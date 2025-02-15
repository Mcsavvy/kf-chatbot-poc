import datetime
from traceback import print_exc
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import socketio
from typing import List
from app.auth import get_current_user, verify_jwt_token
from app.database import SessionLocal, get_db
from app.models import Thread, Chat
from app.rag import RAGChatbot
from sqlalchemy.orm import Session
from app.socket import sio

app = FastAPI(
    title="RAG Chatbot API",
    description="API for RAG Chatbot",
    version="0.1",
)
socket_app = socketio.ASGIApp(sio, app)
app.add_route("/socket.io/", route=socket_app, methods=["GET", "POST"])
app.add_websocket_route("/socket.io/", socket_app)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize RAG chatbot
rag_bot = RAGChatbot()


# WebSocket events
@sio.event
async def connect(sid, environ, auth: dict={}):
    # In a real application, you would get the token from environ
    token = auth.get("token")
    if not token:
        await sio.emit("error", {"status": "unauthenticated"}, room=sid)
        return False
    try:
        user_id = verify_jwt_token(token)
        await sio.save_session(sid, {"user_id": user_id})
        await sio.emit("connected", {"status": "authenticated"}, room=sid)
    except Exception:
        await sio.emit("error", {"status": "unauthenticated"}, room=sid)
        return False


@sio.event
async def disconnect(sid):
    pass


async def get_or_create_thread(
    db: Session, thread_id: int = None, user_id: str = None
) -> Thread:
    if thread_id:
        thread = db.query(Thread).filter(Thread.id == thread_id).first()
        if thread:
            if thread.user_id != user_id:
                raise HTTPException(
                    status_code=403, detail="Not authorized to access this thread"
                )
            return thread

    # Create new thread if none exists or none provided
    thread = Thread(
        user_id=user_id,
        title="Thread {}".format(datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
    )
    db.add(thread)
    db.commit()
    db.refresh(thread)
    return thread


@sio.event
async def chat_message(sid, data):
    session = await sio.get_session(sid)
    user_id = session["user_id"]
    thread_id = data.get("thread_id")

    db = SessionLocal()
    try:
        # Get or create thread
        thread = await get_or_create_thread(db, thread_id, user_id)

        # Emit thread information
        await sio.emit(
            "thread_info",
            {
                "thread_id": thread.id,
                "is_new": thread_id is None or thread_id != thread.id,
                "title": thread.title,
                "created_at": thread.created_at.isoformat(),
            },
            room=sid,
        )

        history = thread.chats

        # Create user message
        chat = Chat(thread_id=thread.id, content=data["message"], role="user")
        db.add(chat)
        db.commit()
        # Emit chat message
        await sio.emit(
            "chat_message",
            {
                "thread_id": thread.id,
                "chat_id": chat.id,
                "role": chat.role,
                "content": chat.content,
                "created_at": chat.created_at.isoformat(),
            },
            room=sid,
        )

        # Create assistant chat before processing
        assistant_chat = Chat(thread_id=thread.id, content="", role="assistant")
        db.add(assistant_chat)
        db.commit()

        # Emit assistant chat
        await sio.emit(
            "chat_message",
            {
                "thread_id": thread.id,
                "chat_id": assistant_chat.id,
                "role": assistant_chat.role,
                "content": assistant_chat.content,
                "created_at": assistant_chat.created_at.isoformat(),
            },
            room=sid,
        )

        # Process message and stream response
        try:
            # Send initial status
            await sio.emit(
                "status",
                {
                    "phase": "started",
                    "message": "Processing your message",
                    "thread_id": thread.id,
                    "chat_id": assistant_chat.id
                },
                room=sid,
            )

            # Process the message
            result = await rag_bot.process_message(
                message=data["message"],
                sid=sid,
                thread_id=thread.id,
                chat_id=assistant_chat.id,
                history=history,
            )

            # Update assistant chat with final response
            assistant_chat.content = result["response"]
            db.add(assistant_chat)
            db.commit()

            # Emit completion status
            await sio.emit(
                "status",
                {
                    "phase": "completed",
                    "message": "Processing completed",
                    "thread_id": thread.id,
                    "chat_id": assistant_chat.id
                },
                room=sid,
            )

        except Exception as e:
            print_exc()
            await sio.emit(
                "error",
                {
                    "phase": "error",
                    "message": str(e),
                    "thread_id": thread.id,
                    "chat_id": assistant_chat.id
                },
                room=sid,
            )
            db.rollback()

    finally:
        db.close()


@app.post("/auth/verify")
async def verify_token(token: str):
    user_id = verify_jwt_token(token)
    return {"user_id": user_id}


@app.get("/threads", response_model=List[dict])
async def get_threads(current_user: str = Depends(get_current_user)):
    db = SessionLocal()
    try:
        threads = db.query(Thread).filter(Thread.user_id == current_user).all()
        return [
            {"id": t.id, "title": t.title, "created_at": t.created_at} for t in threads
        ]
    finally:
        db.close()


@app.post("/threads")
async def create_thread(current_user: str = Depends(get_current_user)):
    db = SessionLocal()
    try:
        thread = Thread(
            user_id=current_user,
            title="Thread {}".format(
                datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            ),
        )
        db.add(thread)
        db.commit()
        db.refresh(thread)
        return {"id": thread.id, "title": thread.title, "created_at": thread.created_at}
    finally:
        db.close()


@app.get("/threads/{thread_id}/chats")
async def get_chats(
    thread_id: int,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        thread = (
            db.query(Thread)
            .filter(Thread.id == thread_id, Thread.user_id == user_id)
            .first()
        )
        if not thread:
            raise HTTPException(status_code=404, detail="Thread not found")
        return [
            {
                "id": c.id,
                "content": c.content,
                "role": c.role,
                "created_at": c.created_at,
            }
            for c in thread.chats
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(socket_app, host="0.0.0.0", port=8000)
