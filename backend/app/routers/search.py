import re
import time
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.project import Project
from app.models.stakeholder import Stakeholder
from app.models.resource import Resource
from app.models.country import Country

router = APIRouter()


@router.get("/filters")
def get_search_filters(db: Session = Depends(get_db)):
    countries = [r[0] for r in db.query(Country.country).order_by(Country.country).all()]
    sectors = [r[0] for r in db.query(Project.sector).distinct().filter(Project.sector != "").order_by(Project.sector).all()]
    technologies = [r[0] for r in db.query(Project.technology).distinct().filter(Project.technology != "").order_by(Project.technology).all()]
    stakeholder_types = [r[0] for r in db.query(Stakeholder.type).distinct().filter(Stakeholder.type != "").order_by(Stakeholder.type).all()]
    resource_types = [r[0] for r in db.query(Resource.type).distinct().filter(Resource.type != "").order_by(Resource.type).all()]
    return {
        "countries": countries,
        "sectors": sectors,
        "technologies": technologies,
        "stakeholder_types": stakeholder_types,
        "resource_types": resource_types,
    }


def parse_query(q: str):
    parsed = {"keywords": q, "country": None, "sector": None, "technology": None, "entity": None, "date_from": None, "date_to": None}
    lower = q.lower()

    entity_map = {"project": "project", "projects": "project", "stakeholder": "stakeholder", "stakeholders": "stakeholder", "resource": "resource", "resources": "resource"}
    for word, ent in entity_map.items():
        if word in lower:
            parsed["entity"] = ent

    countries = db_countries = []
    try:
        from app.database import SessionLocal
        db = SessionLocal()
        countries = [r[0].lower() for r in db.query(Country.country).all()]
        db.close()
    except Exception:
        pass

    for c in countries:
        if c in lower:
            parsed["country"] = c.title()
            break

    sector_keywords = {
        "health": "Health", "healthcare": "Health", "medical": "Health",
        "education": "EduTech", "edutech": "EduTech",
        "finance": "Finance", "fintech": "Finance", "banking": "Finance",
        "agriculture": "Agriculture", "agri": "Agriculture",
        "transport": "Transportation", "transportation": "Transportation",
        "energy": "Energy", "renewable": "Energy",
        "security": "Security", "cyber": "Security",
        "environment": "Environment", "climate": "Environment",
    }
    for kw, sector in sector_keywords.items():
        if kw in lower:
            parsed["sector"] = sector
            break

    tech_keywords = {
        "machine learning": "Machine Learning", "ml": "Machine Learning",
        "deep learning": "Deep Learning", "dl": "Deep Learning",
        "nlp": "NLP", "natural language": "NLP",
        "computer vision": "Computer Vision", "vision": "Computer Vision",
        "robotics": "Robotics", "robot": "Robotics",
        "speech": "Speech Recognition", "voice": "Speech Recognition",
    }
    for kw, tech in tech_keywords.items():
        if kw in lower:
            parsed["technology"] = tech
            break

    return parsed


@router.get("/suggest")
def search_suggest(
    q: str = Query("", min_length=1),
    limit: int = Query(5, le=10),
    db: Session = Depends(get_db),
):
    if not q.strip():
        return {"results": [], "total": 0}

    search = f"%{q}%"
    q_lower = q.lower()
    results = []

    projects = (
        db.query(Project, Country.country)
        .join(Country, Country.id == Project.country_id, isouter=True)
        .filter(~Project.status.in_(["pending", "rejected"]))
        .filter(
            Project.title.ilike(search)
            | Project.description.ilike(search)
            | Project.sector.ilike(search)
            | Project.technology.ilike(search)
            | Project.organization.ilike(search)
        )
        .limit(limit * 2)
        .all()
    )
    for proj, cname in projects:
        txt = q_lower
        t, d, s, tech, org = (
            proj.title.lower(),
            (proj.description or "").lower(),
            proj.sector.lower(),
            proj.technology.lower(),
            proj.organization.lower(),
        )
        score = 0
        if txt in t: score += 10
        if txt in s: score += 6
        if txt in tech: score += 4
        if txt in org: score += 5
        if txt in d: score += 2
        results.append({
            "id": proj.id,
            "title": proj.title,
            "subtitle": cname or "",
            "tag": proj.sector or "",
            "description": (proj.description or "")[:120],
            "entity_type": "project",
            "score": score,
        })

    stakeholders = (
        db.query(Stakeholder)
        .filter(
            Stakeholder.name.ilike(search)
            | Stakeholder.description.ilike(search)
            | Stakeholder.type.ilike(search)
            | Stakeholder.country.ilike(search)
        )
        .limit(limit * 2)
        .all()
    )
    for s in stakeholders:
        txt = q_lower
        n, d, typ, c = (
            s.name.lower(),
            (s.description or "").lower(),
            s.type.lower(),
            (s.country or "").lower(),
        )
        score = 0
        if txt in n: score += 10
        if txt in typ: score += 5
        if txt in c: score += 4
        if txt in d: score += 2
        results.append({
            "id": s.id,
            "title": s.name,
            "subtitle": s.country or "",
            "tag": s.type or "",
            "description": (s.description or "")[:120],
            "entity_type": "stakeholder",
            "score": score,
        })

    resources = (
        db.query(Resource)
        .filter(
            Resource.title.ilike(search)
            | Resource.description.ilike(search)
            | Resource.type.ilike(search)
            | Resource.category.ilike(search)
        )
        .limit(limit * 2)
        .all()
    )
    for r in resources:
        txt = q_lower
        t, d, typ, cat = (
            r.title.lower(),
            (r.description or "").lower(),
            r.type.lower(),
            (r.category or "").lower(),
        )
        score = 0
        if txt in t: score += 10
        if txt in typ: score += 5
        if txt in cat: score += 4
        if txt in d: score += 2
        results.append({
            "id": r.id,
            "title": r.title,
            "subtitle": r.type or "",
            "tag": r.category or "",
            "description": (r.description or "")[:120],
            "entity_type": "resource",
            "score": score,
        })

    results.sort(key=lambda r: r["score"], reverse=True)
    return {"results": results[: limit * 3], "total": len(results)}


@router.get("/ai-search")
def ai_search(
    q: str = Query(""),
    entity: str = Query(None),
    country: str = Query(None),
    sector: str = Query(None),
    technology: str = Query(None),
    limit: int = Query(20),
    db: Session = Depends(get_db),
):
    start = time.time()
    parsed = parse_query(q)

    project_results = []
    stakeholder_results = []
    resource_results = []

    search_term = f"%{q}%"

    if entity is None or entity == "project":
        pq = db.query(
            Project.id, Project.title, Project.description, Project.sector,
            Project.technology, Project.status, Project.sdg_alignment,
            Project.start_date, Country.country.label("country_name")
        ).join(Country, Country.id == Project.country_id, isouter=True).filter(~Project.status.in_(["pending", "rejected"]))

        if q:
            pq = pq.filter(
                Project.title.ilike(search_term) |
                Project.description.ilike(search_term) |
                Project.organization.ilike(search_term) |
                Project.sector.ilike(search_term) |
                Project.technology.ilike(search_term)
            )
        if country:
            pq = pq.filter(Country.country.ilike(f"%{country}%"))
        if sector:
            pq = pq.filter(Project.sector.ilike(f"%{sector}%"))

        for row in pq.limit(limit).all():
            project_results.append({
                "id": row.id,
                "title": row.title,
                "description": row.description or "",
                "sector": row.sector or "",
                "ai_technology": row.technology or "",
                "country": row.country_name or "",
                "status": row.status or "",
                "sdg_alignment": row.sdg_alignment or "",
                "start_date": str(row.start_date) if row.start_date else None,
                "entity_type": "project",
                "organization": "",
            })

    if entity is None or entity == "stakeholder":
        sq = db.query(Stakeholder)
        if q:
            sq = sq.filter(
                Stakeholder.name.ilike(search_term) |
                Stakeholder.description.ilike(search_term) |
                Stakeholder.type.ilike(search_term) |
                Stakeholder.country.ilike(search_term)
            )
        if country:
            sq = sq.filter(Stakeholder.country.ilike(f"%{country}%"))

        for row in sq.limit(limit).all():
            stakeholder_results.append({
                "id": row.id,
                "title": row.name,
                "name": row.name,
                "description": row.description or "",
                "type": row.type or "",
                "country": row.country or "",
                "entity_type": "stakeholder",
            })

    if entity is None or entity == "resource":
        rq = db.query(Resource)
        if q:
            rq = rq.filter(
                Resource.title.ilike(search_term) |
                Resource.description.ilike(search_term) |
                Resource.type.ilike(search_term) |
                Resource.category.ilike(search_term)
            )

        for row in rq.limit(limit).all():
            resource_results.append({
                "id": row.id,
                "title": row.title,
                "description": row.description or "",
                "type": row.type or "",
                "category": row.category or "",
                "language": row.language or "",
                "entity_type": "resource",
            })

    total = len(project_results) + len(stakeholder_results) + len(resource_results)
    elapsed = int((time.time() - start) * 1000)

    return {
        "projects": project_results,
        "stakeholders": stakeholder_results,
        "resources": resource_results,
        "total": total,
        "parsed": parsed,
        "time_ms": elapsed,
    }
