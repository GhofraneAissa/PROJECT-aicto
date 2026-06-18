from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.stakeholder import Stakeholder
from app.schemas.stakeholder import StakeholderCreate, StakeholderUpdate, StakeholderResponse

router = APIRouter()

@router.get("/", response_model=List[StakeholderResponse])
def get_stakeholders(
    skip: int = 0, 
    limit: int = 100, 
    search: str = None,
    type_filter: str = None,
    country: str = None,
    db: Session = Depends(get_db)
):
    query = db.query(Stakeholder)
    
    if search:
        query = query.filter(
            (Stakeholder.name.contains(search)) | 
            (Stakeholder.description.contains(search))
        )
    if type_filter and type_filter != "All":
        query = query.filter(Stakeholder.type == type_filter)
    if country and country != "All":
        query = query.filter(Stakeholder.country == country)
    
    return query.offset(skip).limit(limit).all()

@router.get("/stats/count")
def get_stakeholder_count(db: Session = Depends(get_db)):
    return {"count": db.query(Stakeholder).count()}

@router.get("/{id}", response_model=StakeholderResponse)
def get_stakeholder(id: int, db: Session = Depends(get_db)):
    stakeholder = db.query(Stakeholder).filter(Stakeholder.id == id).first()
    if not stakeholder:
        raise HTTPException(status_code=404, detail="Stakeholder not found")
    return stakeholder

@router.post("/", response_model=StakeholderResponse)
def create_stakeholder(stakeholder: StakeholderCreate, db: Session = Depends(get_db)):
    db_stakeholder = Stakeholder(**stakeholder.model_dump())
    db.add(db_stakeholder)
    db.commit()
    db.refresh(db_stakeholder)
    return db_stakeholder

@router.put("/{id}", response_model=StakeholderResponse)
def update_stakeholder(id: int, stakeholder: StakeholderUpdate, db: Session = Depends(get_db)):
    db_stakeholder = db.query(Stakeholder).filter(Stakeholder.id == id).first()
    if not db_stakeholder:
        raise HTTPException(status_code=404, detail="Stakeholder not found")
    
    update_data = stakeholder.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_stakeholder, field, value)
    
    db.commit()
    db.refresh(db_stakeholder)
    return db_stakeholder

@router.delete("/{id}")
def delete_stakeholder(id: int, db: Session = Depends(get_db)):
    db_stakeholder = db.query(Stakeholder).filter(Stakeholder.id == id).first()
    if not db_stakeholder:
        raise HTTPException(status_code=404, detail="Stakeholder not found")
    
    db.delete(db_stakeholder)
    db.commit()
    return {"message": "Stakeholder deleted successfully"}