from sqlalchemy import create_engine, text
from urllib.parse import quote_plus

password = "0000"
db_name = "SARAI_DB"

DATABASE_URL = f"postgresql+psycopg://postgres:{quote_plus(password)}@localhost:5432/{db_name}"

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    result = conn.execute(text("""
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'projects' 
        ORDER BY ordinal_position
    """))
    print("=== Structure de la table projects ===")
    for row in result:
        print(f"  {row[0]}: {row[1]} nullable={row[2]}")
    
    print("\n=== Contrainte Foreign Key ===")
    result = conn.execute(text("""
        SELECT tc.constraint_name, kcu.column_name, ccu.column_name AS foreign_column
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'projects' AND tc.constraint_type = 'FOREIGN KEY'
    """))
    for row in result:
        print(f"  {row[0]}: {row[1]} -> countries.{row[2]}")
    
    print("\n=== Sample de données ===")
    result = conn.execute(text("""
        SELECT p.id, p.title, p.country_id, c.country 
        FROM projects p 
        JOIN countries c ON p.country_id = c.id 
        LIMIT 3
    """))
    for row in result:
        print(f"  {row[0]}: {row[1]} -> {row[3]} (country_id={row[2]})")