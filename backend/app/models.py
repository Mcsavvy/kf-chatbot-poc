from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, relationship
from app.database import Base

def utcnow():
    return datetime.utcnow()

class Thread(Base):
    __tablename__ = "threads"

    id: Mapped[int] = Column(Integer, primary_key=True, index=True)
    user_id: Mapped[str] = Column(String, index=True)
    title: Mapped[str] = Column(String, default="Untitled")
    created_at: Mapped[datetime] = Column(DateTime, default=utcnow)
    chats: Mapped[list["Chat"]] = relationship("Chat", back_populates="thread")


class Chat(Base):
    __tablename__ = "chats"

    id: Mapped[int] = Column(Integer, primary_key=True, index=True)
    thread_id: Mapped[int] = Column(Integer, ForeignKey("threads.id"))
    content: Mapped[str] = Column(String)
    role: Mapped[str] = Column(String, default="user")
    created_at: Mapped[datetime] = Column(DateTime, default=utcnow)
    thread: Mapped["Thread"] = relationship("Thread", back_populates="chats")