"""
Migration script to add reset_token and reset_token_expiry to users table
Run: cd backend && python migrate_add_reset_token.py
"""
from sqlalchemy import create_engine, text
from urllib.parse import quote_plus
import os

password = os.getenv("DB_PASSWORD", "0000")
db_user = os.getenv("DB_USER", "postgres")
db_host = os.getenv("DB_HOST", "localhost")
db_port = os.getenv("DB_PORT", "5432")
db_name = os.getenv("DB_NAME", "SARAI_DB")

DATABASE_URL = f"postgresql+psycopg://{db_user}:{quote_plus(password)}@{db_host}:{db_port}/{db_name}"

def migrate():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name IN ('reset_token', 'reset_token_expiry')
        """))
        existing = [row[0] for row in result.fetchall()]

        if 'reset_token' not in existing:
            conn.execute(text("ALTER TABLE users ADD COLUMN reset_token VARCHAR(100) UNIQUE"))
            conn.execute(text("CREATE INDEX idx_users_reset_token ON users(reset_token)"))
            print("[OK] Added reset_token column")
        
        if 'reset_token_expiry' not in existing:
            conn.execute(text("ALTER TABLE users ADD COLUMN reset_token_expiry TIMESTAMP WITH TIME ZONE"))
            print("[OK] Added reset_token_expiry column")
        
        conn.commit()
        print("[OK] Migration completed!")

if __name__ == "__main__":
    migrate()
