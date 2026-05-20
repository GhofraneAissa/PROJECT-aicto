from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional, List

class ProjectBase(BaseModel):
    title: str
    organization: str = ""
    country_id: Optional[int] = None
    user_id: int
    sector: str
    technology: str = ""
    sdg_alignment: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None
    status: str = "active"
    year_of_implementation: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    uploaded_documents: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectSubmit(BaseModel):
    title: str
    country_id: Optional[int] = None
    sector: str
    ai_technology: str
    user_id: int
    status: str = "pending"
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    description: Optional[str] = None
    sdg_alignment: Optional[str] = None

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    organization: Optional[str] = None
    country_id: Optional[int] = None
    user_id: Optional[int] = None
    sector: Optional[str] = None
    technology: Optional[str] = None
    sdg_alignment: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None
    status: Optional[str] = None
    year_of_implementation: Optional[int] = None
    uploaded_documents: Optional[str] = None

class StakeholderAssociationOut(BaseModel):
    stakeholder_id: int
    role: str
    stakeholder: Optional["StakeholderOut"] = None

    class Config:
        from_attributes = True

class StakeholderOut(BaseModel):
    id: int
    name: str
    type: str
    category: Optional[str] = None
    country: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    contact_email: Optional[str] = None

    class Config:
        from_attributes = True

class ProjectResponse(ProjectBase):
    id: int
    created_at: datetime
    updated_at: datetime
    stakeholders: Optional[List[StakeholderAssociationOut]] = None

    class Config:
        from_attributes = True

class FlatStakeholder(BaseModel):
    name: str
    type: str
    role: str
    country: Optional[str] = None
    website: Optional[str] = None
    city: str = ""

class DocumentInfo(BaseModel):
    original_name: str
    stored_name: str
    path: str

class ProjectPaginatedResponse(BaseModel):
    items: List[ProjectResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

class ProjectDetailResponse(BaseModel):
    id: int
    title: str
    organization: str
    country_id: Optional[int] = None
    country_name: str
    user_id: int
    sector: str
    technology: str
    sdg_alignment: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None
    status: str
    year_of_implementation: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    documents: list = []
    stakeholders: Optional[List[FlatStakeholder]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
