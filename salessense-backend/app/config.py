from typing import List

try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic import BaseModel as BaseSettings  # type: ignore


class Settings(BaseSettings):
    PROJECT_NAME: str = "SalesSense API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    # Server
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    DEBUG: bool = True

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*",
    ]

    # MongoDB
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "salessense"

    # Hugging Face
    HF_TOKEN: str = ""

    # Modeling
    LSTM_EPOCHS: int = 50
    LSTM_EARLY_STOPPING_PATIENCE: int = 10

    # Authentication & Security
    JWT_SECRET_KEY: str = "salessense-secret-super-secure-key-2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
