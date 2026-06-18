import uuid
from datetime import datetime, date

from sqlalchemy import (
    Boolean, Column, Date, DateTime, Float, ForeignKey,
    Integer, String, Text, ARRAY, func,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from database import Base


def gen_uuid():
    return str(uuid.uuid4())


# ── Users ────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    email = Column(Text, unique=True, nullable=False)
    password_hash = Column(Text, nullable=True)          # null for social-only accounts
    is_email_verified = Column(Boolean, default=False)
    is_face_verified = Column(Boolean, default=False)
    is_onboarded = Column(Boolean, default=False)
    role = Column(String(20), default="user")            # "user" | "admin"
    push_token = Column(Text, nullable=True)             # Expo push token
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_active = Column(DateTime(timezone=True), nullable=True)
    is_premium = Column(Boolean, default=False)           # Amadoo Premium entitlement
    premium_until = Column(DateTime(timezone=True), nullable=True)

    profile = relationship("Profile", back_populates="user", uselist=False)
    photos = relationship("Photo", back_populates="user")
    social_auths = relationship("SocialAuth", back_populates="user")
    auth_tokens = relationship("AuthToken", back_populates="user")
    face_check = relationship("FaceCheck", back_populates="user", uselist=False, foreign_keys="FaceCheck.user_id")
    sent_swipes = relationship("Swipe", foreign_keys="Swipe.swiper_id", back_populates="swiper")
    received_swipes = relationship("Swipe", foreign_keys="Swipe.swiped_id", back_populates="swiped")
    notifications = relationship("Notification", back_populates="user")


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), unique=True, nullable=False)
    name = Column(Text, nullable=False)
    birthday = Column(Date, nullable=False)
    gender = Column(String(20), nullable=False)          # "male" | "female"
    bio = Column(Text, nullable=True)
    school = Column(Text, nullable=True)
    job = Column(Text, nullable=True)
    industry = Column(Text, nullable=True)               # business intent
    looking_for = Column(ARRAY(Text), default=list)      # business intent: "Co-founder" | "Investor" | ...
    dating_goal = Column(Text, nullable=True)            # dating intent: "Long-term" | "Casual" | ...
    hangout_vibes = Column(ARRAY(Text), default=list)    # activity intent: "Coffee" | "Nightlife" | ...
    height_cm = Column(Integer, nullable=True)
    workout = Column(Text, nullable=True)
    drinking = Column(Text, nullable=True)
    smoking = Column(Text, nullable=True)
    religion = Column(Text, nullable=True)
    vibe = Column(Text, nullable=True)
    is_incognito = Column(Boolean, default=False)
    has_pet = Column(Boolean, default=False)
    intents = Column(ARRAY(Text), default=list)          # "dating" | "activity" | "business"
    hobbies = Column(ARRAY(Text), default=list)
    activities = Column(ARRAY(Text), default=list)
    trips = Column(ARRAY(Text), default=list)
    chill_vibes = Column(ARRAY(Text), default=list)
    want_to_meet = Column(ARRAY(Text), default=list)
    age_range_min = Column(Integer, default=18)
    age_range_max = Column(Integer, default=100)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    location_updated_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="profile")


# ── Photos ───────────────────────────────────────────────────────────────────

class Photo(Base):
    __tablename__ = "photos"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    url = Column(Text, nullable=False)
    position = Column(Integer, nullable=False)           # 0 = main
    category = Column(Text, nullable=True)               # null | "activity" | "pet" | "hobbies" | "trips" | "chill"
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="photos")


# ── Auth ─────────────────────────────────────────────────────────────────────

class OTPCode(Base):
    __tablename__ = "otp_codes"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    email = Column(Text, nullable=False)
    code_hash = Column(Text, nullable=False)
    purpose = Column(String(30), nullable=False)         # "verify_email" | "reset_password"
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PendingSignup(Base):
    """Email + password + OTP held until verification succeeds. Only then does a User row get created."""
    __tablename__ = "pending_signups"

    email = Column(Text, primary_key=True)
    password_hash = Column(Text, nullable=False)
    code_hash = Column(Text, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SocialAuth(Base):
    __tablename__ = "social_auth"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    provider = Column(String(20), nullable=False)        # "apple" | "google"
    provider_id = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="social_auths")


class AuthToken(Base):
    __tablename__ = "auth_tokens"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    token_hash = Column(Text, nullable=False)
    device_name = Column(Text, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    revoked_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="auth_tokens")


# ── Face check ───────────────────────────────────────────────────────────────

class FaceCheck(Base):
    __tablename__ = "face_checks"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), unique=True, nullable=False)
    photo_url = Column(Text, nullable=False)
    status = Column(String(20), default="pending")       # "pending" | "approved" | "rejected"
    rejection_reason = Column(Text, nullable=True)
    reviewed_by = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="face_check", foreign_keys=[user_id])


# ── Swipes & Matches ─────────────────────────────────────────────────────────

class Swipe(Base):
    __tablename__ = "swipes"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    swiper_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    swiped_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    action = Column(String(20), nullable=False)          # "like" | "dislike" | "super_like"
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    swiper = relationship("User", foreign_keys=[swiper_id], back_populates="sent_swipes")
    swiped = relationship("User", foreign_keys=[swiped_id], back_populates="received_swipes")


class Match(Base):
    __tablename__ = "matches"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_a_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    user_b_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)
    unmatched_by = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
    unmatched_at = Column(DateTime(timezone=True), nullable=True)

    messages = relationship("Message", back_populates="match")


class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    match_id = Column(UUID(as_uuid=False), ForeignKey("matches.id"), nullable=False)
    sender_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=True)
    type = Column(String(10), default="text")            # "text" | "image"
    image_url = Column(Text, nullable=True)
    sent_at = Column(DateTime(timezone=True), server_default=func.now())
    read_at = Column(DateTime(timezone=True), nullable=True)

    match = relationship("Match", back_populates="messages")


# ── Boosts ────────────────────────────────────────────────────────────────────

class Boost(Base):
    __tablename__ = "boosts"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)


# ── Notifications ─────────────────────────────────────────────────────────────

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    type = Column(String(30), nullable=False)            # "new_match" | "new_message" | "new_like" | "face_check_result"
    title = Column(Text, nullable=False)
    body = Column(Text, nullable=False)
    data = Column(JSONB, nullable=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    sent_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="notifications")


# ── Safety ────────────────────────────────────────────────────────────────────

class Report(Base):
    __tablename__ = "reports"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    reporter_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    reported_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    reason = Column(Text, nullable=False)
    details = Column(Text, nullable=True)
    status = Column(String(20), default="open")          # "open" | "resolved" | "dismissed"
    resolved_by = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)


class Block(Base):
    __tablename__ = "blocks"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    blocker_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    blocked_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
