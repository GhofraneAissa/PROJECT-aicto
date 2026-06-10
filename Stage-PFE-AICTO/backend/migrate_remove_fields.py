from app.database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        # Drop columns one by one
        columns_to_drop = [
            "use_case_type",
            "ai_strategy_alignment",
            "arab_ai_strategy_2023_compliance",
            "ethical_ai_compliance",
            "datasets_used",
            "open_source",
            "github_repo_link",
            "model_type",
            "accuracy_metrics",
            "presentations"
        ]
        
        for column in columns_to_drop:
            try:
                conn.execute(text(f"ALTER TABLE projects DROP COLUMN IF EXISTS {column}"))
                print(f"Dropped column: {column}")
            except Exception as e:
                print(f"Error dropping {column}: {e}")
        
        conn.commit()
        print("Migration completed successfully!")

if __name__ == "__main__":
    migrate()
