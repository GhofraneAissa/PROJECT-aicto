# SARAI Backend API

## Installation

```bash
# Create virtual environment (optional but recommended)
python -m venv venv
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt
```

## Seed Database with Sample Data

```bash
python seed_data.py
```

## Run Server

```bash
uvicorn main:app --reload --port 8000
```

## API Documentation

- **URL**: http://localhost:8000
- **Swagger Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Endpoints

### Stakeholders
- `GET /api/stakeholders/` - List all stakeholders
- `GET /api/stakeholders/{id}` - Get stakeholder by ID
- `POST /api/stakeholders/` - Create stakeholder
- `PUT /api/stakeholders/{id}` - Update stakeholder
- `DELETE /api/stakeholders/{id}` - Delete stakeholder

### Projects
- `GET /api/projects/` - List all projects
- `GET /api/projects/{id}` - Get project by ID
- `POST /api/projects/` - Create project
- `PUT /api/projects/{id}` - Update project
- `DELETE /api/projects/{id}` - Delete project

### Resources
- `GET /api/resources/` - List all resources
- `GET /api/resources/{id}` - Get resource by ID
- `POST /api/resources/` - Create resource
- `PUT /api/resources/{id}` - Update resource
- `DELETE /api/resources/{id}` - Delete resource

### Analytics
- `GET /api/analytics/overview` - Overview statistics
- `GET /api/analytics/projects-by-sector` - Projects grouped by sector
- `GET /api/analytics/projects-by-technology` - Projects grouped by technology
- `GET /api/analytics/projects-by-country` - Projects grouped by country
- `GET /api/analytics/stakeholders-by-type` - Stakeholders grouped by type
- `GET /api/analytics/stakeholders-by-country` - Stakeholders grouped by country