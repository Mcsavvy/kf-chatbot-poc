from pathlib import Path
from pydantic import PostgresDsn
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    DATABASE_URL: PostgresDsn
    JWT_SECRET_KEY: str
    ANTHROPIC_API_KEY: str
    JWT_ALGORITHM: str = "HS256"

    class Config:
        env_file = BASE_DIR / ".env"

settings = Settings() # type: ignore[call-arg]