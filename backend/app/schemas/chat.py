from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class ChatMessageSchema(BaseModel):
    id: int
    session_id: str
    role: str
    content: str
    attachments: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ChatSessionCreate(BaseModel):
    title: Optional[str] = "New Chat"


class ChatSessionResponse(BaseModel):
    id: int
    session_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    messages: List[ChatMessageSchema] = []

    class Config:
        from_attributes = True


class ChatSessionListItem(BaseModel):
    session_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    message: str
    session_id: str
    history: List[dict] = []
    attachments: Optional[List[dict]] = None


class ChatResult(BaseModel):
    title: str
    type: str
    id: int
    url: str
    country: str = ""
    sector: str = ""


class ChatResponse(BaseModel):
    reply: str
    provider: str = "template"
    time_ms: int = 0
    results: List[ChatResult] = []
    session_id: str = ""
