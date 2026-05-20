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
from app.routers import stakeholders, projects, resources, analytics, countries, users, sdgs, search, admin, chat, contact
import os

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
@app.get("/")
def root():
    return {"message": "SARAI API is running"}
@app.get("/health")
def health_check():
    return {"status": "ok", "version": "1.0.0"}