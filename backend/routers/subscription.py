import logging
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import User
from dependencies import get_current_verified_user

log = logging.getLogger("amadoo.subscription")

router = APIRouter(prefix="/subscription", tags=["subscription"])

PREMIUM_DAYS = 30


@router.get("/status")
async def subscription_status(user: User = Depends(get_current_verified_user)):
    return {
        "is_premium": user.is_premium,
        "premium_until": user.premium_until.isoformat() if user.premium_until else None,
    }


@router.post("/activate")
async def activate(user: User = Depends(get_current_verified_user), db: AsyncSession = Depends(get_db)):
    """Grant Premium.

    PRODUCTION: a real purchase must be validated against the store receipt
    (RevenueCat / StoreKit / Play Billing) BEFORE granting. This endpoint grants a
    30-day entitlement directly so the paywall flow is testable end-to-end now.
    """
    user.is_premium = True
    user.premium_until = datetime.now(timezone.utc) + timedelta(days=PREMIUM_DAYS)
    await db.commit()
    log.info("[SUB] Premium activated for %s until %s", user.id, user.premium_until)
    return {"is_premium": True, "premium_until": user.premium_until.isoformat()}


@router.post("/cancel")
async def cancel(user: User = Depends(get_current_verified_user), db: AsyncSession = Depends(get_db)):
    user.is_premium = False
    user.premium_until = None
    await db.commit()
    log.info("[SUB] Premium cancelled for %s", user.id)
    return {"is_premium": False}
