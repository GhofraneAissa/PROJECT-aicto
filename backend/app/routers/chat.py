import re
import time
import requests
import numpy as np
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from app.database import get_db
from app.models.project import Project
from app.models.stakeholder import Stakeholder
from app.models.resource import Resource
from app.models.country import Country

router = APIRouter()

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama3.2"

SENTENCE_SPLITTER = re.compile(r"(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?|\!)\s")

GREETINGS = {
    "hi", "hello", "hey", "salut", "bonjour", "salam", "hiii", "helloo",
    "good morning", "good afternoon", "good evening",
}

COUNTRY_KEYWORDS = [
    "algeria", "bahrain", "comoros", "djibouti", "egypt", "iraq", "jordan",
    "kuwait", "lebanon", "libya", "mauritania", "morocco", "oman", "palestine",
    "qatar", "saudi arabia", "somalia", "sudan", "syria", "tunisia", "uae",
    "united arab emirates", "yemen",
]

TYPE_KEYWORDS = {
    "project": {"project", "projects", "initiative", "initiatives"},
    "stakeholder": {"stakeholder", "stakeholders", "organization", "organizations",
                    "lab", "labs", "center", "centre", "startup", "ngo"},
    "resource": {"resource", "resources", "report", "dataset", "guideline", "tool"},
}

SECTOR_KEYWORDS = {
    "health": {"health", "healthcare", "medical", "hospital", "telemedicine"},
    "education": {"education", "school", "university", "training", "learning"},
    "agriculture": {"agriculture", "agricultural", "farming", "food"},
    "finance": {"finance", "financial", "banking", "fintech"},
    "energy": {"energy", "renewable", "power", "oil", "gas"},
    "governance": {"governance", "smart city", "government", "public service", "egovernment"},
    "environment": {"environment", "climate", "water", "environmental", "green"},
}

_vectorizer = None
_tfidf_matrix = None
_corpus = None


def normalize_text(text):
    return re.sub(r"\s+", " ", text.lower().strip())


def is_greeting(query):
    q = normalize_text(query).rstrip("?!.")
    return q in GREETINGS or any(g == q for g in GREETINGS)


def detect_type_intent(query):
    q = normalize_text(query)
    words = set(q.split())
    for etype, keywords in TYPE_KEYWORDS.items():
        if words & keywords:
            return etype
    return None


def detect_country_intent(query):
    q = normalize_text(query)
    for c in COUNTRY_KEYWORDS:
        if c in q:
            return c.title()
    return None


def detect_sector_intent(query):
    q = normalize_text(query)
    for sector, keywords in SECTOR_KEYWORDS.items():
        if keywords & set(q.split()):
            return sector
    return None


def build_corpus(db):
    docs = []
    projects = (
        db.query(Project, Country.country)
        .join(Country, Country.id == Project.country_id, isouter=True)
        .filter(~Project.status.in_(["pending", "rejected"]))
        .all()
    )
    for p, cname in projects:
        text = (
            f"Project: {p.title}. Organization: {p.organization}. "
            f"Country: {cname or ''}. Sector: {p.sector}. Technology: {p.technology}. "
            f"Description: {p.description or ''}. Status: {p.status or ''}. "
            f"SDG: {p.sdg_alignment or ''}. Year: {p.year_of_implementation or ''}."
        )
        docs.append({
            "text": text, "type": "project", "id": p.id,
            "title": p.title, "country": cname or "", "sector": p.sector or "",
        })

    stakeholders = db.query(Stakeholder).all()
    for s in stakeholders:
        text = (
            f"Stakeholder: {s.name}. Type: {s.type}. "
            f"Country: {s.country or ''}. Category: {s.category or ''}. "
            f"Description: {s.description or ''}. Email: {s.contact_email or ''}."
        )
        docs.append({
            "text": text, "type": "stakeholder", "id": s.id,
            "title": s.name, "country": s.country or "", "sector": s.type or "",
        })

    resources = db.query(Resource).all()
    for r in resources:
        text = (
            f"Resource: {r.title}. Type: {r.type}. Category: {r.category}. "
            f"Description: {r.description or ''}. Language: {r.language or ''}."
        )
        docs.append({
            "text": text, "type": "resource", "id": r.id,
            "title": r.title, "country": "", "sector": r.category or "",
        })

    return docs


def get_index(db):
    global _vectorizer, _tfidf_matrix, _corpus
    if _corpus is None:
        _corpus = build_corpus(db)
        texts = [d["text"] for d in _corpus]
        _vectorizer = TfidfVectorizer(stop_words="english", max_features=5000)
        _tfidf_matrix = _vectorizer.fit_transform(texts)
    return _corpus, _vectorizer, _tfidf_matrix


def keyword_filter(corpus, etype=None, country=None, sector=None):
    if not etype and not country and not sector:
        return corpus
    filtered = []
    for d in corpus:
        if etype and d["type"] != etype:
            continue
        if country and d["country"].lower() != country.lower():
            continue
        if sector and d["sector"] and sector.lower() not in d["sector"].lower():
            continue
        filtered.append(d)
    return filtered


def search_similar(query, db, top_k=6):
    corpus, vec, mat = get_index(db)
    q_vec = vec.transform([query])
    scores = cosine_similarity(q_vec, mat)[0]
    top_idx = scores.argsort()[-top_k:][::-1]
    results = []
    for idx in top_idx:
        if scores[idx] < 0.02:
            continue
        item = dict(corpus[idx])
        item["score"] = float(scores[idx])
        results.append(item)
    return results


def query_ollama(prompt):
    try:
        resp = requests.post(
            OLLAMA_URL,
            json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
            timeout=60,
        )
        if resp.ok:
            return resp.json().get("response", "")
    except Exception:
        pass
    return None


def format_context(results):
    lines = []
    for r in results:
        lines.append(f"[{r['type'].upper()}] {r['title']}")
        lines.append(f"  Country: {r['country'] or 'N/A'} | Sector: {r['sector'] or 'N/A'}")
        desc = r.get("text", "")
        if len(desc) > 300:
            desc = desc[:300] + "..."
        lines.append(f"  {desc}")
        lines.append("---")
    return "\n".join(lines)


def make_url(item):
    t, i = item["type"], item["id"]
    if t == "project":
        return f"/projects/{i}"
    elif t == "stakeholder":
        return f"/stakeholders?highlight={i}"
    return f"/resources?highlight={i}"


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []


class ChatResult(BaseModel):
    title: str
    type: str
    id: int
    url: str
    country: str = ""
    sector: str = ""


class ChatResponse(BaseModel):
    reply: str
    has_ollama: bool = False
    time_ms: int = 0
    results: List[ChatResult] = []


@router.post("/", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db)):
    import logging
    logger = logging.getLogger(__name__)
    start = time.time()

    query = request.message.strip()

    if is_greeting(query):
        elapsed = int((time.time() - start) * 1000)
        return ChatResponse(
            reply="Hello! I am SARAI Assistant.\n\nI can help you find AI projects, stakeholders, and resources in the Arab region. Try asking:\n- \"AI projects in Tunisia\"\n- \"Healthcare AI\"\n- \"Stakeholders in Egypt\"\n- \"Give me all resources\"",
            has_ollama=False,
            time_ms=elapsed,
            results=[],
        )

    etype = detect_type_intent(query)
    country = detect_country_intent(query)
    sector = detect_sector_intent(query)
    corpus, vec, mat = get_index(db)

    if etype or country or sector:
        filtered = corpus
        if etype:
            filtered = [d for d in filtered if d["type"] == etype]
        if country:
            filtered = [d for d in filtered if d["country"].lower() == country.lower()]
        if sector:
            filtered = [d for d in filtered if d["sector"] and sector.lower() in d["sector"].lower()]
        texts = [d["text"] for d in filtered]
        results = []
        if texts:
            q_vec = vec.transform([query])
            f_mat = vec.transform(texts)
            scores = cosine_similarity(q_vec, f_mat)[0]
            top_k = min(15, len(filtered))
            top_idx = scores.argsort()[-top_k:][::-1]
            has_good_score = any(scores[idx] >= 0.02 for idx in top_idx)
            if has_good_score:
                for idx in top_idx:
                    if scores[idx] < 0.02:
                        continue
                    item = dict(filtered[idx])
                    item["score"] = float(scores[idx])
                    results.append(item)
            else:
                for item in filtered[:top_k]:
                    results.append(dict(item))
    else:
        try:
            results = search_similar(query, db, top_k=6)
        except Exception as e:
            logger.error(f"Search error: {e}")
            results = []

    context = format_context(results)

    reply = None
    has_ollama = False

    ollama_prompt = (
        f"You are SARAI Assistant for the Stocktaking of Arab Regional AI Initiatives platform. "
        f"Answer questions about AI projects, stakeholders, and resources across 22 Arab nations. "
        f"Use ONLY the provided data below. Be concise (2-4 sentences) and friendly.\n\n"
        f"Data:\n{context}\n\n"
        f"User: {query}\nAssistant:"
    )
    ollama_reply = query_ollama(ollama_prompt)
    if ollama_reply:
        reply = ollama_reply.strip()
        has_ollama = True

    if not reply:
        if not results:
            reply = (
                "I couldn't find any information matching your question. "
                "Try asking about specific projects, stakeholders, or resources in the Arab region."
            )
        else:
            types = {}
            for r in results:
                types.setdefault(r["type"], []).append(r)
            n = sum(len(v) for v in types.values())
            parts = [f"I found {n} relevant {'item' if n == 1 else 'items'}:"]
            for t, items in types.items():
                parts.append(f"\n**{t.capitalize()}s:**")
                for item in items[:4]:
                    parts.append(f"- {item['title']} ({item['country'] or 'N/A'} | {item['sector'] or 'N/A'})")
            reply = "\n".join(parts)

    elapsed = int((time.time() - start) * 1000)

    return ChatResponse(
        reply=reply,
        has_ollama=has_ollama,
        time_ms=elapsed,
        results=[
            ChatResult(
                title=r["title"],
                type=r["type"],
                id=r["id"],
                url=make_url(r),
                country=r.get("country", ""),
                sector=r.get("sector", ""),
            )
            for r in results
        ],
    )
