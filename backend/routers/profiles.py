import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from config import settings
from database import get_db
from models import User, Profile, Photo, gen_uuid
from schemas import ProfileCreate, ProfileUpdate, ProfileOut, LocationUpdate, PhotoOut
from dependencies import get_current_user, get_current_verified_user

log = logging.getLogger("amadoo.profiles")

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_PHOTO_BYTES = 10 * 1024 * 1024  # 10 MB

router = APIRouter(prefix="/profile", tags=["profile"])


@router.post("", response_model=ProfileOut, status_code=201)
async def create_profile(
    body: ProfileCreate,
    user: User = Depends(get_current_verified_user),
    db: AsyncSession = Depends(get_db),
):
    log.info("[PROFILE-CREATE] user=%s name=%s gender=%s birthday=%s",
             user.id, body.name, body.gender, body.birthday)

    result = await db.execute(select(Profile).where(Profile.user_id == user.id))
    if result.scalar_one_or_none():
        log.warning("[PROFILE-CREATE] ❌ Profile already exists for user %s", user.id)
        raise HTTPException(status_code=409, detail="Profile already exists")

    profile = Profile(user_id=user.id, **body.model_dump())
    db.add(profile)
    user.is_onboarded = True
    await db.commit()
    await db.refresh(profile)
    log.info("[PROFILE-CREATE] ✅ Profile created (id=%s) — user marked as onboarded", profile.id)
    return profile


@router.get("/me", response_model=ProfileOut)
async def get_my_profile(
    user: User = Depends(get_current_verified_user),
    db: AsyncSession = Depends(get_db),
):
    log.info("[PROFILE-GET] user=%s", user.id)
    result = await db.execute(select(Profile).where(Profile.user_id == user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        log.warning("[PROFILE-GET] ❌ No profile found for user %s", user.id)
        raise HTTPException(status_code=404, detail="Profile not found")
    log.info("[PROFILE-GET] ✅ Found profile for %s (name=%s)", user.id, profile.name)
    return profile


@router.patch("/me", response_model=ProfileOut)
async def update_profile(
    body: ProfileUpdate,
    user: User = Depends(get_current_verified_user),
    db: AsyncSession = Depends(get_db),
):
    updates = body.model_dump(exclude_none=True)
    log.info("[PROFILE-UPDATE] user=%s fields=%s", user.id, list(updates.keys()))

    result = await db.execute(select(Profile).where(Profile.user_id == user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        log.warning("[PROFILE-UPDATE] ❌ No profile for user %s", user.id)
        raise HTTPException(status_code=404, detail="Profile not found")

    if updates.get("is_incognito") and profile.gender != "female":
        log.warning("[PROFILE-UPDATE] ❌ Incognito rejected — user %s is not female (gender=%s)",
                    user.id, profile.gender)
        raise HTTPException(status_code=403, detail="Incognito mode is only available for female profiles")

    for field, value in updates.items():
        setattr(profile, field, value)

    await db.commit()
    await db.refresh(profile)
    log.info("[PROFILE-UPDATE] ✅ Updated profile for user %s — new values: %s", user.id, updates)
    return profile


@router.patch("/me/location")
async def update_location(
    body: LocationUpdate,
    user: User = Depends(get_current_verified_user),
    db: AsyncSession = Depends(get_db),
):
    log.info("[LOCATION] user=%s lat=%.4f lng=%.4f", user.id, body.latitude, body.longitude)

    result = await db.execute(select(Profile).where(Profile.user_id == user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        log.warning("[LOCATION] ❌ No profile for user %s", user.id)
        raise HTTPException(status_code=404, detail="Profile not found")

    profile.latitude = body.latitude
    profile.longitude = body.longitude
    profile.location_updated_at = datetime.now(timezone.utc)
    await db.commit()
    log.info("[LOCATION] ✅ Updated for user %s", user.id)
    return {"detail": "Location updated"}


@router.post("/me/photos", response_model=PhotoOut, status_code=201)
async def upload_photo(
    position: int = Form(...),
    category: Optional[str] = Form(None),
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    log.info("[PHOTO-UPLOAD] user=%s position=%d category=%s content_type=%s size~%s",
             user.id, position, category, file.content_type, file.size)

    if file.content_type not in ALLOWED_TYPES:
        log.warning("[PHOTO-UPLOAD] ❌ Rejected content type: %s", file.content_type)
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, and WebP images are accepted")

    result = await db.execute(
        select(Photo).where(Photo.user_id == user.id, Photo.position == position)
    )
    existing = result.scalar_one_or_none()
    if existing:
        log.info("[PHOTO-UPLOAD] Replacing existing photo at position %d (id=%s)", position, existing.id)
        old_file = settings.UPLOADS_DIR / "photos" / existing.url.split("/")[-1]
        if old_file.exists():
            old_file.unlink()
            log.info("[PHOTO-UPLOAD] Deleted old file: %s", old_file.name)
        await db.delete(existing)

    data = await file.read()
    if len(data) > MAX_PHOTO_BYTES:
        log.warning("[PHOTO-UPLOAD] ❌ File too large: %d bytes", len(data))
        raise HTTPException(status_code=413, detail="Image must be 10 MB or smaller")

    ext = (file.filename or "photo").rsplit(".", 1)[-1].lower()
    if ext not in ("jpg", "jpeg", "png", "webp"):
        ext = "jpg"
    filename = f"{gen_uuid()}.{ext}"
    dest = settings.UPLOADS_DIR / "photos" / filename
    dest.write_bytes(data)
    log.info("[PHOTO-UPLOAD] Saved file: %s (%d bytes)", filename, len(data))

    url = f"{settings.BASE_URL}/uploads/photos/{filename}"
    photo = Photo(user_id=user.id, url=url, position=position, category=category)
    db.add(photo)
    await db.commit()
    await db.refresh(photo)
    log.info("[PHOTO-UPLOAD] ✅ Photo saved (id=%s url=%s)", photo.id, url)
    return photo


@router.get("/me/photos", response_model=list[PhotoOut])
async def get_my_photos(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    log.info("[PHOTOS-LIST] user=%s", user.id)
    result = await db.execute(
        select(Photo).where(Photo.user_id == user.id).order_by(Photo.position)
    )
    photos = result.scalars().all()
    log.info("[PHOTOS-LIST] Found %d photos for user %s", len(photos), user.id)
    return photos


@router.delete("/me/photos/{photo_id}", status_code=204)
async def delete_photo(
    photo_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    log.info("[PHOTO-DELETE] user=%s photo_id=%s", user.id, photo_id)
    result = await db.execute(
        select(Photo).where(Photo.id == photo_id, Photo.user_id == user.id)
    )
    photo = result.scalar_one_or_none()
    if not photo:
        log.warning("[PHOTO-DELETE] ❌ Photo not found (id=%s user=%s)", photo_id, user.id)
        raise HTTPException(status_code=404, detail="Photo not found")

    file_path = settings.UPLOADS_DIR / "photos" / photo.url.split("/")[-1]
    if file_path.exists():
        file_path.unlink()
        log.info("[PHOTO-DELETE] Deleted file from disk: %s", file_path.name)

    await db.delete(photo)
    await db.commit()
    log.info("[PHOTO-DELETE] ✅ Photo deleted (id=%s)", photo_id)
