"""Tests for /matches and /matches/{id}/messages endpoints."""

import pytest
from httpx import AsyncClient

from tests.conftest import _full_user

pytestmark = pytest.mark.asyncio


async def _make_match(client: AsyncClient):
    """Create two users, mutually like each other, return (alex_tokens, sarah_tokens, match_id)."""
    alex = await _full_user(client, "alex@test.com", name="Alex", gender="male")
    sarah = await _full_user(client, "sarah@test.com", name="Sarah", gender="female")
    alex_id = (await client.get("/auth/me", headers={"Authorization": f"Bearer {alex['access_token']}"})).json()["id"]
    sarah_id = (await client.get("/auth/me", headers={"Authorization": f"Bearer {sarah['access_token']}"})).json()["id"]

    await client.post("/swipes", json={"swiped_id": sarah_id, "action": "like"}, headers={"Authorization": f"Bearer {alex['access_token']}"})
    r = await client.post("/swipes", json={"swiped_id": alex_id, "action": "like"}, headers={"Authorization": f"Bearer {sarah['access_token']}"})
    match_id = r.json()["match_id"]
    return alex, sarah, match_id


async def test_matches_empty_before_swipe(client: AsyncClient):
    alex = await _full_user(client, "alex@test.com", name="Alex", gender="male")
    r = await client.get("/matches", headers={"Authorization": f"Bearer {alex['access_token']}"})
    assert r.status_code == 200
    assert r.json() == []


async def test_matches_shows_after_mutual_like(client: AsyncClient):
    alex, sarah, match_id = await _make_match(client)
    r = await client.get("/matches", headers={"Authorization": f"Bearer {alex['access_token']}"})
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["id"] == match_id


async def test_matches_shows_other_user(client: AsyncClient):
    alex, sarah, _ = await _make_match(client)
    r = await client.get("/matches", headers={"Authorization": f"Bearer {alex['access_token']}"})
    assert r.json()[0]["other_user"]["name"] == "Sarah"


async def test_matches_unread_count_zero_initially(client: AsyncClient):
    alex, sarah, _ = await _make_match(client)
    r = await client.get("/matches", headers={"Authorization": f"Bearer {alex['access_token']}"})
    assert r.json()[0]["unread_count"] == 0


async def test_send_message(client: AsyncClient):
    alex, sarah, match_id = await _make_match(client)
    r = await client.post(
        f"/matches/{match_id}/messages",
        json={"content": "Hey Sarah!", "type": "text"},
        headers={"Authorization": f"Bearer {alex['access_token']}"},
    )
    assert r.status_code == 201
    assert r.json()["content"] == "Hey Sarah!"


async def test_send_message_empty_text_rejected(client: AsyncClient):
    alex, sarah, match_id = await _make_match(client)
    r = await client.post(
        f"/matches/{match_id}/messages",
        json={"type": "text"},
        headers={"Authorization": f"Bearer {alex['access_token']}"},
    )
    assert r.status_code == 400


async def test_get_messages(client: AsyncClient):
    alex, sarah, match_id = await _make_match(client)
    await client.post(
        f"/matches/{match_id}/messages",
        json={"content": "Hi!", "type": "text"},
        headers={"Authorization": f"Bearer {alex['access_token']}"},
    )
    r = await client.get(
        f"/matches/{match_id}/messages",
        headers={"Authorization": f"Bearer {alex['access_token']}"},
    )
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["content"] == "Hi!"


async def test_messages_ordered_oldest_first(client: AsyncClient):
    alex, sarah, match_id = await _make_match(client)
    for msg in ["first", "second", "third"]:
        await client.post(
            f"/matches/{match_id}/messages",
            json={"content": msg, "type": "text"},
            headers={"Authorization": f"Bearer {alex['access_token']}"},
        )
    r = await client.get(
        f"/matches/{match_id}/messages",
        headers={"Authorization": f"Bearer {alex['access_token']}"},
    )
    contents = [m["content"] for m in r.json()]
    assert contents == ["first", "second", "third"]


async def test_unread_count_increments_for_other_user(client: AsyncClient):
    alex, sarah, match_id = await _make_match(client)
    # Sarah sends 2 messages
    for msg in ["Hello", "You there?"]:
        await client.post(
            f"/matches/{match_id}/messages",
            json={"content": msg, "type": "text"},
            headers={"Authorization": f"Bearer {sarah['access_token']}"},
        )
    # Alex's match list shows 2 unread
    r = await client.get("/matches", headers={"Authorization": f"Bearer {alex['access_token']}"})
    assert r.json()[0]["unread_count"] == 2


async def test_reading_messages_clears_unread(client: AsyncClient):
    alex, sarah, match_id = await _make_match(client)
    await client.post(
        f"/matches/{match_id}/messages",
        json={"content": "Hey!", "type": "text"},
        headers={"Authorization": f"Bearer {sarah['access_token']}"},
    )
    # Alex reads messages
    await client.get(f"/matches/{match_id}/messages", headers={"Authorization": f"Bearer {alex['access_token']}"})
    r = await client.get("/matches", headers={"Authorization": f"Bearer {alex['access_token']}"})
    assert r.json()[0]["unread_count"] == 0


async def test_cannot_send_to_other_users_match(client: AsyncClient):
    alex, sarah, match_id = await _make_match(client)
    # Create a third user
    dan = await _full_user(client, "dan@test.com", name="Dan", gender="male")
    r = await client.post(
        f"/matches/{match_id}/messages",
        json={"content": "Intruder!", "type": "text"},
        headers={"Authorization": f"Bearer {dan['access_token']}"},
    )
    assert r.status_code == 404


async def test_unmatch_deactivates_match(client: AsyncClient):
    alex, sarah, match_id = await _make_match(client)
    r = await client.delete(
        f"/matches/{match_id}",
        headers={"Authorization": f"Bearer {alex['access_token']}"},
    )
    assert r.status_code == 204
    # Match no longer shows in list
    matches = await client.get("/matches", headers={"Authorization": f"Bearer {alex['access_token']}"})
    assert matches.json() == []


async def test_last_message_shown_in_match_list(client: AsyncClient):
    alex, sarah, match_id = await _make_match(client)
    await client.post(
        f"/matches/{match_id}/messages",
        json={"content": "Last one", "type": "text"},
        headers={"Authorization": f"Bearer {alex['access_token']}"},
    )
    r = await client.get("/matches", headers={"Authorization": f"Bearer {alex['access_token']}"})
    assert r.json()[0]["last_message"]["content"] == "Last one"
