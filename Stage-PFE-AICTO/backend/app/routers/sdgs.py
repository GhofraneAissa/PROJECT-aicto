from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.sdg import SDG
from app.schemas.sdg import SDGResponse

router = APIRouter()

@router.get("/", response_model=List[SDGResponse])
def get_sdgs(db: Session = Depends(get_db)):
    return db.query(SDG).order_by(SDG.goal_number).all()
