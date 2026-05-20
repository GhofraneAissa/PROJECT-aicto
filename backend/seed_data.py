from sqlalchemy.orm import Session
from app.database import engine, Base, SessionLocal
from app.models.stakeholder import Stakeholder
from app.models.project import Project
from app.models.resource import Resource

# Sample data
stakeholders_data = [
    {"name": "Dubai AI Center", "type": "Research Lab", "category": "Research", "country": "UAE", "description": "Leading AI research center focusing on computer vision and NLP.", "website": "https://dubaiai.ae"},
    {"name": "Cairo University AI Lab", "type": "University", "category": "Education", "country": "Egypt", "description": "Academic research lab specializing in machine learning.", "website": "https://cu.edu.eg"},
    {"name": "Saudi Data Authority", "type": "Government", "category": "Government", "country": "Saudi Arabia", "description": "National authority for data and AI governance.", "website": "https://sda.gov.sa"},
    {"name": "TechVenture Morocco", "type": "Startup", "category": "Private", "country": "Morocco", "description": "AI startup focused on FinTech solutions.", "website": "https://techventure.ma"},
    {"name": "Jordan AI Association", "type": "NGO", "category": "Civil Society", "country": "Jordan", "description": "Promoting AI adoption across industries in Jordan.", "website": "https://joai.org"},
    {"name": "Qatar Computing Research Institute", "type": "Research Lab", "category": "Research", "country": "Qatar", "description": "World-class research center in computing.", "website": "https://qatar.tamu.edu"},
    {"name": "Kuwait AI Initiative", "type": "Government", "category": "Government", "country": "Kuwait", "description": "National AI strategy implementation body.", "website": "https://ai.gov.kw"},
    {"name": "Tunisian AI Hub", "type": "Startup", "category": "Private", "country": "Tunisia", "description": "AI innovation hub and accelerator.", "website": "https://tunisia-ai.com"},
    {"name": "Emirates AI Lab", "type": "Research Lab", "category": "Research", "country": "UAE", "description": "Advanced AI research laboratory.", "website": "https://emiratesailab.ae"},
    {"name": "Alexandria University AI Center", "type": "University", "category": "Education", "country": "Egypt", "description": "AI research and education center.", "website": "https://alexu.edu.eg"},
]

projects_data = [
    {"title": "AI Diagnostic System", "organization": "Cairo University", "country": "Egypt", "sector": "Health", "technology": "Computer Vision", "sdg_alignment": "SDG 3: Good Health", "description": "AI-powered medical imaging analysis for early disease detection."},
    {"title": "Smart Irrigation System", "organization": "AgriTech Solutions", "country": "Morocco", "sector": "AgriTech", "technology": "Machine Learning", "sdg_alignment": "SDG 2: Zero Hunger", "description": "IoT and AI-based precision agriculture solution."},
    {"title": "Adaptive Learning Platform", "organization": "EduCorp", "country": "UAE", "sector": "EduTech", "technology": "NLP", "sdg_alignment": "SDG 4: Quality Education", "description": "Personalized AI tutor for K-12 students."},
    {"title": "Traffic Management AI", "organization": "Smart City Dept", "country": "Saudi Arabia", "sector": "Transportation", "technology": "Computer Vision", "sdg_alignment": "SDG 11: Sustainable Cities", "description": "Real-time traffic optimization using AI."},
    {"title": "Financial Fraud Detection", "organization": "FinTech Labs", "country": "UAE", "sector": "Finance", "technology": "Machine Learning", "sdg_alignment": "SDG 8: Decent Work", "description": "AI system for detecting financial fraud in real-time."},
    {"title": "Arabic Speech Recognition", "organization": "Qatar Computing Research Institute", "country": "Qatar", "sector": "Technology", "technology": "Speech Recognition", "sdg_alignment": "SDG 9: Industry Innovation", "description": "Advanced Arabic speech recognition system."},
    {"title": "Renewable Energy Optimizer", "organization": "Green Tech", "country": "Jordan", "sector": "Energy", "technology": "Machine Learning", "sdg_alignment": "SDG 7: Affordable Energy", "description": "AI optimization for solar and wind energy systems."},
    {"title": "Water Quality Monitoring", "organization": "Environmental AI", "country": "Tunisia", "sector": "Environment", "technology": "IoT", "sdg_alignment": "SDG 6: Clean Water", "description": "AI-based water quality monitoring system."},
]

resources_data = [
    {"title": "Arab Common AI Strategy 2023", "type": "Policy Document", "category": "Strategy", "language": "Arabic/English", "file_size": "2.4 MB", "description": "Official Arab Common AI Strategy document."},
    {"title": "AI Ethics Guidelines Framework", "type": "White Paper", "category": "Ethics", "language": "English", "file_size": "1.8 MB", "description": "Comprehensive AI ethics guidelines for the Arab region."},
    {"title": "Arabic NLP Dataset v2.0", "type": "Dataset", "category": "Data", "language": "Arabic", "file_size": "450 MB", "description": "Large-scale Arabic NLP dataset for machine learning."},
    {"title": "Regional AI Maturity Assessment Report", "type": "Report", "category": "Research", "language": "English", "file_size": "5.2 MB", "description": "Annual assessment of AI maturity across Arab countries."},
    {"title": "AI Governance Best Practices", "type": "White Paper", "category": "Governance", "language": "English", "file_size": "1.2 MB", "description": "Best practices for AI governance and regulation."},
]

def seed_database():
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if data already exists
        existing_stakeholders = db.query(Stakeholder).first()
        if existing_stakeholders:
            print("Database already seeded!")
            return
        
        # Add stakeholders
        for s in stakeholders_data:
            db_stakeholder = Stakeholder(**s)
            db.add(db_stakeholder)
        
        # Add projects
        for p in projects_data:
            db_project = Project(**p)
            db.add(db_project)
        
        # Add resources
        for r in resources_data:
            db_resource = Resource(**r)
            db.add(db_resource)
        
        db.commit()
        print("Database seeded successfully!")
        print(f"- {len(stakeholders_data)} stakeholders added")
        print(f"- {len(projects_data)} projects added")
        print(f"- {len(resources_data)} resources added")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()