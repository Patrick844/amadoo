# Push Notifications & Real-Time Chat — Amadoo

## What was built

This session added two real-time layers on top of the existing REST + PostgreSQL architecture:

1. **Push Notifications** — Expo Push API to deliver new-message and new-match alerts even when the app is backgrounded or closed.
2. **In-screen polling** — While the chat screen is open and the app is in the foreground, it re-fetches new messages every 4 seconds.

---

## Architecture recap

```
User A (foreground)          Amadoo Backend              User B (background)
─────────────────────        ──────────────────          ────────────────────
Sends message via POST  ──▶  Saves to DB               
                             Saves Notification row     
                             Calls Expo Push API   ──▶  Expo servers
                                                    ──▶  APNS / FCM
                                                    ──▶  iOS/Android delivers notification
                                                    ──▶  User B sees alert

User B opens chat      ──▶  GET /messages?after_id=…  ──▶  Returns new messages only
Every 4s (polling)    ──▶  same endpoint              ──▶  empty if nothing new
```

Why not WebSockets yet? REST + polling is the right call for early stage:
- No extra infra (Redis pub/sub, WS server management)
- Works fine for thousands of concurrent users on a single server
- Push covers the most important case (user is backgrounded)
- Upgrade path: polling → WebSockets when you actually have the concurrency to justify it

---

## Files changed

### Frontend

| File | What changed |
|------|-------------|
| `services/notifications.ts` | **NEW** — push registration, foreground notification handler, notification tap handler |
| `services/api.ts` | Added `registerPushToken()`, added optional `afterId` param to `getMessages()` |
| `app/_layout.tsx` | Registers push token on login, sets up notification tap handler |
| `app/(app)/chat/[matchId].tsx` | Added 4-second polling loop, pauses when app goes to background |
| `app.json` | Added `expo-notifications` plugin, iOS background modes, Android channel |

### Backend

| File | What changed |
|------|-------------|
| `models.py` | Added `push_token TEXT` column to `User` |
| `schemas.py` | Added `PushTokenRequest` schema |
| `push.py` | **NEW** — `send_push()` utility that calls the Expo Push API via httpx |
| `routers/auth.py` | Added `PUT /auth/push-token` endpoint |
| `routers/matches.py` | `send_message` now fires a real push to recipient; imported `send_push` |
| `routers/swipes.py` | Match creation now fires a real push to the other user; imported `send_push` |
| `migrations/add_push_token.sql` | SQL migration (already applied to local DB) |

---

## Push notification flow

### Registration (on every login)
1. App asks iOS/Android for notification permission
2. Gets an `ExponentPushToken[...]` from Expo
3. Calls `PUT /auth/push-token` with the token
4. Backend stores it on the `users` row

### Sending (backend side)
- **New message**: `POST /matches/{id}/messages` → after saving, calls `send_push()` with sender name + message preview
- **New match**: `POST /swipes` when mutual like detected → calls `send_push()` to the other user ("You matched with X!")
- Push is fired via `asyncio.create_task()` so it doesn't block the API response

### Tap handling (frontend)
- `setupNotificationTapHandler()` listens for taps on notifications
- Reads `data.match_id` from notification payload
- Navigates to `/(app)/chat/{match_id}`

---

## Chat polling flow

`app/(app)/chat/[matchId].tsx` now:

1. On initial load, stores the ID of the last message in `lastMessageIdRef`
2. After load completes, starts a `setInterval` (4 seconds)
3. Each tick calls `GET /matches/{id}/messages?after_id={lastId}` — backend returns only messages newer than that ID
4. New messages are appended (deduplication via Set of existing IDs)
5. `lastMessageIdRef` is updated after each merge
6. Polling pauses when the app goes to background (`AppState.addEventListener`), resumes on foreground
7. Interval is cleared on screen unmount

---

## Running it locally

### Database migration (already applied)
```bash
psql postgresql://patricksaade@localhost:5432/amadoo -c \
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT;"
```

### Backend
No new dependencies — `httpx` was already in `requirements.txt`.

### Frontend
```bash
~/.bun/bin/bun install   # installs expo-notifications
```

**Note:** Push notifications require a real device — they will not work in the iOS Simulator. Test on a physical iPhone via Expo Go.

---

## Testing push notifications

1. Open the app on your phone and log in — you'll see a permission prompt.
2. Accept notifications.
3. Background the app (swipe it away or go to home screen).
4. From another device/account, send a message to your match.
5. Your phone should receive a push notification within a few seconds.
6. Tap it → app opens directly to the chat.

For match push: have account A swipe right on B, then B swipe right on A — B receives a "New Match!" push.

---

## Known limitations

- **Expo Go + push tokens**: The project ID in `getExpoPushTokenAsync` is set to `'amadoo'`. For a production build (EAS Build) this should be the EAS project ID from `app.json`. In Expo Go, this may log a warning but still works.
- **No read receipt push**: Read receipts (the ✓✓ tick) update when you open the chat — they are not pushed back to the sender yet.
- **No badge clearing**: App badge count is not cleared on open. Add `Notifications.setBadgeCountAsync(0)` in the chat screen's `useEffect` if you want this.

---

## What's next

| Priority | Task |
|----------|------|
| High | Token refresh — retry any 401 with stored `refreshToken` |
| Medium | Connect settings incognito toggle to `PATCH /profile/me` |
| Medium | Photo upload — wire the `POST /profile/me/photos` multipart endpoint to the upload-photos screen |
| Low | Clear badge count on chat open |
| Low | WebSockets — replace polling when you have real concurrent load |
