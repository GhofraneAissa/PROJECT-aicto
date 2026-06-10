"""
Migration: Add is_active and activation_token columns to users table.
Run with: python migrate_add_activation.py
"""

import logging
from app.database import engine
from sqlalchemy import text, inspect

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def run_migration():
    inspector = inspect(engine)
    columns = [col["name"] for col in inspector.get_columns("users")]

    with engine.connect() as conn:
        if "is_active" not in columns:
            logger.info("Adding column 'is_active' to users table...")
            conn.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT FALSE"))
            logger.info("✓ Column 'is_active' added.")
        else:
            logger.info("Column 'is_active' already exists.")

        if "activation_token" not in columns:
            logger.info("Adding column 'activation_token' to users table...")
            conn.execute(text("ALTER TABLE users ADD COLUMN activation_token VARCHAR(100) NULL"))
            conn.execute(text("CREATE UNIQUE INDEX idx_users_activation_token ON users(activation_token)"))
            logger.info("✓ Column 'activation_token' added with index.")
        else:
            logger.info("Column 'activation_token' already exists.")

        conn.commit()
        logger.info("Migration completed successfully.")


if __name__ == "__main__":
    run_migration()
