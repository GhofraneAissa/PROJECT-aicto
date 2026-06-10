"""
Migration script to change the logo column type from VARCHAR(500) to TEXT
Run this script to update the database schema for PostgreSQL
"""
from sqlalchemy import create_engine, text
from urllib.parse import quote_plus
import os

# Database configuration (same as in database/__init__.py)
password = os.getenv("DB_PASSWORD", "0000")
db_user = os.getenv("DB_USER", "postgres")
db_host = os.getenv("DB_HOST", "localhost")
db_port = os.getenv("DB_PORT", "5432")
db_name = os.getenv("DB_NAME", "SARAI_DB")

DATABASE_URL = f"postgresql+psycopg://{db_user}:{quote_plus(password)}@{db_host}:{db_port}/{db_name}"

def migrate():
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        # Check current column type
        result = conn.execute(text("""
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'logo'
        """))
        
        row = result.fetchone()
        if row:
            current_type = row[0]
            print(f"[MIGRATE] Current logo column type: {current_type}")
            
            if current_type.upper() != 'TEXT':
                print("[MIGRATE] Altering logo column to TEXT...")
                conn.execute(text("ALTER TABLE users ALTER COLUMN logo TYPE TEXT"))
                conn.commit()
                print("[MIGRATE] Migration completed successfully!")
            else:
                print("[MIGRATE] Column is already TEXT type, no migration needed.")
        else:
            print("[MIGRATE] Column 'logo' not found or table doesn't exist yet.")

if __name__ == "__main__":
    migrate()
