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
    admin_id: int

class AdminRejectRequest(BaseModel):
    reason: str
    admin_id: int
