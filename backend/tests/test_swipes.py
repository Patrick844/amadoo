"""Tests for /deck, /swipes, and /likes endpoints."""

import pytest
from httpx import AsyncClient

from tests.conftest import _full_user

pytestmark = pytest.mark.asyncio


async def _two_users(client: AsyncClient):
    """Create Alex (male) and Sarah (female) who can see each other in the deck."""
    alex = await _full_user(client, "alex@test.com", name="Alex", gender="male")
    sarah = await _full_user(client, "sarah@test.com", name="Sarah", gender="female")
    return alex, sarah


async def test_deck_requires_auth(client: AsyncClient):
    r = await client.get("/deck")
    assert r.status_code == 403


async def test_deck_requires_profile(client: AsyncClient):
    from tests.conftest import _signup, _verify
    await _signup(client)
    tokens = await _verify(client)
    r = await client.get("/deck", headers={"Authorization": f"Bearer {tokens['access_token']}"})
    assert r.status_code == 400


async def test_deck_returns_candidates(client: AsyncClient):
    alex, sarah = await _two_users(client)
    r = await client.get("/deck", headers={"Authorization": f"Bearer {alex['access_token']}"})
    assert r.status_code == 200
    ids = [u["id"] for u in r.json()]
    # Sarah should appear in Alex's deck
    sarah_r = await client.get("/auth/me", headers={"Authorization": f"Bearer {sarah['access_token']}"})
    assert sarah_r.json()["id"] in ids


async def test_deck_excludes_already_swiped(client: AsyncClient):
    alex, sarah = await _two_users(client)
    sarah_id = (await client.get("/auth/me", headers={"Authorization": f"Bearer {sarah['access_token']}"})).json()["id"]

    # Alex swipes on Sarah
    await client.post(
        "/swipes",
        json={"swiped_id": sarah_id, "action": "dislike"},
        headers={"Authorization": f"Bearer {alex['access_token']}"},
    )
    # Sarah should no longer appear in Alex's deck
    r = await client.get("/deck", headers={"Authorization": f"Bearer {alex['access_token']}"})
    assert sarah_id not in [u["id"] for u in r.json()]


async def test_swipe_dislike_no_match(client: AsyncClient):
    alex, sarah = await _two_users(client)
    sarah_id = (await client.get("/auth/me", headers={"Authorization": f"Bearer {sarah['access_token']}"})).json()["id"]
    r = await client.post(
        "/swipes",
        json={"swiped_id": sarah_id, "action": "dislike"},
        headers={"Authorization": f"Bearer {alex['access_token']}"},
    )
    assert r.status_code == 200
    assert r.json()["matched"] is False
    assert r.json()["match_id"] is None


async def test_swipe_like_no_match_without_mutual(client: AsyncClient):
    alex, sarah = await _two_users(client)
    sarah_id = (await client.get("/auth/me", headers={"Authorization": f"Bearer {sarah['access_token']}"})).json()["id"]
    r = await client.post(
        "/swipes",
        json={"swiped_id": sarah_id, "action": "like"},
        headers={"Authorization": f"Bearer {alex['access_token']}"},
    )
    assert r.json()["matched"] is False


async def test_mutual_like_creates_match(client: AsyncClient):
    alex, sarah = await _two_users(client)
    alex_id = (await client.get("/auth/me", headers={"Authorization": f"Bearer {alex['access_token']}"})).json()["id"]
    sarah_id = (await client.get("/auth/me", headers={"Authorization": f"Bearer {sarah['access_token']}"})).json()["id"]

    await client.post("/swipes", json={"swiped_id": sarah_id, "action": "like"}, headers={"Authorization": f"Bearer {alex['access_token']}"})
    r = await client.post("/swipes", json={"swiped_id": alex_id, "action": "like"}, headers={"Authorization": f"Bearer {sarah['access_token']}"})

    assert r.json()["matched"] is True
    assert r.json()["match_id"] is not None


async def test_super_like_creates_match(client: AsyncClient):
    alex, sarah = await _two_users(client)
    alex_id = (await client.get("/auth/me", headers={"Authorization": f"Bearer {alex['access_token']}"})).json()["id"]
    sarah_id = (await client.get("/auth/me", headers={"Authorization": f"Bearer {sarah['access_token']}"})).json()["id"]

    await client.post("/swipes", json={"swiped_id": sarah_id, "action": "like"}, headers={"Authorization": f"Bearer {alex['access_token']}"})
    r = await client.post("/swipes", json={"swiped_id": alex_id, "action": "super_like"}, headers={"Authorization": f"Bearer {sarah['access_token']}"})
    assert r.json()["matched"] is True


async def test_invalid_swipe_action_rejected(client: AsyncClient):
    alex, sarah = await _two_users(client)
    sarah_id = (await client.get("/auth/me", headers={"Authorization": f"Bearer {sarah['access_token']}"})).json()["id"]
    r = await client.post(
        "/swipes",
        json={"swiped_id": sarah_id, "action": "wink"},
        headers={"Authorization": f"Bearer {alex['access_token']}"},
    )
    assert r.status_code == 400


async def test_duplicate_match_not_created(client: AsyncClient):
    alex, sarah = await _two_users(client)
    alex_id = (await client.get("/auth/me", headers={"Authorization": f"Bearer {alex['access_token']}"})).json()["id"]
    sarah_id = (await client.get("/auth/me", headers={"Authorization": f"Bearer {sarah['access_token']}"})).json()["id"]

    await client.post("/swipes", json={"swiped_id": sarah_id, "action": "like"}, headers={"Authorization": f"Bearer {alex['access_token']}"})
    r1 = await client.post("/swipes", json={"swiped_id": alex_id, "action": "like"}, headers={"Authorization": f"Bearer {sarah['access_token']}"})
    assert r1.json()["matched"] is True

    # Swipe again — should not create a second match
    r2 = await client.post("/swipes", json={"swiped_id": alex_id, "action": "like"}, headers={"Authorization": f"Bearer {sarah['access_token']}"})
    assert r2.json()["matched"] is False


async def test_likes_endpoint_shows_pending_likes(client: AsyncClient):
    alex, sarah = await _two_users(client)
    sarah_id = (await client.get("/auth/me", headers={"Authorization": f"Bearer {sarah['access_token']}"})).json()["id"]

    # Sarah likes Alex (Alex hasn't swiped Sarah yet)
    alex_id = (await client.get("/auth/me", headers={"Authorization": f"Bearer {alex['access_token']}"})).json()["id"]
    await client.post("/swipes", json={"swiped_id": alex_id, "action": "like"}, headers={"Authorization": f"Bearer {sarah['access_token']}"})

    # Alex checks his likes
    r = await client.get("/likes", headers={"Authorization": f"Bearer {alex['access_token']}"})
    assert r.status_code == 200
    ids = [u["id"] for u in r.json()]
    assert sarah_id in ids


async def test_likes_disappears_after_swipe(client: AsyncClient):
    alex, sarah = await _two_users(client)
    sarah_id = (await client.get("/auth/me", headers={"Authorization": f"Bearer {sarah['access_token']}"})).json()["id"]
    alex_id = (await client.get("/auth/me", headers={"Authorization": f"Bearer {alex['access_token']}"})).json()["id"]

    await client.post("/swipes", json={"swiped_id": alex_id, "action": "like"}, headers={"Authorization": f"Bearer {sarah['access_token']}"})
    await client.post("/swipes", json={"swiped_id": sarah_id, "action": "like"}, headers={"Authorization": f"Bearer {alex['access_token']}"})

    r = await client.get("/likes", headers={"Authorization": f"Bearer {alex['access_token']}"})
    ids = [u["id"] for u in r.json()]
    assert sarah_id not in ids
