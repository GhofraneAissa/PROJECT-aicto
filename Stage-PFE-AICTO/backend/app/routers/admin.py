from fastapi import APIRouter, Depends, HTTPException, Header, Body
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
from app.models.stakeholder import Stakeholder
from app.schemas.admin import AdminPendingProject, AdminStats, AdminProjectDocument, AdminProjectCountry, AdminProjectOwner, AdminPendingOrganization, AdminOrgStats
from app.services.email_service import send_rejection_email, send_org_rejection_email

router = APIRouter()

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "")
if not SECRET_KEY or SECRET_KEY in ("super-secret-key-change-in-production", "change-this-to-a-secure-random-string"):
    import logging
    logging.warning("[SECURITY] JWT_SECRET_KEY is not set or is using a default value! Set it in .env for production.")
    SECRET_KEY = SECRET_KEY or "insecure-dev-key-change-me"
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

@router.get("/orgs/stats", response_model=AdminOrgStats)
def get_org_stats(db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    total = db.query(User).filter(User.role == "organization").count()
    approved = db.query(User).filter(User.role == "organization", User.is_approved == True).count()
    rejected = db.query(User).filter(User.role == "organization", User.rejection_reason.isnot(None)).count()
    pending = total - approved - rejected
    return AdminOrgStats(pending_approval=pending, approved=approved, rejected=rejected)

def _serialize_org(o: User) -> AdminPendingOrganization:
    return AdminPendingOrganization(
        id=o.id,
        organization_name=o.organization_name,
        organization_type=o.organization_type,
        email=o.email,
        phone=o.phone,
        website=o.website,
        country=o.country,
        city=o.city,
        address=o.address,
        sector=o.sector,
        description=o.description,
        logo=o.logo,
        role=o.role,
        is_active=o.is_active,
        is_approved=o.is_approved,
        rejection_reason=o.rejection_reason,
        created_at=o.created_at,
        updated_at=o.updated_at,
        last_login=o.last_login,
    )

@router.get("/orgs/pending", response_model=List[AdminPendingOrganization])
def get_pending_organizations(page: int = 1, page_size: int = 20, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    offset = (page - 1) * page_size
    orgs = (
        db.query(User)
        .filter(User.role == "organization", User.is_approved == False, User.rejection_reason.is_(None))
        .order_by(User.created_at.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )
    return [_serialize_org(o) for o in orgs]

@router.get("/orgs/rejected", response_model=List[AdminPendingOrganization])
def get_rejected_organizations(page: int = 1, page_size: int = 20, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    offset = (page - 1) * page_size
    orgs = (
        db.query(User)
        .filter(User.role == "organization", User.rejection_reason.isnot(None))
        .order_by(User.updated_at.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )
    return [_serialize_org(o) for o in orgs]

@router.get("/orgs/approved", response_model=List[AdminPendingOrganization])
def get_approved_organizations(page: int = 1, page_size: int = 20, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    offset = (page - 1) * page_size
    orgs = (
        db.query(User)
        .filter(User.role == "organization", User.is_approved == True)
        .order_by(User.updated_at.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )
    return [_serialize_org(o) for o in orgs]

@router.put("/orgs/{user_id}/approve")
def approve_organization(user_id: int, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    org = db.query(User).filter(User.id == user_id, User.role == "organization").first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    was_already_approved = org.is_approved
    org.is_approved = True
    org.rejection_reason = None

    if not was_already_approved and org.is_active:
        existing = db.query(Stakeholder).filter(
            (Stakeholder.name == org.organization_name) | (Stakeholder.contact_email == org.email)
        ).first()
        if existing:
            org.stakeholder_id = existing.id
        else:
            stakeholder = Stakeholder(
                name=org.organization_name,
                type=org.organization_type,
                category=org.sector,
                country=org.country,
                website=org.website,
                description=org.description,
                contact_email=org.email,
            )
            db.add(stakeholder)
            db.flush()
            org.stakeholder_id = stakeholder.id

    db.commit()
    return {"message": "Organization approved successfully"}

@router.put("/orgs/{user_id}/reject")
def reject_organization(user_id: int, reason: str = Body("", embed=True), db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    if not reason or not reason.strip():
        raise HTTPException(status_code=400, detail="Rejection reason is required")
    org = db.query(User).filter(User.id == user_id, User.role == "organization").first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    org.is_approved = False
    org.rejection_reason = reason.strip()
    db.commit()

    if org.email:
        send_org_rejection_email(
            recipient_email=org.email,
            organization_name=org.organization_name or "User",
            reason=reason.strip()
        )

    return {"message": "Organization rejected"}

@router.put("/projects/{project_id}/approve")
def approve_project(project_id: int, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project.status = "approved"
    project.moderated_by = admin.id
    project.moderated_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Project approved successfully"}

@router.put("/projects/{project_id}/reject")
def reject_project(project_id: int, reason: str = Body("", embed=True), db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    if not reason or not reason.strip():
        raise HTTPException(status_code=400, detail="Rejection reason is required")
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project.status = "rejected"
    project.rejection_reason = reason.strip()
    project.moderated_by = admin.id
    project.moderated_at = datetime.now(timezone.utc)
    db.commit()

    if project.owner and project.owner.email:
        send_rejection_email(
            recipient_email=project.owner.email,
            organization_name=project.owner.organization_name or "User",
            project_title=project.title,
            reason=reason.strip()
        )

    return {"message": "Project rejected"}
