from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings
from sqlalchemy.orm import DeclarativeBase

SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

engine = create_engine(SQLALCHEMY_DATABASE_URL.unicode_string())
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base: DeclarativeBase = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

from app.models import * # noqa