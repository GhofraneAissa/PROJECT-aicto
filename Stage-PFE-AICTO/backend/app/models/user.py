from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, CheckConstraint, Index
from sqlalchemy.dialects.postgresql import ENUM
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime, timezone


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_name = Column(String(255), nullable=False)
    organization_type = Column(
        String(50),
        nullable=False,
        comment="NGO / Startup / Company / Government / University / Research Lab",
    )
    email = Column(String(255), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    website = Column(String(500), nullable=True)
    country = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    address = Column(String(500), nullable=True)
    sector = Column(String(150), nullable=True)
    description = Column(Text, nullable=True)
    logo = Column(Text, nullable=True)
    role = Column(
        ENUM("admin", "organization", name="user_role", create_type=False),
        nullable=False,
        server_default="organization",
    )
    is_active = Column(Boolean, nullable=False, default=False)
    is_approved = Column(Boolean, nullable=False, default=False)
    rejection_reason = Column(Text, nullable=True)
    activation_token = Column(String(100), nullable=True, unique=True, index=True)
    reset_token = Column(String(100), nullable=True, unique=True, index=True)
    reset_token_expiry = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    last_login = Column(DateTime(timezone=True), nullable=True)

    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan", foreign_keys="Project.user_id")
    resources = relationship("Resource", back_populates="publisher", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint(
            "organization_type IN ('NGO', 'Startup', 'Company', 'Government', 'University', 'Research Lab')",
            name="chk_organization_type",
        ),
        CheckConstraint(
            "email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'",
            name="chk_valid_email",
        ),
        Index("idx_users_email", "email"),
        Index("idx_users_organization_type", "organization_type"),
        Index("idx_users_role", "role"),
        Index("idx_users_country", "country"),
        Index("idx_users_reset_token", "reset_token"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "organization_name": self.organization_name,
            "organization_type": self.organization_type,
            "email": self.email,
            "phone": self.phone,
            "website": self.website,
            "country": self.country,
            "city": self.city,
            "address": self.address,
            "sector": self.sector,
            "description": self.description,
            "logo": self.logo,
            "role": self.role,
            "is_active": self.is_active,
            "is_approved": self.is_approved,
            "rejection_reason": self.rejection_reason,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "last_login": self.last_login,
        }
