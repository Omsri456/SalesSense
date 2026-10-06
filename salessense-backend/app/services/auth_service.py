import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import bcrypt
import jwt
from fastapi import HTTPException, status

from app.config import settings
from app.db.mongo import get_db

logger = logging.getLogger("salessense.auth")

# In-memory fallback user registry for offline/disconnected mode
_FALLBACK_USERS: Dict[str, Dict[str, Any]] = {}
_RESET_TOKENS: Dict[str, Dict[str, Any]] = {}


def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt (NFR-4: Passwords hashed, never plaintext)."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception as e:
        logger.error("Error verifying password: %s", e)
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT access token."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except jwt.PyJWTError as e:
        logger.warning("JWT verification failed: %s", e)
        return None


async def register_user(name: str, email: str, password: str, role: str = "retailer") -> Dict[str, Any]:
    """
    Register a new user account with hashed password and role assignment (FR-15, NFR-4).
    """
    email_clean = email.strip().lower()
    db = get_db()

    # Check if user already exists in Mongo
    if db is not None:
        try:
            existing = await db.users.find_one({"email": email_clean})
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="An account with this email address already exists.",
                )
        except HTTPException:
            raise
        except Exception as e:
            logger.warning("MongoDB lookup failed during registration, checking fallback store: %s", e)
            if email_clean in _FALLBACK_USERS:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="An account with this email address already exists.",
                )
    else:
        if email_clean in _FALLBACK_USERS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email address already exists.",
            )

    user_id = str(uuid.uuid4())
    hashed_pwd = hash_password(password)
    now = datetime.now(timezone.utc).isoformat()

    user_doc = {
        "id": user_id,
        "name": name.strip(),
        "email": email_clean,
        "hashed_password": hashed_pwd,
        "role": role,
        "created_at": now,
        "updated_at": now,
    }

    # Persist user
    persisted_mongo = False
    if db is not None:
        try:
            await db.users.insert_one(user_doc)
            persisted_mongo = True
        except Exception as e:
            logger.warning("Failed to insert user into MongoDB: %s. Using memory fallback.", e)

    # Always keep in fallback registry as well for resilience
    _FALLBACK_USERS[email_clean] = user_doc

    token = create_access_token({"sub": user_id, "email": email_clean, "role": role})

    return {
        "user": {
            "id": user_id,
            "name": name.strip(),
            "email": email_clean,
            "role": role,
            "created_at": now,
        },
        "access_token": token,
        "token_type": "bearer",
        "persisted_in_db": persisted_mongo,
    }


async def authenticate_user(email: str, password: str) -> Dict[str, Any]:
    """
    Authenticate user credentials and issue a JWT token (FR-15).
    """
    email_clean = email.strip().lower()
    db = get_db()
    user_doc = None

    if db is not None:
        try:
            user_doc = await db.users.find_one({"email": email_clean})
        except Exception as e:
            logger.warning("MongoDB find failed during login: %s", e)

    if not user_doc:
        user_doc = _FALLBACK_USERS.get(email_clean)

    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(password, user_doc["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token({
        "sub": user_doc["id"],
        "email": user_doc["email"],
        "role": user_doc.get("role", "retailer"),
    })

    return {
        "user": {
            "id": user_doc["id"],
            "name": user_doc.get("name", "User"),
            "email": user_doc["email"],
            "role": user_doc.get("role", "retailer"),
        },
        "access_token": token,
        "token_type": "bearer",
    }


async def create_password_reset_token(email: str) -> str:
    """
    Generate a secure password reset token (FR-16).
    """
    email_clean = email.strip().lower()
    reset_token = str(uuid.uuid4())
    _RESET_TOKENS[reset_token] = {
        "email": email_clean,
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
    }
    return reset_token


async def reset_password(token: str, new_password: str) -> bool:
    """
    Reset user password using token (FR-16).
    """
    token_data = _RESET_TOKENS.get(token)
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token.",
        )

    if datetime.now(timezone.utc) > token_data["expires_at"]:
        del _RESET_TOKENS[token]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset token has expired.",
        )

    email = token_data["email"]
    new_hash = hash_password(new_password)
    db = get_db()

    if db is not None:
        try:
            await db.users.update_one(
                {"email": email},
                {"$set": {"hashed_password": new_hash, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
        except Exception as e:
            logger.warning("MongoDB update_one failed during password reset: %s", e)

    if email in _FALLBACK_USERS:
        _FALLBACK_USERS[email]["hashed_password"] = new_hash
        _FALLBACK_USERS[email]["updated_at"] = datetime.now(timezone.utc).isoformat()

    del _RESET_TOKENS[token]
    return True


async def get_current_user(token: str) -> Dict[str, Any]:
    """Retrieve user corresponding to a JWT token."""
    payload = decode_access_token(token)
    if not payload or "email" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    email = payload["email"]
    db = get_db()
    user_doc = None

    if db is not None:
        try:
            user_doc = await db.users.find_one({"email": email})
        except Exception as e:
            logger.warning("MongoDB fetch failed: %s", e)

    if not user_doc:
        user_doc = _FALLBACK_USERS.get(email)

    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    return {
        "id": user_doc["id"],
        "name": user_doc.get("name", "User"),
        "email": user_doc["email"],
        "role": user_doc.get("role", "retailer"),
    }


async def update_user_profile(token: str, name: Optional[str] = None, role: Optional[str] = None) -> Dict[str, Any]:
    """Update user name or role for an authenticated session."""
    user = await get_current_user(token)
    email = user["email"]
    db = get_db()

    updates = {}
    if name is not None:
        updates["name"] = name
    if role is not None:
        updates["role"] = role

    if updates:
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        if db is not None:
            try:
                await db.users.update_one({"email": email}, {"$set": updates})
            except Exception as e:
                logger.warning("MongoDB update failed: %s", e)

        if email in _FALLBACK_USERS:
            _FALLBACK_USERS[email].update(updates)

    return await get_current_user(token)

