import os
import re
import json
import uuid
import time
import base64
import logging
from datetime import datetime
import requests
from abc import ABC, abstractmethod
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Header
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.services import rag_service
from app.models.project import Project
from app.models.stakeholder import Stakeholder
from app.models.resource import Resource
from app.models.country import Country
from app.models.chat import ChatSession, ChatMessage
from app.models.user import User
from app.schemas.chat import (
    ChatSessionCreate, ChatSessionResponse, ChatSessionListItem,
    ChatRequest, ChatResponse, ChatResult, ChatMessageSchema,
)

logger = logging.getLogger(__name__)
router = APIRouter()


def get_optional_user(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization:
        return None
    try:
        from jose import JWTError, jwt
        from app.routers.users import SECRET_KEY, ALGORITHM
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not token:
            return None
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            return None
        user = db.query(User).filter(User.id == int(user_id)).first()
        return user
    except Exception:
        return None

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "groq").lower()
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
GROQ_VISION_MODEL = os.getenv("GROQ_VISION_MODEL", "llama-3.2-11b-vision-preview")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")

CHAT_UPLOAD_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "uploads", "chat_attachments"
)
os.makedirs(CHAT_UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp",
    ".pdf", ".doc", ".docx", ".txt", ".csv", ".xls", ".xlsx",
    ".ppt", ".pptx", ".zip",
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

SYSTEM_PROMPT = """You are SARAI Assistant for the Stocktaking of Arab Regional AI Initiatives platform.

### CRITICAL RULES — Never violate these:
1. **ABSOLUTELY NEVER invent data.** Only report what is explicitly listed in the context below. Do not add countries, descriptions, sectors, or any details not present in the context.
2. If the context is empty or insufficient, say "I don't have that information in the database" and suggest what the user can ask about.
3. Respond in the same language as the user (English, French, or Arabic).

### How to structure responses:
- Start with a brief introduction mentioning the total count.
- List items in a clear, readable format with **Title** (Country | Sector).
- Be concise: 2-4 sentences unless the user asks for details.
- Always cite the source type next to each item (Project, Stakeholder, Resource)."""

SYSTEM_PROMPT_FR = """Vous etes l'assistant SARAI pour le recensement des initiatives IA dans la region arabe.

### REGLES CRITIQUES :
1. **N'inventez JAMAIS de donnees.** Basez-vous uniquement sur le contexte fourni.
2. Si le contexte est insuffisant, dites "Je n'ai pas trouve cette information dans la base de donnees."
3. Repondez dans la meme langue que l'utilisateur.

### Structure des reponses :
- Commencez par une breve introduction avec le nombre total d'elements trouves.
- Listez les elements avec **Titre** (Pays | Secteur)
- Soyez concis (2-4 phrases)."""

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
    "education": {"education", "school", "university", "training", "learning", "edutech"},
    "agriculture": {"agriculture", "agricultural", "farming", "food", "agritech"},
    "finance": {"finance", "financial", "banking", "fintech"},
    "energy": {"energy", "renewable", "power", "oil", "gas"},
    "governance": {"governance", "smart city", "government", "public service", "egovernment"},
    "environment": {"environment", "climate", "water", "environmental", "green"},
    "transportation": {"transportation", "transport", "traffic", "logistics"},
}

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp"}


# ── LLM Providers ──

class LLMProvider(ABC):
    @abstractmethod
    def generate(self, system_prompt: str, user_query: str, context: str, image_data: Optional[str] = None) -> Optional[str]:
        ...


class GroqProvider(LLMProvider):
    def __init__(self):
        if not GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY is not set")
        from openai import OpenAI
        self.client = OpenAI(
            base_url="https://api.groq.com/openai/v1",
            api_key=GROQ_API_KEY,
        )
        self.model = GROQ_MODEL
        self.vision_model = GROQ_VISION_MODEL

    def generate(self, system_prompt, user_query, context, image_data=None):
        try:
            use_vision = image_data is not None
            model = self.vision_model if use_vision else self.model

            content = []
            if context and context.strip():
                content.append({"type": "text", "text": f"### Database Context (only use this data, do not invent anything)\n{context}\n\n### User Question\n{user_query}"})
            else:
                content.append({"type": "text", "text": user_query})

            if image_data:
                content.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{image_data}"}
                })

            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": content},
            ]

            resp = self.client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.1,
                max_tokens=1024,
                timeout=60,
            )
            return resp.choices[0].message.content.strip()
        except Exception as e:
            logger.warning(f"Groq API error: {e}")
            return None


class OllamaProvider(LLMProvider):
    def __init__(self):
        self.url = f"{OLLAMA_BASE_URL}/api/generate"
        self.model = OLLAMA_MODEL

    def generate(self, system_prompt, user_query, context, image_data=None):
        try:
            prompt = f"{system_prompt}\n\n### Context from Database\n{context}\n\n### User Question\n{user_query}\n\n### Response"
            payload = {"model": self.model, "prompt": prompt, "stream": False, "options": {"temperature": 0.3}}
            resp = requests.post(self.url, json=payload, timeout=60)
            if resp.ok:
                return resp.json().get("response", "").strip()
        except Exception as e:
            logger.warning(f"Ollama error: {e}")
        return None


class TemplateProvider(LLMProvider):
    def generate(self, system_prompt, user_query, context, image_data=None):
        return None


def build_provider_chain():
    providers = []
    if LLM_PROVIDER == "groq" and GROQ_API_KEY:
        try:
            providers.append(("groq", GroqProvider()))
        except Exception as e:
            logger.warning(f"Failed to init Groq: {e}")
    if LLM_PROVIDER in ("ollama", "groq"):
        providers.append(("ollama", OllamaProvider()))
    providers.append(("template", TemplateProvider()))
    return providers


# ── Text processing ──

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


# ── RAG search (delegates to rag_service with BGE + ChromaDB) ──


def format_context(results):
    lines = []
    for r in results:
        lines.append(f"[{r['type'].upper()}] {r['title']} | {r['country'] or 'N/A'} | {r['sector'] or 'N/A'}")
    return "\n".join(lines) if lines else "(empty)"


def make_url(item):
    t, i = item["type"], item["id"]
    if t == "project":
        return f"/projects/{i}"
    elif t == "stakeholder":
        return f"/stakeholders?highlight={i}"
    return f"/resources?highlight={i}"


def detect_language(query):
    french_markers = {'quels','quelles','quel','quelle','projets','sante','tunisie','maroc','donne','montre'}
    arabic_chars = set('ابتثجحخدذرزسشصضطظعغفقكلمنهويآأؤإئ')
    tokens = set(re.split(r"[\s,;:!?()]+", query.lower().strip()))
    if any(c in query for c in arabic_chars):
        return 'ar'
    if tokens & french_markers:
        return 'fr'
    return 'en'


def build_template_reply(results, query):
    lang = detect_language(query)
    if not results:
        msgs = {
            'fr': "Je n'ai trouve aucun resultat correspondant a votre question dans la base SARAI. Essayez de demander des projets, parties prenantes ou ressources specifiques.",
            'ar': "لم أجد أي نتائج تطابق سؤالك في قاعدة بيانات SARAI. حاول السؤال عن مشاريع أو جهات أو موارد محددة.",
            'en': "I couldn't find any information matching your question in the SARAI database. Try asking about specific projects, stakeholders, or resources in the Arab region."
        }
        return msgs.get(lang, msgs['en'])
    types = {}
    for r in results:
        types.setdefault(r["type"], []).append(r)
    n = sum(len(v) for v in types.values())
    if lang == 'fr':
        parts = [f"J'ai trouve {n} element{'s' if n > 1 else ''} pertinent{'s' if n > 1 else ''} dans la base SARAI :"]
        for t, items in types.items():
            label = {'project': 'Projets', 'stakeholder': 'Organisations', 'resource': 'Ressources'}.get(t, t)
            parts.append(f"\n**{label} :**")
            for item in items[:5]:
                parts.append(f"- {item['title']} ({item['country'] or 'N/A'} | {item['sector'] or 'N/A'})")
    elif lang == 'ar':
        parts = [f"وجدت {n} نتيجة relevant في قاعدة بيانات SARAI:"]
        for t, items in types.items():
            label = {'project': 'المشاريع', 'stakeholder': 'الجهات', 'resource': 'الموارد'}.get(t, t)
            parts.append(f"\n**{label}:**")
            for item in items[:5]:
                parts.append(f"- {item['title']} ({item['country'] or 'N/A'} | {item['sector'] or 'N/A'})")
    else:
        parts = [f"I found {n} relevant {'item' if n == 1 else 'items'} in the SARAI database:"]
        for t, items in types.items():
            parts.append(f"\n**{t.capitalize()}s:**")
            for item in items[:5]:
                parts.append(f"- {item['title']} ({item['country'] or 'N/A'} | {item['sector'] or 'N/A'})")
    return "\n".join(parts)


def search_rag(query, db, etype=None, country=None, sector=None):
    try:
        return rag_service.search_rag(query, db, etype, country, sector)
    except Exception as e:
        logger.error(f"RAG search error: {e}")
        return []


def save_message(db, session_id, role, content, attachments=None):
    msg = ChatMessage(
        session_id=session_id,
        role=role,
        content=content,
        attachments=json.dumps(attachments) if attachments else None,
    )
    db.add(msg)
    session = db.query(ChatSession).filter(ChatSession.session_id == session_id).first()
    if session:
        session.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(msg)
    return msg


def encode_image(image_path):
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


# ── Session Endpoints ──

@router.post("/sessions", response_model=ChatSessionResponse)
def create_session(
    data: ChatSessionCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    user_id = current_user.id if current_user else None
    session = ChatSession(title=data.title or "New Chat", user_id=user_id)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/sessions", response_model=List[ChatSessionListItem])
def list_sessions(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    if not current_user:
        return []
    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == current_user.id)
        .order_by(desc(ChatSession.updated_at))
        .all()
    )
    result = []
    for s in sessions:
        msg_count = db.query(ChatMessage).filter(ChatMessage.session_id == s.session_id).count()
        result.append(ChatSessionListItem(
            session_id=s.session_id,
            title=s.title,
            created_at=s.created_at,
            updated_at=s.updated_at,
            message_count=msg_count,
        ))
    return result


@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
def get_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    session = db.query(ChatSession).filter(ChatSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id is not None and current_user and session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this session")
    return session


@router.delete("/sessions/{session_id}")
def delete_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    session = db.query(ChatSession).filter(ChatSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id is not None and current_user and session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this session")
    db.delete(session)
    db.commit()
    return {"ok": True}


# ── File Upload ──

@router.post("/upload")
async def upload_chat_file(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type {ext} not allowed")
    raw = await file.read()
    if len(raw) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(CHAT_UPLOAD_DIR, unique_name)
    with open(file_path, "wb") as f:
        f.write(raw)

    from app.services.document_reader import extract_text
    extracted = extract_text(file_path)
    if extracted:
        txt_name = f"{uuid.uuid4().hex}.extracted.txt"
        txt_path = os.path.join(CHAT_UPLOAD_DIR, txt_name)
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(extracted)
    else:
        txt_name = None

    preview = extracted[:300] + ("..." if len(extracted) > 300 else "") if extracted else ""

    return {
        "original_name": file.filename,
        "stored_name": unique_name,
        "url": f"/api/chat/files/{unique_name}",
        "is_image": ext in IMAGE_EXTENSIONS,
        "size": len(raw),
        "extracted_text_name": txt_name,
        "preview": preview,
        "has_text": bool(extracted),
    }


@router.get("/files/{filename}")
def get_chat_file(filename: str):
    file_path = os.path.join(CHAT_UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    from fastapi.responses import FileResponse
    return FileResponse(file_path)


# ── Chat ──

@router.post("/sessions/{session_id}/messages", response_model=ChatResponse)
def chat_send(
    session_id: str,
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    start = time.time()
    session = db.query(ChatSession).filter(ChatSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id is not None and current_user and session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this session")

    query = request.message.strip()
    attachments = request.attachments
    image_data = None
    doc_texts = []

    if attachments:
        for att in attachments:
            if att.get("is_image") and att.get("stored_name"):
                file_path = os.path.join(CHAT_UPLOAD_DIR, att["stored_name"])
                if os.path.exists(file_path):
                    image_data = encode_image(file_path)
            if att.get("has_text") and att.get("extracted_text_name"):
                txt_path = os.path.join(CHAT_UPLOAD_DIR, att["extracted_text_name"])
                if os.path.exists(txt_path):
                    try:
                        with open(txt_path, "r", encoding="utf-8") as f:
                            doc_texts.append(f"--- Document: {att.get('original_name', 'file')} ---\n{f.read()}")
                    except Exception as e:
                        logger.warning(f"Failed to read extracted text: {e}")

    save_message(db, session_id, "user", query, attachments)

    if is_greeting(query):
        lang = detect_language(query)
        if lang == 'fr':
            reply = (
                "Bonjour ! Je suis l'assistant SARAI.\n\n"
                "Je peux vous aider a trouver des projets IA, des parties prenantes et des ressources "
                "dans la region arabe. Essayez de demander :\n"
                '- "Projets IA en Tunisie"\n'
                '- "Sante IA"\n'
                '- "Organisations en Egypte"\n'
                '- "Donne-moi toutes les ressources"'
            )
        elif lang == 'ar':
            reply = (
                "مرحبا! أنا مساعد SARAI.\n\n"
                "يمكنني مساعدتك في العثور على مشاريع الذكاء الاصطناعي والجهات والموارد في المنطقة العربية. جرب أن تسأل:\n"
                '- "مشاريع الذكاء الاصطناعي في تونس"\n'
                '- "الذكاء الاصطناعي في الصحة"\n'
                '- "الجهات في مصر"'
            )
        else:
            reply = (
                "Hello! I am SARAI Assistant.\n\n"
                "I can help you find AI projects, stakeholders, and resources in the Arab region. "
                "Try asking:\n"
                '- "AI projects in Tunisia"\n'
                '- "Healthcare AI"\n'
                '- "Stakeholders in Egypt"\n'
                '- "Give me all resources"'
            )
        save_message(db, session_id, "assistant", reply)
        elapsed = int((time.time() - start) * 1000)
        return ChatResponse(reply=reply, provider="template", time_ms=elapsed, session_id=session_id)

    if session.title == "New Chat" and len(query) > 5:
        session.title = query[:50] + ("..." if len(query) > 50 else "")
        db.commit()

    etype = detect_type_intent(query)
    country = detect_country_intent(query)
    sector = detect_sector_intent(query)

    results = search_rag(query, db, etype, country, sector)
    context = format_context(results)

    from sqlalchemy import func, text as sqla_text
    stats_parts = []
    try:
        total_projects = db.query(func.count(Project.id)).scalar() or 0
        total_stakeholders = db.query(func.count(Stakeholder.id)).scalar() or 0
        total_resources = db.query(func.count(Resource.id)).scalar() or 0
        sector_counts = db.query(Project.sector, func.count(Project.id)).filter(Project.sector.isnot(None)).group_by(Project.sector).order_by(func.count(Project.id).desc()).all()
        stats_parts.append(f"Total in DB: {total_projects} projects, {total_stakeholders} stakeholders, {total_resources} resources")
        if sector_counts:
            stats_parts.append("Project sectors: " + ", ".join(f"{s}({c})" for s, c in sector_counts))
    except Exception as e:
        logger.warning(f"Stats error: {e}")
    stats = "\n".join(stats_parts)

    doc_section = ""
    if doc_texts:
        doc_section = "\n\n### Uploaded Document Content\n" + "\n\n".join(doc_texts)

    lang = detect_language(query)
    active_system_prompt = SYSTEM_PROMPT_FR if lang == 'fr' else SYSTEM_PROMPT

    full_context = f"### Stats\n{stats}\n\n### Matching Items\n{context}{doc_section}"

    providers = build_provider_chain()
    reply = None
    active_provider = "template"

    for name, provider in providers:
        if isinstance(provider, TemplateProvider):
            reply = build_template_reply(results, query)
            active_provider = name
            break
        gen = provider.generate(active_system_prompt, query, full_context, image_data)
        if gen:
            reply = gen
            active_provider = name
            break

    reply = reply or "I couldn't process your request. Please try again."
    save_message(db, session_id, "assistant", reply)
    elapsed = int((time.time() - start) * 1000)

    return ChatResponse(
        reply=reply,
        provider=active_provider,
        time_ms=elapsed,
        session_id=session_id,
        results=[
            ChatResult(
                title=r["title"], type=r["type"], id=r["id"],
                url=make_url(r), country=r.get("country", ""), sector=r.get("sector", ""),
            )
            for r in results
        ],
    )


@router.post("/", response_model=ChatResponse)
def chat_endpoint_legacy(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    if not request.session_id:
        user_id = current_user.id if current_user else None
        session = ChatSession(title="New Chat", user_id=user_id)
        db.add(session)
        db.commit()
        db.refresh(session)
        request.session_id = session.session_id
    return chat_send(request.session_id, request, db, current_user)
