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
from app.routers import stakeholders, projects, resources, analytics, countries, users, sdgs, search, admin, chat, contact, report
import os
import threading
import time
from datetime import datetime
from app.services.pdf_report_service import generate_pdf_report
from app.services.email_service import send_report_email

REPORT_RECIPIENT = os.getenv("REPORT_EMAIL", "aissaghofrane1@gmail.com")
REPORT_INTERVAL_SECONDS = 60  # Every minute

# Import tous les modèles AVANT create_all
from app.models.user import User
from app.models.project import Project
from app.models.stakeholder import Stakeholder
from app.models.resource import Resource
from app.models.country import Country
from app.models.sdg import SDG

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
        conn.commit()
except Exception as e:
    logger.error(f"[DB] ERROR: {e}")
app = FastAPI(
    title="SARAI API",
    description="Stocktaking of Arab Regional AI Initiatives - Backend API",
    version="1.0.0"
)

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


# ── Background scheduler: send report every minute ──
def run_scheduled_report():
    """Background thread that generates the PDF report and sends it every REPORT_INTERVAL_SECONDS."""
    while True:
        try:
            now = datetime.utcnow()
            current_year = now.year
            logger.info(f"[SCHEDULER] Generating PDF report for year {current_year}...")
            pdf_bytes = generate_pdf_report(current_year)
            logger.info(f"[SCHEDULER] PDF generated: {len(pdf_bytes)} bytes")
            sent = send_report_email(REPORT_RECIPIENT, pdf_bytes, current_year)
            if sent:
                logger.info(f"[SCHEDULER] Report {current_year} sent to {REPORT_RECIPIENT}")
            else:
                logger.warning(f"[SCHEDULER] Failed to send report {current_year}")
        except Exception as e:
            logger.error(f"[SCHEDULER] Error in scheduled report: {e}")
        time.sleep(REPORT_INTERVAL_SECONDS)


@app.on_event("startup")
def startup_event():
    logger.info("[SCHEDULER] Starting background report scheduler (every 60 seconds)...")
    thread = threading.Thread(target=run_scheduled_report, daemon=True)
    thread.start()


@app.get("/")
def root():
    return {"message": "SARAI API is running"}
@app.get("/health")
def health_check():
    return {"status": "ok", "version": "1.0.0"}