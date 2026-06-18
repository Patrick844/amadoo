"""Tests for /profile/* endpoints."""

import pytest
from httpx import AsyncClient

from tests.conftest import _signup, _verify, _create_profile, _full_user

pytestmark = pytest.mark.asyncio


async def test_create_profile_sets_onboarded(client: AsyncClient):
    await _signup(client)
    tokens = await _verify(client)
    r = await client.post(
        "/profile",
        json={"name": "Alex", "birthday": "1998-05-15", "gender": "male"},
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )
    assert r.status_code == 201
    me = await client.get("/auth/me", headers={"Authorization": f"Bearer {tokens['access_token']}"})
    assert me.json()["is_onboarded"] is True


async def test_unverified_email_cannot_authenticate(client: AsyncClient):
    # New pending-signup flow: signup issues no token until the email is verified,
    # so an unverified user can't authenticate or reach profile creation at all.
    await _signup(client)
    r = await client.post("/auth/signin", json={"email": "user@test.com", "password": "Pass123!"})
    assert r.status_code == 401


async def test_create_profile_duplicate_rejected(client: AsyncClient):
    await _signup(client)
    tokens = await _verify(client)
    await _create_profile(client, tokens["access_token"])
    r = await client.post(
        "/profile",
        json={"name": "Alex2", "birthday": "1990-01-01", "gender": "male"},
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )
    assert r.status_code == 409


async def test_get_my_profile(client: AsyncClient):
    tokens = await _full_user(client)
    r = await client.get("/profile/me", headers={"Authorization": f"Bearer {tokens['access_token']}"})
    assert r.status_code == 200
    data = r.json()
    assert data["name"] == "Alex"
    assert data["gender"] == "male"


async def test_get_profile_not_found(client: AsyncClient):
    await _signup(client)
    tokens = await _verify(client)
    r = await client.get("/profile/me", headers={"Authorization": f"Bearer {tokens['access_token']}"})
    assert r.status_code == 404


async def test_update_profile(client: AsyncClient):
    tokens = await _full_user(client)
    r = await client.patch(
        "/profile/me",
        json={"bio": "Hello world", "school": "AUB", "hobbies": ["hiking", "coding"]},
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )
    assert r.status_code == 200
    assert r.json()["bio"] == "Hello world"
    assert r.json()["school"] == "AUB"
    assert r.json()["hobbies"] == ["hiking", "coding"]


async def test_update_profile_bio_too_long(client: AsyncClient):
    tokens = await _full_user(client)
    r = await client.patch(
        "/profile/me",
        json={"bio": "x" * 301},
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )
    assert r.status_code == 422


async def test_update_location(client: AsyncClient):
    tokens = await _full_user(client)
    r = await client.patch(
        "/profile/me/location",
        json={"latitude": 33.8938, "longitude": 35.5018},
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )
    assert r.status_code == 200
