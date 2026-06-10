from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models.country import Country
from urllib.parse import quote_plus

password = "0000"
db_name = "SARAI_DB"

DATABASE_URL = f"postgresql+psycopg://postgres:{quote_plus(password)}@localhost:5432/{db_name}"

def get_flag_url(code: str) -> str:
    return f"https://flagcdn.com/w320/{code.lower()}.png"

def migrate_and_seed():
    try:
        engine = create_engine(DATABASE_URL)
        print("Connecting to database...")
        conn = engine.connect()
        print("Connected!")

        print("Dropping old flag_code column...")
        try:
            conn.execute(text("ALTER TABLE countries DROP COLUMN IF EXISTS flag_code;"))
            conn.commit()
            print("flag_code column dropped.")
        except Exception as e:
            print(f"Note: {e}")

        print("Adding icon_url column...")
        try:
            conn.execute(text("ALTER TABLE countries ADD COLUMN icon_url VARCHAR(500);"))
            conn.commit()
            print("icon_url column added.")
        except Exception as e:
            print(f"Note: {e}")

        Base.metadata.create_all(bind=engine)

        Session = sessionmaker(bind=engine)
        session = Session()

        if session.query(Country).count() > 0:
            print("Countries table already populated. Skipping...")
            session.close()
            conn.close()
            return

        countries = [
            Country(id=1, country="Algeria", latitude=36.7539, longitude=3.0588, region="North Africa", icon_url=get_flag_url("dz")),
            Country(id=2, country="Bahrain", latitude=26.0667, longitude=50.5580, region="Gulf", icon_url=get_flag_url("bh")),
            Country(id=3, country="Comoros", latitude=-11.6455, longitude=43.3333, region="Horn of Africa", icon_url=get_flag_url("km")),
            Country(id=4, country="Djibouti", latitude=11.8251, longitude=42.5903, region="Horn of Africa", icon_url=get_flag_url("dj")),
            Country(id=5, country="Egypt", latitude=26.8206, longitude=30.8025, region="North Africa", icon_url=get_flag_url("eg")),
            Country(id=6, country="Iraq", latitude=33.3152, longitude=44.3661, region="Levant", icon_url=get_flag_url("iq")),
            Country(id=7, country="Jordan", latitude=31.9539, longitude=35.9106, region="Levant", icon_url=get_flag_url("jo")),
            Country(id=8, country="Kuwait", latitude=29.3759, longitude=47.9774, region="Gulf", icon_url=get_flag_url("kw")),
            Country(id=9, country="Lebanon", latitude=33.8540, longitude=35.8620, region="Levant", icon_url=get_flag_url("lb")),
            Country(id=10, country="Libya", latitude=26.3351, longitude=17.2283, region="North Africa", icon_url=get_flag_url("ly")),
            Country(id=11, country="Mauritania", latitude=21.0079, longitude=-10.9517, region="North Africa", icon_url=get_flag_url("mr")),
            Country(id=12, country="Morocco", latitude=33.5731, longitude=-7.5898, region="North Africa", icon_url=get_flag_url("ma")),
            Country(id=13, country="Oman", latitude=21.5130, longitude=55.9230, region="Gulf", icon_url=get_flag_url("om")),
            Country(id=14, country="Palestine", latitude=31.9520, longitude=35.2330, region="Levant", icon_url=get_flag_url("ps")),
            Country(id=15, country="Qatar", latitude=25.2854, longitude=51.5310, region="Gulf", icon_url=get_flag_url("qa")),
            Country(id=16, country="Saudi Arabia", latitude=24.6877, longitude=46.7219, region="Gulf", icon_url=get_flag_url("sa")),
            Country(id=17, country="Somalia", latitude=5.1521, longitude=46.1996, region="Horn of Africa", icon_url=get_flag_url("so")),
            Country(id=18, country="Sudan", latitude=12.8628, longitude=30.2176, region="North Africa", icon_url=get_flag_url("sd")),
            Country(id=19, country="Syria", latitude=34.8021, longitude=38.7960, region="Levant", icon_url=get_flag_url("sy")),
            Country(id=20, country="Tunisia", latitude=36.8190, longitude=10.1658, region="North Africa", icon_url=get_flag_url("tn")),
            Country(id=21, country="United Arab Emirates", latitude=25.3463, longitude=55.4209, region="Gulf", icon_url=get_flag_url("ae")),
            Country(id=22, country="Yemen", latitude=15.5527, longitude=48.5164, region="Arabian Peninsula", icon_url=get_flag_url("ye")),
        ]

        session.add_all(countries)
        session.commit()
        print(f"Successfully inserted {len(countries)} Arab countries!")

        session.close()
        conn.close()
        print("Done!")

    except Exception as e:
        print(f"Error: {e}")
        print("\nMake sure your PostgreSQL credentials are correct.")

if __name__ == "__main__":
    migrate_and_seed()