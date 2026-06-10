from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class StakeholderBase(BaseModel):
    name: str
    type: str
    category: Optional[str] = None
    country: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    contact_email: Optional[str] = None

class StakeholderCreate(StakeholderBase):
    pass

class StakeholderUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    category: Optional[str] = None
    country: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    contact_email: Optional[str] = None

class StakeholderResponse(StakeholderBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True