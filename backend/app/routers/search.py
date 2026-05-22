import time
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.project import Project
from app.models.stakeholder import Stakeholder
from app.models.resource import Resource
from app.models.country import Country
from app.services.search_service import suggest, hybrid_search, rebuild_fts_index, parse_query, expand_synonyms
from app.services.embedding_service import rebuild_all_embeddings

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


@router.get("/suggest")
def search_suggest(
    q: str = Query("", min_length=1),
    limit: int = Query(5, le=10),
    db: Session = Depends(get_db),
):
    if not q.strip():
        return {"results": [], "total": 0}
    results = suggest(db=db, q=q, limit=limit)
    return {"results": results, "total": len(results)}


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

    hybrid_results = hybrid_search(
        db=db,
        query=q,
        entity=entity or parsed.get("entity"),
        country=country or parsed.get("country"),
        sector=sector or parsed.get("sector"),
        technology=technology or parsed.get("technology"),
        limit=limit,
    )

    project_results = []
    stakeholder_results = []
    resource_results = []

    for item in hybrid_results:
        ent = item.get("_entity_type", "project")
        if ent == "project":
            project_results.append({
                "id": item["id"],
                "title": item.get("title", ""),
                "description": item.get("description") or "",
                "sector": item.get("sector") or "",
                "ai_technology": item.get("technology") or "",
                "country": item.get("country_name") or "",
                "status": item.get("status") or "",
                "sdg_alignment": item.get("sdg_alignment") or "",
                "start_date": str(item["start_date"]) if item.get("start_date") else None,
                "entity_type": "project",
                "organization": item.get("organization") or "",
                "_score": item.get("_score", 0),
                "_source": item.get("_source", "fts"),
            })
        elif ent == "stakeholder":
            stakeholder_results.append({
                "id": item["id"],
                "title": item.get("title") or item.get("name", ""),
                "name": item.get("title") or item.get("name", ""),
                "description": item.get("description") or "",
                "type": item.get("type") or "",
                "country": item.get("country") or "",
                "entity_type": "stakeholder",
                "_score": item.get("_score", 0),
                "_source": item.get("_source", "fts"),
            })
        elif ent == "resource":
            resource_results.append({
                "id": item["id"],
                "title": item.get("title", ""),
                "description": item.get("description") or "",
                "type": item.get("type") or "",
                "category": item.get("category") or "",
                "language": item.get("language") or "",
                "entity_type": "resource",
                "_score": item.get("_score", 0),
                "_source": item.get("_source", "fts"),
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


@router.post("/rebuild-index")
def rebuild_index(db: Session = Depends(get_db)):
    rebuild_fts_index(db)
    rebuild_all_embeddings(db)
    return {"message": "Full-text search indexes and embeddings rebuilt"}
