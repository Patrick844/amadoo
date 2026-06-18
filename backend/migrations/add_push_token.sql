-- Add push_token column to users table
-- Run once: psql $DATABASE_URL -f migrations/add_push_token.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT;
