# 06 — Backend Architecture: The Server Side of Amadoo

## Quick answer to the most common beginner question:

> "Is the backend the same for iOS and Android?"

**YES. 100% yes.**

Your backend is a single server running in the cloud. Both the iPhone app and the Android app talk to the **same** server through the same API. You build the backend once. The platform (iOS or Android) is only about the frontend — the screens the user sees.

```
iPhone app ─────────────────────┐
                                 ├──► https://api.amadoo.com  ◄──► Database
Android app ─────────────────────┘
```

---

## What is a backend?

Your backend is a program running on a server somewhere (AWS, Railway, Render, etc.) that:
1. Receives requests from the app ("give me nearby profiles")
2. Queries the database ("SELECT users WHERE location IS NEAR...")
3. Returns the result ("here are 10 profiles")

It also handles:
- Authentication (verifying passwords, issuing tokens)
- Business logic (matching algorithm, who sees who)
- Security (so users can't see other users' private data)
- Background jobs (sending push notifications when there's a match)

---

## Option A: Build your own backend (Node.js + Express)

You write the server yourself in JavaScript/TypeScript (same language as your app).

**Tech stack:**
- **Runtime:** Node.js
- **Framework:** Express.js or Fastify
- **Database:** PostgreSQL
- **ORM:** Prisma (lets you query the DB with TypeScript instead of raw SQL)
- **Real-time:** Socket.io or Supabase
- **File storage:** AWS S3 or Cloudflare R2 (for photos)
- **Hosting:** Railway.app or Render.com (easy deployment)

**Pros:** Full control, cheaper at scale, learn a lot  
**Cons:** You build and maintain everything yourself

---

## Option B: Backend-as-a-Service — Supabase (RECOMMENDED to start)

**Supabase** gives you a full backend without writing server code.
It's like Firebase but open-source and based on PostgreSQL.

What Supabase gives you:
- PostgreSQL database (fully featured, no limits)
- Authentication (email/password, Apple Sign In, Google, etc.)
- File storage (for photos)
- Real-time subscriptions (for chat, live updates)
- REST and GraphQL API (auto-generated from your database)
- Row-level security (users can only see their own data)
- Edge Functions (for custom logic like the matching algorithm)

**For Amadoo, I recommend starting with Supabase.** You can always migrate to a custom backend later when you have users and specific needs.

Supabase website: https://supabase.com  
Supabase pricing: free tier is generous (up to 50,000 monthly active users on free plan)

---

## The database schema for Amadoo

This is how your data would be structured in PostgreSQL:

### Users table
```sql
users
├── id              UUID (unique identifier, auto-generated)
├── email           TEXT UNIQUE NOT NULL
├── name            TEXT
├── birthday        DATE
├── gender          TEXT  ('male', 'female', 'non-binary')
├── bio             TEXT
├── school          TEXT
├── job             TEXT
├── hobbies         TEXT[]    (array: ['hiking', 'cooking', ...])
├── activities      TEXT[]
├── trips           TEXT[]
├── chill_vibes     TEXT[]
├── has_pet         BOOLEAN
├── want_to_meet    TEXT[]    (genders interested in)
├── photos          TEXT[]    (array of storage URLs)
├── is_verified     BOOLEAN   DEFAULT false
├── is_onboarded    BOOLEAN   DEFAULT false
├── latitude        FLOAT
├── longitude       FLOAT
├── created_at      TIMESTAMP DEFAULT now()
└── last_active     TIMESTAMP
```

### Swipes table
```sql
swipes
├── id              UUID
├── swiper_id       UUID  → users.id
├── swiped_id       UUID  → users.id
├── action          TEXT  ('like', 'dislike', 'super_like')
└── created_at      TIMESTAMP
```

### Matches table (created when two users both like each other)
```sql
matches
├── id              UUID
├── user1_id        UUID  → users.id
├── user2_id        UUID  → users.id
└── created_at      TIMESTAMP
```

### Messages table
```sql
messages
├── id              UUID
├── match_id        UUID  → matches.id
├── sender_id       UUID  → users.id
├── content         TEXT
├── sent_at         TIMESTAMP DEFAULT now()
└── read_at         TIMESTAMP  (NULL = unread)
```

---

## The matching algorithm

When user A swipes right on user B:
1. Record the swipe in the `swipes` table
2. Check: did user B already swipe right on user A?
3. If YES → create a row in `matches` table → send both a push notification ("It's a Match!")
4. If NO → nothing happens yet (wait for B to swipe)

```sql
-- Check for mutual like (run after recording a new 'like')
SELECT id FROM swipes
WHERE swiper_id = 'userB_id'
AND swiped_id = 'userA_id'
AND action = 'like'
```

This can be a Supabase Edge Function (serverless function that runs your logic).

---

## Authentication flow

### Email/Password signup
1. User enters email + password in app
2. App sends `POST /auth/signup` to Supabase
3. Supabase creates the user, sends a **verification email**
4. User clicks link in email → account verified
5. User gets a **JWT token** (a long string that proves identity)
6. App stores this token securely using `expo-secure-store`
7. Every subsequent API call includes this token in the `Authorization` header

### Token-based auth (every API call)
```
App request:
  GET /api/profiles
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Backend checks:
  1. Is this token valid?
  2. Is it expired?
  3. Which user does it belong to?
  → If valid, process the request
  → If invalid, return 401 Unauthorized
```

Tokens expire after a period (e.g., 7 days). Supabase handles refreshing them automatically.

### Apple Sign In (required!)
If your app allows ANY social login (Google, Facebook), Apple requires you to ALSO offer **Sign In with Apple**. This is an App Store rule — your app will be rejected if you violate it.

Supabase supports Apple Sign In out of the box.

---

## File storage (profile photos)

Photos are too large to store in the database. Instead:
1. User picks a photo in the app
2. App uploads the photo directly to **Supabase Storage** (or AWS S3)
3. Storage returns a URL
4. App saves that URL in the user's `photos` array in the database

```typescript
// Uploading a photo to Supabase Storage
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '@/lib/supabase'

async function uploadPhoto() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
  })

  if (!result.canceled) {
    const file = result.assets[0]
    const fileName = `${userId}/${Date.now()}.jpg`

    const { data, error } = await supabase.storage
      .from('photos')
      .upload(fileName, {
        uri: file.uri,
        type: 'image/jpeg',
        name: fileName,
      })

    if (data) {
      const url = supabase.storage.from('photos').getPublicUrl(fileName).data.publicUrl
      // Save url to user profile
    }
  }
}
```

---

## Push notifications

When user gets a match or message while the app is closed:
1. Your backend calls **Expo's Push Notification service**
2. Expo forwards to **APNs** (Apple) or **FCM** (Google/Firebase)
3. The notification appears on the user's screen

```typescript
// In your backend, when a match is created:
await fetch('https://exp.host/--/api/v2/push/send', {
  method: 'POST',
  body: JSON.stringify({
    to: user.expoPushToken,   // token registered by the app on first launch
    title: "It's a Match! 🎉",
    body: `You and ${matchName} liked each other`,
    data: { matchId: match.id },
  })
})
```

---

## Amadoo backend summary

| Feature | Technology |
|---------|-----------|
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| File storage | Supabase Storage |
| Real-time chat | Supabase Realtime |
| Matching logic | Supabase Edge Functions |
| Push notifications | Expo Push + APNs/FCM |
| Hosting | Supabase (managed, no server to maintain) |

---

## Resources

- Supabase docs: https://supabase.com/docs
- Supabase + React Native guide: https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native
- Expo Push Notifications: https://docs.expo.dev/push-notifications/overview/
- Prisma ORM (if you go custom backend): https://www.prisma.io/docs
