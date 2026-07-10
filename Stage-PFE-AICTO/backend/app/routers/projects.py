from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, BackgroundTasks
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import os
from fastapi.responses import FileResponse
from app.database import get_db
from app.models.project import Project, ProjectStakeholderAssociation
from app.models.country import Country
from app.models.stakeholder import Stakeholder
from app.models.user import User
from app.schemas.project import (
    ProjectCreate, ProjectUpdate, ProjectResponse, ProjectDetailResponse,
    ProjectSubmit, StakeholderAssociationOut, ProjectPaginatedResponse,
    ExtractRequest, ExtractResponse, ExtractField
)
from app.services.url_extractor import fetch_url_content
from app.services.ai_extractor import extract_project_info
from app.core.auth import get_current_user
import json

router = APIRouter()

@router.get("/", response_model=ProjectPaginatedResponse)
def get_projects(
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=10000),
    search: str = None,
    sector: str = None,
    technology: str = None,
    country: str = None,
    country_id: int = None,
    sdg: str = None,
    db: Session = Depends(get_db)
):
    query = db.query(Project).options(
        joinedload(Project.stakeholder_associations).joinedload(ProjectStakeholderAssociation.stakeholder),
        joinedload(Project.sdg)
    )
    
    query = query.filter(~Project.status.in_(["pending", "rejected"]))
    
    if search:
        q = f"%{search}%"
        query = query.filter(
            (Project.title.ilike(q)) | 
            (Project.description.ilike(q))
        )
    if sector and sector != "All":
        query = query.filter(Project.sector == sector)
    if technology and technology != "All":
        query = query.filter(Project.technology == technology)
    if country_id and country_id != "All":
        query = query.filter(Project.country_id == country_id)
    if country:
        query = query.join(Country).filter(Country.country.ilike(country))
    if sdg:
        try:
            sdg_id = int(sdg)
            query = query.filter(Project.sdg_id == sdg_id)
        except ValueError:
            pass
    
    total = query.count()
    total_pages = max(1, (total + page_size - 1) // page_size)
    projects = query.offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for p in projects:
        stakeholders = []
        for assoc in p.stakeholder_associations:
            stakeholders.append(StakeholderAssociationOut(
                stakeholder_id=assoc.stakeholder_id,
                role=assoc.role,
                stakeholder=assoc.stakeholder
            ))
        p_dict = {
            "id": p.id,
            "title": p.title,
            "organization": p.organization,
            "country_id": p.country_id,
            "user_id": p.user_id,
            "sector": p.sector,
            "technology": p.technology,
            "sdg_id": p.sdg_id,
            "sdg": {"id": p.sdg.id, "goal_number": p.sdg.goal_number, "title": p.sdg.title, "color": p.sdg.color} if p.sdg else None,
            "description": p.description,
            "website": p.website,
            "status": p.status,
            "year_of_implementation": p.year_of_implementation,
            "start_date": p.start_date,
            "end_date": p.end_date,
            "uploaded_documents": p.uploaded_documents,
            "created_at": p.created_at,
            "updated_at": p.updated_at,
            "stakeholders": stakeholders,
        }
        items.append(p_dict)
    return ProjectPaginatedResponse(items=items, total=total, page=page, page_size=page_size, total_pages=total_pages)

@router.post("/submit", response_model=ProjectResponse)
def submit_project(project_data: ProjectSubmit, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user_org = ""
    from app.models.user import User
    user = db.query(User).filter(User.id == project_data.user_id).first()
    if user:
        user_org = user.organization_name or ""

    db_project = Project(
        title=project_data.title,
        organization=user_org,
        country_id=project_data.country_id,
        user_id=project_data.user_id,
        sector=project_data.sector,
        technology=project_data.ai_technology,
        sdg_id=project_data.sdg_id,
        description=project_data.description,
        status=project_data.status,
        start_date=project_data.start_date,
        end_date=project_data.end_date,
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)

    # Auto-link user's stakeholder as Owner
    if user and user.stakeholder_id:
        existing_link = db.query(ProjectStakeholderAssociation).filter(
            ProjectStakeholderAssociation.project_id == db_project.id,
            ProjectStakeholderAssociation.stakeholder_id == user.stakeholder_id
        ).first()
        if not existing_link:
            assoc = ProjectStakeholderAssociation(
                project_id=db_project.id,
                stakeholder_id=user.stakeholder_id,
                role="Owner"
            )
            db.add(assoc)

    # Create notifications for all admin users
    from app.models.notification import Notification
    admin_users = db.query(User).filter(User.role == "admin").all()
    org_name = user_org or "Unknown Organization"
    for admin_user in admin_users:
        notification = Notification(
            user_id=admin_user.id,
            type="project_submitted",
            message=f"New project submitted: \"{project_data.title}\" by {org_name}",
            related_project_id=db_project.id,
            is_read=0,
        )
        db.add(notification)
    db.commit()

    from app.services.rag_service import trigger_rag_reindex
    trigger_rag_reindex(background_tasks)

    return db_project


@router.post("/extract-from-url", response_model=ExtractResponse)
def extract_from_url(body: ExtractRequest, db: Session = Depends(get_db)):
    url = body.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    content = fetch_url_content(url)
    if not content:
        return ExtractResponse(extracted=False, error="Could not fetch content from URL. Make sure the URL is publicly accessible.")

    result = extract_project_info(content, user_country=body.user_country or "")
    if not result.get("extracted"):
        return ExtractResponse(extracted=False, error=result.get("error", "AI extraction failed"))

    fields = {}
    for key, val in result.get("fields", {}).items():
        fields[key] = ExtractField(
            value=val.get("value", "Non détecté"),
            confidence=val.get("confidence", 0.0),
        )

    return ExtractResponse(extracted=True, fields=fields)


UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "project_documents")


@router.get("/stats/count")
def get_project_count(db: Session = Depends(get_db)):
    return {"count": db.query(Project).filter(~Project.status.in_(["pending", "rejected"])).count()}


@router.get("/stats/by-sector")
def get_projects_by_sector(db: Session = Depends(get_db)):
    from sqlalchemy import func
    results = db.query(Project.sector, func.count(Project.id)).filter(~Project.status.in_(["pending", "rejected"])).group_by(Project.sector).all()
    return [{"sector": r[0], "count": r[1]} for r in results]


@router.get("/stats/by-technology")
def get_projects_by_technology(db: Session = Depends(get_db)):
    from sqlalchemy import func
    results = db.query(Project.technology, func.count(Project.id)).filter(~Project.status.in_(["pending", "rejected"])).group_by(Project.technology).all()
    return [{"technology": r[0], "count": r[1]} for r in results]


@router.get("/stats/by-country")
def get_projects_by_country(db: Session = Depends(get_db)):
    from sqlalchemy import func
    results = db.query(
        Country.country,
        Country.region,
        func.count(Project.id)
    ).join(Project, Project.country_id == Country.id).filter(~Project.status.in_(["pending", "rejected"])).group_by(Country.country, Country.region).all()
    return [{"country": r[0], "region": r[1], "count": r[2]} for r in results]


@router.get("/download/{filename}")
def download_project_document(filename: str):
    path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path, filename=filename)


@router.get("/{id}", response_model=ProjectResponse)
def get_project(id: int, db: Session = Depends(get_db)):
    project = db.query(Project).options(
        joinedload(Project.stakeholder_associations).joinedload(ProjectStakeholderAssociation.stakeholder),
        joinedload(Project.sdg)
    ).filter(Project.id == id, ~Project.status.in_(["pending", "rejected"])).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    stakeholders = []
    for assoc in project.stakeholder_associations:
        stakeholders.append(StakeholderAssociationOut(
            stakeholder_id=assoc.stakeholder_id,
            role=assoc.role,
            stakeholder=assoc.stakeholder
        ))
    
    p_dict = {
        "id": project.id,
        "title": project.title,
        "organization": project.organization,
        "country_id": project.country_id,
        "user_id": project.user_id,
        "sector": project.sector,
        "technology": project.technology,
        "sdg_id": project.sdg_id,
        "sdg": {"id": project.sdg.id, "goal_number": project.sdg.goal_number, "title": project.sdg.title, "color": project.sdg.color} if project.sdg else None,
        "description": project.description,
        "website": project.website,
        "status": project.status,
        "year_of_implementation": project.year_of_implementation,
        "start_date": project.start_date,
        "end_date": project.end_date,
        "uploaded_documents": project.uploaded_documents,
        "created_at": project.created_at,
        "updated_at": project.updated_at,
        "stakeholders": stakeholders,
    }
    return p_dict

@router.get("/{id}/details", response_model=ProjectDetailResponse)
def get_project_details(id: int, db: Session = Depends(get_db)):
    project = db.query(Project).options(
        joinedload(Project.stakeholder_associations).joinedload(ProjectStakeholderAssociation.stakeholder)
    ).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    country_name = project.country.country if project.country else "Regional"

    documents = []
    if project.uploaded_documents:
        try:
            docs = json.loads(project.uploaded_documents)
            if isinstance(docs, list):
                documents = docs
        except (json.JSONDecodeError, TypeError):
            pass

    stakeholders = []
    for assoc in project.stakeholder_associations:
        s = assoc.stakeholder
        stakeholders.append({
            "name": s.name if s else "Unknown",
            "type": s.type if s else "",
            "role": assoc.role,
            "country": s.country if s else "",
            "website": s.website if s else "",
            "city": "",
        })

    return ProjectDetailResponse(
        id=project.id,
        title=project.title,
        organization=project.organization,
        country_id=project.country_id,
        country_name=country_name,
        user_id=project.user_id,
        sector=project.sector,
        technology=project.technology,
        sdg_id=project.sdg_id,
        sdg=project.sdg,
        description=project.description,
        website=project.website,
        status=project.status,
        year_of_implementation=project.year_of_implementation,
        start_date=project.start_date,
        end_date=project.end_date,
        documents=documents,
        stakeholders=stakeholders,
        created_at=project.created_at,
        updated_at=project.updated_at,
    )

@router.post("/{project_id}/stakeholders/{stakeholder_id}")
def link_stakeholder(project_id: int, stakeholder_id: int, role: str = Query("partner"), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    stakeholder = db.query(Stakeholder).filter(Stakeholder.id == stakeholder_id).first()
    if not stakeholder:
        raise HTTPException(status_code=404, detail="Stakeholder not found")
    
    existing = db.query(ProjectStakeholderAssociation).filter(
        ProjectStakeholderAssociation.project_id == project_id,
        ProjectStakeholderAssociation.stakeholder_id == stakeholder_id
    ).first()
    if existing:
        existing.role = role
    else:
        assoc = ProjectStakeholderAssociation(project_id=project_id, stakeholder_id=stakeholder_id, role=role)
        db.add(assoc)
    
    db.commit()
    return {"message": "Stakeholder linked successfully"}

@router.post("/{project_id}/documents")
async def upload_project_documents(project_id: int, files: List[UploadFile] = File(...), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    import uuid
    UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "project_documents")
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    uploaded = []
    allowed_exts = {".pdf", ".doc", ".docx", ".ppt", ".pptx", ".txt", ".png", ".jpg", ".jpeg", ".gif", ".zip"}
    for f in files:
        ext = os.path.splitext(f.filename)[1].lower()
        if ext not in allowed_exts:
            continue
        unique_name = f"{uuid.uuid4().hex}{ext}"
        path = os.path.join(UPLOAD_DIR, unique_name)
        content = await f.read()
        with open(path, "wb") as out:
            out.write(content)
        uploaded.append({
            "original_name": f.filename,
            "stored_name": unique_name,
            "path": f"/api/projects/download/{unique_name}"
        })
    
    existing_docs = []
    if project.uploaded_documents:
        try:
            existing_docs = json.loads(project.uploaded_documents)
        except:
            pass
    existing_docs.extend(uploaded)
    project.uploaded_documents = json.dumps(existing_docs)
    db.commit()
    
    return {"files": uploaded}

@router.post("/", response_model=ProjectResponse)
def create_project(project: ProjectCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    db_project = Project(**project.model_dump())
    db.add(db_project)
    db.flush()

    user = db.query(User).filter(User.id == project.user_id).first()
    if user and user.stakeholder_id:
        existing_link = db.query(ProjectStakeholderAssociation).filter(
            ProjectStakeholderAssociation.project_id == db_project.id,
            ProjectStakeholderAssociation.stakeholder_id == user.stakeholder_id
        ).first()
        if not existing_link:
            assoc = ProjectStakeholderAssociation(
                project_id=db_project.id,
                stakeholder_id=user.stakeholder_id,
                role="Owner"
            )
            db.add(assoc)

    db.commit()
    db.refresh(db_project)
    from app.services.rag_service import trigger_rag_reindex
    trigger_rag_reindex(background_tasks)
    return db_project

@router.put("/{id}", response_model=ProjectResponse)
def update_project(id: int, project: ProjectUpdate, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_project = db.query(Project).filter(Project.id == id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    if db_project.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to modify this project")
    
    update_data = project.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_project, field, value)
    
    db.commit()
    db.refresh(db_project)
    from app.services.rag_service import trigger_rag_reindex
    trigger_rag_reindex(background_tasks)
    return db_project

@router.delete("/{id}")
def delete_project(id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_project = db.query(Project).filter(Project.id == id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    if db_project.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this project")
    
    db.delete(db_project)
    db.commit()
    from app.services.rag_service import trigger_rag_reindex
    trigger_rag_reindex(background_tasks)
    return {"message": "Project deleted successfully"}


