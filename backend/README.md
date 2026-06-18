# Amadoo API

FastAPI backend for the Amadoo dating app.

## Setup

```bash
cd amadoo-api

python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env
# Edit .env — fill in DATABASE_URL and JWT_SECRET at minimum
```

## Run

```bash
uvicorn main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

## Structure

```
amadoo-api/
├── main.py           # FastAPI app, CORS, routers
├── config.py         # All settings (DB URL, JWT secret, etc.) ← fill this in
├── database.py       # SQLAlchemy async engine + session
├── models.py         # ORM models (all tables)
├── schemas.py        # Pydantic request/response schemas
├── auth_utils.py     # Password hashing, JWT, OTP helpers
├── dependencies.py   # FastAPI dependency injection (get_current_user)
├── requirements.txt
├── .env.example      # Template — copy to .env
└── routers/
    ├── auth.py       # POST /auth/signup, signin, verify-email, refresh, logout
    ├── profiles.py   # GET/PATCH /profile/me, location, photos
    ├── swipes.py     # GET /deck, POST /swipes, GET /likes
    └── matches.py    # GET /matches, GET+POST /matches/{id}/messages, DELETE unmatch
```

## Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/signup | Create account, sends OTP |
| POST | /auth/verify-email | Confirm 6-digit OTP |
| POST | /auth/signin | Login, returns tokens |
| POST | /auth/forgot-password | Send reset OTP |
| POST | /auth/reset-password | Set new password |
| POST | /auth/refresh | Rotate refresh token |
| POST | /auth/logout | Revoke refresh token |

### Profile
| Method | Path | Description |
|--------|------|-------------|
| POST | /profile | Create profile (onboarding) |
| GET | /profile/me | Get my profile |
| PATCH | /profile/me | Edit bio, school, job, hobbies, etc. |
| PATCH | /profile/me/location | Update GPS coordinates |
| GET | /profile/me/photos | List my photos |
| DELETE | /profile/me/photos/{id} | Remove a photo |

### Swipes
| Method | Path | Description |
|--------|------|-------------|
| GET | /deck | Next batch of profiles to swipe on |
| POST | /swipes | Record like/dislike/super_like, returns matched: true if it's a match |
| GET | /likes | People who liked me (unswiped) |

### Matches & Chat
| Method | Path | Description |
|--------|------|-------------|
| GET | /matches | All active matches with last message |
| GET | /matches/{id}/messages | Chat history (paginated) |
| POST | /matches/{id}/messages | Send a message |
| DELETE | /matches/{id} | Unmatch |

## Database

Fill in `DATABASE_URL` in `.env` then run migrations (Alembic setup coming next):

```bash
alembic init migrations
# Edit alembic.ini to point at your DATABASE_URL
alembic revision --autogenerate -m "initial"
alembic upgrade head
```
