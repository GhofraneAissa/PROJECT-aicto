from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import relationship
from app.database import Base

class SDG(Base):
    __tablename__ = "sdg"

    id = Column(Integer, primary_key=True, index=True)
    goal_number = Column(Integer, nullable=False)
    title = Column(Text, nullable=False)
    color = Column(String(10), nullable=False)
    image_url = Column(Text, nullable=False)

    projects = relationship("Project", back_populates="sdg")
