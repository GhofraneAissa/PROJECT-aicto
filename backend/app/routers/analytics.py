from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from app.database import get_db
from app.models.stakeholder import Stakeholder
from app.models.project import Project
from app.models.resource import Resource
from app.models.country import Country
from collections import Counter

router = APIRouter()

@router.get("/overview")
def get_overview(db: Session = Depends(get_db)):
    total_projects = db.query(Project).filter(~Project.status.in_(["pending", "rejected"])).count()
    ongoing = db.query(Project).filter(~Project.status.in_(["pending", "rejected"])).count()
    countries_active = db.query(Country).count()
    return {
        "total_projects": total_projects,
        "total_stakeholders": db.query(Stakeholder).count(),
        "total_countries_active": countries_active,
        "ongoing_projects_count": ongoing,
    }

@router.get("/projects-by-sector")
def get_projects_by_sector(db: Session = Depends(get_db)):
    results = db.query(Project.sector, func.count(Project.id)).filter(~Project.status.in_(["pending", "rejected"])).group_by(Project.sector).all()
    return [{"sector": r[0], "count": r[1]} for r in results]

@router.get("/ai-technologies")
@router.get("/projects-by-technology")
def get_ai_technologies(db: Session = Depends(get_db)):
    results = db.query(Project.technology, func.count(Project.id)).filter(~Project.status.in_(["pending", "rejected"]), Project.technology != "").group_by(Project.technology).order_by(func.count(Project.id).desc()).all()
    return [{"technology": r[0], "count": r[1]} for r in results]

@router.get("/projects-by-country")
def get_projects_by_country(db: Session = Depends(get_db)):
    results = db.query(Country.country, func.count(Project.id)).join(Project, Project.country_id == Country.id).filter(~Project.status.in_(["pending", "rejected"])).group_by(Country.country).order_by(func.count(Project.id).desc()).all()
    return [{"country": r[0], "projects": r[1]} for r in results]

@router.get("/projects-timeline")
def get_projects_timeline(db: Session = Depends(get_db)):
    results = db.query(func.coalesce(Project.year_of_implementation, 0), func.count(Project.id)).filter(~Project.status.in_(["pending", "rejected"])).group_by(Project.year_of_implementation).order_by(Project.year_of_implementation).all()
    return [{"year": str(r[0]), "projects": r[1]} for r in results if r[0] > 0]

@router.get("/stakeholders-by-type")
def get_stakeholders_by_type(db: Session = Depends(get_db)):
    results = db.query(Stakeholder.type, func.count(Stakeholder.id)).group_by(Stakeholder.type).all()
    return [{"type": r[0], "count": r[1]} for r in results]

@router.get("/stakeholders-by-country")
def get_stakeholders_by_country(db: Session = Depends(get_db)):
    results = db.query(Stakeholder.country, func.count(Stakeholder.id)).group_by(Stakeholder.country).order_by(func.count(Stakeholder.id).desc()).all()
    return [{"country": r[0], "count": r[1]} for r in results]

@router.get("/resources-by-type")
def get_resources_by_type(db: Session = Depends(get_db)):
    results = db.query(Resource.type, func.count(Resource.id)).group_by(Resource.type).all()
    return [{"type": r[0], "count": r[1]} for r in results]

@router.get("/map-data")
def get_map_data(db: Session = Depends(get_db)):
    countries = db.query(Country).all()
    result = []
    for c in countries:
        projects = db.query(Project).filter(Project.country_id == c.id, ~Project.status.in_(["pending", "rejected"])).all()
        project_count = len(projects)
        stakeholder_count = db.query(Stakeholder).filter(Stakeholder.country == c.country).count()

        ongoing = sum(1 for p in projects if True)
        completed = 0

        sectors = Counter(p.sector for p in projects if p.sector)
        technologies = Counter(p.technology for p in projects if p.technology)
        sector_distribution = [{"sector": s, "count": cnt} for s, cnt in sectors.most_common()]
        top_sector = sectors.most_common(1)[0][0] if sectors else None
        top_tech = technologies.most_common(1)[0][0] if technologies else None

        result.append({
            "country": c.country,
            "project_count": project_count,
            "stakeholder_count": stakeholder_count,
            "ongoing_projects": ongoing,
            "completed_projects": completed,
            "sector_distribution": sector_distribution,
            "top_sector": top_sector,
            "top_ai_technology": top_tech,
        })
    return result