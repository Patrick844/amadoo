import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models import User, Block, Report, Match
from schemas import ReportRequest, BlockRequest
from dependencies import get_current_verified_user

log = logging.getLogger("amadoo.safety")

router = APIRouter(tags=["safety"])


@router.post("/reports", status_code=201)
async def create_report(
    body: ReportRequest,
    user: User = Depends(get_current_verified_user),
    db: AsyncSession = Depends(get_db),
):
    if body.reported_id == user.id:
        raise HTTPException(status_code=400, detail="You can't report yourself")
    db.add(Report(
        reporter_id=user.id,
        reported_id=body.reported_id,
        reason=body.reason,
        details=body.details,
    ))
    await db.commit()
    log.info("[REPORT] %s reported %s (reason=%s)", user.id, body.reported_id, body.reason)
    return {"detail": "Report submitted"}


async def _deactivate_match(db: AsyncSession, me: str, other: str, by: str):
    """Deactivate any active match between two users (used by block + unmatch)."""
    a, b = (me, other) if me < other else (other, me)
    res = await db.execute(select(Match).where(Match.user_a_id == a, Match.user_b_id == b))
    m = res.scalar_one_or_none()
    if m and m.is_active:
        m.is_active = False
        m.unmatched_by = by
        m.unmatched_at = datetime.now(timezone.utc)


@router.post("/blocks", status_code=201)
async def block_user(
    body: BlockRequest,
    user: User = Depends(get_current_verified_user),
    db: AsyncSession = Depends(get_db),
):
    if body.blocked_id == user.id:
        raise HTTPException(status_code=400, detail="You can't block yourself")
    existing = await db.execute(
        select(Block).where(Block.blocker_id == user.id, Block.blocked_id == body.blocked_id)
    )
    if not existing.scalar_one_or_none():
        db.add(Block(blocker_id=user.id, blocked_id=body.blocked_id))
    # Blocking someone also ends any match between you.
    await _deactivate_match(db, user.id, body.blocked_id, by=user.id)
    await db.commit()
    log.info("[BLOCK] %s blocked %s", user.id, body.blocked_id)
    return {"detail": "User blocked"}


@router.delete("/blocks/{blocked_id}", status_code=204)
async def unblock_user(
    blocked_id: str,
    user: User = Depends(get_current_verified_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(Block).where(Block.blocker_id == user.id, Block.blocked_id == blocked_id)
    )
    block = res.scalar_one_or_none()
    if block:
        await db.delete(block)
        await db.commit()
    log.info("[UNBLOCK] %s unblocked %s", user.id, blocked_id)

# Note: unmatching is handled by the existing DELETE /matches/{match_id} in matches.py.
