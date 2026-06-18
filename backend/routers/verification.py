import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from config import settings
from database import get_db
from models import User, FaceCheck, gen_uuid
from dependencies import get_current_verified_user

log = logging.getLogger("amadoo.verification")

router = APIRouter(prefix="/verification", tags=["verification"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_BYTES = 10 * 1024 * 1024


@router.get("/status")
async def verification_status(user: User = Depends(get_current_verified_user)):
    return {"is_face_verified": user.is_face_verified}


@router.post("/face")
async def submit_face(
    file: UploadFile = File(...),
    user: User = Depends(get_current_verified_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit a selfie for identity verification — the 'verified members only' gate.

    There's no human reviewer wired yet, so outside production this auto-approves so
    verification is actually enforceable today. In production it records a pending
    FaceCheck for review (and a real liveness/automated check would slot in here).
    """
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, and WebP images are accepted")
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="Image must be 10 MB or smaller")

    ext = (file.filename or "face").rsplit(".", 1)[-1].lower()
    if ext not in ("jpg", "jpeg", "png", "webp"):
        ext = "jpg"
    filename = f"{gen_uuid()}.{ext}"
    (settings.UPLOADS_DIR / "face" / filename).write_bytes(data)
    url = f"{settings.BASE_URL}/uploads/face/{filename}"

    auto_approve = settings.ENVIRONMENT != "production"
    status = "approved" if auto_approve else "pending"

    res = await db.execute(select(FaceCheck).where(FaceCheck.user_id == user.id))
    fc = res.scalar_one_or_none()
    if fc:
        fc.photo_url = url
        fc.status = status
        fc.rejection_reason = None
        fc.created_at = datetime.now(timezone.utc)
    else:
        db.add(FaceCheck(user_id=user.id, photo_url=url, status=status))

    if auto_approve:
        user.is_face_verified = True

    await db.commit()
    log.info("[VERIFY] user=%s status=%s verified=%s", user.id, status, user.is_face_verified)
    return {"is_face_verified": user.is_face_verified, "status": status}
