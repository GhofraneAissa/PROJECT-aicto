from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class Resource(Base):
    __tablename__ = "resources"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    type = Column(String(100), nullable=False)  # Policy Document, White Paper, Report, Dataset
    category = Column(String(100), nullable=False)  # Strategy, Ethics, Governance, Research, Data
    language = Column(String(50), nullable=True)
    file_size = Column(String(50), nullable=True)
    downloads = Column(Integer, default=0)
    description = Column(Text, nullable=True)
    file_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    publisher = relationship("User", back_populates="resources")