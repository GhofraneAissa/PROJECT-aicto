from pydantic import BaseModel
from typing import Optional

class CountryBase(BaseModel):
    country: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    region: Optional[str] = None
    icon_url: Optional[str] = None

class CountryCreate(CountryBase):
    pass

class CountryUpdate(BaseModel):
    country: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    region: Optional[str] = None
    icon_url: Optional[str] = None

class CountryResponse(CountryBase):
    id: int

    class Config:
        from_attributes = True