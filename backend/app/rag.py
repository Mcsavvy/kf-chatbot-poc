import asyncio
from langchain_anthropic import ChatAnthropic
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from app.config import settings
from app.models import Chat
from app.socket import sio


class RAGChatbot:
    def __init__(self):
        self.llm = ChatAnthropic(
            model="claude-3-haiku-20240307",
            anthropic_api_key=settings.ANTHROPIC_API_KEY,
            max_tokens=4000,
            streaming=True,
        )
        self.output_parser = StrOutputParser()

    async def process_message(
        self, message: str, sid: str, thread_id: int, chat_id: int, history: list[Chat]
    ) -> dict:
        # Simulate processing
        await sio.emit(
            "status",
            {
                "phase": "started",
                "message": "Beginning to process your message",
                "thread_id": thread_id,
                "chat_id": chat_id,
            },
            room=sid,
        )
        await asyncio.sleep(1)

        # Simulating document search
        await sio.emit(
            "status",
            {
                "phase": "searching",
                "message": "Searching through relevant documents",
                "thread_id": thread_id,
                "chat_id": chat_id,
            },
            room=sid,
        )
        await asyncio.sleep(2)

        # Simulating document retrieval
        await sio.emit(
            "status",
            {
                "phase": "retrieving",
                "message": "Found 3 relevant documents",
                "thread_id": thread_id,
                "chat_id": chat_id,
            },
            room=sid,
        )
        await asyncio.sleep(1.5)

        await sio.emit(
            "search_results",
            {
                "results": "Simulated search results for: " + message,
                "documents": [
                    {"title": "Document 1", "relevance": 0.92},
                    {"title": "Document 2", "relevance": 0.85},
                    {"title": "Document 3", "relevance": 0.78},
                ],
                "thread_id": thread_id,
                "chat_id": chat_id,
            },
            room=sid,
        )

        # Simulating embedding calculation
        await sio.emit(
            "status",
            {
                "phase": "embedding",
                "message": "Calculating embeddings for context",
                "thread_id": thread_id,
                "chat_id": chat_id,
            },
            room=sid,
        )
        await asyncio.sleep(2)

        # Process message using RAG
        await sio.emit(
            "status",
            {
                "phase": "processing",
                "message": "Generating response with AI",
                "thread_id": thread_id,
                "chat_id": chat_id,
            },
            room=sid,
        )

        # 2. Create prompt with context
        prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "You are a helpful assistant. Answer the user's question.",
                ),
                *[(c.role, c.content) for c in history if c.content],
                ("human", "{question}")
            ]
        
        )

        # 3. Generate response
        chain = prompt | self.llm | self.output_parser
        response = ""
        async for chunk in chain.astream({"question": message}):
            response += chunk
            await sio.emit(
                "response_chunk",
                {"chunk": chunk, "thread_id": thread_id, "chat_id": chat_id},
                room=sid,
            )

        await sio.emit(
            "status",
            {
                "phase": "completed",
                "message": "Finished processing your message",
                "thread_id": thread_id,
                "chat_id": chat_id,
            },
            room=sid,
        )

        return {
            "response": response,
        }
