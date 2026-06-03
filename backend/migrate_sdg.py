"""
Migration script:
1. Populate the sdg table with the 17 UN SDGs
2. Add sdg_id column to projects table
3. Migrate existing sdg_alignment text values to sdg_id foreign keys
4. (Optionally drop sdg_alignment column)
"""
from sqlalchemy import create_engine, text
from urllib.parse import quote_plus

password = "0000"
db_name = "SARAI_DB"
DATABASE_URL = f"postgresql+psycopg://postgres:{quote_plus(password)}@localhost:5432/{db_name}"

SDGS = [
    {"goal_number": 1,  "title": "No Poverty",                          "color": "#e5243b", "image_url": "https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-01.jpg"},
    {"goal_number": 2,  "title": "Zero Hunger",                         "color": "#dda63a", "image_url": "https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-02.jpg"},
    {"goal_number": 3,  "title": "Good Health and Well-being",          "color": "#4c9f38", "image_url": "https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-03.jpg"},
    {"goal_number": 4,  "title": "Quality Education",                   "color": "#c5192d", "image_url": "https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-04.jpg"},
    {"goal_number": 5,  "title": "Gender Equality",                     "color": "#ff3a21", "image_url": "https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-05.jpg"},
    {"goal_number": 6,  "title": "Clean Water and Sanitation",          "color": "#26bde2", "image_url": "https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-06.jpg"},
    {"goal_number": 7,  "title": "Affordable and Clean Energy",         "color": "#fcc30b", "image_url": "https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-07.jpg"},
    {"goal_number": 8,  "title": "Decent Work and Economic Growth",     "color": "#a21942", "image_url": "https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-08.jpg"},
    {"goal_number": 9,  "title": "Industry, Innovation and Infrastructure", "color": "#fd6925", "image_url": "https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-09.jpg"},
    {"goal_number": 10, "title": "Reduced Inequalities",                "color": "#dd1367", "image_url": "https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-10.jpg"},
    {"goal_number": 11, "title": "Sustainable Cities and Communities",  "color": "#fd9d24", "image_url": "https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-11.jpg"},
    {"goal_number": 12, "title": "Responsible Consumption and Production", "color": "#bf8b2e", "image_url": "https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-12.jpg"},
    {"goal_number": 13, "title": "Climate Action",                      "color": "#3f7e44", "image_url": "https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-13.jpg"},
    {"goal_number": 14, "title": "Life Below Water",                    "color": "#0a97d9", "image_url": "https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-14.jpg"},
    {"goal_number": 15, "title": "Life on Land",                        "color": "#56c02b", "image_url": "https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-15.jpg"},
    {"goal_number": 16, "title": "Peace, Justice and Strong Institutions", "color": "#00689d", "image_url": "https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-16.jpg"},
    {"goal_number": 17, "title": "Partnerships for the Goals",          "color": "#19486a", "image_url": "https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-17.jpg"},
]

def migrate():
    engine = create_engine(DATABASE_URL)
    conn = engine.connect()
    trans = conn.begin()
    try:
        # 1. Populate sdg table if empty
        existing = conn.execute(text("SELECT COUNT(*) FROM sdg")).scalar()
        if existing == 0:
            for sdg in SDGS:
                conn.execute(
                    text("INSERT INTO sdg (goal_number, title, color, image_url) VALUES (:goal_number, :title, :color, :image_url)"),
                    sdg
                )
            print(f"Inserted {len(SDGS)} SDGs")
        else:
            print(f"SDG table already has {existing} rows, skipping insert")

        # 2. Add sdg_id column if not exists
        cols = [row[0] for row in conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='projects'")).fetchall()]
        if "sdg_id" not in cols:
            conn.execute(text("ALTER TABLE projects ADD COLUMN sdg_id INTEGER REFERENCES sdg(id) ON DELETE SET NULL"))
            print("Added sdg_id column to projects")
        else:
            print("sdg_id column already exists")

        # 3. Migrate existing sdg_alignment text → sdg_id
        rows = conn.execute(
            text("SELECT p.id, p.sdg_alignment FROM projects p WHERE p.sdg_alignment IS NOT NULL AND p.sdg_alignment != '' AND p.sdg_id IS NULL")
        ).fetchall()

        migrated = 0
        for (pid, raw) in rows:
            raw = raw.strip()
            if not raw:
                continue
            # Extract goal number from strings like "SDG 3: Good Health", "SDG4", "SDG 15: Vie terrestre", "3", etc.
            import re
            nums = re.findall(r'\d+', raw)
            if nums:
                goal_num = int(nums[0])
                sdg = conn.execute(
                    text("SELECT id FROM sdg WHERE goal_number = :gn"),
                    {"gn": goal_num}
                ).fetchone()
                if sdg:
                    conn.execute(
                        text("UPDATE projects SET sdg_id = :sid WHERE id = :pid"),
                        {"sid": sdg[0], "pid": pid}
                    )
                    migrated += 1

        print(f"Migrated {migrated} projects with sdg_id")

        trans.commit()
        print("Migration completed successfully!")
    except Exception as e:
        trans.rollback()
        print(f"Migration failed: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
