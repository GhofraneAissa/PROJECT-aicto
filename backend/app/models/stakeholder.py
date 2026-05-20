from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class Stakeholder(Base):
    __tablename__ = "stakeholders"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    type = Column(String(100), nullable=False)  # startup, university, government, NGO, lab, company
    category = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)
    website = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    contact_email = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project_associations = relationship("ProjectStakeholderAssociation", back_populates="stakeholder", cascade="all, delete-orphan")