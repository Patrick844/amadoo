-- Dating-intent goal (relationship type the user is after).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dating_goal TEXT;
