-- Multi-intent connection types: what each user is on Amadoo for.
-- Values: 'dating' | 'friends' | 'business' | 'activity'
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS intents TEXT[] DEFAULT '{}';

-- Backfill existing profiles to dating-only so they keep matching as before.
UPDATE profiles
SET intents = ARRAY['dating']
WHERE intents IS NULL OR cardinality(intents) = 0;
