from app.database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT column_name, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'projects' AND column_name = 'user_id'
        """))
        row = result.fetchone()

        if not row:
            conn.execute(text("""
                ALTER TABLE projects
                ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
            """))
            conn.commit()
            print("Added 'user_id' column to 'projects' table (nullable).")
            row = ("user_id", "YES")

        if row[1] == "YES":
            first_admin = conn.execute(text("SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1")).fetchone()
            first_user = conn.execute(text("SELECT id FROM users ORDER BY id LIMIT 1")).fetchone()
            default_user_id = first_admin[0] if first_admin else (first_user[0] if first_user else None)

            if default_user_id:
                conn.execute(text(f"""
                    UPDATE projects SET user_id = {default_user_id} WHERE user_id IS NULL
                """))
                conn.commit()
                print(f"Assigned existing projects to user ID {default_user_id}.")
            else:
                print("WARNING: No users found. Cannot set NOT NULL. Insert a user first, then re-run.")
                return

            conn.execute(text("""
                ALTER TABLE projects
                ALTER COLUMN user_id SET NOT NULL
            """))
            conn.commit()
            print("Set 'user_id' column to NOT NULL.")

        result = conn.execute(text("""
            SELECT conname FROM pg_constraint
            WHERE conrelid = 'projects'::regclass AND conname = 'fk_projects_user_id'
        """))
        if not result.fetchone():
            conn.execute(text("""
                ALTER TABLE projects
                ADD CONSTRAINT fk_projects_user_id
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            """))
            conn.commit()
            print("Added foreign key constraint 'fk_projects_user_id'.")

        result = conn.execute(text("""
            SELECT indexname FROM pg_indexes
            WHERE tablename = 'projects' AND indexname = 'idx_projects_user_id'
        """))
        if not result.fetchone():
            conn.execute(text("CREATE INDEX idx_projects_user_id ON projects(user_id)"))
            conn.commit()
            print("Created index 'idx_projects_user_id'.")

    print("Migration complete.")

if __name__ == "__main__":
    migrate()
