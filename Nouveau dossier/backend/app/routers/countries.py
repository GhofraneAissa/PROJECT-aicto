from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.country import Country
from app.schemas.country import CountryCreate, CountryUpdate, CountryResponse

router = APIRouter()

@router.get("/", response_model=List[CountryResponse])
def get_countries(db: Session = Depends(get_db)):
    return db.query(Country).order_by(Country.id).all()

@router.get("/{id}", response_model=CountryResponse)
def get_country(id: int, db: Session = Depends(get_db)):
    country = db.query(Country).filter(Country.id == id).first()
    if not country:
        raise HTTPException(status_code=404, detail="Country not found")
    return country

@router.post("/", response_model=CountryResponse)
def create_country(country_data: CountryCreate, db: Session = Depends(get_db)):
    try:
        db_country = Country(**country_data.model_dump())
        db.add(db_country)
        db.commit()
        db.refresh(db_country)
        return db_country
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{id}", response_model=CountryResponse)
def update_country(id: int, country_data: CountryUpdate, db: Session = Depends(get_db)):
    db_country = db.query(Country).filter(Country.id == id).first()
    if not db_country:
        raise HTTPException(status_code=404, detail="Country not found")
    
    update_data = country_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_country, field, value)
    
    db.commit()
    db.refresh(db_country)
    return db_country

@router.delete("/{id}")
def delete_country(id: int, db: Session = Depends(get_db)):
    db_country = db.query(Country).filter(Country.id == id).first()
    if not db_country:
        raise HTTPException(status_code=404, detail="Country not found")
    
    db.delete(db_country)
    db.commit()
    return {"message": "Country deleted successfully"}