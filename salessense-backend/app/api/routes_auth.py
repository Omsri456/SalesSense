from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

from app.services.auth_service import (
    register_user,
    authenticate_user,
    create_password_reset_token,
    reset_password,
    get_current_user,
    update_user_profile,
)

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


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    created_at: Optional[str] = None


class AuthResponse(BaseModel):
    user: UserResponse
    access_token: str
    token_type: str = "bearer"
    persisted_in_db: Optional[bool] = None


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def api_register(payload: RegisterRequest):
    """
    Register a new user account with hashed password (FR-15, NFR-4).
    """
    return await register_user(
        name=payload.name,
        email=payload.email,
        password=payload.password,
        role=payload.role,
    )


@router.post("/login", response_model=AuthResponse)
async def api_login(payload: LoginRequest):
    """
    Authenticate user credentials and issue a JWT access token (FR-15).
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
    success = await reset_password(token=payload.token, new_password=payload.new_password)
    return {
        "status": "success",
        "message": "Password has been successfully updated.",
    }


@router.get("/me", response_model=UserResponse)
async def api_get_me(authorization: Optional[str] = Header(None)):
    """
    Get profile information of the currently authenticated user.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Bearer authorization header.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization.split(" ", 1)[1]
    return await get_current_user(token)


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    role: Optional[str] = Field(None)


@router.put("/profile", response_model=UserResponse)
async def api_update_profile(payload: UpdateProfileRequest, authorization: Optional[str] = Header(None)):
    """
    Update profile details (name, active persona role).
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Bearer authorization header.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization.split(" ", 1)[1]
    return await update_user_profile(token=token, name=payload.name, role=payload.role)

