import os
import logging
from typing import Optional
from sqlalchemy.orm import Session
from app.models.project import Project
from app.models.stakeholder import Stakeholder
from app.models.resource import Resource
from app.models.country import Country

logger = logging.getLogger(__name__)

MODEL_NAME = "BAAI/bge-small-en-v1.5"
CHROMA_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
    "chatbot", "chroma_db_rag"
)
COLLECTION_NAME = "sarai_rag"

_rag_service = None


def _build_docs(db: Session):
    docs = []
    projects = (
        db.query(Project, Country.country)
        .join(Country, Country.id == Project.country_id, isouter=True)
        .filter(~Project.status.in_(["pending", "rejected"]))
        .all()
    )
    for p, cname in projects:
        text = (
            f"SARAI Project: {p.title}. "
            f"Sector: {p.sector or ''}, Technology: {p.technology or ''}, "
            f"implemented by {p.organization or ''} in {cname or ''}. "
            f"Status: {p.status or 'active'}. "
            f"Start: {p.start_date or 'N/A'}, End: {p.end_date or 'N/A'}, "
            f"Year: {p.year_of_implementation or 'N/A'}. "
            f"An AI project contributing to the Arab region ecosystem. "
            f"Description: {p.description or p.title or ''}"
        )
        docs.append({
            "id": f"project_{p.id}",
            "text": text,
            "type": "project",
            "entity_id": p.id,
            "title": p.title or "",
            "country": cname or "",
            "sector": p.sector or "",
        })
    stakeholders = db.query(Stakeholder).all()
    for s in stakeholders:
        text = (
            f"SARAI Stakeholder: {s.name}. "
            f"Type: {s.type or ''}, based in {s.country or ''}. "
            f"An organization advancing AI in the Arab world."
        )
        docs.append({
            "id": f"stakeholder_{s.id}",
            "text": text,
            "type": "stakeholder",
            "entity_id": s.id,
            "title": s.name or "",
            "country": s.country or "",
            "sector": s.type or "",
        })
    resources = db.query(Resource).all()
    for r in resources:
        text = (
            f"SARAI Resource: {r.title}. "
            f"Category: {r.category or ''}, providing AI knowledge "
            f"and insights for the Arab region."
        )
        docs.append({
            "id": f"resource_{r.id}",
            "text": text,
            "type": "resource",
            "entity_id": r.id,
            "title": r.title or "",
            "country": "",
            "sector": r.category or "",
        })
    return docs


class RAGService:
    def __init__(self):
        from sentence_transformers import SentenceTransformer
        import chromadb
        from chromadb.config import Settings

        logger.info(f"[RAG] Loading BGE model: {MODEL_NAME}")
        self.model = SentenceTransformer(MODEL_NAME)
        logger.info("[RAG] BGE model loaded")

        os.makedirs(CHROMA_DIR, exist_ok=True)
        self.client = chromadb.PersistentClient(
            path=CHROMA_DIR,
            settings=Settings(anonymized_telemetry=False),
        )
        try:
            self.collection = self.client.get_collection(COLLECTION_NAME)
            logger.info(f"[RAG] Loaded existing collection '{COLLECTION_NAME}' (count={self.collection.count()})")
        except Exception:
            logger.info(f"[RAG] Creating new collection '{COLLECTION_NAME}'")
            self.collection = self.client.create_collection(COLLECTION_NAME)

    def build_index(self, db: Session):
        docs = _build_docs(db)
        try:
            existing = self.collection.get()
            if existing["ids"]:
                self.collection.delete(ids=existing["ids"])
        except Exception:
            pass
        if not docs:
            logger.warning("[RAG] No documents to index")
            return
        ids = [d["id"] for d in docs]
        texts = [d["text"] for d in docs]
        metadatas = [{
            "type": d["type"],
            "id": str(d["entity_id"]),
            "title": d["title"],
            "country": d["country"],
            "sector": d["sector"],
        } for d in docs]
        logger.info(f"[RAG] Generating embeddings for {len(docs)} documents...")
        embeddings = self.model.encode(texts, normalize_embeddings=True, show_progress_bar=False).tolist()
        batch_size = 100
        for i in range(0, len(ids), batch_size):
            end = i + batch_size
            self.collection.add(
                ids=ids[i:end],
                embeddings=embeddings[i:end],
                documents=texts[i:end],
                metadatas=metadatas[i:end],
            )
        logger.info(f"[RAG] Indexed {len(docs)} documents into ChromaDB")

    def search(self, query: str, top_k: int = 15, etype: Optional[str] = None, country: Optional[str] = None, sector: Optional[str] = None):
        query_emb = self.model.encode(query, normalize_embeddings=True).tolist()
        where_filter = {}
        if etype:
            where_filter["type"] = etype
        n_results = min(top_k * 3, 100)
        try:
            results = self.collection.query(
                query_embeddings=[query_emb],
                n_results=n_results,
                where=where_filter or None,
            )
        except Exception as e:
            logger.warning(f"[RAG] Query error: {e}")
            return []
        if not results["ids"] or not results["ids"][0]:
            return []
        items = []
        for i, doc_id in enumerate(results["ids"][0]):
            meta = results["metadatas"][0][i]
            dist = results["distances"][0][i] if results["distances"] else 0.0
            similarity = 1.0 - dist
            try:
                entity_id = int(meta["id"])
            except (ValueError, KeyError):
                entity_id = int(doc_id.split("_")[-1]) if "_" in doc_id else 0
            items.append({
                "id": entity_id,
                "type": meta.get("type", ""),
                "title": meta.get("title", ""),
                "country": meta.get("country", ""),
                "sector": meta.get("sector", ""),
                "text": results["documents"][0][i] if results["documents"] else "",
                "score": similarity,
            })
        if country:
            items = [d for d in items if d["country"].lower() == country.lower()]
        if sector:
            items = [d for d in items if d["sector"] and sector.lower() in d["sector"].lower()]
        items.sort(key=lambda x: x["score"], reverse=True)
        return items[:top_k]

    def rebuild_from_db(self, db: Session):
        logger.info("[RAG] Rebuilding index from database...")
        self.build_index(db)


def get_rag_service(db: Session):
    global _rag_service
    if _rag_service is None:
        _rag_service = RAGService()
        try:
            if _rag_service.collection.count() == 0:
                logger.info("[RAG] Collection empty, building index...")
                _rag_service.build_index(db)
        except Exception:
            logger.info("[RAG] Building index for first time...")
            _rag_service.build_index(db)
    return _rag_service


def ensure_index(db: Session):
    svc = get_rag_service(db)
    if svc.collection.count() == 0:
        svc.build_index(db)
    return svc


def search_rag(query: str, db: Session, etype: Optional[str] = None, country: Optional[str] = None, sector: Optional[str] = None):
    svc = get_rag_service(db)
    return svc.search(query, top_k=15, etype=etype, country=country, sector=sector)
