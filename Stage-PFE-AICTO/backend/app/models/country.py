from sqlalchemy import Column, Integer, String, Numeric
from sqlalchemy.orm import relationship
from app.database import Base

class Country(Base):
    __tablename__ = "countries"

    id = Column(Integer, primary_key=True, autoincrement=True)
    country = Column(String(80), nullable=False)
    latitude = Column(Numeric(9, 6), nullable=True)
    longitude = Column(Numeric(9, 6), nullable=True)
    region = Column(String(60), nullable=True)
    icon_url = Column(String(500), nullable=True)

    projects = relationship("Project", back_populates="country")