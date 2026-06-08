from app.database import engine
from sqlalchemy import text


def migrate():
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'resources' AND column_name = 'user_id'
        """))
        row = result.fetchone()

        if row:
            print("Column 'user_id' already exists in 'resources' table.")
            return

        conn.execute(text("""
            ALTER TABLE resources
            ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
        """))
        conn.commit()
        print("Added 'user_id' column to 'resources' table.")

        result = conn.execute(text("""
            SELECT indexname FROM pg_indexes
            WHERE tablename = 'resources' AND indexname = 'idx_resources_user_id'
        """))
        if not result.fetchone():
            conn.execute(text("CREATE INDEX idx_resources_user_id ON resources(user_id)"))
            conn.commit()
            print("Created index 'idx_resources_user_id'.")

    print("Migration complete.")


if __name__ == "__main__":
    migrate()
