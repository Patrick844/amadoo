import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func

from push import send_push

from database import get_db
from models import User, Profile, Photo, Match, Message, Notification
from schemas import MatchOut, MessageOut, SendMessageRequest, UserCard
from dependencies import get_current_verified_user
from routers.swipes import _build_user_card

log = logging.getLogger("amadoo.matches")

router = APIRouter(tags=["matches"])


async def _get_match_or_404(match_id: str, user_id: str, db: AsyncSession) -> Match:
    result = await db.execute(
        select(Match).where(
            Match.id == match_id,
            or_(Match.user_a_id == user_id, Match.user_b_id == user_id),
            Match.is_active == True,
        )
    )
    match = result.scalar_one_or_none()
    if not match:
        log.warning("[MATCH] ❌ match_id=%s not found or user %s is not a member", match_id, user_id)
        raise HTTPException(status_code=404, detail="Match not found")
    return match


@router.get("/matches", response_model=list[MatchOut])
async def get_matches(
    user: User = Depends(get_current_verified_user),
    db: AsyncSession = Depends(get_db),
):
    log.info("[MATCHES-LIST] Fetching matches for user %s", user.id)

    result = await db.execute(
        select(Match).where(
            or_(Match.user_a_id == user.id, Match.user_b_id == user.id),
            Match.is_active == True,
        ).order_by(Match.created_at.desc())
    )
    matches = result.scalars().all()
    log.info("[MATCHES-LIST] Found %d active matches", len(matches))

    output: list[MatchOut] = []
    for match in matches:
        other_id = match.user_b_id if match.user_a_id == user.id else match.user_a_id

        other_user_result = await db.execute(select(User).where(User.id == other_id))
        other_user = other_user_result.scalar_one_or_none()
        profile_result = await db.execute(select(Profile).where(Profile.user_id == other_id))
        profile = profile_result.scalar_one_or_none()
        photos_result = await db.execute(
            select(Photo).where(Photo.user_id == other_id).order_by(Photo.position)
        )
        photos = photos_result.scalars().all()

        if not other_user or not profile:
            log.warning("[MATCHES-LIST] Missing user or profile for other_id=%s — skipping", other_id)
            continue

        last_msg_result = await db.execute(
            select(Message)
            .where(Message.match_id == match.id)
            .order_by(Message.sent_at.desc())
            .limit(1)
        )
        last_msg = last_msg_result.scalar_one_or_none()

        unread_result = await db.execute(
            select(func.count()).where(
                Message.match_id == match.id,
                Message.sender_id != user.id,
                Message.read_at.is_(None),
            )
        )
        unread = unread_result.scalar() or 0

        log.info("[MATCHES-LIST]   → match=%s with %s (name=%s) last_msg=%s unread=%d",
                 match.id, other_id, profile.name,
                 f'"{last_msg.content[:30]}..."' if last_msg and last_msg.content else "none",
                 unread)

        output.append(MatchOut(
            id=match.id,
            other_user=_build_user_card(other_user, profile, list(photos), None),
            created_at=match.created_at,
            is_active=match.is_active,
            last_message=MessageOut.model_validate(last_msg) if last_msg else None,
            unread_count=unread,
        ))

    log.info("[MATCHES-LIST] ✅ Returning %d matches", len(output))
    return output


@router.get("/matches/{match_id}/messages", response_model=list[MessageOut])
async def get_messages(
    match_id: str,
    before_id: str | None = None,
    after_id: str | None = None,
    limit: int = 40,
    user: User = Depends(get_current_verified_user),
    db: AsyncSession = Depends(get_db),
):
    log.info("[MESSAGES-GET] match=%s user=%s limit=%d before_id=%s after_id=%s",
             match_id, user.id, limit, before_id, after_id)

    await _get_match_or_404(match_id, user.id, db)

    query = select(Message).where(Message.match_id == match_id)
    if before_id:
        pivot = await db.execute(select(Message.sent_at).where(Message.id == before_id))
        pivot_time = pivot.scalar_one_or_none()
        if pivot_time:
            query = query.where(Message.sent_at < pivot_time)
            log.info("[MESSAGES-GET] Paginating before %s", pivot_time)
    elif after_id:
        pivot = await db.execute(select(Message.sent_at).where(Message.id == after_id))
        pivot_time = pivot.scalar_one_or_none()
        if pivot_time:
            query = query.where(Message.sent_at > pivot_time)
            log.info("[MESSAGES-GET] Polling after %s", pivot_time)

    result = await db.execute(query.order_by(Message.sent_at.desc()).limit(limit))
    messages = result.scalars().all()
    log.info("[MESSAGES-GET] Fetched %d messages", len(messages))

    now = datetime.now(timezone.utc)
    newly_read = 0
    for msg in messages:
        if msg.sender_id != user.id and msg.read_at is None:
            msg.read_at = now
            newly_read += 1
    if newly_read:
        log.info("[MESSAGES-GET] Marked %d messages as read", newly_read)
    await db.commit()

    log.info("[MESSAGES-GET] ✅ Returning %d messages (oldest first)", len(messages))
    return list(reversed(messages))


@router.post("/matches/{match_id}/messages", response_model=MessageOut, status_code=201)
async def send_message(
    match_id: str,
    body: SendMessageRequest,
    user: User = Depends(get_current_verified_user),
    db: AsyncSession = Depends(get_db),
):
    log.info("[MESSAGE-SEND] match=%s user=%s type=%s content=%s",
             match_id, user.id, body.type,
             f'"{body.content[:60]}"' if body.content else "None")

    match = await _get_match_or_404(match_id, user.id, db)

    if body.type == "text" and not body.content:
        log.warning("[MESSAGE-SEND] ❌ Empty text message rejected")
        raise HTTPException(status_code=400, detail="content is required for text messages")

    msg = Message(
        match_id=match_id,
        sender_id=user.id,
        content=body.content,
        type=body.type,
        image_url=body.image_url,
    )
    db.add(msg)

    other_id = match.user_b_id if match.user_a_id == user.id else match.user_a_id

    other_user_result = await db.execute(select(User).where(User.id == other_id))
    other_user = other_user_result.scalar_one_or_none()

    my_profile_result = await db.execute(select(Profile).where(Profile.user_id == user.id))
    my_profile = my_profile_result.scalar_one_or_none()
    sender_name = my_profile.name if my_profile else "Someone"

    db.add(Notification(
        user_id=other_id,
        type="new_message",
        title=f"{sender_name}",
        body=body.content[:60] if body.content else "Sent a photo",
        data={"match_id": match_id},
    ))
    log.info("[MESSAGE-SEND] Notification queued for user %s", other_id)

    await db.commit()
    await db.refresh(msg)

    # Fire real push notification (non-blocking, after commit)
    if other_user and other_user.push_token:
        import asyncio
        asyncio.create_task(send_push(
            to_token=other_user.push_token,
            title=sender_name,
            body=body.content[:60] if body.content else "Sent a photo 📷",
            data={"match_id": match_id},
        ))
        log.info("[MESSAGE-SEND] Push notification fired to %s", other_id)
    else:
        log.info("[MESSAGE-SEND] No push token for %s — skipping push", other_id)

    log.info("[MESSAGE-SEND] ✅ Message saved (id=%s)", msg.id)
    return msg


@router.delete("/matches/{match_id}", status_code=204)
async def unmatch(
    match_id: str,
    user: User = Depends(get_current_verified_user),
    db: AsyncSession = Depends(get_db),
):
    log.info("[UNMATCH] user=%s match=%s", user.id, match_id)
    match = await _get_match_or_404(match_id, user.id, db)
    match.is_active = False
    match.unmatched_by = user.id
    match.unmatched_at = datetime.now(timezone.utc)
    await db.commit()
    log.info("[UNMATCH] ✅ Match %s deactivated by user %s", match_id, user.id)
