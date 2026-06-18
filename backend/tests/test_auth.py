"""Tests for /auth/* endpoints."""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_signup_then_verify_returns_tokens(client: AsyncClient):
    # Signup is now a two-step flow: 202 (pending) → verify-email issues the tokens.
    r = await client.post("/auth/signup", json={"email": "a@test.com", "password": "Pass123!"})
    assert r.status_code == 202
    v = await client.post("/auth/verify-email", json={"email": "a@test.com", "code": "000000"})
    assert v.status_code == 200
    data = v.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


async def test_signup_duplicate_email(client: AsyncClient):
    # A duplicate is rejected once the email belongs to a verified (real) user.
    await client.post("/auth/signup", json={"email": "a@test.com", "password": "Pass123!"})
    await client.post("/auth/verify-email", json={"email": "a@test.com", "code": "000000"})
    r = await client.post("/auth/signup", json={"email": "a@test.com", "password": "Pass123!"})
    assert r.status_code == 409


async def test_verify_email_dev_bypass(client: AsyncClient):
    await client.post("/auth/signup", json={"email": "a@test.com", "password": "Pass123!"})
    r = await client.post("/auth/verify-email", json={"email": "a@test.com", "code": "000000"})
    assert r.status_code == 200


async def test_verify_email_wrong_code(client: AsyncClient):
    await client.post("/auth/signup", json={"email": "a@test.com", "password": "Pass123!"})
    r = await client.post("/auth/verify-email", json={"email": "a@test.com", "code": "999999"})
    assert r.status_code == 400


async def test_signin_correct_credentials(client: AsyncClient):
    await client.post("/auth/signup", json={"email": "a@test.com", "password": "Pass123!"})
    await client.post("/auth/verify-email", json={"email": "a@test.com", "code": "000000"})
    r = await client.post("/auth/signin", json={"email": "a@test.com", "password": "Pass123!"})
    assert r.status_code == 200
    assert "access_token" in r.json()


async def test_signin_wrong_password(client: AsyncClient):
    await client.post("/auth/signup", json={"email": "a@test.com", "password": "Pass123!"})
    r = await client.post("/auth/signin", json={"email": "a@test.com", "password": "wrong"})
    assert r.status_code == 401


async def test_signin_unknown_email(client: AsyncClient):
    r = await client.post("/auth/signin", json={"email": "nobody@test.com", "password": "Pass123!"})
    assert r.status_code == 401


async def test_get_me_requires_auth(client: AsyncClient):
    r = await client.get("/auth/me")
    assert r.status_code == 403


async def test_get_me_returns_user(client: AsyncClient):
    await client.post("/auth/signup", json={"email": "a@test.com", "password": "Pass123!"})
    tokens = await client.post("/auth/verify-email", json={"email": "a@test.com", "code": "000000"})
    token = tokens.json()["access_token"]
    r = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    data = r.json()
    assert data["email"] == "a@test.com"
    assert data["is_email_verified"] is True
    assert data["is_onboarded"] is False


async def test_get_me_after_verify(client: AsyncClient):
    await client.post("/auth/signup", json={"email": "a@test.com", "password": "Pass123!"})
    await client.post("/auth/verify-email", json={"email": "a@test.com", "code": "000000"})
    tokens = await client.post("/auth/signin", json={"email": "a@test.com", "password": "Pass123!"})
    token = tokens.json()["access_token"]
    r = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.json()["is_email_verified"] is True


async def test_refresh_token(client: AsyncClient):
    await client.post("/auth/signup", json={"email": "a@test.com", "password": "Pass123!"})
    tokens = await client.post("/auth/verify-email", json={"email": "a@test.com", "code": "000000"})
    refresh = tokens.json()["refresh_token"]
    r = await client.post("/auth/refresh", json={"refresh_token": refresh})
    assert r.status_code == 200
    new_tokens = r.json()
    assert "access_token" in new_tokens
    assert new_tokens["refresh_token"] != refresh  # rotated


async def test_refresh_token_is_single_use(client: AsyncClient):
    await client.post("/auth/signup", json={"email": "a@test.com", "password": "Pass123!"})
    tokens = await client.post("/auth/verify-email", json={"email": "a@test.com", "code": "000000"})
    refresh = tokens.json()["refresh_token"]
    await client.post("/auth/refresh", json={"refresh_token": refresh})
    r2 = await client.post("/auth/refresh", json={"refresh_token": refresh})
    assert r2.status_code == 401


async def test_logout_invalidates_refresh_token(client: AsyncClient):
    await client.post("/auth/signup", json={"email": "a@test.com", "password": "Pass123!"})
    tokens = await client.post("/auth/verify-email", json={"email": "a@test.com", "code": "000000"})
    refresh = tokens.json()["refresh_token"]
    await client.post("/auth/logout", json={"refresh_token": refresh})
    r = await client.post("/auth/refresh", json={"refresh_token": refresh})
    assert r.status_code == 401


async def test_rate_limit_blocks_excess_requests(client: AsyncClient):
    # Limiter is disabled for the suite; enable it just for this test.
    from config import settings as s
    from rate_limit import _hits
    s.RATE_LIMIT_ENABLED = True
    try:
        statuses = [
            (await client.post("/auth/signin", json={"email": "x@test.com", "password": "Pass123!"})).status_code
            for _ in range(12)
        ]
        assert 429 in statuses  # signin caps at 10/min per IP
    finally:
        s.RATE_LIMIT_ENABLED = False
        _hits.clear()


async def test_forgot_password_always_200(client: AsyncClient):
    r = await client.post("/auth/forgot-password", json={"email": "nobody@test.com"})
    assert r.status_code == 200


async def test_reset_password_dev_bypass(client: AsyncClient):
    await client.post("/auth/signup", json={"email": "a@test.com", "password": "Pass123!"})
    await client.post("/auth/verify-email", json={"email": "a@test.com", "code": "000000"})
    await client.post("/auth/forgot-password", json={"email": "a@test.com"})
    r = await client.post(
        "/auth/reset-password",
        json={"email": "a@test.com", "code": "000000", "new_password": "NewPass456!"},
    )
    assert r.status_code == 200
    # Old password no longer works
    old = await client.post("/auth/signin", json={"email": "a@test.com", "password": "Pass123!"})
    assert old.status_code == 401
    # New password works
    new = await client.post("/auth/signin", json={"email": "a@test.com", "password": "NewPass456!"})
    assert new.status_code == 200
