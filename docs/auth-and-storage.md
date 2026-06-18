# Auth & Storage — How Amadoo Handles Tokens and Files

---

## 1. JWT Tokens

### What is a JWT?

JWT stands for **JSON Web Token**. It's a string the server hands to the client after login. The client includes it in every subsequent request to prove who it is — no session table, no cookie, just a self-contained token.

A JWT looks like this:

```
eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLXV1aWQiLCJleHAiOjE3MDAwMDB9.SIGNATURE
```

Three parts separated by dots, each base64-encoded:
1. **Header** — algorithm used (`HS256`)
2. **Payload** — the data inside (`sub`: user ID, `exp`: expiry timestamp)
3. **Signature** — HMAC of header + payload, signed with `JWT_SECRET`

Nobody can fake or tamper with the token without knowing `JWT_SECRET`.

### How Amadoo uses JWTs

Amadoo uses **two tokens**:

| Token | Lifetime | Purpose |
|-------|----------|---------|
| **Access token** | 60 minutes | Sent with every API request in the `Authorization: Bearer <token>` header |
| **Refresh token** | 30 days | Stored in the app, used once to get a new access token when the old one expires |

**Flow:**
```
1. User signs up / logs in
       ↓
2. Server returns { access_token, refresh_token }
       ↓
3. App stores both tokens (AsyncStorage via Zustand persist)
       ↓
4. Every API call: Authorization: Bearer <access_token>
       ↓
5. Access token expires after 60 min
       ↓
6. App calls POST /auth/refresh with refresh_token
       ↓
7. Server revokes old refresh token, issues new pair
```

**Why two tokens?**
The access token is short-lived so that if it leaks, damage is limited. The refresh token is long-lived but only ever sent to one endpoint (`/auth/refresh`), reducing its exposure.

### Where the secret lives

`JWT_SECRET` in `.env`. It must be a long random string — generate one with:

```bash
openssl rand -hex 32
```

Never commit this to git. Never hardcode it. If it leaks, anyone can forge tokens for any user.

### In the backend code

- `auth_utils.py` — `create_access_token()`, `create_refresh_token()`, `decode_access_token()`
- `dependencies.py` — `get_current_user()` reads the `Authorization` header, decodes the token, fetches the user from DB
- `auth_tokens` table — stores hashed refresh tokens so they can be revoked (logout, stolen token detection)

---

## 2. Photo Storage

### Current approach — Local disk

Photos are saved directly to the server's filesystem and served as static files.

**Upload flow:**
```
App picks photo → POST /profile/me/photos (multipart form)
                        ↓
              File saved to backend/uploads/photos/uuid.jpg
                        ↓
              DB stores: http://localhost:8000/uploads/photos/uuid.jpg
                        ↓
              App loads photo from that URL
```

**Config:**
```env
BASE_URL=http://localhost:8000
# UPLOADS_DIR defaults to ./uploads inside backend/
```

**Folder structure:**
```
backend/
  uploads/
    photos/    ← profile photos (positions 0–5)
    face/      ← face verification selfies
```

**Why this works for development:** Zero dependencies, zero cost, instant setup. The URL stored in the DB is just a string — swapping to a real CDN later only requires changing where `url` points.

**Limitation:** Files live on the same machine as the server. If the server restarts on a new machine, photos are gone. Not suitable for production.

---

## 3. Production storage — Cloudflare R2

When ready to go to production, the right move is **Cloudflare R2**.

### What is R2?

R2 is Cloudflare's object storage — like AWS S3 but with one key difference: **zero egress fees**. S3 charges you every time a file is downloaded. R2 does not. For a dating app where photos are loaded constantly by every user, this matters a lot.

### R2 vs S3 comparison

| | Cloudflare R2 | AWS S3 |
|--|---------------|--------|
| Storage cost | $0.015/GB/month | $0.023/GB/month |
| Egress (downloads) | **Free** | ~$0.09/GB |
| Free tier | 10 GB storage, 1M requests/month | 5 GB for 12 months |
| API | S3-compatible | S3 native |
| Setup | Cloudflare dashboard | AWS IAM + policies |

### How to switch

R2 uses the same API as S3, so the code change is minimal. You'd replace the local file write with a `boto3` upload call pointed at your R2 bucket.

**What you need from Cloudflare:**
- Account ID
- R2 bucket name
- Access Key ID + Secret Access Key (R2 API token)
- Public bucket URL (or Cloudflare custom domain)

**Environment variables to add when switching:**
```env
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret
R2_BUCKET_NAME=amadoo-photos
R2_PUBLIC_URL=https://your-bucket.r2.dev   # or custom domain
```

**The upload code becomes:**
```python
import boto3

s3 = boto3.client(
    "s3",
    endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
    aws_access_key_id=R2_ACCESS_KEY_ID,
    aws_secret_access_key=R2_SECRET_ACCESS_KEY,
)

s3.upload_fileobj(file, R2_BUCKET_NAME, filename, ExtraArgs={"ContentType": content_type})
url = f"{R2_PUBLIC_URL}/{filename}"
# Store url in DB — same as now
```

The rest of the backend (DB records, URL storage, response format) stays identical.

---

## Summary

| Concern | Dev (now) | Production (later) |
|---------|-----------|-------------------|
| Auth | JWT access + refresh tokens | Same |
| Photo storage | Local disk (`backend/uploads/`) | Cloudflare R2 |
| Photo URL in DB | `http://localhost:8000/uploads/...` | `https://cdn.amadoo.app/...` |
| Cost | Free | ~$0 until scale |
