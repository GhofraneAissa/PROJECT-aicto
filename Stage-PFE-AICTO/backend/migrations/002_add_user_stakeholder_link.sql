-- Migration: Add stakeholder_id to users table
-- Run this against your PostgreSQL database
-- psql -d SARAI_DB -f backend/migrations/002_add_user_stakeholder_link.sql
-- Or run from within psql: \i backend/migrations/002_add_user_stakeholder_link.sql

BEGIN;

ALTER TABLE users
ADD COLUMN stakeholder_id INTEGER REFERENCES stakeholders(id) ON DELETE SET NULL;

-- Backfill: link existing approved users to their stakeholders
UPDATE users u
SET stakeholder_id = s.id
FROM stakeholders s
WHERE (s.name = u.organization_name OR s.contact_email = u.email)
  AND u.is_approved = TRUE
  AND u.stakeholder_id IS NULL;

CREATE INDEX idx_users_stakeholder_id ON users(stakeholder_id);

COMMIT;
