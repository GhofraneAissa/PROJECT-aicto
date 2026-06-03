import re
import json
import time
import logging
import numpy as np
from typing import Optional
from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

SECTOR_MAP = {
    "health": "Health", "healthcare": "Health", "medical": "Health", "sante": "Health",
    "education": "Education", "edutech": "Education", "edu": "Education",
    "finance": "Finance", "fintech": "Finance", "banking": "Finance",
    "agriculture": "Agriculture", "agri": "Agriculture", "agritech": "Agriculture",
    "transport": "Transportation", "transportation": "Transportation",
    "energy": "Energy", "renewable": "Energy", "solar": "Energy", "wind": "Energy",
    "security": "Security", "cyber": "Security", "cybersecurity": "Security",
    "environment": "Environment", "climate": "Environment", "green": "Environment",
    "govtech": "GovTech", "government": "GovTech", "public": "GovTech",
    "tourism": "Tourism", "travel": "Tourism",
    "manufacturing": "Manufacturing", "industry": "Manufacturing", "industrie": "Manufacturing",
}

TECH_MAP = {
    "machine learning": "Machine Learning", "ml": "Machine Learning",
    "deep learning": "Deep Learning", "dl": "Deep Learning",
    "nlp": "NLP", "natural language": "NLP", "llm": "NLP",
    "computer vision": "Computer Vision", "vision": "Computer Vision", "image": "Computer Vision",
    "robotics": "Robotics", "robot": "Robotics",
    "speech": "Speech Recognition", "voice": "Speech Recognition", "recognition": "Speech Recognition",
    "recommender": "Recommender System", "recommendation": "Recommender System",
    "predictive": "Predictive Analytics", "prediction": "Predictive Analytics",
    "iot": "IoT", "internet of things": "IoT",
    "blockchain": "Blockchain",
    "big data": "Big Data", "data analytics": "Big Data",
    "generative": "Generative AI", "genai": "Generative AI",
    "reinforcement": "Reinforcement Learning", "rl": "Reinforcement Learning",
    "edge": "Edge Computing", "edge computing": "Edge Computing",
    "ia": "Artificial Intelligence",
}

ENTITY_MAP = {
    "project": "project", "projects": "project", "projet": "project", "projets": "project",
    "stakeholder": "stakeholder", "stakeholders": "stakeholder",
    "resource": "resource", "resources": "resource", "ressource": "resource", "ressources": "resource",
}

COUNTRY_ALIASES = {
    "tunisie": "Tunisia", "tunisian": "Tunisia",
    "france": "France", "french": "France",
    "algerie": "Algeria", "algeria": "Algeria", "algerian": "Algeria",
    "maroc": "Morocco", "morocco": "Morocco",
    "usa": "USA", "united states": "USA", "america": "USA", "american": "USA",
    "canada": "Canada", "canadian": "Canada",
    "senegal": "Senegal",
    "cote d'ivoire": "Côte d'Ivoire", "côte d'ivoire": "Côte d'Ivoire",
    "egypte": "Egypt", "egypt": "Egypt",
    "kenya": "Kenya",
    "nigeria": "Nigeria",
    "afrique du sud": "South Africa", "south africa": "South Africa",
    "ghana": "Ghana",
    "rwanda": "Rwanda",
}

INTENT_KEYWORDS = {
    "project": ["project", "projects", "projet", "projets", "startup", "startups", "start-up", "initiative", "case study"],
    "stakeholder": ["stakeholder", "stakeholders", "organization", "organizations", "organisation", "organisations", "partner", "partners", "ngo", "ngos", "company", "companies", "institution", "institutions", "startup"],
    "resource": ["resource", "resources", "ressource", "ressources", "event", "events", "evenement", "evenements", "tool", "tools", "outil", "outils", "guide", "guides", "dataset", "datasets", "publication", "publications", "report", "reports", "documentation"],
}

SYNONYM_MAP = {
    "startup": ["startup", "start-up", "new venture", "emerging company", "early stage"],
    "ngo": ["ngo", "non-profit", "nonprofit", "not-for-profit", "charity", "civil society"],
    "hospital": ["hospital", "clinic", "medical center", "healthcare facility"],
    "university": ["university", "college", "higher education", "academic institution", "school"],
    "ai": ["artificial intelligence", "machine learning", "deep learning", "intelligence artificielle"],
    "robot": ["robot", "robotics", "automation", "autonomous"],
    "agri": ["agriculture", "farming", "agritech", "agricultural", "agri"],
    "sante": ["health", "healthcare", "medical", "santé"],
    "finance": ["finance", "financial", "banking", "fintech"],
    "tunisia": ["tunisia", "tunisie", "tunisian"],
    "africa": ["africa", "african", "sub-saharan"],
}


def expand_synonyms(query: str):
    lower = query.lower()
    expanded = {lower}
    words = lower.split()
    for w in words:
        if w in SYNONYM_MAP:
            for syn in SYNONYM_MAP[w]:
                expanded.add(syn)
    return " ".join(sorted(expanded, key=len))


def classify_intent(q: str):
    lower = q.lower().strip()
    matched = {}
    for entity, keywords in INTENT_KEYWORDS.items():
        for kw in keywords:
            if kw in lower:
                matched[entity] = matched.get(entity, 0) + 1
    if not matched:
        return {"primary_entity": None, "confidence": "low"}
    best = max(matched, key=matched.get)
    return {"primary_entity": best, "confidence": "high" if matched[best] >= 2 else "medium"}


def parse_query(q: str):
    lower = q.lower().strip()
    intent = classify_intent(q)
    parsed = {
        "keywords": q,
        "clean_keywords": lower,
        "expanded_keywords": expand_synonyms(q),
        "country": None,
        "sector": None,
        "technology": None,
        "entity": intent["primary_entity"],
        "intent_confidence": intent["confidence"],
    }

    for word, ent in ENTITY_MAP.items():
        if word in lower:
            parsed["entity"] = ent
            break

    for kw, sector in SECTOR_MAP.items():
        if kw in lower:
            parsed["sector"] = sector
            break

    for kw, tech in TECH_MAP.items():
        if kw in lower:
            parsed["technology"] = tech
            break

    for alias, country in COUNTRY_ALIASES.items():
        if alias in lower:
            parsed["country"] = country
            break

    return parsed


def install_pg_trgm(db: Session):
    try:
        db.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        logger.warning(f"[FTS] Could not install pg_trgm: {e}")
        return False


def rebuild_fts_index(db: Session):
    logger.info("[FTS] Rebuilding full-text search indexes...")
    install_pg_trgm(db)
    try:
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_project_fts
            ON projects USING GIN (
                to_tsvector('english',
                    coalesce(title,'') || ' ' ||
                    coalesce(description,'') || ' ' ||
                    coalesce(sector,'') || ' ' ||
                    coalesce(technology,'') || ' ' ||
                    coalesce(organization,'')
                )
            )
        """))
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_stakeholder_fts
            ON stakeholders USING GIN (
                to_tsvector('english',
                    coalesce(name,'') || ' ' ||
                    coalesce(description,'') || ' ' ||
                    coalesce(type,'') || ' ' ||
                    coalesce(country,'')
                )
            )
        """))
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_resource_fts
            ON resources USING GIN (
                to_tsvector('english',
                    coalesce(title,'') || ' ' ||
                    coalesce(description,'') || ' ' ||
                    coalesce(type,'') || ' ' ||
                    coalesce(category,'')
                )
            )
        """))
        db.commit()
        logger.info("[FTS] GIN indexes created successfully")
    except Exception as e:
        db.rollback()
        logger.warning(f"[FTS] GIN index creation failed: {e}")


def _make_tsquery(words):
    parts = []
    for w in words:
        clean = re.sub(r"[^a-z0-9]", "", w.lower())
        if len(clean) >= 2:
            parts.append(f"{clean}:*")
    return " & ".join(parts) if parts else None


def _make_vector_expr(columns, table_alias="t"):
    inner = " || ' ' || ".join(f"coalesce({table_alias}.{c},'')" for c in columns)
    return f"to_tsvector('english', {inner})"


def _rank_clause(tsvector_expr):
    return f"ts_rank({tsvector_expr}, to_tsquery('english', :tsquery))"


def fts_search(
    db: Session,
    table: str,
    columns: list,
    query: str,
    filters: Optional[dict] = None,
    limit: int = 20,
    offset: int = 0,
    exclude_status: Optional[list] = None,
):
    words = [w for w in re.split(r"[\s,;:!?()]+", query.lower().strip()) if len(w) >= 2]
    if not words:
        return [], 0

    tsquery_str = _make_tsquery(words)
    use_fts = tsquery_str is not None

    filters = filters or {}
    params = {}
    where_parts = []

    if table == "projects":
        alias = "p"
        tsvector_cols = ["title", "description", "sector", "technology", "organization"]
        tsvector_expr = _make_vector_expr(tsvector_cols, alias)
        select_cols = f"""
            {alias}.id, {alias}.title, {alias}.description, {alias}.sector,
            {alias}.technology, {alias}.status, {alias}.sdg_id,
            {alias}.start_date, {alias}.organization,
            c.country AS country_name
        """
        from_clause = f"FROM projects {alias} LEFT JOIN countries c ON c.id = {alias}.country_id"

        if use_fts:
            where_parts.append(f"{tsvector_expr} @@ to_tsquery('english', :tsquery)")
            params["tsquery"] = tsquery_str
            order_clause = f"ORDER BY {_rank_clause(tsvector_expr)} DESC"
        else:
            order_clause = f"ORDER BY {alias}.updated_at DESC NULLS LAST"

        if exclude_status:
            status_conds = " AND ".join([f"{alias}.status != :ex_{i}" for i, s in enumerate(exclude_status)])
            where_parts.append(status_conds)
            params.update({f"ex_{i}": s for i, s in enumerate(exclude_status)})

        if filters.get("country"):
            where_parts.append("LOWER(c.country) LIKE :country_filter")
            params["country_filter"] = f"%{filters['country'].lower()}%"
        if filters.get("sector"):
            where_parts.append(f"LOWER({alias}.sector) LIKE :sector_filter")
            params["sector_filter"] = f"%{filters['sector'].lower()}%"
        if filters.get("technology"):
            where_parts.append(f"LOWER({alias}.technology) LIKE :tech_filter")
            params["tech_filter"] = f"%{filters['technology'].lower()}%"

        if not use_fts:
            like_conds = []
            for i, w in enumerate(words):
                parts = []
                for j, col in enumerate(tsvector_cols):
                    pname = f"w{i}c{j}"
                    parts.append(f"LOWER({alias}.{col}) LIKE :{pname}")
                    params[pname] = f"%{w}%"
                like_conds.append("(" + " OR ".join(parts) + ")")
            if like_conds:
                where_parts.append("(" + " AND ".join(like_conds) + ")")

    elif table == "stakeholders":
        alias = "s"
        tsvector_cols = ["name", "description", "type", "country"]
        tsvector_expr = _make_vector_expr(tsvector_cols, alias)
        select_cols = f"""
            {alias}.id, {alias}.name AS title, {alias}.description, {alias}.type,
            {alias}.category, {alias}.country, {alias}.website
        """
        from_clause = f"FROM stakeholders {alias}"

        if use_fts:
            where_parts.append(f"{tsvector_expr} @@ to_tsquery('english', :tsquery)")
            params["tsquery"] = tsquery_str
            order_clause = f"ORDER BY {_rank_clause(tsvector_expr)} DESC"
        else:
            order_clause = f"ORDER BY {alias}.name ASC"

        if not use_fts:
            like_conds = []
            for i, w in enumerate(words):
                parts = []
                for j, col in enumerate(tsvector_cols):
                    pname = f"w{i}c{j}"
                    parts.append(f"LOWER({alias}.{col}) LIKE :{pname}")
                    params[pname] = f"%{w}%"
                like_conds.append("(" + " OR ".join(parts) + ")")
            if like_conds:
                where_parts.append("(" + " AND ".join(like_conds) + ")")

    elif table == "resources":
        alias = "r"
        tsvector_cols = ["title", "description", "type", "category"]
        tsvector_expr = _make_vector_expr(tsvector_cols, alias)
        select_cols = f"""
            {alias}.id, {alias}.title, {alias}.description, {alias}.type,
            {alias}.category, {alias}.language, {alias}.file_url
        """
        from_clause = f"FROM resources {alias}"

        if use_fts:
            where_parts.append(f"{tsvector_expr} @@ to_tsquery('english', :tsquery)")
            params["tsquery"] = tsquery_str
            order_clause = f"ORDER BY {_rank_clause(tsvector_expr)} DESC"
        else:
            order_clause = f"ORDER BY {alias}.title ASC"

        if not use_fts:
            like_conds = []
            for i, w in enumerate(words):
                parts = []
                for j, col in enumerate(tsvector_cols):
                    pname = f"w{i}c{j}"
                    parts.append(f"LOWER({alias}.{col}) LIKE :{pname}")
                    params[pname] = f"%{w}%"
                like_conds.append("(" + " OR ".join(parts) + ")")
            if like_conds:
                where_parts.append("(" + " AND ".join(like_conds) + ")")
    else:
        return [], 0

    where_clause = "WHERE " + " AND ".join(where_parts) if where_parts else ""
    count_sql = f"SELECT COUNT(*) {from_clause} {where_clause}"
    data_sql = f"SELECT {select_cols} {from_clause} {where_clause} {order_clause} LIMIT :lim OFFSET :off"
    params["lim"] = limit
    params["off"] = offset

    try:
        total = db.execute(text(count_sql), params).scalar() or 0
        result = db.execute(text(data_sql), params)
        col_names = result.keys()
        items = [dict(zip(col_names, row)) for row in result.fetchall()]
        return items, total
    except Exception as e:
        logger.error(f"[FTS] Search error on {table}: {e}")
        db.rollback()
        return [], 0


def _fallback_recent(db: Session, entity_type: str, limit: int = 20):
    """Return recent items when keyword/semantic search returns nothing."""
    try:
        if entity_type == "project":
            rows = db.execute(text("""
                SELECT p.id, p.title, p.description, p.sector, p.technology,
                       p.status, p.sdg_id, p.start_date, p.organization,
                       c.country AS country_name
                FROM projects p
                LEFT JOIN countries c ON c.id = p.country_id
                WHERE p.status NOT IN ('pending', 'rejected')
                ORDER BY p.updated_at DESC NULLS LAST
                LIMIT :lim
            """), {"lim": limit}).fetchall()
            keys = rows[0].keys() if rows else []
            return [dict(zip(keys, r)) for r in rows]
        elif entity_type == "stakeholder":
            rows = db.execute(text("""
                SELECT id, name AS title, description, type, category, country, website
                FROM stakeholders
                ORDER BY updated_at DESC NULLS LAST
                LIMIT :lim
            """), {"lim": limit}).fetchall()
            keys = rows[0].keys() if rows else []
            return [dict(zip(keys, r)) for r in rows]
        elif entity_type == "resource":
            rows = db.execute(text("""
                SELECT id, title, description, type, category, language, file_url
                FROM resources
                ORDER BY updated_at DESC NULLS LAST
                LIMIT :lim
            """), {"lim": limit}).fetchall()
            keys = rows[0].keys() if rows else []
            return [dict(zip(keys, r)) for r in rows]
    except Exception as e:
        logger.warning(f"[FALLBACK] Error: {e}")
        db.rollback()
    return []


def _fuzzy_fallback(db: Session, query: str, entity_type: str, limit: int = 20):
    """Use pg_trgm similarity as last resort for typos."""
    try:
        if entity_type == "project":
            rows = db.execute(text("""
                SELECT p.id, p.title, p.description, p.sector, p.technology,
                       p.status, p.sdg_id, p.start_date, p.organization,
                       c.country AS country_name,
                       similarity(LOWER(p.title), LOWER(:q)) AS sim
                FROM projects p
                LEFT JOIN countries c ON c.id = p.country_id
                WHERE similarity(LOWER(p.title), LOWER(:q)) > 0.1
                   OR similarity(LOWER(p.description), LOWER(:q)) > 0.1
                   OR similarity(LOWER(p.sector), LOWER(:q)) > 0.1
                ORDER BY sim DESC
                LIMIT :lim
            """), {"q": query, "lim": limit}).fetchall()
            keys = rows[0].keys() if rows else []
            items = [dict(zip(keys, r)) for r in rows]
            for it in items:
                it.pop("sim", None)
            return items
    except Exception as e:
        logger.warning(f"[FUZZY] Error: {e}")
        db.rollback()
    return []


def hybrid_search(
    db: Session,
    query: str,
    entity: Optional[str] = None,
    country: Optional[str] = None,
    sector: Optional[str] = None,
    technology: Optional[str] = None,
    limit: int = 20,
):
    from app.services.embedding_service import generate_embedding, semantic_search, invalidate_cache

    expanded = expand_synonyms(query)
    logger.info(f"[HYBRID] query='{query}' entity={entity} expanded='{expanded}'")

    fts_filters = {}
    if country: fts_filters["country"] = country
    if sector: fts_filters["sector"] = sector
    if technology: fts_filters["technology"] = technology

    entities_to_search = ["project", "stakeholder", "resource"]
    if entity:
        entities_to_search = [entity]

    all_results = []
    seen = set()
    has_any_fts_result = False

    for ent in entities_to_search:
        cols_map = {
            "project": (["title", "description", "sector", "technology", "organization"], "projects"),
            "stakeholder": (["name", "description", "type", "country"], "stakeholders"),
            "resource": (["title", "description", "type", "category"], "resources"),
        }
        cols, table_name = cols_map[ent]
        exclude = ["pending", "rejected"] if ent == "project" else None

        fts_items, _ = fts_search(
            db=db, table=table_name, columns=cols, query=expanded,
            filters=fts_filters if ent == "project" else None,
            limit=limit, exclude_status=exclude,
        )

        if fts_items:
            has_any_fts_result = True

        for item in fts_items:
            item["_source"] = "fts"
            item["_entity_type"] = ent
            key = (ent, item["id"])
            if key not in seen:
                seen.add(key)
                all_results.append(item)

    query_embedding = generate_embedding(query)

    for ent in entities_to_search:
        sem_items, _ = semantic_search(db=db, query_embedding=query_embedding, entity_type=ent, limit=limit)
        for sem_ent, sem_id, score in sem_items:
            key = (sem_ent, sem_id)
            if key in seen:
                for r in all_results:
                    if r["_entity_type"] == sem_ent and r["id"] == sem_id:
                        r["_semantic_score"] = score
                        r["_source"] = "hybrid"
                        break
            else:
                if score > 0.3:
                    seen.add(key)
                    item = _fetch_entity_item(db, sem_ent, sem_id)
                    if item:
                        item["_source"] = "semantic"
                        item["_entity_type"] = sem_ent
                        item["_semantic_score"] = score
                        all_results.append(item)

    # Fallback: if nothing found and entity detected → return recent items of that type
    if not has_any_fts_result and entity:
        logger.info(f"[HYBRID] FTS returned 0 for entity={entity}, trying fallback")
        fallback_items = _fallback_recent(db, entity, limit)
        for item in fallback_items:
            key = (entity, item["id"])
            if key not in seen:
                seen.add(key)
                item["_source"] = "fallback"
                item["_entity_type"] = entity
                item["_semantic_score"] = 0.1
                all_results.append(item)

    # Last resort: fuzzy matching for typos
    if not has_any_fts_result and len(query) >= 3:
        logger.info(f"[HYBRID] Trying fuzzy fallback for '{query}'")
        for ent in entities_to_search:
            fuzzy_items = _fuzzy_fallback(db, query, ent, limit)
            for item in fuzzy_items:
                key = (ent, item["id"])
                if key not in seen:
                    seen.add(key)
                    item["_source"] = "fuzzy"
                    item["_entity_type"] = ent
                    item["_semantic_score"] = 0.15
                    all_results.append(item)

    return _rank_hybrid_results(all_results, limit)


def _fetch_entity_item(db: Session, entity_type: str, entity_id: int):
    try:
        if entity_type == "project":
            row = db.execute(text("""
                SELECT p.id, p.title, p.description, p.sector, p.technology,
                       p.status, p.sdg_id, p.start_date, p.organization,
                       c.country AS country_name
                FROM projects p
                LEFT JOIN countries c ON c.id = p.country_id
                WHERE p.id = :id
            """), {"id": entity_id}).fetchone()
            if row:
                return dict(zip(row.keys(), row))
        elif entity_type == "stakeholder":
            row = db.execute(text("""
                SELECT id, name AS title, description, type, category, country, website
                FROM stakeholders WHERE id = :id
            """), {"id": entity_id}).fetchone()
            if row:
                return dict(zip(row.keys(), row))
        elif entity_type == "resource":
            row = db.execute(text("""
                SELECT id, title, description, type, category, language
                FROM resources WHERE id = :id
            """), {"id": entity_id}).fetchone()
            if row:
                return dict(zip(row.keys(), row))
    except Exception as e:
        logger.warning(f"[HYBRID] Error fetching {entity_type}/{entity_id}: {e}")
        db.rollback()
    return None


def _rank_hybrid_results(items: list, limit: int):
    scored = []
    for item in items:
        score = 0.0
        source = item.get("_source", "fts")
        semantic = item.get("_semantic_score", 0)

        if source == "hybrid":
            score = 0.3 + semantic * 0.6
        elif source == "semantic":
            score = semantic * 0.6
        elif source == "fallback":
            score = 0.2
        elif source == "fuzzy":
            score = 0.1 + semantic * 0.3
        else:
            score = 0.3

        if item.get("_entity_type") == "project":
            score += 0.05

        title = item.get("title") or item.get("name") or ""
        if title:
            score += 0.02

        item["_score"] = round(min(score, 1.0), 4)
        scored.append(item)

    scored.sort(key=lambda r: r["_score"], reverse=True)
    return scored[:limit]


def _suggest_one_table(db, table, id_col, title_col, desc_col, tag_col, subtitle_col, words, limit, extra_join, extra_where):
    alias = table.split()[0] if " " in table else table[0]
    conditions = []
    params = {}

    for i, w in enumerate(words):
        w_clean = re.sub(r"[^a-z0-9]", "", w)
        if not w_clean:
            continue
        parts = [
            f"LOWER({title_col}) LIKE :sw{i}t",
            f"LOWER({desc_col}) LIKE :sw{i}d",
        ]
        if tag_col:
            parts.append(f"LOWER({tag_col}) LIKE :sw{i}g")
        params[f"sw{i}t"] = f"%{w_clean}%"
        params[f"sw{i}d"] = f"%{w_clean}%"
        if tag_col:
            params[f"sw{i}g"] = f"%{w_clean}%"
        conditions.append("(" + " OR ".join(parts) + ")")

    if not conditions:
        return []

    where = "WHERE " + " AND ".join(conditions) + " " + extra_where
    params["lim"] = limit

    sql = f"""
        SELECT {id_col} AS id, {title_col} AS title,
               COALESCE({subtitle_col}, '') AS subtitle,
               COALESCE({tag_col}, '') AS tag,
               LEFT(COALESCE({desc_col}, ''), 120) AS description
        FROM {table} {extra_join}
        {where}
        ORDER BY updated_at DESC NULLS LAST
        LIMIT :lim
    """
    try:
        rows = db.execute(text(sql), params).fetchall()
        results = []
        for row in rows:
            score = sum(
                10 if w in (row.title or "").lower()
                else 5 if tag_col and w in (row.tag or "").lower()
                else 1
                for w in words
            )
            results.append({
                "id": row.id,
                "title": row.title or "",
                "subtitle": row.subtitle or "",
                "tag": row.tag or "",
                "description": row.description or "",
                "score": score,
            })
        return results
    except Exception as e:
        logger.error(f"[FTS] Suggest error on {table}: {e}")
        return []


def suggest(db: Session, q: str, limit: int = 5):
    if not q.strip():
        return []

    words = [w for w in re.split(r"[\s,;:!?]+", q.lower().strip()) if len(w) > 1]
    if not words:
        return []

    all_results = []
    seen = set()

    rows = _suggest_one_table(
        db, table="projects p", id_col="p.id", title_col="p.title",
        desc_col="p.description", tag_col="p.sector", subtitle_col="c.country",
        words=words, limit=limit,
        extra_join="LEFT JOIN countries c ON c.id = p.country_id",
        extra_where="AND p.status NOT IN ('pending', 'rejected')",
    )
    for r in rows:
        key = ("project", r["id"])
        if key not in seen:
            seen.add(key)
            r["entity_type"] = "project"
            all_results.append(r)

    rows = _suggest_one_table(
        db, table="stakeholders s", id_col="s.id", title_col="s.name",
        desc_col="s.description", tag_col="s.type", subtitle_col="s.country",
        words=words, limit=limit,
        extra_join="", extra_where="",
    )
    for r in rows:
        key = ("stakeholder", r["id"])
        if key not in seen:
            seen.add(key)
            r["entity_type"] = "stakeholder"
            all_results.append(r)

    rows = _suggest_one_table(
        db, table="resources r", id_col="r.id", title_col="r.title",
        desc_col="r.description", tag_col="r.type", subtitle_col="''",
        words=words, limit=limit,
        extra_join="", extra_where="",
    )
    for r in rows:
        key = ("resource", r["id"])
        if key not in seen:
            seen.add(key)
            r["entity_type"] = "resource"
            all_results.append(r)

    all_results.sort(key=lambda r: r["score"], reverse=True)
    return all_results[: limit * 3]
