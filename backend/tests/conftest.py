"""
Shared fixtures for the Amadoo backend test suite.

Uses a real PostgreSQL test database (amadoo_test).
Create it once with:  createdb amadoo_test
"""

import asyncio
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import text

from config import settings
from database import Base, get_db
from main import app

TEST_DATABASE_URL = "postgresql+asyncpg://patricksaade@localhost:5432/amadoo_test"

# Tests must never hit real SMTP. Blanking the creds makes the OTP path fall back to
# console logging, so the suite is fast and never emails real inboxes. Verification in
# tests uses the "000000" development bypass, so delivery is irrelevant anyway.
settings.SMTP_USER = ""
settings.SMTP_PASSWORD = ""
# Don't throttle the test suite (it hammers auth endpoints across many tests).
settings.RATE_LIMIT_ENABLED = False


def pytest_configure(config):
    """Create tables before the test session."""

    async def _setup():
        eng = create_async_engine(TEST_DATABASE_URL, echo=False)
        async with eng.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
        await eng.dispose()

    asyncio.run(_setup())


def pytest_unconfigure(config):
    """Drop tables after the test session."""

    async def _teardown():
        eng = create_async_engine(TEST_DATABASE_URL, echo=False)
        async with eng.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        await eng.dispose()

    asyncio.run(_teardown())


# ── Per-test engine (fresh connection pool per test run) ─────────────────────

@pytest.fixture
async def engine():
    eng = create_async_engine(TEST_DATABASE_URL, echo=False)
    yield eng
    await eng.dispose()


@pytest.fixture
async def db_session(engine):
    Session = async_sessionmaker(engine, expire_on_commit=False)
    async with Session() as session:
        yield session


@pytest.fixture(autouse=True)
async def clean_tables(engine):
    async with engine.begin() as conn:
        await conn.execute(text(
            "TRUNCATE messages, matches, swipes, notifications, "
            "boosts, blocks, reports, face_checks, photos, "
            "profiles, otp_codes, auth_tokens, social_auth, users "
            "RESTART IDENTITY CASCADE"
        ))
    yield


@pytest.fixture
async def client(engine) -> AsyncClient:
    Session = async_sessionmaker(engine, expire_on_commit=False)

    async def _override():
        async with Session() as session:
            yield session

    app.dependency_overrides[get_db] = _override
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.pop(get_db, None)


# ── Auth helpers ──────────────────────────────────────────────────────────────

async def _signup(client: AsyncClient, email: str = "user@test.com", password: str = "Pass123!") -> None:
    # Signup now stores a pending signup + sends an OTP, returning 202. Tokens are
    # issued by /auth/verify-email once the code is confirmed.
    r = await client.post("/auth/signup", json={"email": email, "password": password})
    assert r.status_code == 202, r.text


async def _verify(client: AsyncClient, email: str = "user@test.com") -> dict:
    # "000000" is the development OTP bypass. Returns the token pair.
    r = await client.post("/auth/verify-email", json={"email": email, "code": "000000"})
    assert r.status_code == 200, r.text
    return r.json()


async def _create_profile(client: AsyncClient, token: str, name: str = "Alex", gender: str = "male") -> dict:
    r = await client.post(
        "/profile",
        json={"name": name, "birthday": "1998-05-15", "gender": gender},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 201, r.text
    return r.json()


async def _verify_face(client: AsyncClient, token: str) -> None:
    # Identity verification is mandatory to swipe; in dev this auto-approves.
    r = await client.post(
        "/verification/face",
        files={"file": ("face.jpg", b"\xff\xd8\xff\xe0\x00\x10JFIF", "image/jpeg")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200, r.text


async def _full_user(
    client: AsyncClient,
    email: str = "user@test.com",
    password: str = "Pass123!",
    name: str = "Alex",
    gender: str = "male",
) -> dict:
    """Sign up, verify email, create profile, verify identity. Returns tokens dict."""
    await _signup(client, email, password)
    tokens = await _verify(client, email)
    await _create_profile(client, tokens["access_token"], name, gender)
    await _verify_face(client, tokens["access_token"])
    return tokens
