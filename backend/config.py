from pathlib import Path
from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Database ─────────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/amadoo"

    # ── JWT ──────────────────────────────────────────────────────────────────────
    JWT_SECRET: str = "CHANGE_ME_in_production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # ── Local file storage ───────────────────────────────────────────────────────
    # Photos are saved to UPLOADS_DIR and served at BASE_URL/uploads/...
    UPLOADS_DIR: Path = Path(__file__).parent / "uploads"
    BASE_URL: str = "http://localhost:8000"

    # ── Email (OTP) — leave all blank to use console logging ─────────────────────
    # Preferred path: Resend over HTTPS (port 443). Render and most PaaS block
    # outbound SMTP (25/465/587), so RESEND_API_KEY is the production transport.
    # SMTP_* is kept only as a local-dev fallback when no Resend key is set.
    RESEND_API_KEY: str = ""
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    # Must be a Resend-verified sender. Use "onboarding@resend.dev" for an
    # immediate smoke test before your domain is verified.
    EMAIL_FROM: str = "noreply@amadoo.app"

    # ── Social Auth ───────────────────────────────────────────────────────────────
    GOOGLE_CLIENT_ID: str = ""
    APPLE_CLIENT_ID: str = ""
    APPLE_TEAM_ID: str = ""
    APPLE_KEY_ID: str = ""
    APPLE_PRIVATE_KEY: str = ""

    # ── App ───────────────────────────────────────────────────────────────────────
    ENVIRONMENT: str = "development"
    # Mobile clients don't send an Origin, so "*" is fine for the API. Set an explicit
    # list if you ever serve a browser front-end from the same backend.
    CORS_ORIGINS: list[str] = ["*"]
    RATE_LIMIT_ENABLED: bool = True   # tests disable this so the suite isn't throttled

    @field_validator("DATABASE_URL")
    @classmethod
    def _async_db_url(cls, v: str) -> str:
        # Managed hosts (Render/Railway/Heroku) hand out `postgres://` / `postgresql://`.
        # SQLAlchemy's async engine needs the asyncpg driver scheme.
        if v.startswith("postgres://"):
            return "postgresql+asyncpg://" + v[len("postgres://"):]
        if v.startswith("postgresql://"):
            return "postgresql+asyncpg://" + v[len("postgresql://"):]
        return v

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

# Fail fast in production if the JWT secret was left at its insecure public default —
# a forged-token risk. (CORS "*" is acceptable for a mobile API; see above.)
if settings.ENVIRONMENT == "production" and settings.JWT_SECRET == "CHANGE_ME_in_production":
    raise RuntimeError("JWT_SECRET must be set to a strong secret in production")
