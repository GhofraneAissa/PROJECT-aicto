import re
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import func, case, extract
from jose import JWTError, jwt
import os
from app.database import get_db
from app.models.stakeholder import Stakeholder
from app.models.project import Project
from app.models.resource import Resource
from app.models.country import Country
from app.models.user import User
from app.models.sdg import SDG
from app.models.chat import ChatSession, ChatMessage
from app.models.notification import Notification
from collections import Counter
from datetime import datetime, timedelta, timezone

router = APIRouter()

# ──────── Helpers ────────

ACTIVE_STATUSES = ["active", "approved", "completed", "in progress"]
DECIDED_STATUSES = ["approved", "rejected"]


class AnalyticsFilters:
    """Dependency that extracts optional filter query params and applies them to Project queries."""
    def __init__(
        self,
        sector: Optional[str] = Query(None, description="Comma-separated sectors"),
        country: Optional[str] = Query(None, description="Comma-separated country names"),
        status: Optional[str] = Query(None, description="Comma-separated statuses"),
        technology: Optional[str] = Query(None, description="Comma-separated technologies"),
        sdg: Optional[int] = Query(None, description="SDG goal number"),
        region: Optional[str] = Query(None, description="Comma-separated regions"),
    ):
        self.sector = [s.strip() for s in sector.split(",") if s.strip()] if sector else None
        self.country = [c.strip() for c in country.split(",") if c.strip()] if country else None
        self.status = [s.strip().lower() for s in status.split(",") if s.strip()] if status else None
        self.technology = [t.strip() for t in technology.split(",") if t.strip()] if technology else None
        self.sdg = sdg
        self.region = [r.strip() for r in region.split(",") if r.strip()] if region else None

    def apply(self, query, db=None):
        if self.sector:
            query = query.filter(Project.sector.in_(self.sector))
        if self.country:
            query = query.join(Project.country).filter(Country.country.in_(self.country))
        if self.status:
            query = query.filter(func.lower(Project.status).in_(self.status))
        if self.technology:
            query = query.filter(Project.technology.in_(self.technology))
        if self.sdg is not None:
            sdg_record = db.query(SDG).filter(SDG.goal_number == self.sdg).first()
            if sdg_record:
                query = query.filter(Project.sdg_id == sdg_record.id)
        if self.region:
            query = query.join(Project.country).filter(Country.region.in_(self.region))
        return query


def normalize_status(s):
    """Normalize inconsistently-cased status values."""
    if not s:
        return "unknown"
    s = s.strip()
    lower = s.lower()
    if lower in ("active", "approved", "rejected", "pending", "draft", "completed", "in progress"):
        return lower
    return lower


def parse_sdg_numbers(raw):
    """
    Extract SDG goal numbers from any format:
      '10'                    -> [10]
      'SDG2'                  -> [2]
      'SDG 1: Pas de pauvreté' -> [1]
      '2,6,13'                -> [2, 6, 13]
      'SDG4,SDG7'             -> [4, 7]
    """
    if not raw or not raw.strip():
        return []
    results = set()
    parts = re.split(r'[,;]+', raw)
    for part in parts:
        part = part.strip()
        if not part:
            continue
        # Pattern 1: plain digits
        if part.isdigit():
            results.add(int(part))
            continue
        # Pattern 2: SDG<number>  (e.g. SDG2)
        m = re.match(r'^(?:SDG|odd)\s*(\d+)$', part, re.IGNORECASE)
        if m:
            results.add(int(m.group(1)))
            continue
        # Pattern 3: SDG <number>: <title>  (e.g. "SDG 1: Pas de pauvreté")
        m = re.match(r'^(?:SDG|odd)\s*(\d+)\s*:\s*', part, re.IGNORECASE)
        if m:
            results.add(int(m.group(1)))
            continue
        # Pattern 4: just a number after text cleanup
        nums = re.findall(r'\d+', part)
        for n in nums:
            results.add(int(n))
    return sorted(results)


def filter_active(q, model=None):
    """Case-insensitive filter for 'active-ish' statuses."""
    m = model or Project
    return q.filter(func.lower(m.status).in_(ACTIVE_STATUSES))


# ───────────────── Dashboard 1 — Vue d'ensemble ─────────────────

@router.get("/overview")
def get_overview(filters: AnalyticsFilters = Depends(), db: Session = Depends(get_db)):
    base = filters.apply(db.query(Project), db)

    total = base.count()
    all_statuses = base.with_entities(func.lower(Project.status).label("s"), func.count(Project.id)).group_by(func.lower(Project.status)).all()
    status_map = {r[0]: r[1] for r in all_statuses}
    pending = status_map.get("pending", 0)
    approved = status_map.get("approved", 0)
    rejected = status_map.get("rejected", 0)
    draft = status_map.get("draft", 0)
    active_count = sum(v for k, v in status_map.items() if k in ACTIVE_STATUSES)

    now = datetime.utcnow()
    first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    approved_this_month = base.filter(
        func.lower(Project.status) == "approved",
        Project.moderated_at >= first_of_month
    ).count()
    rejected_this_month = base.filter(
        func.lower(Project.status) == "rejected",
        Project.moderated_at >= first_of_month
    ).count()

    moderated = base.filter(
        func.lower(Project.status).in_(["approved", "rejected"]),
        Project.moderated_at.isnot(None),
        Project.submitted_at.isnot(None)
    ).all()
    total_mod_sec = 0
    mod_count = 0
    for p in moderated:
        diff = (p.moderated_at - p.submitted_at).total_seconds()
        if diff >= 0:
            total_mod_sec += diff
            mod_count += 1
    avg_mod_hours = round(total_mod_sec / 3600 / mod_count, 1) if mod_count > 0 else 0
    total_decided = approved + rejected
    approval_rate = round((approved / total_decided * 100) if total_decided > 0 else 0, 1)
    countries_active = base.join(Project.country).with_entities(func.count(Country.id.distinct())).scalar() or 0
    stakeholders_count = db.query(Stakeholder).count()
    total_resources = db.query(Resource).count()
    return {
        "total_projects": total,
        "pending_count": pending,
        "approved_count": approved,
        "rejected_count": rejected,
        "draft_count": draft,
        "active_count": active_count,
        "approved_this_month": approved_this_month,
        "rejected_this_month": rejected_this_month,
        "average_moderation_hours": avg_mod_hours,
        "approval_rate": approval_rate,
        "total_stakeholders": stakeholders_count,
        "total_countries_active": countries_active,
        "total_resources": total_resources,
    }


@router.get("/status-distribution")
def get_status_distribution(filters: AnalyticsFilters = Depends(), db: Session = Depends(get_db)):
    base = filters.apply(db.query(Project), db)
    results = base.with_entities(func.lower(Project.status), func.count(Project.id)).group_by(func.lower(Project.status)).all()
    return [{"status": r[0] or "unknown", "count": r[1]} for r in results]


@router.get("/status-breakdown")
def get_status_breakdown(filters: AnalyticsFilters = Depends(), db: Session = Depends(get_db)):
    """
    Returns two status groupings:
      - approvalPipeline: approved, rejected, in progress
      - activityStatus: active vs completed (based on end_date < today)
        Covers ALL projects: if end_date is in the past -> completed, else active.
        Rejected/pending/draft are counted as active (existant) but not completed.
    """
    today = datetime.utcnow().date()

    all_projects = filters.apply(db.query(Project), db).all()

    approval_pipeline = {"approved": 0, "rejected": 0, "in progress": 0}
    active_count = 0
    completed_count = 0

    for p in all_projects:
        s = p.status.lower().strip() if p.status else "unknown"

        if s in approval_pipeline:
            approval_pipeline[s] += 1

        # Activity logic: end_date in the past = completed, otherwise = active (includes rejected/pending/draft)
        if p.end_date and p.end_date < today:
            completed_count += 1
        else:
            active_count += 1

    return {
        "approvalPipeline": [
            {"status": "approved", "count": approval_pipeline["approved"], "label": "Approuvé", "color": "#10b981"},
            {"status": "rejected", "count": approval_pipeline["rejected"], "label": "Rejeté", "color": "#ef4444"},
            {"status": "in progress", "count": approval_pipeline["in progress"], "label": "En Cours", "color": "#f59e0b"},
        ],
        "activityStatus": [
            {"status": "active", "count": active_count, "label": "Actif", "color": "#2563eb"},
            {"status": "completed", "count": completed_count, "label": "Terminé", "color": "#10b981"},
        ],
    }


@router.get("/projects-by-sector")
def get_projects_by_sector(filters: AnalyticsFilters = Depends(), db: Session = Depends(get_db)):
    base = filters.apply(db.query(Project), db).filter(
        ~func.lower(Project.status).in_(["pending", "rejected"])
    )
    results = base.with_entities(Project.sector, func.count(Project.id)).group_by(Project.sector).all()
    return [{"sector": r[0], "count": r[1]} for r in results]



@router.get("/ai-technologies")
@router.get("/projects-by-technology")
def get_ai_technologies(filters: AnalyticsFilters = Depends(), db: Session = Depends(get_db)):
    base = filters.apply(db.query(Project), db).filter(
        ~func.lower(Project.status).in_(["pending", "rejected"]),
        Project.technology != ""
    )
    results = base.with_entities(Project.technology, func.count(Project.id)).group_by(Project.technology).order_by(func.count(Project.id).desc()).all()
    return [{"technology": r[0], "count": r[1]} for r in results]



@router.get("/projects-by-country")
def get_projects_by_country(filters: AnalyticsFilters = Depends(), db: Session = Depends(get_db)):
    base = filters.apply(db.query(Project), db).filter(
        ~func.lower(Project.status).in_(["pending", "rejected"])
    )
    results = base.join(Project.country).with_entities(Country.country, func.count(Project.id)).group_by(Country.country).order_by(func.count(Project.id).desc()).all()
    return [{"country": r[0], "projects": r[1]} for r in results]


@router.get("/projects-timeline")
def get_projects_timeline(filters: AnalyticsFilters = Depends(), db: Session = Depends(get_db)):
    base = filters.apply(db.query(Project), db).filter(
        ~func.lower(Project.status).in_(["pending", "rejected"])
    )
    results = base.with_entities(
        func.coalesce(Project.year_of_implementation, 0),
        func.count(Project.id)
    ).group_by(Project.year_of_implementation).order_by(Project.year_of_implementation).all()
    return [{"year": str(r[0]), "projects": r[1]} for r in results if r[0] > 0]


@router.get("/submissions-by-month")
def get_submissions_by_month(filters: AnalyticsFilters = Depends(), db: Session = Depends(get_db)):
    base = filters.apply(db.query(Project), db).filter(Project.created_at.isnot(None))
    results = base.with_entities(
        extract("year", Project.created_at).label("year"),
        extract("month", Project.created_at).label("month"),
        func.count(Project.id)
    ).group_by("year", "month").order_by("year", "month").all()
    return [{"year": int(r[0]), "month": int(r[1]), "count": r[2]} for r in results]


@router.get("/moderation-queue")
def get_moderation_queue(db: Session = Depends(get_db)):
    projects = db.query(Project).filter(
        func.lower(Project.status) == "pending"
    ).order_by(Project.submitted_at.asc()).all()
    result = []
    for p in projects:
        country_name = p.country.country if p.country else None
        result.append({
            "id": p.id,
            "title": p.title,
            "organization": p.organization,
            "country": country_name,
            "sector": p.sector,
            "submitted_at": p.submitted_at.isoformat() if p.submitted_at else None,
        })
    return result


@router.get("/approved-rejected-by-month")
def get_approved_rejected_by_month(filters: AnalyticsFilters = Depends(), db: Session = Depends(get_db)):
    base = filters.apply(db.query(Project), db)
    approved = base.with_entities(
        extract("year", Project.moderated_at).label("year"),
        extract("month", Project.moderated_at).label("month"),
        func.count(Project.id)
    ).filter(
        func.lower(Project.status) == "approved",
        Project.moderated_at.isnot(None)
    ).group_by("year", "month").order_by("year", "month").all()
    rejected = base.with_entities(
        extract("year", Project.moderated_at).label("year"),
        extract("month", Project.moderated_at).label("month"),
        func.count(Project.id),
        Project.rejection_reason
    ).filter(
        func.lower(Project.status) == "rejected",
        Project.moderated_at.isnot(None)
    ).group_by("year", "month", Project.rejection_reason).order_by("year", "month").all()
    months_map = {}
    for r in approved:
        key = f"{int(r[0])}-{int(r[1]):02d}"
        if key not in months_map:
            months_map[key] = {"month": key, "approved": 0, "rejected": 0, "top_rejection_reason": None}
        months_map[key]["approved"] = r[2]
    rejection_reasons = {}
    for r in rejected:
        key = f"{int(r[0])}-{int(r[1]):02d}"
        if key not in months_map:
            months_map[key] = {"month": key, "approved": 0, "rejected": 0, "top_rejection_reason": None}
        months_map[key]["rejected"] += r[2]
        if key not in rejection_reasons:
            rejection_reasons[key] = Counter()
        rejection_reasons[key][r[3] or "No reason"] += r[2]
    for key, reasons in rejection_reasons.items():
        months_map[key]["top_rejection_reason"] = reasons.most_common(1)[0][0]
    return sorted(months_map.values(), key=lambda x: x["month"])


# ───────────────── Dashboard 2 — Impact & ODD ─────────────────

@router.get("/sdg-coverage")
def get_sdg_coverage(filters: AnalyticsFilters = Depends(), db: Session = Depends(get_db)):
    base = filters.apply(db.query(Project), db).filter(
        ~func.coalesce(Project.status, '').in_(["pending", "rejected"])
    )
    results = base.join(SDG, Project.sdg_id == SDG.id).with_entities(
        SDG.goal_number,
        SDG.title,
        SDG.color,
        func.count(Project.id).label("count")
    ).group_by(SDG.id, SDG.goal_number, SDG.title, SDG.color
    ).order_by(SDG.goal_number).all()
    return [{"goal_number": r[0], "title": r[1], "color": r[2], "count": r[3]} for r in results]


@router.get("/projects-by-region")
def get_projects_by_region(filters: AnalyticsFilters = Depends(), db: Session = Depends(get_db)):
    base = filters.apply(db.query(Project), db).filter(
        ~func.lower(Project.status).in_(["pending", "rejected"])
    )
    results = base.join(Project.country).filter(
        Country.region.isnot(None)
    ).with_entities(
        Country.region,
        func.count(Project.id)
    ).group_by(Country.region).all()
    return [{"region": r[0], "count": r[1]} for r in results]


@router.get("/region-sdg-dominant")
def get_region_sdg_dominant(filters: AnalyticsFilters = Depends(), db: Session = Depends(get_db)):
    base = filters.apply(db.query(Project), db).filter(
        ~func.coalesce(func.lower(Project.status), '').in_(["pending", "rejected"])
    )
    results = base.join(Project.country).filter(
        Country.region.isnot(None)
    ).join(SDG, Project.sdg_id == SDG.id
    ).with_entities(
        Country.region,
        SDG.goal_number,
        SDG.title,
        SDG.color,
        func.count(Project.id).label("count")
    ).group_by(Country.region, SDG.goal_number, SDG.title, SDG.color).all()

    region_map = {}
    for r in results:
        region = r[0]
        if region not in region_map:
            region_map[region] = []
        region_map[region].append({
            "goal_number": r[1],
            "title": r[2],
            "color": r[3],
            "count": r[4]
        })

    output = []
    for region, sdgs_list in region_map.items():
        total = sum(s["count"] for s in sdgs_list)
        top = max(sdgs_list, key=lambda x: x["count"]) if sdgs_list else None
        output.append({
            "region": region,
            "dominant_sdg": top["goal_number"] if top else None,
            "dominant_sdg_title": top["title"] if top else None,
            "dominant_sdg_color": top["color"] if top else None,
            "project_count": total
        })
    return output


@router.get("/technology-by-sector")
def get_technology_by_sector(filters: AnalyticsFilters = Depends(), db: Session = Depends(get_db)):
    base = filters.apply(db.query(Project), db).filter(
        ~func.lower(Project.status).in_(["pending", "rejected"]),
        Project.technology != "",
        Project.technology.isnot(None),
        Project.sector.isnot(None)
    )
    results = base.with_entities(
        Project.sector,
        Project.technology,
        func.count(Project.id)
    ).group_by(Project.sector, Project.technology).all()
    return [{"sector": r[0], "technology": r[1], "count": r[2]} for r in results]


@router.get("/duration-vs-sdg")
def get_duration_vs_sdg(filters: AnalyticsFilters = Depends(), db: Session = Depends(get_db)):
    base = filters.apply(db.query(Project), db).filter(
        Project.start_date.isnot(None),
        Project.end_date.isnot(None),
        Project.sdg_id.isnot(None),
        ~func.lower(Project.status).in_(["pending", "rejected"])
    )
    result = []
    for p in projects_list:
        duration = (p.end_date - p.start_date).days
        result.append({
            "project_id": p.id,
            "title": p.title,
            "sector": p.sector,
            "duration_days": duration,
            "sdg_count": 1,
            "sdg_goal": p.sdg.goal_number if p.sdg else None,
            "start_date": p.start_date.isoformat() if p.start_date else None,
            "end_date": p.end_date.isoformat() if p.end_date else None,
        })
    return result


@router.get("/projects-active-timeline")
def get_projects_active_timeline(filters: AnalyticsFilters = Depends(), db: Session = Depends(get_db)):
    base = filters.apply(db.query(Project), db).filter(
        Project.start_date.isnot(None),
        Project.end_date.isnot(None),
        ~func.lower(Project.status).in_(["pending", "rejected"])
    ).order_by(Project.start_date).all()
    result = []
    for p in projects_list:
        country_name = p.country.country if p.country else None
        result.append({
            "id": p.id,
            "title": p.title,
            "sector": p.sector,
            "country": country_name,
            "start_date": p.start_date.isoformat() if p.start_date else None,
            "end_date": p.end_date.isoformat() if p.end_date else None,
        })
    return result


@router.get("/average-project-duration")
def get_average_project_duration(filters: AnalyticsFilters = Depends(), db: Session = Depends(get_db)):
    base = filters.apply(db.query(Project), db).filter(
        Project.start_date.isnot(None),
        Project.end_date.isnot(None),
        ~func.lower(Project.status).in_(["pending", "rejected"])
    )
    projects_list = base.all()
    if not projects_list:
        return {"avg_duration_days": 0}
    total_days = sum((p.end_date - p.start_date).days for p in projects_list)
    return {"avg_duration_days": round(total_days / len(projects_list), 1)}


@router.get("/organizations-active")
def get_organizations_active(filters: AnalyticsFilters = Depends(), db: Session = Depends(get_db)):
    base = filters.apply(db.query(Project), db).filter(
        ~func.lower(Project.status).in_(["pending", "rejected"])
    )
    count = base.with_entities(Project.organization).distinct().count()
    return {"count": count}


# ───────────────── Dashboard 3 — Communauté & Acteurs ─────────────────

@router.get("/user-signups")
def get_user_signups(db: Session = Depends(get_db)):
    results = db.query(
        extract("year", User.created_at).label("year"),
        extract("month", User.created_at).label("month"),
        func.count(User.id)
    ).filter(
        User.created_at.isnot(None)
    ).group_by("year", "month").order_by("year", "month").all()
    signups = [{"year": int(r[0]), "month": int(r[1]), "count": r[2]} for r in results]
    cumulative = 0
    for s in signups:
        cumulative += s["count"]
        s["cumulative"] = cumulative
    return signups


@router.get("/users-by-organization-type")
def get_users_by_organization_type(db: Session = Depends(get_db)):
    results = db.query(User.organization_type, func.count(User.id)).group_by(User.organization_type).all()
    return [{"type": r[0], "count": r[1]} for r in results]


@router.get("/users-by-country")
def get_users_by_country(db: Session = Depends(get_db)):
    results = db.query(User.country, func.count(User.id)).filter(
        User.country.isnot(None)
    ).group_by(User.country).order_by(func.count(User.id).desc()).all()
    return [{"country": r[0], "count": r[1]} for r in results]


@router.get("/stakeholders-by-category")
def get_stakeholders_by_category(db: Session = Depends(get_db)):
    results = db.query(Stakeholder.category, func.count(Stakeholder.id)).filter(
        Stakeholder.category.isnot(None)
    ).group_by(Stakeholder.category).order_by(func.count(Stakeholder.id).desc()).all()
    return [{"category": r[0], "count": r[1]} for r in results]


@router.get("/stakeholders-by-type")
def get_stakeholders_by_type(db: Session = Depends(get_db)):
    results = db.query(Stakeholder.type, func.count(Stakeholder.id)).group_by(Stakeholder.type).all()
    return [{"type": r[0], "count": r[1]} for r in results]


@router.get("/projects-per-user")
def get_projects_per_user(db: Session = Depends(get_db)):
    results = db.query(
        User.id,
        User.organization_name,
        func.count(Project.id).label("project_count")
    ).join(Project, Project.user_id == User.id).filter(
        ~func.lower(Project.status).in_(["pending", "rejected"])
    ).group_by(User.id).all()
    if not results:
        return {"distribution": [], "average": 0}
    bins = {"0": 0, "1": 0, "2": 0, "3-5": 0, "6+": 0}
    for r in results:
        c = r[2]
        if c == 0: bins["0"] += 1
        elif c == 1: bins["1"] += 1
        elif c == 2: bins["2"] += 1
        elif c <= 5: bins["3-5"] += 1
        else: bins["6+"] += 1
    total_projects = sum(r[2] for r in results)
    total_users = len(results)
    avg = round(total_projects / total_users, 1) if total_users > 0 else 0
    distribution = [{"range": k, "count": v} for k, v in bins.items()]
    return {"distribution": distribution, "average": avg, "total_users_with_projects": total_users}


@router.get("/recent-users")
def get_recent_users(db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.last_login.desc().nullslast()).limit(20).all()
    return [{
        "id": u.id,
        "organization_name": u.organization_name,
        "organization_type": u.organization_type,
        "country": u.country,
        "role": u.role,
        "is_active": u.is_active,
        "last_login": u.last_login.isoformat() if u.last_login else None,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    } for u in users]


@router.get("/active-users")
def get_active_users(db: Session = Depends(get_db)):
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    active = db.query(User).filter(
        User.last_login.isnot(None),
        User.last_login >= thirty_days_ago
    ).count()
    total = db.query(User).count()
    return {"active_30_days": active, "total_users": total}


@router.get("/activation-rate")
def get_activation_rate(db: Session = Depends(get_db)):
    total = db.query(User).count()
    active = db.query(User).filter(User.is_active == True).count()
    rate = round((active / total * 100), 1) if total > 0 else 0
    return {"total_users": total, "active_users": active, "activation_rate": rate}


# ───────────────── Legacy & Map ─────────────────

@router.get("/stakeholders-by-country")
def get_stakeholders_by_country(db: Session = Depends(get_db)):
    results = db.query(Stakeholder.country, func.count(Stakeholder.id)).group_by(
        Stakeholder.country
    ).order_by(func.count(Stakeholder.id).desc()).all()
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
        projs = db.query(Project).filter(
            Project.country_id == c.id,
            Project.status != None,
            func.lower(Project.status).notin_(["pending", "rejected"])
        ).all()
        project_count = len(projs)
        stakeholder_count = db.query(Stakeholder).filter(Stakeholder.country == c.country).count()
        sectors = Counter(p.sector for p in projs if p.sector)
        technologies = Counter(p.technology for p in projs if p.technology)
        sector_distribution = [{"sector": s, "count": cnt} for s, cnt in sectors.most_common()]
        top_sector = sectors.most_common(1)[0][0] if sectors else None
        top_tech = technologies.most_common(1)[0][0] if technologies else None
        lat = float(c.latitude) if c.latitude is not None else None
        lng = float(c.longitude) if c.longitude is not None else None
        result.append({
            "country": c.country,
            "latitude": lat,
            "longitude": lng,
            "project_count": project_count,
            "stakeholder_count": stakeholder_count,
            "ongoing_projects": project_count,
            "completed_projects": 0,
            "sector_distribution": sector_distribution,
            "top_sector": top_sector,
            "top_ai_technology": top_tech,
        })
    return result


# ───────────────── Admin Dashboard ─────────────────

SECRET_KEY_ADMIN = os.getenv("JWT_SECRET_KEY", "default-secret-change-in-production")
ALGORITHM_ADMIN = "HS256"


def get_admin_user(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    token = parts[1]
    try:
        payload = jwt.decode(token, SECRET_KEY_ADMIN, algorithms=[ALGORITHM_ADMIN])
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


@router.get("/admin/overview")
def get_admin_overview(admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    approved_orgs = db.query(User).filter(User.is_approved == True).count()
    pending_orgs = db.query(User).filter(User.is_approved == False, User.is_active == True).count()
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    new_users_30d = db.query(User).filter(User.created_at >= thirty_days_ago).count()
    activation_rate = round((active_users / total_users * 100), 1) if total_users > 0 else 0
    total_projects = db.query(Project).count()
    pending_projects = db.query(Project).filter(func.lower(Project.status) == "pending").count()
    approved_projects = db.query(Project).filter(func.lower(Project.status) == "approved").count()
    rejected_projects = db.query(Project).filter(func.lower(Project.status) == "rejected").count()
    total_downloads = db.query(func.coalesce(func.sum(Resource.downloads), 0)).scalar()

    now = datetime.utcnow()
    first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    approved_today = db.query(Project).filter(
        func.lower(Project.status) == "approved",
        Project.moderated_at >= now.replace(hour=0, minute=0, second=0, microsecond=0)
    ).count()
    rejected_today = db.query(Project).filter(
        func.lower(Project.status) == "rejected",
        Project.moderated_at >= now.replace(hour=0, minute=0, second=0, microsecond=0)
    ).count()

    moderated = db.query(Project).filter(
        func.lower(Project.status).in_(["approved", "rejected"]),
        Project.moderated_at.isnot(None),
        Project.submitted_at.isnot(None)
    ).all()
    total_sec = 0
    cnt = 0
    for p in moderated:
        diff = (p.moderated_at - p.submitted_at).total_seconds()
        if diff >= 0:
            total_sec += diff
            cnt += 1
    avg_review_hours = round(total_sec / 3600 / cnt, 1) if cnt > 0 else 0

    total_decided = approved_projects + rejected_projects
    approval_rate = round((approved_projects / total_decided * 100) if total_decided > 0 else 0, 1)

    return {
        "total_users": total_users,
        "active_users": active_users,
        "approved_orgs": approved_orgs,
        "pending_orgs": pending_orgs,
        "new_users_30d": new_users_30d,
        "activation_rate": activation_rate,
        "total_projects": total_projects,
        "pending_projects": pending_projects,
        "approved_projects": approved_projects,
        "rejected_projects": rejected_projects,
        "total_downloads": total_downloads,
        "approved_today": approved_today,
        "rejected_today": rejected_today,
        "average_review_hours": avg_review_hours,
        "approval_rate": approval_rate,
    }


@router.get("/admin/user-management")
def get_admin_user_management(admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    users_by_country = db.query(User.country, func.count(User.id)).filter(
        User.country.isnot(None)
    ).group_by(User.country).order_by(func.count(User.id).desc()).all()

    users_by_role = db.query(User.role, func.count(User.id)).group_by(User.role).all()

    account_status = {
        "active": db.query(User).filter(User.is_active == True).count(),
        "inactive": db.query(User).filter(User.is_active == False).count(),
    }

    latest_registrations = db.query(User).order_by(User.created_at.desc()).limit(20).all()

    most_active = db.query(
        User.id, User.organization_name, User.email, User.country,
        func.count(Project.id).label("project_count")
    ).join(Project, Project.user_id == User.id).filter(
        ~func.lower(Project.status).in_(["pending", "rejected"])
    ).group_by(User.id).order_by(func.count(Project.id).desc()).limit(20).all()

    inactive = db.query(User).filter(
        User.last_login.is_(None),
        User.is_active == False
    ).order_by(User.created_at.desc()).limit(20).all()

    return {
        "usersByCountry": [{"country": r[0], "count": r[1]} for r in users_by_country],
        "usersByRole": [{"role": r[0], "count": r[1]} for r in users_by_role],
        "accountStatus": [
            {"status": "active", "count": account_status["active"]},
            {"status": "inactive", "count": account_status["inactive"]},
        ],
        "latestRegistrations": [{
            "id": u.id, "organization_name": u.organization_name, "email": u.email,
            "country": u.country, "role": u.role, "is_active": u.is_active,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        } for u in latest_registrations],
        "mostActiveUsers": [{
            "id": r[0], "organization_name": r[1], "email": r[2], "country": r[3],
            "project_count": r[4],
        } for r in most_active],
        "inactiveUsers": [{
            "id": u.id, "organization_name": u.organization_name, "email": u.email,
            "country": u.country, "created_at": u.created_at.isoformat() if u.created_at else None,
        } for u in inactive],
    }


@router.get("/admin/moderation")
def get_admin_moderation(admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    pending = db.query(Project).filter(func.lower(Project.status) == "pending").order_by(Project.submitted_at.asc()).all()
    approved_recent = db.query(Project).filter(
        func.lower(Project.status) == "approved"
    ).order_by(Project.moderated_at.desc().nullslast()).limit(20).all()
    rejected_recent = db.query(Project).filter(
        func.lower(Project.status) == "rejected"
    ).order_by(Project.moderated_at.desc().nullslast()).limit(20).all()

    submission_trends = db.query(
        extract("year", Project.created_at).label("year"),
        extract("month", Project.created_at).label("month"),
        func.count(Project.id)
    ).group_by("year", "month").order_by("year", "month").all()

    rejection_reasons = db.query(
        Project.rejection_reason,
        func.count(Project.id)
    ).filter(
        func.lower(Project.status) == "rejected",
        Project.rejection_reason.isnot(None)
    ).group_by(Project.rejection_reason).order_by(func.count(Project.id).desc()).all()

    return {
        "pendingQueue": [{
            "id": p.id, "title": p.title, "organization": p.organization,
            "country": p.country.country if p.country else None,
            "sector": p.sector, "submitted_at": p.submitted_at.isoformat() if p.submitted_at else None,
        } for p in pending],
        "recentlyApproved": [{
            "id": p.id, "title": p.title, "organization": p.organization,
            "country": p.country.country if p.country else None,
            "moderated_at": p.moderated_at.isoformat() if p.moderated_at else None,
        } for p in approved_recent],
        "recentlyRejected": [{
            "id": p.id, "title": p.title, "organization": p.organization,
            "country": p.country.country if p.country else None,
            "rejection_reason": p.rejection_reason,
            "moderated_at": p.moderated_at.isoformat() if p.moderated_at else None,
        } for p in rejected_recent],
        "submissionTrends": [{"year": int(r[0]), "month": int(r[1]), "count": r[2]} for r in submission_trends],
        "rejectionReasons": [{"reason": r[0], "count": r[1]} for r in rejection_reasons],
    }


@router.get("/admin/user-signups")
def get_admin_user_signups(admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    results = db.query(
        extract("year", User.created_at).label("year"),
        extract("month", User.created_at).label("month"),
        func.count(User.id)
    ).filter(User.created_at.isnot(None)).group_by("year", "month").order_by("year", "month").all()
    signups = [{"year": int(r[0]), "month": int(r[1]), "count": r[2]} for r in results]
    cumulative = 0
    for s in signups:
        cumulative += s["count"]
        s["cumulative"] = cumulative
    return signups


@router.get("/admin/latest-registrations")
def get_admin_latest_registrations(admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.created_at.desc()).limit(50).all()
    return [{
        "id": u.id, "organization_name": u.organization_name, "email": u.email,
        "country": u.country, "role": u.role, "is_active": u.is_active,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    } for u in users]


@router.get("/admin/platform-stats")
def get_admin_platform_stats(admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    total_resources = db.query(Resource).count()
    total_downloads = db.query(func.coalesce(func.sum(Resource.downloads), 0)).scalar()
    total_chat_sessions = db.query(ChatSession).count()
    total_chat_messages = db.query(ChatMessage).count()
    chat_messages_30d = db.query(ChatMessage).filter(
        ChatMessage.created_at >= datetime.utcnow() - timedelta(days=30)
    ).count()
    top_resources = db.query(
        Resource.title, Resource.type, Resource.downloads
    ).order_by(Resource.downloads.desc().nullslast()).limit(10).all()
    return {
        "total_resources": total_resources,
        "total_downloads": total_downloads,
        "total_chat_sessions": total_chat_sessions,
        "total_chat_messages": total_chat_messages,
        "chat_messages_30d": chat_messages_30d,
        "topResources": [{"title": r[0], "type": r[1], "downloads": r[2] or 0} for r in top_resources],
    }


@router.get("/admin/org-status")
def get_admin_org_status(admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    approved = db.query(User).filter(User.is_approved == True).count()
    pending_org = db.query(User).filter(User.is_approved == False, User.is_active == True).count()
    rejected = db.query(User).filter(User.is_approved == False, User.is_active == False).count()
    return [
        {"status": "Approved", "count": approved, "color": "#10b981"},
        {"status": "Pending", "count": pending_org, "color": "#f59e0b"},
        {"status": "Rejected", "count": rejected, "color": "#ef4444"},
    ]


@router.get("/admin/notifications")
def get_admin_notifications(admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    unread = db.query(Notification).filter(Notification.is_read == 0).count()
    recent = db.query(Notification).order_by(Notification.created_at.desc()).limit(20).all()
    return {
        "unread_count": unread,
        "recent": [{
            "id": n.id,
            "type": n.type,
            "message": n.message,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        } for n in recent],
    }


@router.get("/admin/last-logins")
def get_admin_last_logins(admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    users = db.query(User).filter(User.last_login.isnot(None)).order_by(User.last_login.desc()).limit(20).all()
    return [{
        "id": u.id,
        "organization_name": u.organization_name,
        "email": u.email,
        "last_login": u.last_login.isoformat() if u.last_login else None,
    } for u in users]


@router.get("/admin/downloads-timeline")
def get_admin_downloads_timeline(admin: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    from sqlalchemy import extract as sql_extract
    results = db.query(
        sql_extract("year", Resource.created_at).label("year"),
        sql_extract("month", Resource.created_at).label("month"),
        func.coalesce(func.sum(Resource.downloads), 0).label("downloads"),
        func.count(Resource.id).label("uploads")
    ).filter(Resource.created_at.isnot(None)).group_by("year", "month").order_by("year", "month").all()
    return [{"year": int(r[0]), "month": int(r[1]), "downloads": int(r[2]), "uploads": r[3]} for r in results]
