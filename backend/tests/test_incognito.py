"""Tests for incognito mode behaviour."""

import pytest
from httpx import AsyncClient

from tests.conftest import _full_user

pytestmark = pytest.mark.asyncio


async def _get_id(client: AsyncClient, token: str) -> str:
    r = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    return r.json()["id"]


async def test_female_can_enable_incognito(client: AsyncClient):
    sarah = await _full_user(client, "sarah@test.com", name="Sarah", gender="female")
    r = await client.patch(
        "/profile/me",
        json={"is_incognito": True},
        headers={"Authorization": f"Bearer {sarah['access_token']}"},
    )
    assert r.status_code == 200
    assert r.json()["is_incognito"] is True


async def test_male_cannot_enable_incognito(client: AsyncClient):
    alex = await _full_user(client, "alex@test.com", name="Alex", gender="male")
    r = await client.patch(
        "/profile/me",
        json={"is_incognito": True},
        headers={"Authorization": f"Bearer {alex['access_token']}"},
    )
    assert r.status_code == 403


async def test_incognito_female_hidden_from_deck(client: AsyncClient):
    alex = await _full_user(client, "alex@test.com", name="Alex", gender="male")
    sarah = await _full_user(client, "sarah@test.com", name="Sarah", gender="female")
    sarah_id = await _get_id(client, sarah["access_token"])

    # Sarah enables incognito
    await client.patch(
        "/profile/me",
        json={"is_incognito": True},
        headers={"Authorization": f"Bearer {sarah['access_token']}"},
    )

    r = await client.get("/deck", headers={"Authorization": f"Bearer {alex['access_token']}"})
    assert r.status_code == 200
    assert sarah_id not in [u["id"] for u in r.json()]


async def test_incognito_female_appears_after_she_likes(client: AsyncClient):
    alex = await _full_user(client, "alex@test.com", name="Alex", gender="male")
    sarah = await _full_user(client, "sarah@test.com", name="Sarah", gender="female")
    alex_id = await _get_id(client, alex["access_token"])
    sarah_id = await _get_id(client, sarah["access_token"])

    # Sarah goes incognito
    await client.patch(
        "/profile/me",
        json={"is_incognito": True},
        headers={"Authorization": f"Bearer {sarah['access_token']}"},
    )

    # Sarah likes Alex first
    await client.post(
        "/swipes",
        json={"swiped_id": alex_id, "action": "like"},
        headers={"Authorization": f"Bearer {sarah['access_token']}"},
    )

    # Now Sarah should appear in Alex's deck
    r = await client.get("/deck", headers={"Authorization": f"Bearer {alex['access_token']}"})
    assert sarah_id in [u["id"] for u in r.json()]


async def test_incognito_female_can_see_all_males(client: AsyncClient):
    """Incognito mode only hides her from others — she can still browse normally."""
    alex = await _full_user(client, "alex@test.com", name="Alex", gender="male")
    sarah = await _full_user(client, "sarah@test.com", name="Sarah", gender="female")
    alex_id = await _get_id(client, alex["access_token"])

    await client.patch(
        "/profile/me",
        json={"is_incognito": True},
        headers={"Authorization": f"Bearer {sarah['access_token']}"},
    )

    r = await client.get("/deck", headers={"Authorization": f"Bearer {sarah['access_token']}"})
    assert alex_id in [u["id"] for u in r.json()]


async def test_non_incognito_female_visible_normally(client: AsyncClient):
    alex = await _full_user(client, "alex@test.com", name="Alex", gender="male")
    sarah = await _full_user(client, "sarah@test.com", name="Sarah", gender="female")
    sarah_id = await _get_id(client, sarah["access_token"])

    r = await client.get("/deck", headers={"Authorization": f"Bearer {alex['access_token']}"})
    assert sarah_id in [u["id"] for u in r.json()]


async def test_incognito_mutual_like_creates_match(client: AsyncClient):
    alex = await _full_user(client, "alex@test.com", name="Alex", gender="male")
    sarah = await _full_user(client, "sarah@test.com", name="Sarah", gender="female")
    alex_id = await _get_id(client, alex["access_token"])
    sarah_id = await _get_id(client, sarah["access_token"])

    # Sarah goes incognito and likes Alex first
    await client.patch("/profile/me", json={"is_incognito": True}, headers={"Authorization": f"Bearer {sarah['access_token']}"})
    await client.post("/swipes", json={"swiped_id": alex_id, "action": "like"}, headers={"Authorization": f"Bearer {sarah['access_token']}"})

    # Alex sees Sarah in deck, likes back
    r = await client.post(
        "/swipes",
        json={"swiped_id": sarah_id, "action": "like"},
        headers={"Authorization": f"Bearer {alex['access_token']}"},
    )
    assert r.json()["matched"] is True
