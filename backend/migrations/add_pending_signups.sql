-- Holds email + password hash + OTP for users who haven't verified their email yet.
-- The real User row is only created when verification succeeds, so abandoning
-- signup before the OTP step never permanently reserves the email.
CREATE TABLE IF NOT EXISTS pending_signups (
  email          VARCHAR     PRIMARY KEY,
  password_hash  TEXT        NOT NULL,
  code_hash      TEXT        NOT NULL,
  expires_at     TIMESTAMPTZ NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pending_signups_expires_at_idx
  ON pending_signups (expires_at);
