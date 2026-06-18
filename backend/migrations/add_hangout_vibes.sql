-- Friends/hangout-intent vibes (what kind of hanging out the user is into).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hangout_vibes TEXT[] DEFAULT '{}';
