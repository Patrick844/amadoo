# Amadoo

A React Native **connectivity app** — not dating-only. Users pick one or more
**intents** (Dating, Activities & friends, Business — all equally first-class) and
match with people whose intents overlap. iOS first, then Android.

- **Frontend:** Expo SDK 54 (React Native 0.81), Expo Router, TypeScript, Zustand
- **Backend:** FastAPI + PostgreSQL (SQLAlchemy async), JWT auth, Expo Push
- **Deployment:** Backend on Render (Blueprint), app via EAS Build / Updates
- **Status:** Fully wired to the real backend. Auth, onboarding, swipe deck,
  matches, chat, likes, and push notifications all call live API endpoints.

> The multi-intent model (onboarding, swipe filter, per-intent fields, matching
> rule) is documented in `docs/multi-intent-connections.md`. `constants/intents.ts`
> is the single source of truth for intents, labels, photo categories, and the
> per-intent option lists.

---

## Table of contents

1. [Architecture](#architecture)
2. [Repository layout](#repository-layout)
3. [Prerequisites](#prerequisites)
4. [Local development](#local-development)
   - [Backend](#1-backend-fastapi--postgresql)
   - [Frontend](#2-frontend-expo)
   - [Dev networking](#dev-networking-simulator-vs-real-device)
5. [Environment variables](#environment-variables)
6. [Email / OTP (Resend)](#email--otp-resend)
7. [The app — screens & flow](#the-app--screens--flow)
8. [The backend — API & data model](#the-backend--api--data-model)
9. [Database migrations](#database-migrations)
10. [Testing](#testing)
11. [Deployment](#deployment)
    - [Backend on Render](#backend-on-render)
    - [App with EAS](#app-with-eas)
12. [Common commands](#common-commands)
13. [Troubleshooting](#troubleshooting)
14. [Known constraints](#known-constraints)

---

## Architecture

```
┌─────────────────────────────┐         ┌──────────────────────────────┐
│  Expo / React Native app     │  HTTPS  │  FastAPI backend             │
│                              │ ──────▶ │                              │
│  services/api.ts             │  JWT    │  routers/  (auth, profiles,  │
│   • all API calls            │         │   swipes, matches, safety,   │
│   • token refresh mutex      │ ◀────── │   verification, subscription)│
│  services/notifications.ts   │  JSON   │  models.py  (SQLAlchemy)     │
│  stores/  (Zustand persist)  │         │  push.py    (Expo Push API)  │
└─────────────────────────────┘         └───────────────┬──────────────┘
            │                                            │
            │ APNs / FCM                          ┌──────▼───────┐
            ▼                                     │ PostgreSQL   │
   Expo Push notifications                        └──────────────┘
                                            ┌─────────────────────┐
                                            │ Resend (OTP email,   │
                                            │ HTTPS — Render-safe)  │
                                            └─────────────────────┘
```

**Real-time approach**
- **Push notifications** — Expo Push API → APNs/FCM. Fires on new message and new match.
- **Polling** — chat screen polls `GET /matches/{id}/messages?after_id=` every 4s while foregrounded.
- **No WebSockets** — deliberate for this scale; add when there's real concurrent load.

**Auto host detection** — `services/api.ts` reads `Constants.expoGoConfig?.debuggerHost`
to find the Mac's LAN IP automatically, so no manual IP edits when switching between
simulator and device in Expo Go.

---

## Repository layout

```
amadoo/
├── app/                       ← Expo Router screens (file name = route)
│   ├── (auth)/                ← welcome, sign-up, sign-in, verify-email, forgot/reset
│   ├── (onboarding)/          ← name → birthday → gender → intents → per-intent
│   │                            details → photos → face-check
│   └── (app)/
│       ├── (tabs)/            ← swipe (index), likes, matches, around-me, profile
│       ├── chat/[matchId]     ← conversation screen (4s polling)
│       ├── user/[userId]      ← public profile
│       ├── edit-profile, settings, subscription
│
├── components/                ← reusable UI
├── constants/intents.ts       ← SINGLE SOURCE OF TRUTH for intents + option lists
├── services/
│   ├── api.ts                 ← all API calls, host auto-detect, token refresh
│   └── notifications.ts       ← push token registration + tap handling
├── stores/
│   ├── auth.store.ts          ← Zustand persist (key 'amadoo-auth' in AsyncStorage)
│   └── swipe.store.ts         ← deck state, pending match
│
├── backend/                   ← FastAPI app (see backend/README.md)
│   ├── main.py                ← app factory, router includes, CORS, static /uploads
│   ├── config.py              ← Settings (pydantic-settings, reads .env)
│   ├── models.py              ← SQLAlchemy models
│   ├── schemas.py             ← Pydantic request/response models
│   ├── database.py            ← async engine + session
│   ├── init_db.py             ← create tables + seed once (used by Render startCommand)
│   ├── routers/               ← auth, profiles, swipes, matches, safety,
│   │                            verification, subscription
│   ├── push.py                ← Expo Push API utility (httpx)
│   ├── rate_limit.py          ← in-memory rate limiter
│   ├── migrations/            ← manual SQL migrations (no Alembic runtime)
│   └── tests/                 ← pytest suite
│
├── docs/                      ← design + flow documentation
├── design/                    ← reference mockups (*.jpeg)
├── app.json                   ← Expo config (bundle IDs, permissions, plugins)
├── eas.json                   ← EAS Build / Submit profiles
├── render.yaml                ← Render Blueprint (backend + managed Postgres)
└── CLAUDE.md                  ← project working notes
```

---

## Prerequisites

| Tool | Notes |
|------|-------|
| **Node.js 20+** | `brew install node` |
| **bun** | Package manager. Installed at `~/.bun/bin/bun` (may not be on PATH). |
| **Watchman** | `brew install watchman` |
| **Xcode** | From the Mac App Store. Open once, accept license, `xcode-select --install`. Required for the iOS Simulator. |
| **Expo Go (SDK 54)** | On your iPhone, from the App Store. Must match SDK 54. |
| **Python 3.11+** | For the backend (Render pins 3.12.7). |
| **PostgreSQL** | Local database for backend dev. |
| **EAS CLI** | `npm install -g eas-cli` — for device/store builds. |

> **Package manager is bun**, not npm. `.npmrc` has `legacy-peer-deps=true` — never delete it.
> Always use `npx expo install <lib>` for Expo libraries so versions stay SDK-compatible.

---

## Local development

### 1. Backend (FastAPI + PostgreSQL)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# one-time: create the database
createdb amadoo               # or: psql -c "CREATE DATABASE amadoo;"

# create tables + seed (safe to re-run; only seeds when empty)
python init_db.py

# run
uvicorn main:app --reload --port 8000
```

API is now at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

`backend/.env` (not committed) holds at least:
```
DATABASE_URL=postgresql+asyncpg://patricksaade@localhost:5432/amadoo
JWT_SECRET=<any-strong-string-for-dev>
ENVIRONMENT=development
```

### 2. Frontend (Expo)

```bash
~/.bun/bin/bun install
npx expo install --fix      # reconcile any SDK version drift
npx expo start
```

Then:
- **iOS Simulator** — press `i` (Xcode required)
- **Real iPhone** — open Camera, scan the QR, tap the banner (Expo Go opens it)
- Press `r` to reload, `npx expo start --clear` to clear the Metro cache

### Dev networking (simulator vs. real device)

`.env.local` controls the API host the app talks to. `EXPO_PUBLIC_API_URL` wins if
set; otherwise `services/api.ts` falls back to the Expo Go host, then `localhost:8000`.
The committed default points at the hosted Render backend:

```
# Hosted backend on Render (stable, public) — used by builds and `expo start`:
EXPO_PUBLIC_API_URL=https://amadoo-api.onrender.com

# Local dev against your Mac's backend instead (uncomment one):
#   Simulator:    EXPO_PUBLIC_API_URL=http://localhost:8001
#   Real device:  EXPO_PUBLIC_API_URL=http://<mac-LAN-ip>:8001   (ipconfig getifaddr en0)
```

For real-device testing, phone and Mac must be on the same Wi-Fi.

---

## Environment variables

### Frontend (`.env.local`)
| Var | Purpose |
|-----|---------|
| `EXPO_PUBLIC_API_URL` | Backend base URL (auto-detected in Expo Go if unset). |

### Backend (`backend/.env`)
| Var | Default | Purpose |
|-----|---------|---------|
| `DATABASE_URL` | local Postgres | `postgres://` / `postgresql://` are auto-rewritten to the asyncpg driver. |
| `JWT_SECRET` | `CHANGE_ME_in_production` | **Must** be set in production (startup fails otherwise). |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | Access token lifetime. |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `30` | Refresh token lifetime. |
| `BASE_URL` | `http://localhost:8000` | Used to build absolute photo URLs. Set to the Render URL in prod. |
| `RESEND_API_KEY` | `""` | Resend API key (`re_...`). Primary OTP email transport — see below. |
| `EMAIL_FROM` | `noreply@amadoo.app` | Must be a Resend-verified sender. |
| `TEST_OTP_CODE` | `""` | When set, this exact code verifies **any** email's OTP in any environment — lets a tester pass email verification without receiving mail. **Clear before launch.** |
| `SMTP_*` | Gmail | Local-dev-only fallback. **Blocked on Render** (see below). |
| `ENVIRONMENT` | `development` | `production` enables fail-fast checks. |
| `CORS_ORIGINS` | `["*"]` | Fine for a mobile API. |
| `RATE_LIMIT_ENABLED` | `true` | Tests set this false. |
| Social auth | `""` | `GOOGLE_CLIENT_ID`, `APPLE_*` — optional. |

---

## Email / OTP (Resend)

OTP codes (email verification, password reset) are sent by `_send_otp_email` in
`backend/routers/auth.py`. Transport is chosen at runtime:

1. **`RESEND_API_KEY` set →** send via the Resend HTTP API over **HTTPS (port 443)**.
2. **else `SMTP_USER`/`SMTP_PASSWORD` set →** send via SMTP (local dev only).
3. **else →** print the code to the console (and always as a fallback if a send fails).

> ⚠️ **Why Resend, not Gmail SMTP, in production:** Render (like most PaaS) **blocks
> outbound SMTP** on ports 25/465/587. A Gmail connection there fails at `connect()`
> with `[Errno 101] Network is unreachable` — *before* auth, so no app password can
> help. Resend goes over 443, which is allowed. Gmail SMTP still works for **local dev**.

**Setup:**
1. Create a key at <https://resend.com> → **API Keys** → **Create API Key**
   (Sending access; leave domain unrestricted until a domain is verified).
   The value starts with **`re_`** — note it's distinct from a **Render** key (`rnd_`).
2. Verify a sender: use `onboarding@resend.dev` for an immediate smoke test (delivers
   only to your own Resend account email), or add & verify `amadoo.app` under
   **Domains** (SPF/DKIM DNS records) and use `noreply@amadoo.app`.
3. Set `RESEND_API_KEY` and `EMAIL_FROM` as environment variables (Render → Environment,
   or local `backend/.env`). **No quotes, no trailing spaces** around the value.

A successful send logs `[OTP] ✅ Email sent via Resend`.

**Letting a tester sign up without a verified domain.** Until `amadoo.app` is verified,
set `TEST_OTP_CODE` (e.g. on Render) to any code, and tell the tester to enter that code
on the verification screen — it's accepted for any email, no inbox needed. A bypass logs
`[OTP] ⚠️ OTP bypass used`. **Remove `TEST_OTP_CODE` before App Store launch.**

---

## The app — screens & flow

**Auth** (`app/(auth)/`) — welcome → sign-up → email OTP verify → sign-in;
forgot/reset password. Frosted-glass UI on a dark warm background.

**Onboarding** (`app/(onboarding)/`) — white-background flow:
`name → birthday → gender → i-want-to-meet → intents → per-intent details
(dating-goal / looking-for / hangout / business) → tell-us-more → upload-photos →
face-check`. Per-intent option lists come from `constants/intents.ts`.

**Main app** (`app/(app)/(tabs)/`):
- **Swipe** (`index`) — full-screen deck, drag-to-swipe, action buttons (undo, reject,
  super-like, like, boost), verify banner.
- **Likes** — people who liked you (blurred until matched).
- **Matches** — new matches strip + conversation list.
- **Around me** — map of nearby users / crossed paths.
- **Profile** — gear → settings; edit-profile; subscription.
- **Chat** (`chat/[matchId]`) — coral/gray bubbles, read receipts, 4s polling.

**Intents** (the core model): `dating`, `activity` (Activities & friends), `business`.
Two users match when their selected intents overlap.

---

## The backend — API & data model

FastAPI app (`backend/main.py`, title "Amadoo API"). Routers:
`auth`, `profiles`, `swipes`, `matches`, `safety`, `verification`, `subscription`.
Photos are stored on disk under `backend/uploads/` and served at `BASE_URL/uploads/...`.

| Feature | Endpoint |
|---------|----------|
| Sign up | `POST /auth/signup` |
| Email verify (OTP) | `POST /auth/verify-email` |
| Sign in | `POST /auth/signin` |
| Token refresh | `POST /auth/refresh` (client uses a mutex: 401 → refresh → retry once) |
| Current user | `GET /auth/me`, `GET /profile/me` |
| Create / update profile | `POST /profile` → `PATCH /profile/me` |
| Photo upload | `POST /profile/me/photos` |
| Swipe deck | `GET /deck` |
| Record swipe | `POST /swipes` |
| Likes received | `GET /likes` |
| Matches | `GET /matches` |
| Messages | `GET /matches/{id}/messages`, `POST /matches/{id}/messages` |
| Push token | `PUT /auth/push-token` |

Auth is JWT (access + refresh). Signups are staged in `pending_signups` and only
become a real `User` row after OTP verification, so an abandoned signup never
permanently reserves an email.

See **`backend/README.md`** for backend-specific detail.

---

## Database migrations

No Alembic at runtime — migrations are **manual SQL** in `backend/migrations/`,
applied with `psql`:

```bash
psql postgresql://patricksaade@localhost:5432/amadoo -f backend/migrations/<file>.sql
```

Existing migrations: `add_push_token`, `add_pending_signups`, `add_intents`,
`add_dating_goal`, `add_business_fields`, `add_hangout_vibes`, `add_premium`,
`merge_friends_into_activity`, `drop_match_trigger`.

On Render, `init_db.py` runs at start and creates tables when the DB is empty;
apply new migration SQL manually against the Render database as needed.

---

## Testing

Backend tests use pytest (`backend/tests/`, config in `backend/pytest.ini`):

```bash
cd backend && source .venv/bin/activate
pytest
```

The frontend has a Maestro flow setup under `maestro/` for UI smoke tests.

---

## Deployment

### Backend on Render

Defined by `render.yaml` (Blueprint): a Python web service **+ managed Postgres**,
both `free` plan, `frankfurt` region.

1. Render → **New → Blueprint** → connect this repo. It provisions `amadoo-api`
   and `amadoo-db`.
2. Build: `pip install -r requirements.txt` (rootDir `backend`).
3. Start: `python init_db.py && uvicorn main:app --host 0.0.0.0 --port $PORT`.
4. Env vars: `DATABASE_URL` (from the DB), `JWT_SECRET` (auto-generated),
   `ENVIRONMENT=production`, `PYTHON_VERSION=3.12.7`, and **set `BASE_URL`** to the
   service URL after the first deploy. Add `RESEND_API_KEY` + `EMAIL_FROM` for email.

> Free tier sleeps when idle (~50s cold start). Env-var changes trigger a redeploy —
> wait for the deploy to read **Live** before testing.

### App with EAS

Profiles in `eas.json` (project id in `app.json` → `extra.eas.projectId`):

```bash
eas login

# internal builds
eas build --profile preview --platform ios            # device install
eas build --profile preview-simulator --platform ios  # simulator .app
eas build --profile development --platform ios         # dev client

# production build + store submit
eas build --profile production --platform ios
eas submit --profile production --platform ios

# OTA JS update (production channel)
eas update --channel production
```

Bundle IDs: iOS `com.amadoo.app`, Android `com.amadoo.app`. Runtime version policy
is `appVersion`; OTA updates served from the Expo Updates URL in `app.json`.

---

## Common commands

| Command | What it does |
|---------|--------------|
| `~/.bun/bin/bun install` | Install JS deps |
| `npx expo install --fix` | Reconcile Expo lib versions |
| `npx expo start` | Start Metro + QR |
| `npx expo start --clear` | Start with cleared cache |
| `npx expo start --ios` | Open iOS Simulator |
| `cd backend && uvicorn main:app --reload --port 8000` | Run backend |
| `python backend/init_db.py` | Create tables + seed |
| `cd backend && pytest` | Run backend tests |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `[WorkletsError] Mismatch (0.6.x vs 0.5.1)` | Pin `react-native-worklets` to `~0.5.1`, then `bun install` |
| `Cannot find module 'react-native-worklets/plugin'` | Add `"react-native-worklets": "~0.5.1"` to package.json |
| `Unable to resolve "expo-linking"` | Add `"expo-linking": "~8.0.12"` |
| `npm error ERESOLVE` | Use bun, or ensure `.npmrc` has `legacy-peer-deps=true` |
| `Project is incompatible with this version of Expo Go` | Update Expo Go to the SDK 54 build |
| `Attempted to navigate before mounting the Root Layout` | Never `router.replace` from `_layout.tsx`; use `<Redirect>` in `app/index.tsx` |
| `spawn bun ENOENT` | bun not on PATH — use the full path `~/.bun/bin/bun` |
| OTP `[Errno 101] Network is unreachable` on Render | Expected — Render blocks SMTP. Use `RESEND_API_KEY` (HTTPS). |
| OTP `Resend 401: API key is invalid` | Wrong key — must start with `re_` (a `rnd_` key is a *Render* key), no quotes/spaces. |
| Push notifications not arriving | Requires a real device; tokens don't work in the iOS Simulator. |
| App won't load on phone | Same Wi-Fi as Mac; try `npx expo start --clear` |
| Image with spaces won't load | Use a relative `require('../../Main Page/...')`, never the `@/` alias |

To clear stale auth/onboarding state: **Settings → Log Out**, or nuke
`AsyncStorage.removeItem('amadoo-auth')` and reload.

---

## Known constraints

- **In-app purchases** — `subscription.tsx` is wired to `api.activateSubscription` /
  `cancelSubscription` but uses a **simulated** purchase. Needs StoreKit / Play Billing
  + RevenueCat receipt validation before launch.
- **Face-check verification** — Bumble-style face match vs. profile photo is scaffolded
  (`face-check.tsx`, `routers/verification.py`) but the live functional pass is pending.
- **react-native-worklets** must stay `~0.5.1` — Expo Go SDK 54 ships 0.5.1 native;
  0.6.x crashes.

---

For deeper design and flow notes see `docs/` and `CLAUDE.md`.
For backend internals see `backend/README.md`.
