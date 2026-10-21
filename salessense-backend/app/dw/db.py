"""
Data Warehouse Database Configuration & Connection Management
Supports SQLite file persistence by default (data_cache/salessense_dw.db)
with full compatibility for PostgreSQL via DW_DATABASE_URL.
Enforces foreign key constraints and transactional integrity.
"""

import os
import logging
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings

logger = logging.getLogger("salessense.dw.db")

# Ensure data cache directory exists for SQLite
if settings.DW_DATABASE_URL.startswith("sqlite"):
    db_path = settings.DW_DATABASE_URL.replace("sqlite:///", "")
    db_dir = os.path.dirname(db_path)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)

# Create SQLAlchemy engine
connect_args = {"check_same_thread": False} if settings.DW_DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    settings.DW_DATABASE_URL,
    connect_args=connect_args,
    echo=False,
    pool_pre_ping=True,
)

# Enable SQLite foreign key enforcement
if settings.DW_DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_dw_session():
    """Yields a database session with automatic cleanup."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def init_dw_db():
    """Initializes all dimensional and fact tables in the persistent store."""
    try:
        from app.dw import models  # noqa: F401
        Base.metadata.create_all(bind=engine)
        logger.info("Initialized persistent Data Warehouse tables at %s", settings.DW_DATABASE_URL)
    except Exception as e:
        logger.error("Failed to initialize Data Warehouse database: %s", e)
        raise
