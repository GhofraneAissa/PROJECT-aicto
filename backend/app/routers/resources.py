from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.resource import Resource
from app.schemas.resource import ResourceCreate, ResourceUpdate, ResourceResponse

router = APIRouter()

@router.get("/", response_model=List[ResourceResponse])
def get_resources(
    skip: int = 0, 
    limit: int = 100,
    search: str = None,
    type_filter: str = None,
    category: str = None,
    db: Session = Depends(get_db)
):
    query = db.query(Resource)
    
    if search:
        query = query.filter(
            (Resource.title.contains(search)) | 
            (Resource.description.contains(search))
        )
    if type_filter and type_filter != "All":
        query = query.filter(Resource.type == type_filter)
    if category and category != "All":
        query = query.filter(Resource.category == category)
    
    return query.offset(skip).limit(limit).all()

@router.get("/{id}", response_model=ResourceResponse)
def get_resource(id: int, db: Session = Depends(get_db)):
    resource = db.query(Resource).filter(Resource.id == id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    return resource

@router.post("/", response_model=ResourceResponse)
def create_resource(resource: ResourceCreate, db: Session = Depends(get_db)):
    db_resource = Resource(**resource.model_dump())
    db.add(db_resource)
    db.commit()
    db.refresh(db_resource)
    return db_resource

@router.put("/{id}", response_model=ResourceResponse)
def update_resource(id: int, resource: ResourceUpdate, db: Session = Depends(get_db)):
    db_resource = db.query(Resource).filter(Resource.id == id).first()
    if not db_resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    update_data = resource.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_resource, field, value)
    
    db.commit()
    db.refresh(db_resource)
    return db_resource

@router.delete("/{id}")
def delete_resource(id: int, db: Session = Depends(get_db)):
    db_resource = db.query(Resource).filter(Resource.id == id).first()
    if not db_resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    db.delete(db_resource)
    db.commit()
    return {"message": "Resource deleted successfully"}

@router.get("/stats/count")
def get_resource_count(db: Session = Depends(get_db)):
    return {"count": db.query(Resource).count()}