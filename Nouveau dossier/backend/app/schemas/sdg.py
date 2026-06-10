from pydantic import BaseModel

class SDGBase(BaseModel):
    goal_number: int
    title: str
    color: str
    image_url: str

class SDGResponse(SDGBase):
    id: int

    class Config:
        from_attributes = True
