from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models.project import Project
from app.models.resource import Resource
from app.models.stakeholder import Stakeholder
from app.models.country import Country
from app.models.sdg import SDG
from urllib.parse import quote_plus

password = "0000"
db_name = "SARAI_DB"

DATABASE_URL = f"postgresql+psycopg://postgres:{quote_plus(password)}@localhost:5432/{db_name}"

def init_database():
    try:
        engine = create_engine(DATABASE_URL)
        print("Connecting to database...")
        conn = engine.connect()
        print("Connected!")
        
        print("Creating tables...")
        Base.metadata.create_all(bind=engine)
        print("Tables created successfully!")
        
        Session = sessionmaker(bind=engine)
        session = Session()
        
        if session.query(SDG).count() == 0:
            sdg_data = [
                SDG(goal_number=1, title="No Poverty", color="#e5243b", image_url=""),
                SDG(goal_number=2, title="Zero Hunger", color="#dda63a", image_url=""),
                SDG(goal_number=3, title="Good Health and Well-being", color="#4c9f38", image_url=""),
                SDG(goal_number=4, title="Quality Education", color="#c5192d", image_url=""),
                SDG(goal_number=5, title="Gender Equality", color="#ff3a21", image_url=""),
                SDG(goal_number=6, title="Clean Water and Sanitation", color="#26bde2", image_url=""),
                SDG(goal_number=7, title="Affordable and Clean Energy", color="#fcc30b", image_url=""),
                SDG(goal_number=8, title="Decent Work and Economic Growth", color="#a21942", image_url=""),
                SDG(goal_number=9, title="Industry, Innovation and Infrastructure", color="#fd6925", image_url=""),
                SDG(goal_number=10, title="Reduced Inequalities", color="#dd1367", image_url=""),
                SDG(goal_number=11, title="Sustainable Cities and Communities", color="#fd9d24", image_url=""),
                SDG(goal_number=12, title="Responsible Consumption and Production", color="#bf8b2e", image_url=""),
                SDG(goal_number=13, title="Climate Action", color="#3f7e44", image_url=""),
                SDG(goal_number=14, title="Life Below Water", color="#0a97d9", image_url=""),
                SDG(goal_number=15, title="Life on Land", color="#56c02b", image_url=""),
                SDG(goal_number=16, title="Peace, Justice and Strong Institutions", color="#00689d", image_url=""),
                SDG(goal_number=17, title="Partnerships for the Goals", color="#19486a", image_url=""),
            ]
            session.add_all(sdg_data)
            session.commit()
            print("SDG data inserted!")

        if session.query(Project).count() == 0:
            sdg_map = {s.goal_number: s.id for s in session.query(SDG).all()}
            projects = [
                Project(title="Egyptian NLP Initiative", organization="AIN", country="Egypt", sector="EduTech", technology="NLP", sdg_id=sdg_map.get(4), description="AI-powered Arabic language learning", website="https://ain.eg", status="active"),
                Project(title="Morocco Smart Health", organization="MoH", country="Morocco", sector="Health", technology="Computer Vision", sdg_id=sdg_map.get(3), description="Medical imaging AI system", website="https://moh.ma", status="active"),
                Project(title="Jordan AgriTech AI", organization="JFDA", country="Jordan", sector="AgriTech", technology="Machine Learning", sdg_id=sdg_map.get(2), description="Crop prediction system", website="https://jfda.jo", status="active"),
            ]
            
            resources = [
                Resource(title="AI Ethics Guidelines", type="Policy Document", category="Ethics", language="Arabic", description="National AI ethics framework", file_url="https://example.com/ethics.pdf"),
                Resource(title="Arabic NLP Dataset", type="Dataset", category="Data", language="Arabic", description="Large Arabic text corpus", file_url="https://example.com/nlp.zip"),
                Resource(title="AI Governance Report", type="Report", category="Governance", language="English", description="Annual AI governance report", file_url="https://example.com/report.pdf"),
            ]
            
            stakeholders = [
                Stakeholder(name="Cairo University AI Lab", type="Research Lab", category="Academic", country="Egypt", website="https://ai.cu.edu.eg", description="Leading AI research in Egypt", contact_email="ai@cu.edu.eg"),
                Stakeholder(name="InnoTech Morocco", type="Startup", category="Private", country="Morocco", website="https://innotech.ma", description="AI startup focusing on NLP", contact_email="hello@innotech.ma"),
                Stakeholder(name="Jordan Ministry of Digital Economy", type="Government", category="Government", country="Jordan", website="https://mde.gov.jo", description="Government body for digital transformation", contact_email="info@mde.gov.jo"),
            ]
            
            session.add_all(projects + resources + stakeholders)
            session.commit()
            print("Sample data inserted!")
        
        if session.query(Country).count() == 0:
            countries = [
                Country(country="Algeria", latitude=36.737200, longitude=3.086500, region="North Africa", flag_code="DZ"),
                Country(country="Bahrain", latitude=26.066000, longitude=50.558000, region="Gulf", flag_code="BH"),
                Country(country="Djibouti", latitude=11.825000, longitude=42.590000, region="Horn of Africa", flag_code="DJ"),
                Country(country="Egypt", latitude=26.820000, longitude=30.802000, region="North Africa", flag_code="EG"),
                Country(country="Iraq", latitude=33.315200, longitude=44.366100, region="Levant", flag_code="IQ"),
                Country(country="Jordan", latitude=31.953900, longitude=35.910600, region="Levant", flag_code="JO"),
                Country(country="Kuwait", latitude=29.375900, longitude=47.977400, region="Gulf", flag_code="KW"),
                Country(country="Lebanon", latitude=33.854000, longitude=35.862000, region="Levant", flag_code="LB"),
                Country(country="Libya", latitude=26.335000, longitude=17.228000, region="North Africa", flag_code="LY"),
                Country(country="Mauritania", latitude=21.007900, longitude=-10.951700, region="North Africa", flag_code="MR"),
                Country(country="Morocco", latitude=33.573100, longitude=-7.589800, region="North Africa", flag_code="MA"),
                Country(country="Oman", latitude=21.513000, longitude=55.923000, region="Gulf", flag_code="OM"),
                Country(country="Palestine", latitude=31.952000, longitude=35.233000, region="Levant", flag_code="PS"),
                Country(country="Qatar", latitude=25.285400, longitude=51.531000, region="Gulf", flag_code="QA"),
                Country(country="Saudi Arabia", latitude=24.687700, longitude=46.721900, region="Gulf", flag_code="SA"),
                Country(country="Somalia", latitude=5.163300, longitude=46.203700, region="Horn of Africa", flag_code="SO"),
                Country(country="Sudan", latitude=40.298000, longitude=-74.521000, region="North Africa", flag_code="SD"),
                Country(country="Tunisia", latitude=36.819000, longitude=10.165800, region="North Africa", flag_code="TN"),
                Country(country="United Arab Emirates", latitude=25.346300, longitude=55.420900, region="Gulf", flag_code="AE"),
                Country(country="Yemen", latitude=15.552000, longitude=48.516000, region="Arabian Peninsula", flag_code="YE"),
            ]
            session.add_all(countries)
            session.commit()
            print("Countries data inserted!")
        
        session.close()
        conn.close()
        print("Done!")
        
    except Exception as e:
        print(f"Error: {e}")
        print("\nMake sure your PostgreSQL credentials are correct.")
        print("You can check pgAdmin4 connection settings.")

if __name__ == "__main__":
    init_database()