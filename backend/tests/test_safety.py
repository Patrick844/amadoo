"""Tests for safety (report / block) + abuse-prevention guards."""

import pytest
from httpx import AsyncClient

from tests.conftest import _full_user, _signup, _verify, _create_profile

pytestmark = pytest.mark.asyncio


async def test_unverified_user_cannot_swipe(client: AsyncClient):
    # Email-verified with a profile, but identity NOT verified → blocked from swiping.
    await _signup(client, "a@test.com")
    a = await _verify(client, "a@test.com")
    await _create_profile(client, a["access_token"])
    target = await _full_user(client, "b@test.com", name="B", gender="female")
    bid = (await client.get("/auth/me", headers={"Authorization": f"Bearer {target['access_token']}"})).json()["id"]
    r = await client.post(
        "/swipes",
        json={"swiped_id": bid, "action": "like"},
        headers={"Authorization": f"Bearer {a['access_token']}"},
    )
    assert r.status_code == 403


async def _me_id(client: AsyncClient, token: str) -> str:
    r = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    return r.json()["id"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def test_cannot_swipe_self(client: AsyncClient):
    t = await _full_user(client)
    me = await _me_id(client, t["access_token"])
    r = await client.post("/swipes", json={"swiped_id": me, "action": "like"}, headers=_auth(t["access_token"]))
    assert r.status_code == 400


async def test_report_user(client: AsyncClient):
    a = await _full_user(client, "a@test.com", name="A", gender="male")
    b = await _full_user(client, "b@test.com", name="B", gender="female")
    bid = await _me_id(client, b["access_token"])
    r = await client.post(
        "/reports",
        json={"reported_id": bid, "reason": "spam", "details": "spammy"},
        headers=_auth(a["access_token"]),
    )
    assert r.status_code == 201


async def test_cannot_report_self(client: AsyncClient):
    a = await _full_user(client)
    aid = await _me_id(client, a["access_token"])
    r = await client.post("/reports", json={"reported_id": aid, "reason": "x"}, headers=_auth(a["access_token"]))
    assert r.status_code == 400


async def test_block_hides_profile_both_ways(client: AsyncClient):
    a = await _full_user(client, "a@test.com", name="A", gender="male")
    b = await _full_user(client, "b@test.com", name="B", gender="female")
    aid = await _me_id(client, a["access_token"])
    bid = await _me_id(client, b["access_token"])

    # Visible before blocking
    assert (await client.get(f"/users/{bid}", headers=_auth(a["access_token"]))).status_code == 200

    # A blocks B
    rb = await client.post("/blocks", json={"blocked_id": bid}, headers=_auth(a["access_token"]))
    assert rb.status_code == 201

    # Now hidden in both directions
    assert (await client.get(f"/users/{bid}", headers=_auth(a["access_token"]))).status_code == 404
    assert (await client.get(f"/users/{aid}", headers=_auth(b["access_token"]))).status_code == 404


async def test_subscription_activate_and_cancel(client: AsyncClient):
    t = await _full_user(client)
    h = _auth(t["access_token"])
    r = await client.post("/subscription/activate", headers=h)
    assert r.status_code == 200 and r.json()["is_premium"] is True
    me = await client.get("/auth/me", headers=h)
    assert me.json()["is_premium"] is True
    r2 = await client.post("/subscription/cancel", headers=h)
    assert r2.json()["is_premium"] is False
    me2 = await client.get("/auth/me", headers=h)
    assert me2.json()["is_premium"] is False


async def test_unblock_restores_visibility(client: AsyncClient):
    a = await _full_user(client, "a@test.com", name="A", gender="male")
    b = await _full_user(client, "b@test.com", name="B", gender="female")
    bid = await _me_id(client, b["access_token"])

    await client.post("/blocks", json={"blocked_id": bid}, headers=_auth(a["access_token"]))
    assert (await client.get(f"/users/{bid}", headers=_auth(a["access_token"]))).status_code == 404

    r = await client.delete(f"/blocks/{bid}", headers=_auth(a["access_token"]))
    assert r.status_code == 204
    assert (await client.get(f"/users/{bid}", headers=_auth(a["access_token"]))).status_code == 200
