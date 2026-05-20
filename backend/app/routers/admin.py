from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import json
from datetime import datetime, timezone
from jose import JWTError, jwt
import os
from app.database import get_db
from app.models.project import Project
from app.models.user import User
from app.schemas.admin import AdminPendingProject, AdminStats, AdminProjectDocument, AdminProjectCountry, AdminProjectOwner, AdminApproveRequest, AdminRejectRequest

router = APIRouter()

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "super-secret-key-change-in-production")
ALGORITHM = "HS256"

def get_admin_user(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    token = parts[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied: Admin only")
    return user

@router.get("/projects/pending", response_model=List[AdminPendingProject])
def get_pending_projects(db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    projects = db.query(Project).filter(Project.status == "pending").order_by(Project.submitted_at.desc()).all()
    result = []
    for p in projects:
        documents = []
        if p.uploaded_documents:
            try:
                docs = json.loads(p.uploaded_documents)
                if isinstance(docs, list):
                    documents = [
                        AdminProjectDocument(
                            file_url=doc.get("path", ""),
                            original_filename=doc.get("original_name", "file")
                        ) for doc in docs
                    ]
            except (json.JSONDecodeError, TypeError):
                pass
        result.append(AdminPendingProject(
            id=p.id,
            title=p.title,
            description=p.description,
            sector=p.sector,
            ai_technology=p.technology,
            website=p.website,
            status=p.status,
            rejection_reason=p.rejection_reason,
            submitted_at=p.submitted_at or p.created_at,
            country=AdminProjectCountry(name=p.country.country) if p.country else None,
            owner=AdminProjectOwner(
                organization_name=p.owner.organization_name if p.owner else None,
                email=p.owner.email if p.owner else None
            ) if p.owner else None,
            documents=documents,
        ))
    return result

@router.get("/stats", response_model=AdminStats)
def get_stats(db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    counts = db.query(Project.status, func.count(Project.id)).group_by(Project.status).all()
    stats = {"pending": 0, "approved": 0, "rejected": 0}
    for status, count in counts:
        if status in stats:
            stats[status] = count
    return AdminStats(**stats)

@router.put("/projects/{project_id}/approve")
def approve_project(project_id: int, body: AdminApproveRequest, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project.status = "approved"
    project.moderated_by = admin.id
    project.moderated_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Project approved successfully"}

@router.put("/projects/{project_id}/reject")
def reject_project(project_id: int, body: AdminRejectRequest, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    if not body.reason or not body.reason.strip():
        raise HTTPException(status_code=400, detail="Rejection reason is required")
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project.status = "rejected"
    project.rejection_reason = body.reason.strip()
    project.moderated_by = admin.id
    project.moderated_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Project rejected"}
