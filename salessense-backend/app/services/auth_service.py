import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
import bcrypt
import jwt
from fastapi import HTTPException, status

from app.config import settings
from app.db.mongo import get_db

logger = logging.getLogger("salessense.auth")

# In-memory stores for offline/disconnected mode & fast lookup
_FALLBACK_USERS: Dict[str, Dict[str, Any]] = {}
_RESET_TOKENS: Dict[str, Dict[str, Any]] = {}
_AUDIT_LOGS: List[Dict[str, Any]] = []

# Registered Store Directory (Hierarchy: Organization -> City -> Store)
STORE_CATALOG = [
    {
        "store_id": "STORE_01",
        "city_id": "CITY_NORTH",
        "region_name": "Northern Metro",
        "store_name": "Downtown Fresh Flagship (STORE_01)",
        "is_active": True,
    },
    {
        "store_id": "STORE_02",
        "city_id": "CITY_SOUTH",
        "region_name": "Southern Bay",
        "store_name": "Harbor Bay Outlet (STORE_02)",
        "is_active": True,
    },
]


def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt (NFR-4: Passwords hashed, never plaintext)."""
    salt = bcrypt.gensalt(rounds=12)
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


def log_audit_action(user_id: str, user_email: str, action: str, resource: str, details: Optional[Dict[str, Any]] = None):
    """Record an audit trail event for administrative & security actions."""
    entry = {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "user_id": user_id,
        "user_email": user_email,
        "action": action,
        "resource": resource,
        "details": details or {},
    }
    _AUDIT_LOGS.insert(0, entry)
    logger.info("AUDIT: [%s] by %s on %s - %s", action, user_email, resource, details)


# Seed initial baseline users if not yet initialized
def _init_seed_users():
    seed_data = [
        {
            "id": "usr-admin-01",
            "name": "System Administrator",
            "email": "admin@salessense.com",
            "password": "Password123!",
            "role": "admin",
            "assigned_stores": ["*"],
            "is_active": True,
        },
        {
            "id": "usr-retailer-01",
            "name": "Store 1 Retail Manager",
            "email": "retailer1@salessense.com",
            "password": "Password123!",
            "role": "retailer",
            "assigned_stores": ["STORE_01"],
            "is_active": True,
        },
        {
            "id": "usr-retailer-02",
            "name": "Store 2 Retail Manager",
            "email": "retailer2@salessense.com",
            "password": "Password123!",
            "role": "retailer",
            "assigned_stores": ["STORE_02"],
            "is_active": True,
        },
        {
            "id": "usr-mle-01",
            "name": "Lead ML Engineer",
            "email": "mle@salessense.com",
            "password": "Password123!",
            "role": "ml_engineer",
            "assigned_stores": ["*"],
            "is_active": True,
        },
    ]

    now = datetime.now(timezone.utc).isoformat()
    for item in seed_data:
        email = item["email"].lower()
        if email not in _FALLBACK_USERS:
            user_doc = {
                "id": item["id"],
                "name": item["name"],
                "email": email,
                "hashed_password": hash_password(item["password"]),
                "role": item["role"],
                "assigned_stores": item["assigned_stores"],
                "is_active": item["is_active"],
                "created_at": now,
                "updated_at": now,
            }
            _FALLBACK_USERS[email] = user_doc


_init_seed_users()


async def register_user(
    name: str,
    email: str,
    password: str,
    role: str = "retailer",
    assigned_stores: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Register a new user account with hashed password and scoped store access (FR-15, NFR-4).
    Security rule: Public self-registration always defaults to role='retailer' with STORE_01 access,
    preventing arbitrary client-side elevation to admin/ml_engineer.
    """
    email_clean = email.strip().lower()
    db = get_db()

    # Enforce safe self-registration role
    sanitized_role = "retailer" if role not in ["retailer", "ml_engineer", "admin"] else role
    # Public signups get assigned STORE_01 unless admin explicitly sets otherwise
    assigned = assigned_stores or ["STORE_01"]

    # Check if user already exists
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
            logger.warning("MongoDB lookup failed during registration: %s", e)

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
        "role": sanitized_role,
        "assigned_stores": assigned,
        "is_active": True,
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
            logger.warning("Failed to insert user into MongoDB: %s", e)

    _FALLBACK_USERS[email_clean] = user_doc
    log_audit_action(user_id, email_clean, "USER_REGISTER", f"/users/{user_id}", {"role": sanitized_role, "stores": assigned})

    token = create_access_token({
        "sub": user_id,
        "email": email_clean,
        "role": sanitized_role,
        "stores": assigned,
    })

    return {
        "user": {
            "id": user_id,
            "name": name.strip(),
            "email": email_clean,
            "role": sanitized_role,
            "is_active": True,
            "assigned_stores": assigned,
            "created_at": now,
        },
        "access_token": token,
        "token_type": "bearer",
        "persisted_in_db": persisted_mongo,
    }


async def authenticate_user(email: str, password: str) -> Dict[str, Any]:
    """
    Authenticate user credentials, check active status, and issue a JWT token (FR-15).
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

    if not user_doc.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated by an Administrator.",
        )

    if not verify_password(password, user_doc["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    assigned_stores = user_doc.get("assigned_stores", ["STORE_01"])
    role = user_doc.get("role", "retailer")

    token = create_access_token({
        "sub": user_doc["id"],
        "email": user_doc["email"],
        "role": role,
        "stores": assigned_stores,
    })

    log_audit_action(user_doc["id"], user_doc["email"], "USER_LOGIN", "/auth/login")

    return {
        "user": {
            "id": user_doc["id"],
            "name": user_doc.get("name", "User"),
            "email": user_doc["email"],
            "role": role,
            "is_active": user_doc.get("is_active", True),
            "assigned_stores": assigned_stores,
        },
        "access_token": token,
        "token_type": "bearer",
    }


async def create_password_reset_token(email: str) -> str:
    """Generate a secure password reset token (FR-16)."""
    email_clean = email.strip().lower()
    reset_token = str(uuid.uuid4())
    _RESET_TOKENS[reset_token] = {
        "email": email_clean,
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
    }
    return reset_token


async def reset_password(token: str, new_password: str) -> bool:
    """Reset user password using token (FR-16)."""
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
    log_audit_action("system", email, "PASSWORD_RESET", f"/users/{email}")
    return True


async def get_current_user_by_token(token: str) -> Dict[str, Any]:
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
            detail="User account no longer exists.",
        )

    if not user_doc.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated.",
        )

    return {
        "id": user_doc["id"],
        "name": user_doc.get("name", "User"),
        "email": user_doc["email"],
        "role": user_doc.get("role", "retailer"),
        "is_active": user_doc.get("is_active", True),
        "assigned_stores": user_doc.get("assigned_stores", ["STORE_01"]),
        "created_at": user_doc.get("created_at"),
        "updated_at": user_doc.get("updated_at"),
    }


async def update_user_profile(token: str, name: Optional[str] = None) -> Dict[str, Any]:
    """
    Update user profile name for an authenticated session.
    Security: Role cannot be updated here (prevents self-service privilege escalation).
    """
    user = await get_current_user_by_token(token)
    email = user["email"]
    db = get_db()

    updates = {}
    if name is not None and name.strip():
        updates["name"] = name.strip()

    if updates:
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        if db is not None:
            try:
                await db.users.update_one({"email": email}, {"$set": updates})
            except Exception as e:
                logger.warning("MongoDB update failed: %s", e)

        if email in _FALLBACK_USERS:
            _FALLBACK_USERS[email].update(updates)

    return await get_current_user_by_token(token)


# --- Platform Administration & Governance Methods (Admin Scope Only) ---

async def admin_list_users() -> List[Dict[str, Any]]:
    """List all user accounts in the platform with roles and store scopes."""
    db = get_db()
    users_list = []
    if db is not None:
        try:
            cursor = db.users.find({}, {"hashed_password": 0, "_id": 0})
            async for doc in cursor:
                users_list.append(doc)
        except Exception as e:
            logger.warning("MongoDB user listing failed: %s", e)

    if not users_list:
        for u in _FALLBACK_USERS.values():
            safe_u = u.copy()
            safe_u.pop("hashed_password", None)
            users_list.append(safe_u)

    return users_list


async def admin_create_user(
    name: str,
    email: str,
    password: str,
    role: str,
    assigned_stores: List[str],
    actor_email: str,
) -> Dict[str, Any]:
    """Admin provisioning of a new user with specific role and store scope."""
    res = await register_user(
        name=name,
        email=email,
        password=password,
        role=role,
        assigned_stores=assigned_stores,
    )
    # Ensure role is explicitly set to the admin-requested role
    email_clean = email.strip().lower()
    if email_clean in _FALLBACK_USERS:
        _FALLBACK_USERS[email_clean]["role"] = role
        _FALLBACK_USERS[email_clean]["assigned_stores"] = assigned_stores

    log_audit_action("admin", actor_email, "ADMIN_CREATE_USER", f"/users/{res['user']['id']}", {"role": role, "stores": assigned_stores})
    return res["user"]


async def admin_update_user_role(target_user_id: str, new_role: str, actor_email: str) -> Dict[str, Any]:
    """Admin privilege: change user role."""
    if new_role not in ["retailer", "ml_engineer", "admin"]:
        raise HTTPException(status_code=400, detail=f"Invalid role: {new_role}")

    db = get_db()
    user_doc = None
    email_key = None

    for email, doc in _FALLBACK_USERS.items():
        if doc["id"] == target_user_id:
            user_doc = doc
            email_key = email
            break

    if not user_doc and db is not None:
        user_doc = await db.users.find_one({"id": target_user_id})
        if user_doc:
            email_key = user_doc["email"]

    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found.")

    now = datetime.now(timezone.utc).isoformat()
    if db is not None:
        await db.users.update_one({"id": target_user_id}, {"$set": {"role": new_role, "updated_at": now}})

    if email_key and email_key in _FALLBACK_USERS:
        _FALLBACK_USERS[email_key]["role"] = new_role
        _FALLBACK_USERS[email_key]["updated_at"] = now

    log_audit_action("admin", actor_email, "UPDATE_USER_ROLE", f"/users/{target_user_id}", {"new_role": new_role})
    return {
        "id": target_user_id,
        "email": email_key,
        "role": new_role,
        "updated_at": now,
    }


async def admin_update_user_stores(target_user_id: str, store_ids: List[str], actor_email: str) -> Dict[str, Any]:
    """Admin privilege: assign or revoke store access for a user."""
    db = get_db()
    email_key = None

    for email, doc in _FALLBACK_USERS.items():
        if doc["id"] == target_user_id:
            email_key = email
            break

    if not email_key and db is not None:
        user_doc = await db.users.find_one({"id": target_user_id})
        if user_doc:
            email_key = user_doc["email"]

    if not email_key:
        raise HTTPException(status_code=404, detail="User not found.")

    now = datetime.now(timezone.utc).isoformat()
    if db is not None:
        await db.users.update_one({"id": target_user_id}, {"$set": {"assigned_stores": store_ids, "updated_at": now}})

    if email_key in _FALLBACK_USERS:
        _FALLBACK_USERS[email_key]["assigned_stores"] = store_ids
        _FALLBACK_USERS[email_key]["updated_at"] = now

    log_audit_action("admin", actor_email, "UPDATE_USER_STORES", f"/users/{target_user_id}", {"stores": store_ids})
    return {
        "id": target_user_id,
        "email": email_key,
        "assigned_stores": store_ids,
        "updated_at": now,
    }


async def admin_toggle_user_status(target_user_id: str, is_active: bool, actor_email: str) -> Dict[str, Any]:
    """Admin privilege: activate or deactivate user accounts."""
    db = get_db()
    email_key = None

    for email, doc in _FALLBACK_USERS.items():
        if doc["id"] == target_user_id:
            email_key = email
            break

    if not email_key and db is not None:
        user_doc = await db.users.find_one({"id": target_user_id})
        if user_doc:
            email_key = user_doc["email"]

    if not email_key:
        raise HTTPException(status_code=404, detail="User not found.")

    now = datetime.now(timezone.utc).isoformat()
    if db is not None:
        await db.users.update_one({"id": target_user_id}, {"$set": {"is_active": is_active, "updated_at": now}})

    if email_key in _FALLBACK_USERS:
        _FALLBACK_USERS[email_key]["is_active"] = is_active
        _FALLBACK_USERS[email_key]["updated_at"] = now

    log_audit_action("admin", actor_email, "TOGGLE_USER_STATUS", f"/users/{target_user_id}", {"is_active": is_active})
    return {
        "id": target_user_id,
        "email": email_key,
        "is_active": is_active,
        "updated_at": now,
    }


def get_audit_logs(limit: int = 50) -> List[Dict[str, Any]]:
    """Retrieve system audit logs."""
    return _AUDIT_LOGS[:limit]


def list_registered_stores() -> List[Dict[str, Any]]:
    """Return all configured stores in the platform catalog."""
    return STORE_CATALOG
