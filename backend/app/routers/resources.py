import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, Header, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from jose import JWTError, jwt
from app.database import get_db
from app.models.resource import Resource
from app.models.user import User
from app.schemas.resource import ResourceCreate, ResourceUpdate, ResourceResponse
from app.routers.users import SECRET_KEY, ALGORITHM

RESOURCE_UPLOAD_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "uploads", "resources"
)

router = APIRouter()


def get_current_user(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not token:
            raise HTTPException(status_code=401, detail="Invalid authorization header")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

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
def create_resource(resource: ResourceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_resource = Resource(**resource.model_dump())
    db.add(db_resource)
    db.commit()
    db.refresh(db_resource)
    return db_resource

@router.post("/upload", response_model=ResourceResponse)
async def upload_resource(
    title: str = Form(...),
    type: str = Form(...),
    category: str = Form(...),
    language: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    os.makedirs(RESOURCE_UPLOAD_DIR, exist_ok=True)
    ext = os.path.splitext(file.filename)[1].lower()
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(RESOURCE_UPLOAD_DIR, unique_name)
    content = await file.read()
    with open(file_path, "wb") as out:
        out.write(content)
    file_size_bytes = len(content)
    if file_size_bytes < 1024:
        size_str = f"{file_size_bytes} B"
    elif file_size_bytes < 1024 * 1024:
        size_str = f"{file_size_bytes / 1024:.1f} KB"
    else:
        size_str = f"{file_size_bytes / (1024 * 1024):.1f} MB"
    db_resource = Resource(
        title=title,
        type=type,
        category=category,
        language=language,
        description=description,
        file_size=size_str,
        file_url=f"/api/resources/view/{unique_name}",
        downloads=0
    )
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

@router.get("/view/{filename}")
def view_resource(filename: str):
    path = os.path.join(RESOURCE_UPLOAD_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path, filename=filename, content_disposition_type="inline")

@router.get("/download/{filename}")
def download_resource(filename: str):
    path = os.path.join(RESOURCE_UPLOAD_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path, filename=filename, media_type="application/octet-stream")

@router.get("/stats/count")
def get_resource_count(db: Session = Depends(get_db)):
    return {"count": db.query(Resource).count()}