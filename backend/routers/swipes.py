import asyncio
import hashlib
import logging
import math
import random
from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, text, cast
from sqlalchemy.dialects.postgresql import ARRAY as PG_ARRAY
from sqlalchemy import Text as SAText

from push import send_push

from database import get_db
from models import User, Profile, Photo, Swipe, Match, Notification, Block
from schemas import SwipeRequest, SwipeResponse, UserCard, NearbyUser
from dependencies import get_current_verified_user

log = logging.getLogger("amadoo.swipes")

router = APIRouter(tags=["swipes"])

FREE_DAILY_LIKES = 30  # Free users' daily like/super-like cap; Premium is unlimited.


def _age(birthday: date) -> int:
    today = date.today()
    return today.year - birthday.year - ((today.month, today.day) < (birthday.month, birthday.day))


def _build_user_card(
    user: User,
    profile: Profile,
    photos: list[Photo],
    distance_km: Optional[float],
    *,
    include_lifestyle: bool = False,
) -> UserCard:
    return UserCard(
        id=user.id,
        name=profile.name,
        age=_age(profile.birthday),
        gender=profile.gender,
        bio=profile.bio,
        photos=[p.url for p in sorted(photos, key=lambda x: x.position)],
        school=profile.school,
        job=profile.job,
        height_cm=profile.height_cm,
        hobbies=profile.hobbies or [],
        activities=profile.activities or [],
        trips=profile.trips or [],
        chill_vibes=profile.chill_vibes or [],
        has_pet=profile.has_pet,
        intents=profile.intents or [],
        is_face_verified=user.is_face_verified,
        distance_km=round(distance_km, 1) if distance_km else None,
        industry=profile.industry if include_lifestyle else None,
        looking_for=(profile.looking_for or []) if include_lifestyle else [],
        dating_goal=profile.dating_goal if include_lifestyle else None,
        hangout_vibes=(profile.hangout_vibes or []) if include_lifestyle else [],
        workout=profile.workout if include_lifestyle else None,
        drinking=profile.drinking if include_lifestyle else None,
        smoking=profile.smoking if include_lifestyle else None,
        religion=profile.religion if include_lifestyle else None,
        vibe=profile.vibe if include_lifestyle else None,
    )


@router.get("/deck", response_model=list[UserCard])
async def get_deck(
    limit: int = 20,
    intent: Optional[str] = None,
    user: User = Depends(get_current_verified_user),
    db: AsyncSession = Depends(get_db),
):
    log.info("[DECK] Building deck for user %s (limit=%d, intent=%s)", user.id, limit, intent)

    my_profile_result = await db.execute(select(Profile).where(Profile.user_id == user.id))
    my_profile = my_profile_result.scalar_one_or_none()
    if not my_profile:
        log.warning("[DECK] ❌ No profile for user %s — cannot build deck", user.id)
        raise HTTPException(status_code=400, detail="Complete your profile first")

    log.info("[DECK] My profile: gender=%s intents=%s want_to_meet=%s age_range=%d-%d incognito=%s",
             my_profile.gender, my_profile.intents, my_profile.want_to_meet,
             my_profile.age_range_min, my_profile.age_range_max, my_profile.is_incognito)

    swiped_result = await db.execute(
        select(Swipe.swiped_id).where(Swipe.swiper_id == user.id)
    )
    swiped_ids = {row[0] for row in swiped_result.fetchall()}
    log.info("[DECK] Already swiped on %d users", len(swiped_ids))

    blocked_result = await db.execute(
        text("""
            SELECT blocked_id FROM blocks WHERE blocker_id = :me
            UNION
            SELECT blocker_id FROM blocks WHERE blocked_id = :me
        """),
        {"me": user.id},
    )
    blocked_ids = {row[0] for row in blocked_result.fetchall()}
    if blocked_ids:
        log.info("[DECK] Excluding %d blocked users", len(blocked_ids))

    excluded = swiped_ids | blocked_ids | {user.id}

    incognito_liked_me_result = await db.execute(
        select(Swipe.swiper_id)
        .join(Profile, Profile.user_id == Swipe.swiper_id)
        .where(
            Swipe.swiped_id == user.id,
            Swipe.action.in_(["like", "super_like"]),
            Profile.is_incognito == True,
        )
    )
    incognito_liked_me = {row[0] for row in incognito_liked_me_result.fetchall()}
    if incognito_liked_me:
        log.info("[DECK] %d incognito users liked me — they will appear in deck", len(incognito_liked_me))

    my_intents = my_profile.intents or []

    # The deck can be filtered to a single intent (the swipe-screen "browse by need"
    # filter). If a valid intent is requested, browse only that; otherwise browse
    # the union of everything I'm looking for.
    if intent and intent in my_intents:
        browse_intents = [intent]
    else:
        browse_intents = my_intents
    log.info("[DECK] Browsing intents: %s", browse_intents)

    conditions = [
        User.id.not_in(excluded),
        User.is_onboarded == True,
        func.date_part("year", func.age(Profile.birthday)).between(
            my_profile.age_range_min, my_profile.age_range_max
        ),
        or_(
            Profile.is_incognito == False,
            User.id.in_(incognito_liked_me) if incognito_liked_me else False,
        ),
    ]

    # Intent overlap — only show people who share at least one of the goals I'm
    # browsing. Legacy profiles with no intents are treated as dating-only, so
    # dating seekers still see them.
    if browse_intents:
        overlap_clauses = [Profile.intents.op("&&")(cast(browse_intents, PG_ARRAY(SAText)))]
        if "dating" in browse_intents:
            overlap_clauses.append(
                or_(Profile.intents == None, func.cardinality(Profile.intents) == 0)
            )
        conditions.append(or_(*overlap_clauses))

    # Gender preference only applies when I'm browsing for dating. Friends/business/
    # activity decks are not filtered by gender.
    if "dating" in browse_intents:
        conditions.append(Profile.gender.in_(my_profile.want_to_meet or ["male", "female"]))

    candidates_result = await db.execute(
        select(Profile, User)
        .join(User, User.id == Profile.user_id)
        .where(and_(*conditions))
        .limit(limit * 3)
    )
    rows = candidates_result.fetchall()
    log.info("[DECK] Found %d raw candidates before photo fetch", len(rows))

    cards: list[UserCard] = []
    for profile, candidate_user in rows:
        photos_result = await db.execute(
            select(Photo).where(Photo.user_id == candidate_user.id).order_by(Photo.position)
        )
        photos = photos_result.scalars().all()

        distance_km = None
        if my_profile.latitude and my_profile.longitude and profile.latitude and profile.longitude:
            import math
            lat1, lon1 = math.radians(my_profile.latitude), math.radians(my_profile.longitude)
            lat2, lon2 = math.radians(profile.latitude), math.radians(profile.longitude)
            dlat, dlon = lat2 - lat1, lon2 - lon1
            a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
            distance_km = 6371 * 2 * math.asin(math.sqrt(a))

        log.info("[DECK]   → %s (name=%s age=%d photos=%d dist=%s)",
                 candidate_user.id, profile.name, _age(profile.birthday),
                 len(photos), f"{distance_km:.1f}km" if distance_km else "unknown")
        cards.append(_build_user_card(candidate_user, profile, list(photos), distance_km))

    final = cards[:limit]
    log.info("[DECK] ✅ Returning %d cards to user %s", len(final), user.id)
    return final


def _approx_point(my_lat: float, my_lon: float, other_id: str, spread_km: float):
    """Place a person at a deterministic, approximate point AROUND the requester — most
    people cluster within a few km (so the map is populated right on you) and a few sit
    farther out (visible when you zoom out). Stable per person, never an exact position.
    This works anywhere the requester is. (Production swaps in each person's own jittered
    stored coordinates + a geohash proximity query.)"""
    seed = int(hashlib.md5(other_id.encode()).hexdigest()[:8], 16)
    rnd = random.Random(seed)
    angle = rnd.uniform(0, 2 * math.pi)
    # f**2.6 biases hard toward small distances → a tight cluster + a long tail.
    dist_km = 0.3 + (rnd.random() ** 2.6) * spread_km
    dlat = (dist_km / 111.0) * math.cos(angle)
    dlon = (dist_km / (111.0 * math.cos(math.radians(my_lat)))) * math.sin(angle)
    return my_lat + dlat, my_lon + dlon, round(dist_km, 1)


@router.get("/nearby", response_model=list[NearbyUser])
async def get_nearby(
    spread_km: float = 60.0,
    user: User = Depends(get_current_verified_user),
    db: AsyncSession = Depends(get_db),
):
    """People around you for the map. Positions are approximate (never exact) and stable
    per person — clustered near you, a few farther out so you can zoom to discover more."""
    my = (await db.execute(select(Profile).where(Profile.user_id == user.id))).scalar_one_or_none()
    if not my or my.latitude is None or my.longitude is None:
        log.info("[NEARBY] user=%s has no location — returning []", user.id)
        return []

    blocked_result = await db.execute(
        text(
            "SELECT blocked_id FROM blocks WHERE blocker_id = :me "
            "UNION SELECT blocker_id FROM blocks WHERE blocked_id = :me"
        ),
        {"me": user.id},
    )
    excluded = {row[0] for row in blocked_result.fetchall()} | {user.id}
    my_intents = my.intents or []

    conditions = [
        User.id.not_in(excluded),
        User.is_onboarded == True,
        Profile.is_incognito == False,
    ]
    if my_intents:
        overlap = [Profile.intents.op("&&")(cast(my_intents, PG_ARRAY(SAText)))]
        if "dating" in my_intents:
            overlap.append(or_(Profile.intents == None, func.cardinality(Profile.intents) == 0))
        conditions.append(or_(*overlap))

    rows = (
        await db.execute(
            select(Profile, User).join(User, User.id == Profile.user_id).where(and_(*conditions)).limit(60)
        )
    ).fetchall()

    out: list[NearbyUser] = []
    for profile, cu in rows:
        photo_row = await db.execute(
            select(Photo.url).where(Photo.user_id == cu.id).order_by(Photo.position).limit(1)
        )
        photo = photo_row.scalar_one_or_none()
        lat, lon, dist = _approx_point(my.latitude, my.longitude, cu.id, spread_km)
        out.append(NearbyUser(
            id=cu.id, name=profile.name, age=_age(profile.birthday), photo=photo,
            distance_km=dist, latitude=lat, longitude=lon,
            intents=profile.intents or [], is_face_verified=cu.is_face_verified,
        ))

    out.sort(key=lambda u: u.distance_km)
    log.info("[NEARBY] ✅ user=%s → %d people around them (spread %.0fkm)", user.id, len(out), spread_km)
    return out


@router.post("/swipes", response_model=SwipeResponse)
async def record_swipe(
    body: SwipeRequest,
    user: User = Depends(get_current_verified_user),
    db: AsyncSession = Depends(get_db),
):
    log.info("[SWIPE] user=%s action=%s swiped_id=%s", user.id, body.action, body.swiped_id)

    if body.action not in ("like", "dislike", "super_like"):
        log.warning("[SWIPE] ❌ Invalid action: %s", body.action)
        raise HTTPException(status_code=400, detail="Invalid action")

    if body.swiped_id == user.id:
        log.warning("[SWIPE] ❌ Self-swipe rejected for user %s", user.id)
        raise HTTPException(status_code=400, detail="You can't swipe on yourself")

    # Verified-members-only: identity verification is required to connect with anyone.
    if not user.is_face_verified:
        log.info("[SWIPE] ❌ Unverified user %s blocked from swiping", user.id)
        raise HTTPException(status_code=403, detail="Verify your identity to start connecting")

    # Free users get a daily like cap; Premium is unlimited. Dislikes never count.
    if body.action in ("like", "super_like") and not user.is_premium:
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        used_result = await db.execute(
            select(func.count()).select_from(Swipe).where(
                Swipe.swiper_id == user.id,
                Swipe.action.in_(["like", "super_like"]),
                Swipe.created_at >= today_start,
            )
        )
        already_swiped = await db.execute(
            select(Swipe).where(Swipe.swiper_id == user.id, Swipe.swiped_id == body.swiped_id)
        )
        # Don't count re-swipes on someone already liked toward the cap.
        if (used_result.scalar() or 0) >= FREE_DAILY_LIKES and not already_swiped.scalar_one_or_none():
            log.info("[SWIPE] ❌ Free daily like limit reached for %s", user.id)
            raise HTTPException(
                status_code=402,
                detail="You've used your free likes for today. Go Premium for unlimited likes.",
            )

    existing = await db.execute(
        select(Swipe).where(Swipe.swiper_id == user.id, Swipe.swiped_id == body.swiped_id)
    )
    swipe = existing.scalar_one_or_none()
    if swipe:
        log.info("[SWIPE] Updating existing swipe (was %s → now %s)", swipe.action, body.action)
        swipe.action = body.action
    else:
        swipe = Swipe(swiper_id=user.id, swiped_id=body.swiped_id, action=body.action)
        db.add(swipe)
        log.info("[SWIPE] New swipe recorded")

    await db.flush()

    match_id = None
    if body.action in ("like", "super_like"):
        log.info("[SWIPE] Checking for mutual like with %s ...", body.swiped_id)
        reverse = await db.execute(
            select(Swipe).where(
                Swipe.swiper_id == body.swiped_id,
                Swipe.swiped_id == user.id,
                Swipe.action.in_(["like", "super_like"]),
            )
        )
        reverse_swipe = reverse.scalar_one_or_none()

        if reverse_swipe:
            log.info("[SWIPE] 💘 Mutual like detected! %s ↔ %s (their action=%s)",
                     user.id, body.swiped_id, reverse_swipe.action)

            user_a = min(user.id, body.swiped_id)
            user_b = max(user.id, body.swiped_id)
            existing_match = await db.execute(
                select(Match).where(Match.user_a_id == user_a, Match.user_b_id == user_b)
            )
            if not existing_match.scalar_one_or_none():
                match = Match(user_a_id=user_a, user_b_id=user_b)
                db.add(match)
                await db.flush()
                match_id = match.id
                log.info("[SWIPE] ✅ MATCH CREATED! match_id=%s between %s and %s",
                         match_id, user_a, user_b)

                for recipient_id in [user.id, body.swiped_id]:
                    db.add(Notification(
                        user_id=recipient_id,
                        type="new_match",
                        title="New connection! 🎉",
                        body="You have a new connection. Say hi!",
                        data={"match_id": match_id},
                    ))
                log.info("[SWIPE] Notifications queued for both users")

                # Push to the other user (the one who was swiped, who doesn't see the match overlay)
                other_user_result = await db.execute(select(User).where(User.id == body.swiped_id))
                other_user = other_user_result.scalar_one_or_none()
                my_profile_result = await db.execute(select(Profile).where(Profile.user_id == user.id))
                my_profile = my_profile_result.scalar_one_or_none()
                if other_user and other_user.push_token:
                    asyncio.create_task(send_push(
                        to_token=other_user.push_token,
                        title="New connection! 🎉",
                        body=f"You and {my_profile.name if my_profile else 'someone'} connected. Say hi!",
                        data={"match_id": match_id},
                    ))
                    log.info("[SWIPE] Push notification fired to matched user %s", body.swiped_id)
            else:
                log.info("[SWIPE] Match already exists between %s and %s — skipping", user_a, user_b)
        else:
            log.info("[SWIPE] No mutual like yet — %s has not liked %s back", body.swiped_id, user.id)
    else:
        log.info("[SWIPE] Dislike — no match check needed")

    await db.commit()
    log.info("[SWIPE] ✅ Done — matched=%s match_id=%s", match_id is not None, match_id)
    return SwipeResponse(matched=match_id is not None, match_id=match_id)


@router.get("/likes", response_model=list[UserCard])
async def get_likes(
    user: User = Depends(get_current_verified_user),
    db: AsyncSession = Depends(get_db),
):
    log.info("[LIKES] Fetching people who liked user %s", user.id)

    my_swipes_result = await db.execute(
        select(Swipe.swiped_id).where(Swipe.swiper_id == user.id)
    )
    my_swiped_ids = {row[0] for row in my_swipes_result.fetchall()}
    log.info("[LIKES] I've already swiped on %d users (excluding them)", len(my_swiped_ids))

    blocked_result = await db.execute(
        text("""
            SELECT blocked_id FROM blocks WHERE blocker_id = :me
            UNION
            SELECT blocker_id FROM blocks WHERE blocked_id = :me
        """),
        {"me": user.id},
    )
    blocked_ids = {row[0] for row in blocked_result.fetchall()}

    result = await db.execute(
        select(Swipe).where(
            Swipe.swiped_id == user.id,
            Swipe.action.in_(["like", "super_like"]),
            Swipe.swiper_id.not_in(my_swiped_ids),
        ).order_by(Swipe.action.desc(), Swipe.created_at.desc())
    )
    swipes = result.scalars().all()
    log.info("[LIKES] %d people liked me that I haven't swiped on", len(swipes))

    cards: list[UserCard] = []
    for swipe in swipes:
        if swipe.swiper_id in blocked_ids:
            continue
        profile_result = await db.execute(select(Profile).where(Profile.user_id == swipe.swiper_id))
        profile = profile_result.scalar_one_or_none()
        user_result = await db.execute(select(User).where(User.id == swipe.swiper_id))
        candidate = user_result.scalar_one_or_none()
        if not profile or not candidate:
            log.warning("[LIKES] Missing profile or user for swiper_id=%s — skipping", swipe.swiper_id)
            continue
        photos_result = await db.execute(
            select(Photo).where(Photo.user_id == candidate.id).order_by(Photo.position)
        )
        photos = photos_result.scalars().all()
        log.info("[LIKES]   → %s (name=%s action=%s photos=%d)",
                 candidate.id, profile.name, swipe.action, len(photos))
        cards.append(_build_user_card(candidate, profile, list(photos), None))

    log.info("[LIKES] ✅ Returning %d like cards", len(cards))
    return cards


@router.get("/users/{user_id}", response_model=UserCard)
async def get_user_detail(
    user_id: str,
    user: User = Depends(get_current_verified_user),
    db: AsyncSession = Depends(get_db),
):
    """Full profile (UserCard + lifestyle fields) for a single user — used by the detail screen."""
    log.info("[USER-DETAIL] %s requested by %s", user_id, user.id)

    other_q = await db.execute(select(User).where(User.id == user_id))
    other = other_q.scalar_one_or_none()
    if not other:
        raise HTTPException(status_code=404, detail="User not found")

    profile_q = await db.execute(select(Profile).where(Profile.user_id == user_id))
    profile = profile_q.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not set up")

    # Privacy: hide profiles you've blocked or that have blocked you.
    block_q = await db.execute(
        select(Block).where(
            or_(
                and_(Block.blocker_id == user.id, Block.blocked_id == user_id),
                and_(Block.blocker_id == user_id, Block.blocked_id == user.id),
            )
        )
    )
    if block_q.scalar_one_or_none():
        log.info("[USER-DETAIL] %s is blocked-related to %s — hiding", user.id, user_id)
        raise HTTPException(status_code=404, detail="User not found")

    # Incognito profiles are only visible to people they've already liked.
    if profile.is_incognito:
        liked_me_q = await db.execute(
            select(Swipe).where(
                Swipe.swiper_id == user_id,
                Swipe.swiped_id == user.id,
                Swipe.action.in_(["like", "super_like"]),
            )
        )
        if not liked_me_q.scalar_one_or_none():
            log.info("[USER-DETAIL] %s is incognito and hasn't liked %s — hiding", user_id, user.id)
            raise HTTPException(status_code=404, detail="User not found")

    photos_q = await db.execute(
        select(Photo).where(Photo.user_id == user_id).order_by(Photo.position)
    )
    photos = photos_q.scalars().all()

    return _build_user_card(other, profile, list(photos), None, include_lifestyle=True)
