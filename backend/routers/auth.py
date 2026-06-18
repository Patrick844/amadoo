import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, delete, update

from database import get_db
from models import (
    User, OTPCode, AuthToken, Profile, Photo, SocialAuth, FaceCheck,
    Swipe, Match, Message, Boost, Notification, Report, Block, PendingSignup,
)
from schemas import (
    SignUpRequest, SignInRequest, OTPVerifyRequest,
    ForgotPasswordRequest, ResetPasswordRequest,
    RefreshTokenRequest, TokenResponse, MeOut, PushTokenRequest,
)
from auth_utils import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    generate_otp, verify_otp,
)
from config import settings
from dependencies import get_current_user, get_current_verified_user
from rate_limit import rate_limit

log = logging.getLogger("amadoo.auth")

router = APIRouter(prefix="/auth", tags=["auth"])

OTP_EXPIRE_MINUTES = 10


async def _send_otp_email(email: str, code: str, purpose: str):
    import smtplib
    import asyncio
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    log.info("[OTP] Preparing to send %s email to %s", purpose, email)
    log.info("[OTP] Code (also printed below in case email fails): %s", code)

    # No transport configured → console-only (local dev / tests). Honors the
    # "leave blank to use console logging" contract in config.py without a wasted
    # (and potentially hanging) network round-trip.
    if not settings.RESEND_API_KEY and (not settings.SMTP_USER or not settings.SMTP_PASSWORD):
        log.warning("[OTP] No email transport configured — console fallback for %s", email)
        print(f"\n{'='*50}\n  OTP CODE for {email}: {code}\n  Purpose: {purpose}\n{'='*50}\n")
        return

    subject = "Your Amadoo verification code" if purpose == "verify_email" else "Reset your Amadoo password"
    body = f"""
    <div style="font-family:sans-serif;max-width:420px;margin:auto;padding:32px">
      <h2 style="color:#FF3B6B;margin-bottom:8px">Amadoo</h2>
      <p style="color:#333;font-size:16px">Your verification code is:</p>
      <div style="font-size:40px;font-weight:700;letter-spacing:8px;color:#1A1A1A;margin:24px 0">{code}</div>
      <p style="color:#888;font-size:13px">This code expires in 10 minutes. Do not share it with anyone.</p>
    </div>
    """

    def _console_fallback(reason: str):
        log.error("[OTP] ❌ Failed to send email to %s: %s", email, reason)
        log.warning("[OTP] FALLBACK — %s code for %s: %s", purpose, email, code)
        print(f"\n{'='*50}")
        print(f"  OTP CODE for {email}: {code}")
        print(f"  Purpose: {purpose}")
        print(f"{'='*50}\n")

    # ── Preferred transport: Resend over HTTPS (works on Render, which blocks SMTP) ──
    if settings.RESEND_API_KEY:
        import httpx
        try:
            log.info("[OTP] Sending via Resend API to %s ...", email)
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(
                    "https://api.resend.com/emails",
                    headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
                    json={
                        "from": settings.EMAIL_FROM,
                        "to": [email],
                        "subject": subject,
                        "html": body,
                    },
                )
            if resp.status_code >= 400:
                _console_fallback(f"Resend {resp.status_code}: {resp.text}")
            else:
                log.info("[OTP] ✅ Email sent via Resend to %s (purpose=%s)", email, purpose)
        except Exception as exc:
            _console_fallback(repr(exc))
        return

    # ── Fallback transport: SMTP (local dev only — blocked on most PaaS) ──
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = email
    msg.attach(MIMEText(body, "html"))

    def _send():
        try:
            log.info("[OTP] Connecting to SMTP %s:%s ...", settings.SMTP_HOST, settings.SMTP_PORT)
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as smtp:
                smtp.starttls()
                log.info("[OTP] SMTP TLS OK — logging in as %s", settings.SMTP_USER)
                smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                smtp.sendmail(settings.EMAIL_FROM, email, msg.as_string())
            log.info("[OTP] ✅ Email sent successfully to %s (purpose=%s)", email, purpose)
        except Exception as exc:
            log.error("[OTP] ❌ Failed to send email to %s: %s", email, exc)
            log.warning("[OTP] FALLBACK — %s code for %s: %s", purpose, email, code)
            print(f"\n{'='*50}")
            print(f"  OTP CODE for {email}: {code}")
            print(f"  Purpose: {purpose}")
            print(f"{'='*50}\n")

    # Use get_running_loop (not deprecated get_event_loop) to run blocking SMTP in thread pool
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, _send)


@router.post("/signup", status_code=status.HTTP_202_ACCEPTED,
             dependencies=[Depends(rate_limit(5, 60, "signup"))])
async def signup(body: SignUpRequest, background: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    """Stash email + password + OTP in pending_signups. The real User row is created
    only after /auth/verify-email succeeds — so an abandoned signup never permanently
    reserves the email."""
    log.info("[SIGNUP] Attempt for email=%s", body.email)
    now = datetime.now(timezone.utc)

    # Only verified-account collisions are hard 409s. Abandoned signups can be retried.
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        log.warning("[SIGNUP] ❌ Email already registered (verified account): %s", body.email)
        raise HTTPException(status_code=409, detail="Email already registered")

    plain_code, code_hash = generate_otp()
    expires_at = now + timedelta(minutes=OTP_EXPIRE_MINUTES)
    password_hash = hash_password(body.password)

    # Upsert into pending_signups — retried signup with the same email replaces the prior row.
    await db.execute(delete(PendingSignup).where(PendingSignup.email == body.email))
    db.add(PendingSignup(
        email=body.email,
        password_hash=password_hash,
        code_hash=code_hash,
        expires_at=expires_at,
    ))
    await db.commit()
    log.info("[SIGNUP] Pending signup stored for %s — queuing OTP email", body.email)

    background.add_task(_send_otp_email, body.email, plain_code, "verify_email")
    return {"detail": "Verification code sent"}


@router.post("/verify-email", response_model=TokenResponse,
             dependencies=[Depends(rate_limit(10, 60, "verify-email"))])
async def verify_email(body: OTPVerifyRequest, db: AsyncSession = Depends(get_db)):
    """Verify the OTP and, if there's a matching pending signup, create the User row and
    issue tokens. Idempotent for password-reset OTPs (which use the OTPCode table)."""
    log.info("[VERIFY-EMAIL] Attempt for email=%s code=%s", body.email, body.code)
    now = datetime.now(timezone.utc)
    # Bypass the OTP check when: (a) local dev with the well-known 000000 code, or
    # (b) a TEST_OTP_CODE is configured (any environment) and matches — for testers
    # who can't receive email yet. TEST_OTP_CODE must be cleared before launch.
    dev_bypass = (
        (settings.ENVIRONMENT == "development" and body.code == "000000")
        or (settings.TEST_OTP_CODE != "" and body.code == settings.TEST_OTP_CODE)
    )
    if dev_bypass:
        log.warning("[OTP] ⚠️ OTP bypass used for %s (test code)", body.email)

    # Pending signup path — the only one that creates a new User
    pending_q = await db.execute(
        select(PendingSignup).where(
            and_(PendingSignup.email == body.email, PendingSignup.expires_at > now)
        )
    )
    pending = pending_q.scalar_one_or_none()

    if pending:
        if not dev_bypass and not verify_otp(body.code, pending.code_hash):
            log.warning("[VERIFY-EMAIL] ❌ Wrong code for pending signup %s", body.email)
            raise HTTPException(status_code=400, detail="Invalid or expired code")

        user = User(
            email=pending.email,
            password_hash=pending.password_hash,
            is_email_verified=True,
        )
        db.add(user)
        await db.flush()
        log.info("[VERIFY-EMAIL] ✅ Created user %s from pending signup", user.id)

        access_token = create_access_token(user.id)
        raw_refresh, hashed_refresh = create_refresh_token()
        db.add(AuthToken(
            user_id=user.id,
            token_hash=hashed_refresh,
            expires_at=now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        ))
        await db.execute(delete(PendingSignup).where(PendingSignup.email == body.email))
        await db.commit()

        return TokenResponse(access_token=access_token, refresh_token=raw_refresh)

    # Fallback path — verifying an OTP for an existing user (legacy / re-verify case).
    # Used when an already-created User somehow needs to re-verify their email.
    if not dev_bypass:
        otp_q = await db.execute(
            select(OTPCode).where(
                and_(
                    OTPCode.email == body.email,
                    OTPCode.purpose == "verify_email",
                    OTPCode.used_at.is_(None),
                    OTPCode.expires_at > now,
                )
            ).order_by(OTPCode.created_at.desc())
        )
        otp = otp_q.scalar_one_or_none()
        if not otp or not verify_otp(body.code, otp.code_hash):
            log.warning("[VERIFY-EMAIL] ❌ No valid OTP / pending signup for %s", body.email)
            raise HTTPException(status_code=400, detail="Invalid or expired code")
        otp.used_at = now

    user_q = await db.execute(select(User).where(User.email == body.email))
    user = user_q.scalar_one_or_none()
    if not user:
        log.error("[VERIFY-EMAIL] ❌ No pending signup and no user for %s", body.email)
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    user.is_email_verified = True
    access_token = create_access_token(user.id)
    raw_refresh, hashed_refresh = create_refresh_token()
    db.add(AuthToken(
        user_id=user.id,
        token_hash=hashed_refresh,
        expires_at=now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    ))
    await db.commit()
    log.info("[VERIFY-EMAIL] ✅ Re-verified existing user %s", user.id)

    return TokenResponse(access_token=access_token, refresh_token=raw_refresh)


@router.post("/signin", response_model=TokenResponse,
             dependencies=[Depends(rate_limit(10, 60, "signin"))])
async def signin(body: SignInRequest, db: AsyncSession = Depends(get_db)):
    log.info("[SIGNIN] Attempt for email=%s", body.email)

    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user:
        log.warning("[SIGNIN] ❌ No user found for email=%s", body.email)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.password_hash:
        log.warning("[SIGNIN] ❌ User %s has no password hash (social login only?)", user.id)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(body.password, user.password_hash):
        log.warning("[SIGNIN] ❌ Wrong password for user %s (%s)", user.id, body.email)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    log.info("[SIGNIN] Password OK for user %s — issuing tokens", user.id)
    log.info("[SIGNIN] User state: is_email_verified=%s is_onboarded=%s is_face_verified=%s",
             user.is_email_verified, user.is_onboarded, user.is_face_verified)

    access_token = create_access_token(user.id)
    raw_refresh, hashed_refresh = create_refresh_token()
    db.add(AuthToken(
        user_id=user.id,
        token_hash=hashed_refresh,
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    ))
    user.last_active = datetime.now(timezone.utc)
    await db.commit()
    log.info("[SIGNIN] ✅ Done — tokens issued for user %s", user.id)

    return TokenResponse(access_token=access_token, refresh_token=raw_refresh)


@router.post("/forgot-password",
             dependencies=[Depends(rate_limit(5, 60, "forgot-password"))])
async def forgot_password(body: ForgotPasswordRequest, background: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    log.info("[FORGOT-PASSWORD] Request for email=%s", body.email)

    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user:
        log.info("[FORGOT-PASSWORD] Email not found — returning 200 anyway (anti-enumeration)")
    else:
        log.info("[FORGOT-PASSWORD] User found (id=%s) — generating reset OTP", user.id)
        plain_code, code_hash = generate_otp()
        otp = OTPCode(
            email=body.email,
            code_hash=code_hash,
            purpose="reset_password",
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRE_MINUTES),
        )
        db.add(otp)
        await db.commit()
        log.info("[FORGOT-PASSWORD] OTP created — queuing email to %s", body.email)
        background.add_task(_send_otp_email, body.email, plain_code, "reset_password")

    return {"detail": "If that email exists you'll receive a code"}


@router.post("/reset-password",
             dependencies=[Depends(rate_limit(10, 60, "reset-password"))])
async def reset_password(body: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    log.info("[RESET-PASSWORD] Attempt for email=%s code=%s", body.email, body.code)
    now = datetime.now(timezone.utc)

    # Bypass the OTP check when: (a) local dev with the well-known 000000 code, or
    # (b) a TEST_OTP_CODE is configured (any environment) and matches — for testers
    # who can't receive email yet. TEST_OTP_CODE must be cleared before launch.
    dev_bypass = (
        (settings.ENVIRONMENT == "development" and body.code == "000000")
        or (settings.TEST_OTP_CODE != "" and body.code == settings.TEST_OTP_CODE)
    )
    if dev_bypass:
        log.warning("[OTP] ⚠️ OTP bypass used for %s (test code)", body.email)
    if dev_bypass:
        log.warning("[RESET-PASSWORD] Dev bypass used for %s", body.email)

    if not dev_bypass:
        result = await db.execute(
            select(OTPCode).where(
                and_(
                    OTPCode.email == body.email,
                    OTPCode.purpose == "reset_password",
                    OTPCode.used_at.is_(None),
                    OTPCode.expires_at > now,
                )
            ).order_by(OTPCode.created_at.desc())
        )
        otp = result.scalar_one_or_none()
        if not otp:
            log.warning("[RESET-PASSWORD] ❌ No valid OTP found for %s", body.email)
            raise HTTPException(status_code=400, detail="Invalid or expired code")
        if not verify_otp(body.code, otp.code_hash):
            log.warning("[RESET-PASSWORD] ❌ Wrong code for %s", body.email)
            raise HTTPException(status_code=400, detail="Invalid or expired code")
        log.info("[RESET-PASSWORD] Code matched — marking OTP used")
        otp.used_at = now

    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one()
    user.password_hash = hash_password(body.new_password)
    await db.commit()
    log.info("[RESET-PASSWORD] ✅ Password updated for user %s (%s)", user.id, body.email)

    return {"detail": "Password updated"}


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    import hashlib
    log.info("[REFRESH] Token rotation requested")
    token_hash = hashlib.sha256(body.refresh_token.encode()).hexdigest()
    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(AuthToken).where(
            and_(
                AuthToken.token_hash == token_hash,
                AuthToken.revoked_at.is_(None),
                AuthToken.expires_at > now,
            )
        )
    )
    stored = result.scalar_one_or_none()
    if not stored:
        log.warning("[REFRESH] ❌ Invalid or expired refresh token")
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    log.info("[REFRESH] Valid token for user %s — rotating", stored.user_id)
    stored.revoked_at = now
    new_access = create_access_token(stored.user_id)
    raw_refresh, hashed_refresh = create_refresh_token()
    db.add(AuthToken(
        user_id=stored.user_id,
        token_hash=hashed_refresh,
        expires_at=now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    ))
    await db.commit()
    log.info("[REFRESH] ✅ New tokens issued for user %s", stored.user_id)

    return TokenResponse(access_token=new_access, refresh_token=raw_refresh)


@router.post("/logout")
async def logout(body: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    import hashlib
    log.info("[LOGOUT] Request received")
    token_hash = hashlib.sha256(body.refresh_token.encode()).hexdigest()
    result = await db.execute(select(AuthToken).where(AuthToken.token_hash == token_hash))
    token = result.scalar_one_or_none()
    if token:
        token.revoked_at = datetime.now(timezone.utc)
        await db.commit()
        log.info("[LOGOUT] ✅ Token revoked for user %s", token.user_id)
    else:
        log.warning("[LOGOUT] Token not found — already revoked or invalid")
    return {"detail": "Logged out"}


@router.get("/me", response_model=MeOut)
async def get_me(user: User = Depends(get_current_user)):
    log.info("[ME] user %s (%s) — verified=%s onboarded=%s face=%s",
             user.id, user.email, user.is_email_verified, user.is_onboarded, user.is_face_verified)
    return MeOut(
        id=user.id,
        email=user.email,
        is_email_verified=user.is_email_verified,
        is_face_verified=user.is_face_verified,
        is_onboarded=user.is_onboarded,
        is_premium=user.is_premium,
    )


@router.delete("/me")
async def delete_account(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Permanently delete the current user and every record that references them."""
    uid = user.id
    email = user.email
    log.info("[DELETE-ACCOUNT] Hard-delete requested for user %s (%s)", uid, email)

    # 1. NULL out admin-style references where this user touched someone else's record
    await db.execute(update(FaceCheck).where(FaceCheck.reviewed_by == uid).values(reviewed_by=None))
    await db.execute(update(Match).where(Match.unmatched_by == uid).values(unmatched_by=None))
    await db.execute(update(Report).where(Report.resolved_by == uid).values(resolved_by=None))

    # 2. Find matches involving this user, then delete their messages and the matches themselves
    match_rows = await db.execute(
        select(Match.id).where(or_(Match.user_a_id == uid, Match.user_b_id == uid))
    )
    match_ids = [row[0] for row in match_rows.all()]
    if match_ids:
        await db.execute(delete(Message).where(Message.match_id.in_(match_ids)))
        await db.execute(delete(Match).where(Match.id.in_(match_ids)))

    # 3. Any other messages sent by this user (defensive — should be covered above)
    await db.execute(delete(Message).where(Message.sender_id == uid))

    # 4. Per-user child rows
    await db.execute(delete(Swipe).where(or_(Swipe.swiper_id == uid, Swipe.swiped_id == uid)))
    await db.execute(delete(Block).where(or_(Block.blocker_id == uid, Block.blocked_id == uid)))
    await db.execute(delete(Report).where(or_(Report.reporter_id == uid, Report.reported_id == uid)))
    await db.execute(delete(Photo).where(Photo.user_id == uid))
    await db.execute(delete(FaceCheck).where(FaceCheck.user_id == uid))
    await db.execute(delete(SocialAuth).where(SocialAuth.user_id == uid))
    await db.execute(delete(AuthToken).where(AuthToken.user_id == uid))
    await db.execute(delete(Notification).where(Notification.user_id == uid))
    await db.execute(delete(Boost).where(Boost.user_id == uid))
    await db.execute(delete(Profile).where(Profile.user_id == uid))
    await db.execute(delete(OTPCode).where(OTPCode.email == email))

    # 5. Finally the user
    await db.execute(delete(User).where(User.id == uid))
    await db.commit()

    log.info("[DELETE-ACCOUNT] ✅ Account fully deleted (user %s)", uid)
    return {"detail": "Account deleted"}


@router.put("/push-token")
async def update_push_token(
    body: PushTokenRequest,
    user: User = Depends(get_current_verified_user),
    db: AsyncSession = Depends(get_db),
):
    log.info("[PUSH-TOKEN] Registering push token for user %s: %s…", user.id, body.push_token[:30])
    user.push_token = body.push_token
    await db.commit()
    log.info("[PUSH-TOKEN] ✅ Saved")
    return {"detail": "Push token registered"}
