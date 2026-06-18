# Amadoo — Database Schema

Stack: **PostgreSQL** via FastAPI + SQLAlchemy (async) or Prisma

---

## Tables

### `users`
Core account. Created on sign-up, before onboarding starts.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | auto-generated |
| `email` | TEXT UNIQUE NOT NULL | login identifier |
| `password_hash` | TEXT | nullable — null for social-auth-only accounts |
| `is_email_verified` | BOOLEAN | default false, set true after OTP |
| `is_face_verified` | BOOLEAN | default false, set true after face check approved |
| `is_onboarded` | BOOLEAN | default false, set true after upload-photos |
| `role` | TEXT | `'user'` \| `'admin'`, default `'user'` |
| `created_at` | TIMESTAMPTZ | default now() |
| `last_active` | TIMESTAMPTZ | updated on each authenticated request |

---

### `otp_codes`
Six-digit codes sent to email for verification and password reset.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `email` | TEXT NOT NULL | |
| `code_hash` | TEXT NOT NULL | bcrypt hash of the 6-digit code |
| `purpose` | TEXT NOT NULL | `'verify_email'` \| `'reset_password'` |
| `expires_at` | TIMESTAMPTZ | 10 minutes from creation |
| `used_at` | TIMESTAMPTZ | nullable — set when consumed |
| `created_at` | TIMESTAMPTZ | |

Only one active (unused, unexpired) code per email+purpose pair should exist at a time.

---

### `social_auth`
Links Apple/Google identities to an account.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID FK → users.id | |
| `provider` | TEXT NOT NULL | `'apple'` \| `'google'` |
| `provider_id` | TEXT NOT NULL | the external user ID from the provider |
| `created_at` | TIMESTAMPTZ | |

Unique constraint: `(provider, provider_id)`

---

### `profiles`
One-to-one with `users`. Filled progressively during onboarding.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID FK → users.id UNIQUE | |
| `name` | TEXT NOT NULL | first name only, cannot be changed after onboarding |
| `birthday` | DATE NOT NULL | used to compute age at query time |
| `gender` | TEXT NOT NULL | `'male'` \| `'female'` |
| `bio` | TEXT | nullable, max 300 chars, editable from profile |
| `school` | TEXT | nullable |
| `job` | TEXT | nullable |
| `height_cm` | INT | nullable, from tell-us-more screen |
| `workout` | TEXT | nullable — `'Every day'` \| `'3-5x week'` \| `'1-2x week'` \| `'Never'` |
| `drinking` | TEXT | nullable — `'Never'` \| `'Socially'` \| `'Regularly'` \| `'Often'` |
| `smoking` | TEXT | nullable — `'Non-smoker'` \| `'Occasional'` \| `'Smoker'` |
| `religion` | TEXT | nullable — open enum (Agnostic, Atheist, Christian, Muslim, …) |
| `vibe` | TEXT | nullable — one of the vibe options from tell-us-more |
| `has_pet` | BOOLEAN | default false |
| `hobbies` | TEXT[] | from hobbies screen, max 6 |
| `activities` | TEXT[] | from activities screen |
| `trips` | TEXT[] | from trips screen |
| `chill_vibes` | TEXT[] | from chill screen |
| `want_to_meet` | TEXT[] | `['male']` \| `['female']` \| `['male','female']` |
| `age_range_min` | INT | default 18 |
| `age_range_max` | INT | default 100 |
| `latitude` | FLOAT | nullable, updated when user opens app |
| `longitude` | FLOAT | nullable |
| `location_updated_at` | TIMESTAMPTZ | nullable |

---

### `photos`
Profile photos. Max 6 per user (1 main + 5 category slots).

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID FK → users.id | |
| `url` | TEXT NOT NULL | S3 / Supabase Storage URL |
| `position` | INT NOT NULL | 0 = main photo, 1-5 = category slots |
| `category` | TEXT | null = main, `'activity'` \| `'pet'` \| `'hobbies'` \| `'trips'` \| `'chill'` |
| `created_at` | TIMESTAMPTZ | |

Unique constraint: `(user_id, position)`

---

### `face_checks`
Selfie submitted during onboarding for identity verification.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID FK → users.id UNIQUE | |
| `photo_url` | TEXT NOT NULL | the selfie uploaded |
| `status` | TEXT NOT NULL | `'pending'` \| `'approved'` \| `'rejected'` |
| `rejection_reason` | TEXT | nullable, shown to user if rejected |
| `reviewed_by` | UUID FK → users.id | nullable, admin who reviewed |
| `created_at` | TIMESTAMPTZ | |
| `reviewed_at` | TIMESTAMPTZ | nullable |

On approval → set `users.is_face_verified = true`.

---

### `swipes`
One row per swipe action. The source of truth for likes, dislikes, and super likes.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `swiper_id` | UUID FK → users.id | who swiped |
| `swiped_id` | UUID FK → users.id | who was swiped on |
| `action` | TEXT NOT NULL | `'like'` \| `'dislike'` \| `'super_like'` |
| `created_at` | TIMESTAMPTZ | |

Unique constraint: `(swiper_id, swiped_id)` — one decision per pair.

The "Likes you" screen queries: `SELECT * FROM swipes WHERE swiped_id = $me AND action IN ('like','super_like') AND swiper_id NOT IN (SELECT swiped_id FROM swipes WHERE swiper_id = $me)` — i.e. people who liked you and you haven't swiped back yet.

---

### `matches`
Created when two users mutually like each other.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_a_id` | UUID FK → users.id | always `LEAST(a, b)` for uniqueness |
| `user_b_id` | UUID FK → users.id | always `GREATEST(a, b)` |
| `created_at` | TIMESTAMPTZ | when the match happened |
| `is_active` | BOOLEAN | default true, false if either user unmatches |
| `unmatched_by` | UUID FK → users.id | nullable — who unmatched |
| `unmatched_at` | TIMESTAMPTZ | nullable |

Unique constraint: `(user_a_id, user_b_id)`

---

### `messages`
Chat messages within a match.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `match_id` | UUID FK → matches.id | |
| `sender_id` | UUID FK → users.id | |
| `content` | TEXT | nullable if type = 'image' |
| `type` | TEXT | `'text'` \| `'image'`, default `'text'` |
| `image_url` | TEXT | nullable, used when type = 'image' |
| `sent_at` | TIMESTAMPTZ | default now() |
| `read_at` | TIMESTAMPTZ | nullable — set when the other user reads it |

---

### `boosts`
Temporary visibility boost (the lightning bolt button on the swipe screen).

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID FK → users.id | |
| `started_at` | TIMESTAMPTZ | |
| `expires_at` | TIMESTAMPTZ | typically 30 minutes from start |
| `is_active` | BOOLEAN | computed: `now() < expires_at` |

During a boost, the user's profile is shown first in other users' decks.

---

### `notifications`
In-app and push notification log.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID FK → users.id | recipient |
| `type` | TEXT | `'new_match'` \| `'new_message'` \| `'new_like'` \| `'face_check_result'` |
| `title` | TEXT | push notification title |
| `body` | TEXT | push notification body |
| `data` | JSONB | extra payload (match_id, message_id, etc.) |
| `read_at` | TIMESTAMPTZ | nullable |
| `sent_at` | TIMESTAMPTZ | default now() |

---

### `reports`
User-reported profiles.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `reporter_id` | UUID FK → users.id | |
| `reported_id` | UUID FK → users.id | |
| `reason` | TEXT NOT NULL | `'spam'` \| `'fake'` \| `'inappropriate'` \| `'harassment'` \| `'other'` |
| `details` | TEXT | optional extra description |
| `status` | TEXT | `'open'` \| `'resolved'` \| `'dismissed'` |
| `resolved_by` | UUID FK → users.id | nullable, admin |
| `created_at` | TIMESTAMPTZ | |
| `resolved_at` | TIMESTAMPTZ | nullable |

---

### `blocks`
When a user blocks another — they disappear from each other's decks.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `blocker_id` | UUID FK → users.id | |
| `blocked_id` | UUID FK → users.id | |
| `created_at` | TIMESTAMPTZ | |

Unique constraint: `(blocker_id, blocked_id)`

---

### `auth_tokens`
Refresh tokens for keeping sessions alive.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID FK → users.id | |
| `token_hash` | TEXT NOT NULL | SHA-256 of the raw refresh token |
| `device_name` | TEXT | nullable, e.g. "Patrick's iPhone" |
| `expires_at` | TIMESTAMPTZ | 30 days |
| `created_at` | TIMESTAMPTZ | |
| `revoked_at` | TIMESTAMPTZ | nullable — set on logout |

---

## Relationships

```
users 1──1 profiles
users 1──1 face_checks
users 1──∞ photos                  (max 6)
users 1──∞ social_auth             (Apple + Google)
users 1──∞ auth_tokens
users 1──∞ otp_codes
users 1──∞ swipes (as swiper)
users 1──∞ swipes (as swiped)
users 1──∞ boosts
users ∞──∞ users   (through matches)
matches 1──∞ messages
users 1──∞ notifications
users 1──∞ reports (as reporter)
users 1──∞ reports (as reported)
users 1──∞ blocks (as blocker)
users 1──∞ blocks (as blocked)
```

---

## Indexes

```sql
-- Swipe deck query (exclude already-swiped users)
CREATE INDEX idx_swipes_swiper ON swipes(swiper_id);
CREATE INDEX idx_swipes_swiped ON swipes(swiped_id);

-- Chat screen — latest message first
CREATE INDEX idx_messages_match ON messages(match_id, sent_at DESC);

-- Unread messages per match
CREATE INDEX idx_messages_unread ON messages(match_id, read_at) WHERE read_at IS NULL;

-- Photo ordering
CREATE INDEX idx_photos_user ON photos(user_id, position);

-- Location-based deck ("show me users within X km")
CREATE INDEX idx_profiles_location ON profiles USING GIST (point(longitude, latitude));

-- Notification inbox
CREATE INDEX idx_notifications_user ON notifications(user_id, sent_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;

-- Active boosts
CREATE INDEX idx_boosts_active ON boosts(user_id, expires_at) WHERE expires_at > now();

-- OTP lookup
CREATE INDEX idx_otp_email_purpose ON otp_codes(email, purpose, expires_at);
```

---

## Key backend logic

### Match creation (after every swipe)
```
POST /swipes  { swiped_id, action }

1. INSERT INTO swipes (swiper_id, swiped_id, action)
2. If action IN ('like', 'super_like'):
   a. SELECT id FROM swipes
      WHERE swiper_id = $swiped_id
        AND swiped_id = $swiper_id
        AND action IN ('like', 'super_like')
   b. If found → INSERT INTO matches (LEAST(a,b), GREATEST(a,b))
   c. Notify both users (push + notifications table)
```

### Swipe deck query (who to show)
```sql
SELECT p.*, u.id, u.is_face_verified,
       ST_Distance(point(p.longitude, p.latitude), point($my_lon, $my_lat)) AS distance_km
FROM profiles p
JOIN users u ON u.id = p.user_id
WHERE u.id != $me
  AND u.is_onboarded = true
  AND p.gender = ANY($my_want_to_meet)
  AND (SELECT gender FROM profiles WHERE user_id = $me) = ANY(p.want_to_meet)
  AND DATE_PART('year', AGE(p.birthday)) BETWEEN $my_age_min AND $my_age_max
  AND u.id NOT IN (SELECT swiped_id FROM swipes WHERE swiper_id = $me)
  AND u.id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = $me)
  AND u.id NOT IN (SELECT blocker_id FROM blocks WHERE blocked_id = $me)
ORDER BY
  EXISTS(SELECT 1 FROM boosts WHERE user_id = u.id AND expires_at > now()) DESC,
  distance_km ASC
LIMIT 20;
```

### Likes screen query
```sql
-- People who liked me, filtered to those I haven't swiped yet
SELECT s.swiper_id, s.action, s.created_at
FROM swipes s
WHERE s.swiped_id = $me
  AND s.action IN ('like', 'super_like')
  AND s.swiper_id NOT IN (
    SELECT swiped_id FROM swipes WHERE swiper_id = $me
  )
ORDER BY s.action = 'super_like' DESC, s.created_at DESC;
```

### Suggested screen query
```sql
-- Highly compatible users: shared hobbies + mutual want_to_meet + close location
SELECT p.user_id,
       ARRAY_LENGTH(ARRAY(
         SELECT UNNEST(p.hobbies) INTERSECT SELECT UNNEST($my_hobbies)
       ), 1) AS common_interests
FROM profiles p
JOIN users u ON u.id = p.user_id
WHERE /* same filters as deck query */
ORDER BY common_interests DESC, distance_km ASC
LIMIT 10;
```

---

## Storage (photos)

Photos are uploaded to **Supabase Storage** or **AWS S3**:

```
bucket: amadoo-photos
path:   {user_id}/{position}-{category}.jpg

face checks:
bucket: amadoo-face-checks   (private, admin-only read)
path:   {user_id}/selfie.jpg
```

Max upload size: 5 MB per photo. Resize to 1200×1600 on the server before storing.
