import json
import logging
import numpy as np
from typing import Optional
from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
_model = None
_embedding_cache = None


def invalidate_cache():
    global _embedding_cache
    _embedding_cache = None
    logger.info("[EMB] Embedding cache invalidated")


def _get_model():
    global _model
    if _model is None:
        logger.info(f"[EMB] Loading model: {MODEL_NAME}")
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer(MODEL_NAME)
        logger.info("[EMB] Model loaded")
    return _model


def generate_embedding(text: str):
    model = _get_model()
    emb = model.encode(text, normalize_embeddings=True)
    return emb.tolist()


def generate_embeddings_batch(texts: list[str]):
    model = _get_model()
    embs = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
    return [e.tolist() for e in embs]


def cosine_similarity(a: list[float], b: list[float]):
    return float(np.dot(a, b))


def load_all_embeddings(db: Session):
    global _embedding_cache
    if _embedding_cache is not None:
        return _embedding_cache

    try:
        rows = db.execute(text(
            "SELECT entity_type, entity_id, embedding FROM entity_embeddings"
        )).fetchall()
        result = {}
        for row in rows:
            key = (row.entity_type, row.entity_id)
            result[key] = json.loads(row.embedding)
        _embedding_cache = result
        logger.info(f"[EMB] Loaded {len(result)} embeddings into cache")
        return result
    except Exception as e:
        logger.warning(f"[EMB] Could not load embeddings: {e}")
        db.rollback()
        return {}


def _content_for_project(p):
    parts = [
        p.title or "",
        p.description or "",
        p.sector or "",
        p.technology or "",
        p.organization or "",
    ]
    return " | ".join(parts)


def _content_for_stakeholder(s):
    parts = [
        s.name or "",
        s.description or "",
        s.type or "",
        s.country or "",
    ]
    return " | ".join(parts)


def _content_for_resource(r):
    parts = [
        r.title or "",
        r.description or "",
        r.type or "",
        r.category or "",
    ]
    return " | ".join(parts)


def rebuild_all_embeddings(db: Session):
    from app.models.project import Project
    from app.models.stakeholder import Stakeholder
    from app.models.resource import Resource

    logger.info("[EMB] Rebuilding all embeddings...")

    db.execute(text("""
        CREATE TABLE IF NOT EXISTS entity_embeddings (
            id SERIAL PRIMARY KEY,
            entity_type VARCHAR(50) NOT NULL,
            entity_id INTEGER NOT NULL,
            embedding TEXT NOT NULL,
            content TEXT,
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(entity_type, entity_id)
        )
    """))
    db.commit()

    entries = []

    projects = db.query(Project).all()
    for p in projects:
        entries.append(("project", p.id, _content_for_project(p)))
    logger.info(f"[EMB] {len(projects)} projects to embed")

    stakeholders = db.query(Stakeholder).all()
    for s in stakeholders:
        entries.append(("stakeholder", s.id, _content_for_stakeholder(s)))
    logger.info(f"[EMB] {len(stakeholders)} stakeholders to embed")

    resources = db.query(Resource).all()
    for r in resources:
        entries.append(("resource", r.id, _content_for_resource(r)))
    logger.info(f"[EMB] {len(resources)} resources to embed")

    if not entries:
        return

    texts = [e[2] for e in entries]
    embeddings = generate_embeddings_batch(texts)

    for (typ, eid, content), emb in zip(entries, embeddings):
        try:
            db.execute(text("""
                INSERT INTO entity_embeddings (entity_type, entity_id, embedding, content, updated_at)
                VALUES (:typ, :eid, :emb, :content, NOW())
                ON CONFLICT (entity_type, entity_id)
                DO UPDATE SET embedding = :emb, content = :content, updated_at = NOW()
            """), {
                "typ": typ,
                "eid": eid,
                "emb": json.dumps(emb),
                "content": content,
            })
        except Exception as e:
            logger.warning(f"[EMB] Error saving embedding for {typ}/{eid}: {e}")
    db.commit()

    invalidate_cache()
    logger.info(f"[EMB] All {len(entries)} embeddings saved and cache refreshed")


def semantic_search(
    db: Session,
    query_embedding: list[float],
    entity_type: Optional[str] = None,
    limit: int = 20,
):
    embeddings = load_all_embeddings(db)
    if not embeddings:
        return [], 0

    scored = []
    for (typ, eid), emb in embeddings.items():
        if entity_type and typ != entity_type:
            continue
        sim = cosine_similarity(query_embedding, emb)
        scored.append((sim, typ, eid))

    scored.sort(key=lambda x: x[0], reverse=True)
    top = scored[:limit]
    total = len(scored)

    return [(typ, eid, float(score)) for score, typ, eid in top], total
