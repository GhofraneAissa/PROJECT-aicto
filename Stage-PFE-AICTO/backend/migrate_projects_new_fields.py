from app.database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        columns_to_add = [
            ("year_of_implementation", "ALTER TABLE projects ADD COLUMN year_of_implementation INTEGER"),
            ("use_case_type", "ALTER TABLE projects ADD COLUMN use_case_type VARCHAR(100)"),
            ("ai_strategy_alignment", "ALTER TABLE projects ADD COLUMN ai_strategy_alignment VARCHAR(255)"),
            ("arab_ai_strategy_2023_compliance", "ALTER TABLE projects ADD COLUMN arab_ai_strategy_2023_compliance VARCHAR(3)"),
            ("ethical_ai_compliance", "ALTER TABLE projects ADD COLUMN ethical_ai_compliance VARCHAR(3)"),
            ("datasets_used", "ALTER TABLE projects ADD COLUMN datasets_used TEXT"),
            ("open_source", "ALTER TABLE projects ADD COLUMN open_source VARCHAR(3)"),
            ("github_repo_link", "ALTER TABLE projects ADD COLUMN github_repo_link VARCHAR(500)"),
            ("model_type", "ALTER TABLE projects ADD COLUMN model_type VARCHAR(100)"),
            ("accuracy_metrics", "ALTER TABLE projects ADD COLUMN accuracy_metrics TEXT"),
            ("uploaded_documents", "ALTER TABLE projects ADD COLUMN uploaded_documents TEXT"),
            ("presentations", "ALTER TABLE projects ADD COLUMN presentations TEXT"),
        ]

        for col_name, sql in columns_to_add:
            exists = conn.execute(text(f"""
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'projects' AND column_name = '{col_name}'
            """)).fetchone()

            if exists:
                print(f"  SKIP: Column '{col_name}' already exists")
            else:
                conn.execute(text(sql))
                conn.commit()
                print(f"  ADDED: Column '{col_name}'")

    print("Migration complete.")

if __name__ == "__main__":
    migrate()
