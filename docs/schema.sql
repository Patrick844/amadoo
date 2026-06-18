-- Amadoo — PostgreSQL Schema
-- Run this once against your database to create all tables.
-- psql -h host -U user -d amadoo -f schema.sql

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "btree_gist"; -- for GIST index on point()

-- ── Users ─────────────────────────────────────────────────────────────────────

CREATE TABLE users (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email             TEXT UNIQUE NOT NULL,
    password_hash     TEXT,                          -- NULL for social-auth-only accounts
    is_email_verified BOOLEAN NOT NULL DEFAULT false,
    is_face_verified  BOOLEAN NOT NULL DEFAULT false,
    is_onboarded      BOOLEAN NOT NULL DEFAULT false,
    role              TEXT NOT NULL DEFAULT 'user',  -- 'user' | 'admin'
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_active       TIMESTAMPTZ
);

-- ── OTP Codes ─────────────────────────────────────────────────────────────────

CREATE TABLE otp_codes (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email      TEXT NOT NULL,
    code_hash  TEXT NOT NULL,
    purpose    TEXT NOT NULL,                        -- 'verify_email' | 'reset_password'
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Social Auth ───────────────────────────────────────────────────────────────

CREATE TABLE social_auth (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider    TEXT NOT NULL,                       -- 'apple' | 'google'
    provider_id TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (provider, provider_id)
);

-- ── Auth Tokens (refresh tokens) ──────────────────────────────────────────────

CREATE TABLE auth_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL,
    device_name TEXT,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at  TIMESTAMPTZ
);

-- ── Profiles ──────────────────────────────────────────────────────────────────

CREATE TABLE profiles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name                TEXT NOT NULL,
    birthday            DATE NOT NULL,
    gender              TEXT NOT NULL,               -- 'male' | 'female'
    bio                 TEXT CHECK (char_length(bio) <= 300),
    school              TEXT,
    job                 TEXT,
    height_cm           INT,
    workout             TEXT,                        -- 'Every day' | '3-5x week' | '1-2x week' | 'Never'
    drinking            TEXT,                        -- 'Never' | 'Socially' | 'Regularly' | 'Often'
    smoking             TEXT,                        -- 'Non-smoker' | 'Occasional' | 'Smoker'
    religion            TEXT,
    vibe                TEXT,
    has_pet             BOOLEAN NOT NULL DEFAULT false,
    hobbies             TEXT[] NOT NULL DEFAULT '{}',
    activities          TEXT[] NOT NULL DEFAULT '{}',
    trips               TEXT[] NOT NULL DEFAULT '{}',
    chill_vibes         TEXT[] NOT NULL DEFAULT '{}',
    want_to_meet        TEXT[] NOT NULL DEFAULT '{}',
    age_range_min       INT NOT NULL DEFAULT 18,
    age_range_max       INT NOT NULL DEFAULT 100,
    latitude            FLOAT,
    longitude           FLOAT,
    location_updated_at TIMESTAMPTZ
);

-- ── Photos ────────────────────────────────────────────────────────────────────

CREATE TABLE photos (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url        TEXT NOT NULL,
    position   INT NOT NULL,                         -- 0 = main photo
    category   TEXT,                                 -- NULL | 'activity' | 'pet' | 'hobbies' | 'trips' | 'chill'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, position)
);

-- ── Face Checks ───────────────────────────────────────────────────────────────

CREATE TABLE face_checks (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    photo_url        TEXT NOT NULL,
    status           TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
    rejection_reason TEXT,
    reviewed_by      UUID REFERENCES users(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at      TIMESTAMPTZ
);

-- ── Swipes ────────────────────────────────────────────────────────────────────

CREATE TABLE swipes (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    swiper_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    swiped_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action     TEXT NOT NULL,                        -- 'like' | 'dislike' | 'super_like'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (swiper_id, swiped_id)
);

-- ── Matches ───────────────────────────────────────────────────────────────────

CREATE TABLE matches (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_a_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_b_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_active     BOOLEAN NOT NULL DEFAULT true,
    unmatched_by  UUID REFERENCES users(id),
    unmatched_at  TIMESTAMPTZ,
    UNIQUE (user_a_id, user_b_id),
    CHECK (user_a_id < user_b_id)                    -- enforces LEAST/GREATEST ordering
);

-- ── Messages ──────────────────────────────────────────────────────────────────

CREATE TABLE messages (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id  UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content   TEXT,
    type      TEXT NOT NULL DEFAULT 'text',          -- 'text' | 'image'
    image_url TEXT,
    sent_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at   TIMESTAMPTZ
);

-- ── Boosts ────────────────────────────────────────────────────────────────────

CREATE TABLE boosts (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- ── Notifications ─────────────────────────────────────────────────────────────

CREATE TABLE notifications (
    id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type    TEXT NOT NULL,                           -- 'new_match' | 'new_message' | 'new_like' | 'face_check_result'
    title   TEXT NOT NULL,
    body    TEXT NOT NULL,
    data    JSONB,
    read_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Reports ───────────────────────────────────────────────────────────────────

CREATE TABLE reports (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason      TEXT NOT NULL,                       -- 'spam' | 'fake' | 'inappropriate' | 'harassment' | 'other'
    details     TEXT,
    status      TEXT NOT NULL DEFAULT 'open',        -- 'open' | 'resolved' | 'dismissed'
    resolved_by UUID REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

-- ── Blocks ────────────────────────────────────────────────────────────────────

CREATE TABLE blocks (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (blocker_id, blocked_id)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

-- Swipe deck (exclude already-swiped users fast)
CREATE INDEX idx_swipes_swiper   ON swipes(swiper_id);
CREATE INDEX idx_swipes_swiped   ON swipes(swiped_id);

-- Chat screen — latest message first
CREATE INDEX idx_messages_match  ON messages(match_id, sent_at DESC);

-- Unread badge count
CREATE INDEX idx_messages_unread ON messages(match_id, read_at) WHERE read_at IS NULL;

-- Photo ordering
CREATE INDEX idx_photos_user     ON photos(user_id, position);

-- Matches per user
CREATE INDEX idx_matches_user_a  ON matches(user_a_id) WHERE is_active = true;
CREATE INDEX idx_matches_user_b  ON matches(user_b_id) WHERE is_active = true;

-- Notification inbox
CREATE INDEX idx_notif_user      ON notifications(user_id, sent_at DESC);
CREATE INDEX idx_notif_unread    ON notifications(user_id, read_at) WHERE read_at IS NULL;

-- Active boosts
CREATE INDEX idx_boosts_active   ON boosts(user_id, expires_at);

-- OTP lookup
CREATE INDEX idx_otp_lookup      ON otp_codes(email, purpose, expires_at) WHERE used_at IS NULL;

-- Location-based deck query
CREATE INDEX idx_profiles_location ON profiles USING GIST (point(longitude, latitude));

-- ── Match creation trigger ────────────────────────────────────────────────────
-- Automatically creates a match when two users mutually like each other.

CREATE OR REPLACE FUNCTION create_match_if_mutual()
RETURNS TRIGGER AS $$
DECLARE
    a UUID;
    b UUID;
BEGIN
    -- Only fire on like / super_like
    IF NEW.action NOT IN ('like', 'super_like') THEN
        RETURN NEW;
    END IF;

    -- Check if the other person already liked back
    IF EXISTS (
        SELECT 1 FROM swipes
        WHERE swiper_id = NEW.swiped_id
          AND swiped_id = NEW.swiper_id
          AND action IN ('like', 'super_like')
    ) THEN
        -- Enforce user_a < user_b for the UNIQUE constraint
        a := LEAST(NEW.swiper_id, NEW.swiped_id);
        b := GREATEST(NEW.swiper_id, NEW.swiped_id);

        INSERT INTO matches (user_a_id, user_b_id)
        VALUES (a, b)
        ON CONFLICT (user_a_id, user_b_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_create_match
AFTER INSERT OR UPDATE ON swipes
FOR EACH ROW EXECUTE FUNCTION create_match_if_mutual();
