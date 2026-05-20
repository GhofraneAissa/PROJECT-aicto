from sqlalchemy import create_engine, text
from urllib.parse import quote_plus

password = "0000"
db_name = "SARAI_DB"

DATABASE_URL = f"postgresql+psycopg://postgres:{quote_plus(password)}@localhost:5432/{db_name}"

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    print("1. Ajout de la colonne country_id...")
    conn.execute(text("""
        ALTER TABLE projects ADD COLUMN country_id INTEGER
    """))
    conn.commit()
    
    print("2. Migration des données existantes...")
    conn.execute(text("""
        UPDATE projects p
        SET country_id = c.id
        FROM countries c
        WHERE p.country = c.country
    """))
    conn.commit()
    
    print("3. Ajout de la contrainte Foreign Key...")
    conn.execute(text("""
        ALTER TABLE projects
        ADD CONSTRAINT fk_projects_country
        FOREIGN KEY (country_id) REFERENCES countries(id)
        ON DELETE SET NULL ON UPDATE CASCADE
    """))
    conn.commit()
    
    print("4. Suppression de l'ancienne colonne country...")
    conn.execute(text("ALTER TABLE projects DROP COLUMN country"))
    conn.commit()
    
    print("5. Création de l'index...")
    conn.execute(text("CREATE INDEX idx_projects_country_id ON projects(country_id)"))
    conn.commit()
    
    print("Migration terminée avec succès!")