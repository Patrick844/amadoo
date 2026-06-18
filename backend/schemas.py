from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator


# ── Auth ─────────────────────────────────────────────────────────────────────

class SignUpRequest(BaseModel):
    email: EmailStr
    password: str

class SignInRequest(BaseModel):
    email: EmailStr
    password: str

class OTPVerifyRequest(BaseModel):
    email: EmailStr
    code: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class MeOut(BaseModel):
    id: str
    email: str
    is_email_verified: bool
    is_face_verified: bool
    is_onboarded: bool
    is_premium: bool = False

class SocialAuthRequest(BaseModel):
    provider: str           # "apple" | "google"
    id_token: str           # token from Apple/Google SDK

class PushTokenRequest(BaseModel):
    push_token: str


# ── Profile ───────────────────────────────────────────────────────────────────

class ProfileCreate(BaseModel):
    name: str
    birthday: date
    gender: str             # "male" | "female"

class ProfileUpdate(BaseModel):
    bio: Optional[str] = None
    school: Optional[str] = None
    job: Optional[str] = None
    industry: Optional[str] = None
    looking_for: Optional[list[str]] = None
    dating_goal: Optional[str] = None
    hangout_vibes: Optional[list[str]] = None
    height_cm: Optional[int] = None
    workout: Optional[str] = None
    drinking: Optional[str] = None
    smoking: Optional[str] = None
    religion: Optional[str] = None
    vibe: Optional[str] = None
    is_incognito: Optional[bool] = None
    has_pet: Optional[bool] = None
    intents: Optional[list[str]] = None
    hobbies: Optional[list[str]] = None
    activities: Optional[list[str]] = None
    trips: Optional[list[str]] = None
    chill_vibes: Optional[list[str]] = None
    want_to_meet: Optional[list[str]] = None
    age_range_min: Optional[int] = None
    age_range_max: Optional[int] = None

    @field_validator("bio")
    @classmethod
    def bio_max_length(cls, v):
        if v and len(v) > 300:
            raise ValueError("Bio must be 300 characters or less")
        return v

class LocationUpdate(BaseModel):
    latitude: float
    longitude: float

class ProfileOut(BaseModel):
    id: str
    user_id: str
    name: str
    birthday: date
    gender: str
    bio: Optional[str]
    school: Optional[str]
    job: Optional[str]
    industry: Optional[str]
    looking_for: list[str]
    dating_goal: Optional[str]
    hangout_vibes: list[str]
    height_cm: Optional[int]
    workout: Optional[str]
    drinking: Optional[str]
    smoking: Optional[str]
    religion: Optional[str]
    vibe: Optional[str]
    is_incognito: bool
    has_pet: bool
    intents: list[str]
    hobbies: list[str]
    activities: list[str]
    trips: list[str]
    chill_vibes: list[str]
    want_to_meet: list[str]
    age_range_min: int
    age_range_max: int

    model_config = {"from_attributes": True}


# ── User (public card shown in deck/likes/suggested) ──────────────────────────

class UserCard(BaseModel):
    id: str
    name: str
    age: int
    gender: str
    bio: Optional[str]
    photos: list[str]
    school: Optional[str]
    job: Optional[str]
    height_cm: Optional[int]
    hobbies: list[str]
    activities: list[str]
    trips: list[str]
    chill_vibes: list[str]
    has_pet: bool
    intents: list[str] = []
    is_face_verified: bool
    distance_km: Optional[float]
    # Optional lifestyle/intent fields — present on detail views; left null in deck rows where unused.
    industry: Optional[str] = None
    looking_for: list[str] = []
    dating_goal: Optional[str] = None
    hangout_vibes: list[str] = []
    workout: Optional[str] = None
    drinking: Optional[str] = None
    smoking: Optional[str] = None
    religion: Optional[str] = None
    vibe: Optional[str] = None


# ── Nearby / map ──────────────────────────────────────────────────────────────

class NearbyUser(BaseModel):
    id: str
    name: str
    age: int
    photo: Optional[str]
    distance_km: float
    # Approximate (jittered) coordinates — never the user's exact position.
    latitude: float
    longitude: float
    intents: list[str] = []
    is_face_verified: bool


# ── Photos ────────────────────────────────────────────────────────────────────

class PhotoOut(BaseModel):
    id: str
    url: str
    position: int
    category: Optional[str]

    model_config = {"from_attributes": True}


# ── Swipes ────────────────────────────────────────────────────────────────────

class SwipeRequest(BaseModel):
    swiped_id: str
    action: str             # "like" | "dislike" | "super_like"

class SwipeResponse(BaseModel):
    matched: bool
    match_id: Optional[str] = None


# ── Matches & Messages ────────────────────────────────────────────────────────

class MatchOut(BaseModel):
    id: str
    other_user: UserCard
    created_at: datetime
    is_active: bool
    last_message: Optional["MessageOut"] = None
    unread_count: int

class MessageOut(BaseModel):
    id: str
    match_id: str
    sender_id: str
    content: Optional[str]
    type: str
    image_url: Optional[str]
    sent_at: datetime
    read_at: Optional[datetime]

    model_config = {"from_attributes": True}

class SendMessageRequest(BaseModel):
    content: Optional[str] = None
    type: str = "text"
    image_url: Optional[str] = None


# ── Safety (report / block) ───────────────────────────────────────────────────

class ReportRequest(BaseModel):
    reported_id: str
    reason: str
    details: Optional[str] = None

class BlockRequest(BaseModel):
    blocked_id: str


# ── Face check ────────────────────────────────────────────────────────────────

class FaceCheckOut(BaseModel):
    id: str
    status: str
    rejection_reason: Optional[str]
    created_at: datetime
