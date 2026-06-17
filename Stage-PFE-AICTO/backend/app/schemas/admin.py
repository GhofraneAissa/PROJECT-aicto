from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional, List

class AdminProjectDocument(BaseModel):
    file_url: str
    original_filename: str

class AdminProjectCountry(BaseModel):
    name: str

class AdminProjectOwner(BaseModel):
    organization_name: Optional[str] = None
    email: Optional[str] = None

class AdminPendingProject(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    sector: str
    ai_technology: str
    website: Optional[str] = None
    status: str
    rejection_reason: Optional[str] = None
    submitted_at: datetime
    country: Optional[AdminProjectCountry] = None
    owner: Optional[AdminProjectOwner] = None
    documents: List[AdminProjectDocument] = []

class AdminStats(BaseModel):
    pending: int
    approved: int
    rejected: int

class AdminApproveRequest(BaseModel):
    admin_id: int = 0

class AdminRejectRequest(BaseModel):
    reason: str = ""
    admin_id: int = 0

# --- Organization moderation schemas ---

class AdminPendingOrganization(BaseModel):
    id: int
    organization_name: str
    organization_type: str
    email: str
    phone: Optional[str] = None
    website: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    sector: Optional[str] = None
    description: Optional[str] = None
    logo: Optional[str] = None
    role: str
    is_active: bool
    is_approved: bool
    rejection_reason: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None

class AdminOrgStats(BaseModel):
    pending_approval: int
    approved: int
    rejected: int
