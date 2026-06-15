# from dotenv import load_dotenv
# load_dotenv()

# from fastapi import FastAPI
# from fastapi.middleware.cors import CORSMiddleware
# from fastapi.staticfiles import StaticFiles
# from app.database import engine, Base
# from app.routers import stakeholders, projects, resources, analytics, countries, users
# import os

# # CRITICAL: Import all models BEFORE create_all so SQLAlchemy knows about them
# from app.models.user import User
# from app.models.project import Project
# from app.models.stakeholder import Stakeholder
# from app.models.resource import Resource
# from app.models.country import Country

# try:
#     Base.metadata.create_all(bind=engine)
#     print("[DB] Tables created/verified successfully")
# except Exception as e:
#     print(f"[DB] ERROR creating tables: {e}")

# app = FastAPI(
#     title="SARAI API",
#     description="Stocktaking of Arab Regional AI Initiatives - Backend API",
#     version="1.0.0"
# )

# # CORS configuration - covers all frontend dev servers and production
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=[
#         "http://localhost:3001",
#         "http://localhost:3000",
#         "http://127.0.0.1:3000",
#         "http://localhost:5500",
#         "http://127.0.0.1:5500",
#         "http://localhost:8000",
#         "http://127.0.0.1:8000",
#     ],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
#     expose_headers=["*"],
# )

# # Serve frontend static files
# frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
# if os.path.exists(frontend_dir):
#     app.mount("/static", StaticFiles(directory=frontend_dir, html=True), name="static")

# # Routers
# app.include_router(stakeholders.router, prefix="/api/stakeholders", tags=["Stakeholders"])
# app.include_router(projects.router, prefix="/api/projects", tags=["Projects"])
# app.include_router(resources.router, prefix="/api/resources", tags=["Resources"])
# app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
# app.include_router(countries.router, prefix="/api/countries", tags=["Countries"])
# app.include_router(users.router, prefix="/api/users", tags=["Users"])


# @app.get("/")
# def root():
#     return {"message": "SARAI API is running"}


# @app.get("/health")
# def health_check():
#     return {"status": "ok", "version": "1.0.0"}


import logging
from dotenv import load_dotenv
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(name)s] %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import engine, Base
from app.routers import stakeholders, projects, resources, analytics, countries, users, sdgs, search, admin, chat, contact, report, notifications, auth_oauth
import os
import threading
import time
from datetime import datetime
from app.services.pdf_report_service import generate_pdf_report
from app.services.email_service import send_report_email
from app.services.rag_service import ensure_index
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.limiter import limiter

REPORT_RECIPIENT = os.getenv("REPORT_EMAIL", "aissaghofrane1@gmail.com")
REPORT_CHECK_INTERVAL = 30  # Check every 30 seconds

# Import tous les modèles AVANT create_all
from app.models.user import User
from app.models.project import Project
from app.models.stakeholder import Stakeholder
from app.models.resource import Resource
from app.models.country import Country
from app.models.sdg import SDG
from app.models.chat import ChatSession, ChatMessage
from app.models.notification import Notification

try:
    Base.metadata.create_all(bind=engine)
    logger.info("[DB] Tables created/verified successfully")
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    project_columns = [c["name"] for c in inspector.get_columns("projects")]
    with engine.connect() as conn:
        for col, col_type in [("rejection_reason", "TEXT"), ("moderated_by", "INTEGER"), ("moderated_at", "TIMESTAMP"), ("submitted_at", "TIMESTAMP")]:
            if col not in project_columns:
                conn.execute(text(f"ALTER TABLE projects ADD COLUMN {col} {col_type} NULL"))
                logger.info(f"[DB] Added column {col} to projects table")
        # Add new columns to users table if missing (for org moderation)
        user_columns = [c["name"] for c in inspector.get_columns("users")]
        for col, col_type in [("is_approved", "BOOLEAN DEFAULT false"), ("rejection_reason", "TEXT"), ("activation_code", "VARCHAR(6)")]:
            if col not in user_columns:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {col_type}"))
                logger.info(f"[DB] Added column {col} to users table")
        # Fix notifications table columns
        try:
            notif_columns = [c["name"] for c in inspector.get_columns("notifications")]
            # Drop legacy 'title' column if it exists (model uses 'message')
            if "title" in notif_columns:
                conn.execute(text("ALTER TABLE notifications DROP COLUMN title"))
                logger.info("[DB] Dropped legacy column 'title' from notifications table")
                notif_columns.remove("title")
            # Drop CHECK constraint on type if it exists (model allows any string)
            conn.execute(text("ALTER TABLE notifications DROP CONSTRAINT IF EXISTS chk_notification_type"))
            logger.info("[DB] Dropped CHECK constraint chk_notification_type if it existed")
            # Add missing columns
            for col, col_type in [("related_project_id", "INTEGER"), ("user_id", "INTEGER"), ("type", "VARCHAR(50) DEFAULT 'project_submitted'"), ("is_read", "INTEGER DEFAULT 0")]:
                if col not in notif_columns:
                    nullable = "NULL" if col != "user_id" else "NOT NULL DEFAULT 0"
                    conn.execute(text(f"ALTER TABLE notifications ADD COLUMN {col} {col_type} {nullable}"))
                    logger.info(f"[DB] Added column {col} to notifications table")
        except Exception:
            pass
        # Fix chat_sessions FK to cascade on user delete
        try:
            from sqlalchemy import inspect as sa_inspect
            fk_list = [fk for fk in sa_inspect(engine).get_foreign_keys("chat_sessions") if fk["constrained_columns"] == ["user_id"]]
            if fk_list and "CASCADE" not in (fk_list[0].get("options", {}).get("ondelete", "") or ""):
                db_type = engine.dialect.name
                if db_type == "postgresql":
                    fk_name = fk_list[0]["name"]
                    conn.execute(text(f"ALTER TABLE chat_sessions DROP CONSTRAINT {fk_name}"))
                    conn.execute(text(f"ALTER TABLE chat_sessions ADD CONSTRAINT {fk_name} FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"))
                    logger.info("[DB] Updated chat_sessions FK to CASCADE on delete")
                elif db_type == "sqlite":
                    # SQLite cannot alter FK; delete orphaned sessions as cleanup
                    conn.execute(text("DELETE FROM chat_sessions WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM users)"))
                    logger.info("[DB] Cleaned up orphaned chat_sessions")
        except Exception:
            pass
        conn.commit()
except Exception as e:
    logger.error(f"[DB] ERROR: {e}")
app = FastAPI(
    title="SARAI API",
    description="Stocktaking of Arab Regional AI Initiatives - Backend API",
    version="1.0.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS CONFIGURATION
logger.info("[CORS] Configuring CORS middleware...")
CORS_ORIGINS = [
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)
logger.info(f"[CORS] Allowed origins: {CORS_ORIGINS}")
app.add_middleware(SlowAPIMiddleware)
# Serve frontend static files
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
if os.path.exists(frontend_dir):
    app.mount("/static", StaticFiles(directory=frontend_dir, html=True), name="static")
# Routers
app.include_router(stakeholders.router, prefix="/api/stakeholders", tags=["Stakeholders"])
app.include_router(projects.router, prefix="/api/projects", tags=["Projects"])
app.include_router(resources.router, prefix="/api/resources", tags=["Resources"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(countries.router, prefix="/api/countries", tags=["Countries"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(sdgs.router, prefix="/api/sdgs", tags=["SDGs"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(search.router, prefix="/api/search", tags=["Search"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(contact.router, prefix="/api", tags=["Contact"])
app.include_router(report.router, prefix="/api", tags=["Report"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(auth_oauth.router)


# ── Background scheduler: send report every day at 8:00 AM ──
SEND_DAYS = [0, 1, 2, 3, 4, 5, 6]  # Every day
SEND_HOUR = 8
SEND_MINUTE = 0


def run_scheduled_report():
    """Background thread that sends the annual report every day at 8:00 AM."""
    last_sent_date = None
    while True:
        try:
            now = datetime.utcnow()
            # Check if today is a send day and time matches (within 1-minute window)
            if now.weekday() in SEND_DAYS and now.hour == SEND_HOUR and now.minute == SEND_MINUTE:
                sent_today_key = now.date()
                if last_sent_date != sent_today_key:
                    current_year = now.year
                    logger.info(f"[SCHEDULER] Sending report for {current_year} on {now.strftime('%A %d/%m/%Y')}...")
                    pdf_bytes = generate_pdf_report(current_year)
                    logger.info(f"[SCHEDULER] PDF generated: {len(pdf_bytes)} bytes")
                    sent = send_report_email(REPORT_RECIPIENT, pdf_bytes, current_year)
                    if sent:
                        logger.info(f"[SCHEDULER] Report {current_year} sent to {REPORT_RECIPIENT}")
                        last_sent_date = sent_today_key
                    else:
                        logger.warning(f"[SCHEDULER] Failed to send report {current_year}")
        except Exception as e:
            logger.error(f"[SCHEDULER] Error in scheduled report: {e}")
        time.sleep(REPORT_CHECK_INTERVAL)


@app.on_event("startup")
def startup_event():
    # Auto-seed countries if table is empty
    try:
        from app.database import SessionLocal
        from app.models.country import Country
        db = SessionLocal()
        if db.query(Country).count() == 0:
            logger.info("[SEED] Countries table is empty. Seeding...")
            from seed_countries import seed_countries
            seed_countries()
        db.close()
    except Exception as e:
        logger.warning(f"[SEED] Could not seed countries: {e}")

    # Auto-seed demo data (SDGs, stakeholders, projects, resources)
    try:
        from seed_data import seed_database
        seed_database()
    except Exception as e:
        logger.warning(f"[SEED] Could not seed demo data: {e}")

    # Pre-initialize RAG service (loads embedding model + builds ChromaDB index)
    try:
        logger.info("[RAG] Pre-initializing RAG service at startup...")
        from app.database import SessionLocal
        rag_db = SessionLocal()
        ensure_index(rag_db)
        rag_db.close()
        logger.info("[RAG] RAG service ready")
    except Exception as e:
        logger.warning(f"[RAG] Could not pre-initialize: {e}")

    logger.info("[SCHEDULER] Starting background report scheduler (every day at 8:00 AM)...")
    logger.info(f"[SCHEDULER] Will send daily report at {SEND_HOUR:02d}:{SEND_MINUTE:02d} UTC")
    thread = threading.Thread(target=run_scheduled_report, daemon=True)
    thread.start()


@app.get("/")
def root():
    return {"message": "SARAI API is running"}
@app.get("/health")
def health_check():
    return {"status": "ok", "version": "1.0.0"}