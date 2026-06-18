# Amadoo — Full Architecture & Workflow

## Overview

Amadoo is a dating app with:
- **Frontend**: React Native (Expo SDK 54, expo-router, Zustand)
- **Backend**: FastAPI (Python, async, SQLAlchemy + asyncpg, PostgreSQL)

---

## Directory layout

```
amadoo/
├── app/                    ← React Native screens (expo-router file-based routing)
│   ├── _layout.tsx         ← Root layout (providers, SplashScreen)
│   ├── index.tsx           ← Loading screen + auth redirect
│   ├── (auth)/             ← Unauthenticated screens
│   │   ├── index.tsx       ← Welcome / social login
│   │   ├── sign-up.tsx
│   │   ├── sign-in.tsx
│   │   ├── forgot-password.tsx
│   │   └── verify-email.tsx
│   ├── (onboarding)/       ← One-time setup after signup
│   │   ├── name.tsx, birthday.tsx, gender.tsx, school.tsx, job.tsx
│   │   ├── tell-us-more.tsx (height, workout, drinking, etc.)
│   │   ├── hobbies.tsx, activities.tsx, trips.tsx, chill.tsx, pet.tsx
│   │   ├── i-want-to-meet.tsx (gender pref + age range)
│   │   ├── upload-photos.tsx
│   │   └── face-check.tsx
│   └── (app)/              ← Main app (tab bar)
│       ├── index.tsx        ← Swipe deck
│       ├── likes.tsx        ← People who liked me
│       ├── suggested.tsx    ← Suggested profiles
│       ├── matches.tsx      ← Match list + conversations
│       ├── chat/[matchId].tsx
│       ├── profile.tsx      ← My profile
│       ├── settings.tsx     ← Settings (incognito, notifications, etc.)
│       └── edit-profile.tsx
│
├── stores/
│   ├── auth.store.ts       ← Zustand: user, tokens, onboarding data
│   └── swipe.store.ts      ← Zustand: deck cards, pendingMatch
│
├── types/index.ts          ← Shared TypeScript types
├── constants/colors.ts     ← Design tokens
│
└── backend/
    ├── main.py             ← FastAPI app, routers, CORS, static files
    ├── models.py           ← SQLAlchemy ORM models
    ├── schemas.py          ← Pydantic request/response models
    ├── database.py         ← Async engine + session factory
    ├── auth_utils.py       ← bcrypt, JWT, OTP helpers
    ├── dependencies.py     ← get_current_user, get_current_verified_user
    ├── config.py           ← Pydantic settings (reads .env)
    ├── seed.py             ← Dev seed script
    └── routers/
        ├── auth.py
        ├── profiles.py
        ├── swipes.py
        └── matches.py
```

---

## Database schema

```
users
  id (UUID PK)
  email (unique)
  password_hash
  is_email_verified
  is_face_verified
  is_onboarded
  role ("user" | "admin")
  created_at, last_active

profiles
  id (UUID PK)
  user_id → users
  name, birthday, gender
  bio, school, job, height_cm
  workout, drinking, smoking, religion, vibe
  is_incognito (bool, female-only feature)
  has_pet
  hobbies[], activities[], trips[], chill_vibes[]  ← ARRAY(Text)
  want_to_meet[], age_range_min, age_range_max
  latitude, longitude, location_updated_at

photos
  id, user_id → users
  url, position (0 = main), category

otp_codes
  email, code_hash (SHA-256), purpose, expires_at, used_at

auth_tokens       ← refresh tokens (hashed SHA-256)
social_auth       ← Apple / Google OAuth links
face_checks       ← selfie review queue

swipes
  swiper_id → users
  swiped_id → users
  action ("like" | "dislike" | "super_like")

matches
  user_a_id, user_b_id → users   (sorted so a < b)
  is_active, unmatched_by, unmatched_at

messages
  match_id → matches
  sender_id → users
  content, type ("text" | "image"), image_url
  sent_at, read_at

notifications, reports, blocks, boosts
```

---

## API endpoints

### Auth  `/auth`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/signup` | Create account → returns access+refresh tokens |
| POST | `/auth/verify-email` | OTP check (dev: `000000` always passes) |
| POST | `/auth/signin` | Login → tokens |
| POST | `/auth/forgot-password` | Send reset OTP email |
| POST | `/auth/reset-password` | Verify OTP → update password |
| POST | `/auth/refresh` | Rotate refresh token |
| POST | `/auth/logout` | Revoke refresh token |
| GET  | `/auth/me` | Returns `{id, email, is_email_verified, is_face_verified, is_onboarded}` |

### Profile  `/profile`
| Method | Path | Description |
|--------|------|-------------|
| POST | `/profile` | Create profile (requires verified email) → sets `is_onboarded=true` |
| GET  | `/profile/me` | Get my profile |
| PATCH | `/profile/me` | Update bio, school, hobbies, `is_incognito`, etc. |
| PATCH | `/profile/me/location` | Update lat/lng |
| POST | `/profile/me/photos` | Upload photo (multipart) |
| GET  | `/profile/me/photos` | List my photos |
| DELETE | `/profile/me/photos/{id}` | Delete a photo |

### Swipes  (no prefix)
| Method | Path | Description |
|--------|------|-------------|
| GET  | `/deck` | Fetch swipe candidates (filtered by gender, age, incognito) |
| POST | `/swipes` | Record swipe action → returns `{matched, match_id}` |
| GET  | `/likes` | People who liked me but I haven't swiped yet |

### Matches  (no prefix)
| Method | Path | Description |
|--------|------|-------------|
| GET  | `/matches` | My active matches (with last message + unread count) |
| GET  | `/matches/{id}/messages` | Paginated messages (marks them read) |
| POST | `/matches/{id}/messages` | Send a message |
| DELETE | `/matches/{id}` | Unmatch |

---

## Auth flow

```
1. POST /auth/signup  { email, password }
   → hashes password with bcrypt
   → stores user row (is_email_verified=false)
   → generates OTP, stores SHA-256 hash in otp_codes
   → sends OTP email (Gmail SMTP, background task)
   → returns { access_token (JWT, 60 min), refresh_token (random, 30 days) }

2. POST /auth/verify-email  { email, code }
   → in dev: code "000000" always passes
   → sets is_email_verified=true

3. POST /auth/signin  { email, password }
   → bcrypt.checkpw
   → issues new token pair

4. POST /auth/refresh  { refresh_token }
   → looks up SHA-256(token) in auth_tokens
   → revokes old token, issues new pair (rotation)

5. All protected endpoints:
   → Authorization: Bearer <access_token>
   → get_current_user: decodes JWT → user
   → get_current_verified_user: also asserts is_email_verified
```

**JWT payload**: `{ sub: user_id, exp: timestamp, type: "access" }`

---

## Onboarding flow

After signup, the app detects `user.is_onboarded === false` and routes to `/(onboarding)/name`.

Steps: name → birthday → gender → school → job → tell-us-more → hobbies → activities → trips → chill → pet → i-want-to-meet → upload-photos → face-check

Each screen calls `updateOnboarding(data)` in Zustand. The final step calls `POST /profile` with the collected data.

---

## Match flow (the core)

```
User A swipes right on User B
  → POST /swipes { swiped_id: B.id, action: "like" }

Backend checks: has B already liked A?
  SELECT swipes WHERE swiper=B AND swiped=A AND action IN ('like','super_like')

  NO  → return { matched: false }
  YES → create Match row (user_a=min(A,B), user_b=max(A,B))
        create Notifications for both A and B
        return { matched: true, match_id }

Frontend: if matched=true → show match animation popup
```

### Incognito mode (females only)
```
Sarah (female, incognito=true) likes Alex

GET /deck for Alex:
  Normal flow: Sarah is filtered OUT (is_incognito=true)
  BUT: Sarah has a swipe WHERE swiped_id=Alex → she's in the "incognito_liked_me" set
  → Sarah IS included in Alex's deck

Alex swipes right on Sarah
  → both have liked each other → Match created
```

### Swipe deck filtering
```
GET /deck filters candidates who:
  ✓ are onboarded
  ✓ match my want_to_meet genders
  ✓ are within my age_range_min..age_range_max
  ✗ already swiped by me (any direction)
  ✗ in a block relationship with me
  ✗ are me
  ✗ are incognito AND have not liked me
```

---

## Token auth (frontend ↔ backend)

```
Zustand auth.store holds:
  token: string | null   ← JWT access token

Every API call:
  Authorization: Bearer <token>

On 401: call POST /auth/refresh with stored refresh_token
  → new access_token → retry original request
  (not implemented yet — will be added when backend is connected)
```

---

## Real-time / notifications

Currently: **polling only** (no WebSocket).

Planned: push notifications via Expo Notifications when backend sends `Notification` rows (already modelled).

---

## Local dev setup

```bash
# Backend
cd backend
uv run uvicorn main:app --reload    # runs on :8000

# Seed test data
uv run python seed.py

# Frontend
npx expo start
# Scan QR with Expo Go (iOS/Android)
```

**Important about Expo Go + backend**: Expo Go on your phone uses the same wifi as your Mac. The backend runs on `localhost:8000` on your Mac. Your phone can NOT reach `localhost` — it resolves to the phone itself. You must use your Mac's LAN IP:

```
# Find your IP:
ipconfig getifaddr en0   # e.g. 192.168.1.42

# Set in frontend .env or config:
API_BASE_URL=http://192.168.1.42:8000

# Your friends on a different network CANNOT reach your local backend.
# Options:
#   - ngrok: ngrok http 8000  → gives a public https URL
#   - deploy the backend to Render/Railway/Fly.io
```

---

## Security notes

- Passwords: bcrypt (12 rounds)
- OTPs: SHA-256 hash stored, 10 min expiry, single-use
- Refresh tokens: SHA-256 hash stored, rotated on every use
- JWT: HS256, 60 min expiry
- Dev bypass: `000000` OTP only works when `ENVIRONMENT=development`
- Email enumeration: forgot-password always returns 200
- Incognito: enforced server-side (gender check in PATCH /profile/me)
