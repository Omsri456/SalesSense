import logging
from typing import Any

try:
    from motor.motor_asyncio import AsyncIOMotorClient
except ImportError:
    AsyncIOMotorClient = None  # type: ignore

from app.config import settings

logger = logging.getLogger("salessense.db")


class MongoDB:
    client: Any = None
    db: Any = None


db_instance = MongoDB()


async def connect_to_mongo():
    logger.info("Connecting to MongoDB at %s...", settings.MONGO_URI)
    try:
        db_instance.client = AsyncIOMotorClient(
            settings.MONGO_URI,
            serverSelectionTimeoutMS=2000,
        )
        db_instance.db = db_instance.client[settings.MONGO_DB_NAME]
        # Ping to check connection
        await db_instance.client.admin.command('ping')
        logger.info("Successfully connected to MongoDB (%s).", settings.MONGO_DB_NAME)
    except Exception as e:
        logger.warning("MongoDB not reachable at %s. Running in disconnected mode. Error: %s", settings.MONGO_URI, e)


async def close_mongo_connection():
    logger.info("Closing MongoDB connection...")
    if db_instance.client:
        db_instance.client.close()
        logger.info("MongoDB connection closed.")


def get_db():
    return db_instance.db
