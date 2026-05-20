from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Date
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    organization = Column(String(255), nullable=False)
    country_id = Column(Integer, ForeignKey("countries.id", ondelete="SET NULL", onupdate="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    sector = Column(String(100), nullable=False)
    technology = Column(String(100), default="")
    sdg_alignment = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    website = Column(String(500), nullable=True)
    status = Column(String(50), default="active")
    year_of_implementation = Column(Integer, nullable=True)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    uploaded_documents = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    moderated_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    moderated_at = Column(DateTime, nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    country = relationship("Country", back_populates="projects")
    owner = relationship("User", back_populates="projects", foreign_keys=[user_id])
    moderator = relationship("User", foreign_keys=[moderated_by])
    stakeholder_associations = relationship("ProjectStakeholderAssociation", back_populates="project", cascade="all, delete-orphan")

class ProjectStakeholderAssociation(Base):
    __tablename__ = "project_stakeholders"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    stakeholder_id = Column(Integer, ForeignKey("stakeholders.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(50), default="partner")

    project = relationship("Project", back_populates="stakeholder_associations")
    stakeholder = relationship("Stakeholder", back_populates="project_associations")