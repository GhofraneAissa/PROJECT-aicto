from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime
from typing import Optional
import re


VALID_ORG_TYPES = {"NGO", "Startup", "Company", "Government", "University", "Research Lab"}
VALID_ROLES = {"organization", "admin"}


def determine_role_from_email(email: str) -> str:
    return "admin" if email.lower().endswith("@aicto.org") else "organization"


class UserBase(BaseModel):
    organization_name: str
    organization_type: str
    email: EmailStr
    phone: Optional[str] = None
    website: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    sector: Optional[str] = None
    description: Optional[str] = None
    logo: Optional[str] = None

    @field_validator("organization_type")
    @classmethod
    def validate_org_type(cls, v):
        if v not in VALID_ORG_TYPES:
            raise ValueError(f"organization_type must be one of: {', '.join(sorted(VALID_ORG_TYPES))}")
        return v


class UserCreate(UserBase):
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if len(v) > 128:
            raise ValueError("Password must not exceed 128 characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one digit")
        return v


class UserUpdate(BaseModel):
    organization_name: Optional[str] = None
    organization_type: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    sector: Optional[str] = None
    description: Optional[str] = None
    logo: Optional[str] = None
    password: Optional[str] = None

    @field_validator("organization_type")
    @classmethod
    def validate_org_type(cls, v):
        if v is not None and v not in VALID_ORG_TYPES:
            raise ValueError(f"organization_type must be one of: {', '.join(sorted(VALID_ORG_TYPES))}")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if v is not None:
            if len(v) < 8:
                raise ValueError("Password must be at least 8 characters")
            if len(v) > 128:
                raise ValueError("Password must not exceed 128 characters")
            if not re.search(r"[A-Z]", v):
                raise ValueError("Password must contain at least one uppercase letter")
            if not re.search(r"[a-z]", v):
                raise ValueError("Password must contain at least one lowercase letter")
            if not re.search(r"[0-9]", v):
                raise ValueError("Password must contain at least one digit")
        return v


class UserResponse(UserBase):
    id: int
    role: str
    is_active: bool = False
    is_approved: bool = False
    rejection_reason: Optional[str] = None
    stakeholder_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    password: str
    confirm_password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if len(v) > 128:
            raise ValueError("Password must not exceed 128 characters")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one digit")
        return v

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v, info):
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Passwords do not match")
        return v


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
