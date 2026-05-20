from sqlalchemy import create_engine, text
from urllib.parse import quote_plus

password = "0000"
db_name = "SARAI_DB"

DATABASE_URL = f"postgresql+psycopg://postgres:{quote_plus(password)}@localhost:5432/{db_name}"

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    result = conn.execute(text("SELECT id, title, country_id FROM projects WHERE country_id IS NULL")).fetchall()
    print("=== Projets sans country_id ===")
    if result:
        for r in result:
            print(f"  {r[0]}: {r[1]}")
    else:
        print("  Aucun")
    
    total = conn.execute(text("SELECT COUNT(*) FROM projects")).fetchone()[0]
    print(f"\nTotal projets: {total}")