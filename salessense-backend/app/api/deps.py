from typing import List, Dict, Any, Optional
from fastapi import Header, HTTPException, status, Depends
from app.services.auth_service import get_current_user_by_token


async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    Extract and validate the Bearer token from request headers.
    Returns the authenticated user dict or raises 401.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Bearer authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.split(" ", 1)[1].strip()
    return await get_current_user_by_token(token)


def require_role(allowed_roles: List[str]):
    """
    Dependency factory to enforce role-based access control (RBAC).
    """
    async def role_checker(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = current_user.get("role", "retailer")
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: Action requires one of {allowed_roles} roles. Your role is '{user_role}'.",
            )
        return current_user

    return role_checker


async def verify_store_access(store_id: str, current_user: Dict[str, Any] = Depends(get_current_user)) -> str:
    """
    Enforces Data Scope: Verifies that the authenticated user is authorized
    to view or interact with the requested store.
    - Admins and ML Engineers with '*' have platform-wide access.
    - Retailers can only access explicitly assigned stores.
    """
    user_role = current_user.get("role", "retailer")
    assigned = current_user.get("assigned_stores", [])

    # Global administrative & ML analytical scope
    if user_role == "admin" or "*" in assigned:
        return store_id

    # Retailer requesting aggregate across all assigned stores
    if store_id == "all":
        if not assigned:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You have no assigned stores to aggregate.",
            )
        return store_id

    # Specific store requested: check assignment
    if store_id not in assigned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: You do not have permission for store '{store_id}'. Your authorized stores are: {assigned}.",
        )

    return store_id
