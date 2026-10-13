from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

from app.services.auth_service import (
    register_user,
    authenticate_user,
    create_password_reset_token,
    reset_password,
    get_current_user_by_token,
    update_user_profile,
    list_registered_stores,
)
from app.db.schemas import UserResponse, StoreScopeItem
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, example="Jane Doe")
    email: EmailStr = Field(..., example="jane@retailstore.com")
    password: str = Field(..., min_length=6, max_length=128, example="Secret123")
    role: str = Field(default="retailer", example="retailer")


class LoginRequest(BaseModel):
    email: EmailStr = Field(..., example="jane@retailstore.com")
    password: str = Field(..., min_length=1, example="Secret123")


class ForgotPasswordRequest(BaseModel):
    email: EmailStr = Field(..., example="jane@retailstore.com")


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=1, example="reset-token-uuid")
    new_password: str = Field(..., min_length=6, max_length=128, example="NewSecret123")


class AuthResponse(BaseModel):
    user: UserResponse
    access_token: str
    token_type: str = "bearer"
    persisted_in_db: Optional[bool] = None


class UpdateProfileRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Full name")
    # Security note: 'role' has been completely removed to prevent self-service privilege escalation (CWE-269)


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def api_register(payload: RegisterRequest):
    """
    Register a new user account with hashed password (FR-15, NFR-4).
    Self-registration role is restricted to Retailer with default store scope.
    """
    return await register_user(
        name=payload.name,
        email=payload.email,
        password=payload.password,
        role="retailer",  # Secure default; admin promotion required for other roles
    )


@router.post("/login", response_model=AuthResponse)
async def api_login(payload: LoginRequest):
    """
    Authenticate user credentials, verify active status, and issue a JWT access token (FR-15).
    """
    return await authenticate_user(
        email=payload.email,
        password=payload.password,
    )


@router.post("/forgot-password")
async def api_forgot_password(payload: ForgotPasswordRequest):
    """
    Initiate password reset flow and issue reset token (FR-16).
    """
    token = await create_password_reset_token(payload.email)
    return {
        "status": "success",
        "message": f"Password reset instructions have been generated for {payload.email}",
        "reset_token": token,  # Provided for testing/demo convenience
    }


@router.post("/reset-password")
async def api_reset_password(payload: ResetPasswordRequest):
    """
    Complete password reset using a reset token (FR-16).
    """
    await reset_password(token=payload.token, new_password=payload.new_password)
    return {
        "status": "success",
        "message": "Password has been successfully updated.",
    }


@router.get("/me", response_model=UserResponse)
async def api_get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Get profile information of the currently authenticated user including role and assigned store scope.
    """
    return current_user


@router.put("/profile", response_model=UserResponse)
async def api_update_profile(
    payload: UpdateProfileRequest,
    authorization: Optional[str] = Header(None),
):
    """
    Update profile details (name only).
    Role and store permissions can only be altered by an Administrator.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Bearer authorization header.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization.split(" ", 1)[1].strip()
    return await update_user_profile(token=token, name=payload.name)


@router.get("/my-stores", response_model=List[StoreScopeItem])
async def api_get_my_stores(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Retrieve the stores that the authenticated user is authorized to analyze.
    Retailers receive only assigned stores; Admins and ML Engineers receive all registered stores.
    """
    all_stores = list_registered_stores()
    role = current_user.get("role", "retailer")
    assigned = current_user.get("assigned_stores", [])

    if role == "admin" or "*" in assigned:
        return all_stores

    return [s for s in all_stores if s["store_id"] in assigned]
