from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://logiq:logiq123@localhost:5432/logiqdb"
    REDIS_URL: str = "redis://localhost:6379"
    SECRET_KEY: str = "logiq-hackathon-secret-key"

    class Config:
        env_file = ".env"


settings = Settings()
