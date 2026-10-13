from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.deps import require_role
from app.db.schemas import (
    UserResponse,
    UserCreateRequest,
    UserRoleUpdateRequest,
    UserStoresUpdateRequest,
    UserStatusUpdateRequest,
    AuditLogEntry,
    StoreScopeItem,
)
from app.services.auth_service import (
    admin_list_users,
    admin_create_user,
    admin_update_user_role,
    admin_update_user_stores,
    admin_toggle_user_status,
    get_audit_logs,
    list_registered_stores,
)

router = APIRouter(prefix="/admin", tags=["Admin Governance"])


@router.get("/users", response_model=List[UserResponse])
async def list_users(current_user: Dict[str, Any] = Depends(require_role(["admin"]))):
    """
    List all platform users with roles, account statuses, and store scopes.
    Requires Admin privileges.
    """
    return await admin_list_users()


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreateRequest,
    current_user: Dict[str, Any] = Depends(require_role(["admin"])),
):
    """
    Admin provisioning of a new user account with designated role and store permissions.
    """
    return await admin_create_user(
        name=payload.name,
        email=payload.email,
        password=payload.password,
        role=payload.role,
        assigned_stores=payload.assigned_stores,
        actor_email=current_user["email"],
    )


@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    payload: UserRoleUpdateRequest,
    current_user: Dict[str, Any] = Depends(require_role(["admin"])),
):
    """
    Assign or revoke role privileges (retailer, ml_engineer, admin) for a user account.
    """
    return await admin_update_user_role(
        target_user_id=user_id,
        new_role=payload.role,
        actor_email=current_user["email"],
    )


@router.put("/users/{user_id}/stores")
async def update_user_stores(
    user_id: str,
    payload: UserStoresUpdateRequest,
    current_user: Dict[str, Any] = Depends(require_role(["admin"])),
):
    """
    Assign or revoke authorized stores for a user account.
    """
    return await admin_update_user_stores(
        target_user_id=user_id,
        store_ids=payload.assigned_stores,
        actor_email=current_user["email"],
    )


@router.put("/users/{user_id}/status")
async def toggle_user_status(
    user_id: str,
    payload: UserStatusUpdateRequest,
    current_user: Dict[str, Any] = Depends(require_role(["admin"])),
):
    """
    Activate or deactivate a user account.
    """
    return await admin_toggle_user_status(
        target_user_id=user_id,
        is_active=payload.is_active,
        actor_email=current_user["email"],
    )


@router.get("/audit-logs", response_model=List[AuditLogEntry])
async def list_audit_logs(
    limit: int = 50,
    current_user: Dict[str, Any] = Depends(require_role(["admin"])),
):
    """
    Retrieve system security and governance audit logs.
    """
    return get_audit_logs(limit=limit)


@router.get("/stores", response_model=List[StoreScopeItem])
async def list_stores(
    current_user: Dict[str, Any] = Depends(require_role(["admin"])),
):
    """
    View all registered stores and city/region mappings across the platform.
    """
    return list_registered_stores()
