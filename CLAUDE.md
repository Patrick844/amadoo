# Amadoo — Claude Instructions

## Project

React Native **connectivity app** built with Expo SDK 54 — not dating-only. Users
pick one or more **intents** (friends, business, activity partner, dating — all
equally first-class) and match with people whose intents overlap. iOS first, then Android. Backend is FastAPI +
PostgreSQL, fully connected. Patrick is a full-stack dev / AI engineer with basic
React knowledge.

> The multi-intent model (onboarding, swipe filter, per-intent fields, matching
> rule) is documented in `docs/multi-intent-connections.md`. `constants/intents.ts`
> is the single source of truth for intents, labels, photo categories, and the
> per-intent option lists (dating goals, business "looking for", hangout vibes).

---

## WHERE WE LEFT OFF

The app is fully wired to the real backend. Auth, onboarding, swipe deck, matches, chat, likes, and push notifications all call real API endpoints.

### Previously-listed tasks 1–5 are all DONE (verified 2026-06-05):

1. ~~Token refresh~~ ✅ `services/api.ts` `doRefresh()` + mutex: 401 → `POST /auth/refresh` → retry once.
2. ~~Photo upload~~ ✅ wired in **both** onboarding (`upload-photos.tsx` → `api.uploadPhoto`) and edit-profile. Verified live: `POST /profile/me/photos` → 201, file saved to `/uploads/photos/`.
3. ~~Incognito toggle~~ ✅ `settings.tsx` `toggleIncognito` → `PATCH /profile/me { is_incognito }` (optimistic + rollback). Note: it's **female-only** by design, so it's hidden for male accounts.
4. ~~Edit profile~~ ✅ `edit-profile.tsx` Save → `PATCH /profile/me`. Verified live (200).
5. ~~Badge clearing~~ ✅ `chat/[matchId].tsx` calls `Notifications.setBadgeCountAsync(0)` on open.

### What still needs to be built:

1. **Real in-app purchases** — `subscription.tsx` is wired to `api.activateSubscription` / `cancelSubscription` but uses a **simulated purchase**. Needs StoreKit / Play Billing + RevenueCat receipt validation before launch.
2. **Swipe gestures + verification gate** — drag-to-swipe animation and the "Verify now or you won't be seen" face-check gate still need a live functional pass (see `docs/findings-signup-flow.md` → Main App section for the full open-items checklist).

> ⚠️ Dev networking: `.env.local` now uses `http://localhost:8000` (simulator shares the
> Mac's network stack, so it survives LAN-IP changes). For **real-device** testing, swap in
> the Mac's current LAN IP (`ipconfig getifaddr en0`) — see the commented line in `.env.local`.

---

## Backend connection state (all implemented)

| Feature | Status | Endpoint |
|---------|--------|----------|
| Sign up | ✅ | `POST /auth/signup` |
| Email verify (OTP) | ✅ | `POST /auth/verify-email` |
| Sign in | ✅ | `POST /auth/signin` |
| Get current user | ✅ | `GET /auth/me` + `GET /profile/me` |
| Create profile (onboarding) | ✅ | `POST /profile` → `PATCH /profile/me` |
| Swipe deck | ✅ | `GET /deck` |
| Swipe | ✅ | `POST /swipes` |
| Likes received | ✅ | `GET /likes` |
| Matches list | ✅ | `GET /matches` |
| Chat messages | ✅ | `GET /matches/{id}/messages` |
| Send message | ✅ | `POST /matches/{id}/messages` |
| Push token registration | ✅ | `PUT /auth/push-token` |
| Push notifications (new message) | ✅ | Fires via Expo Push API |
| Push notifications (new match) | ✅ | Fires via Expo Push API |
| In-screen chat polling | ✅ | 4s interval, pauses in background |
| Token refresh | ✅ | `POST /auth/refresh` — `doRefresh()` mutex, 401 → refresh → retry |
| Photo upload | ✅ | `POST /profile/me/photos` — onboarding + edit-profile (verified 201) |
| Incognito toggle | ✅ | `PATCH /profile/me` — wired, female-only by design |
| Edit profile | ✅ | `PATCH /profile/me` — verified 200 |
| Subscription | 🟡 | `api.activateSubscription`/`cancelSubscription` — **simulated** purchase, real IAP TODO |
| Face-check verification | ⏳ | Intentionally deferred — Bumble-style face match vs. profile photo, later |

---

## Architecture

```
Frontend (Expo / React Native)
  └── services/api.ts          ← all API calls, auto-detects backend host
  └── services/notifications.ts ← push token registration, notification tap handler
  └── stores/auth.store.ts     ← Zustand persist (key: 'amadoo-auth' in AsyncStorage)
  └── stores/swipe.store.ts    ← deck state, pending match

Backend (FastAPI + PostgreSQL)
  └── routers/auth.py          ← signup, signin, OTP, refresh, push-token
  └── routers/profiles.py      ← profile create/update/photos/location
  └── routers/swipes.py        ← deck building, swipe recording, match detection
  └── routers/matches.py       ← match list, messages, send message + push
  └── push.py                  ← Expo Push API utility (httpx)
  └── models.py                ← SQLAlchemy models (User has push_token column)
```

### Auto host detection
`services/api.ts` reads `Constants.expoGoConfig?.debuggerHost` to get the Mac's LAN IP automatically — no manual IP changes needed when switching between simulator and device.

### Real-time approach
- **Push notifications**: Expo Push API → APNS/FCM. Fires on new message and new match.
- **Polling**: Chat screen polls `GET /messages?after_id=` every 4 seconds while in foreground.
- **No WebSockets**: correct choice for this scale. Add when there's real concurrent load.

---

## DESIGNS — what each screen should look like

### Assets available
```
Pages design/logo-hd-amadoo.png   ← WHITE logo on transparent bg. Use on dark backgrounds.
Pages design/loading-page-.png    ← Loading screen (dark background + centered logo)
Pages design/main-login-sign-in.png
Pages design/Sign-in-with-email-page.png
Pages design/login-by-email.png
Pages design/Forgot-password-page.png
Pages design/email-verificaiton.png
Pages design/Name.png
Pages design/birthday.png
Pages design/Gender.png
Pages design/school.png
Pages design/job.png
Pages design/hobbies.png          ← icon only (puzzle piece)
Pages design/actifities.png       ← icon only (basketball)
Pages design/pet.png              ← icon only (paw)
Pages design/chill.png            ← icon only (coffee cup)
Pages design/trips.png            ← icon only (airplane)
Pages design/I-want-to-meet.png
Pages design/Upload-your-images.png
Pages design/Face-check.png
Pages design/3.png                ← "Can we get your number?" phone screen
Pages design/4.png                ← "Enter your code" 6-digit OTP screen

icons/male-sign.png               ← male symbol (coral/pink color)
icons/women-sign.png              ← female symbol (coral/pink color)
Pages design/male-logo.png        ← male symbol (larger version)
Pages design/female-logo.png      ← female symbol (larger version)

Main Page/Icons/Main-page-icon.png
Main Page/Icons/likes-you.png
Main Page/Icons/chats.png
Main Page/Icons/my-profile.png
Main Page/Icons/suggested.png
Main Page/Icons/back-button.png
Main Page/Icons/Boost.png
Main Page/Icons/Reject.png
Main Page/Icons/supper-like.png
Main Page/Icons/Green.png
```

### Auth screens — background style
ALL auth screens share this look:
- **Background**: Blurred photo of a couple (warm brown tones). We don't have the actual photo stored yet — use a dark warm-toned background (`#2C1810` or similar dark brown) as placeholder. Structure it so swapping in a real ImageBackground + blur is easy later.
- **Logo**: `require('../../Pages design/logo-hd-amadoo.png')` — white on transparent, shows on dark bg
- **Buttons**: Frosted glass pills — `backgroundColor: 'rgba(255,255,255,0.2)'`, white border, white text, `borderRadius: 30`, height 52

### `(auth)/index.tsx` — Welcome screen
- Logo centered vertically in top 60% of screen
- Bottom 40%: 4 buttons stacked with gap 10:
  - "Sign in with Apple" → nothing for now
  - "Sign in with Google" → nothing for now  
  - "Sign in with e-mail" → `router.push('/(auth)/sign-up')`
  - "Login" (slightly different style — white text, same frosted) → `router.push('/(auth)/sign-in')`

### `(auth)/sign-up.tsx` — Create account
- Same dark background, logo at top (smaller, ~80px)
- Labels above each input: "Sign in with your e-mail address:", "Enter a password:", "Confirm your password:"
- Inputs: frosted glass pill (same rgba white style)
- Inline error under email if address already registered (409 from backend)
- "Next" button at bottom → `router.push('/(auth)/verify-email')`

### `(auth)/sign-in.tsx` — Login
- Same dark background, logo at top
- Labels: "Login with your e-mail address:", "Password:"
- "Forgot password?" right-aligned link in white
- "Next" button
- Below: "Login with Apple", "Login with Google" buttons

### `(auth)/forgot-password.tsx`
- Same dark background, logo at top
- "Enter your e-mail address:" label
- Email input
- "Send code again" text (small, white, right-aligned)
- "Next" button

### Onboarding screens — all WHITE background
Pattern for ALL onboarding screens:
- White background
- Back arrow `‹` top-left (gray, `fontSize: 28`)
- Skip button top-right (coral pill `#E8756A`, white text) — only on optional screens (school, job, hobbies, activities, trips, chill, pet, upload-photos)
- Bold title centered (`fontSize: 26, fontWeight: '700'`)
- Content in middle
- "Next" button at bottom (gray pill when disabled, activates when input filled)
- "This can't be changed later" note in small gray text — only on name and birthday screens

### `(onboarding)/gender.tsx` — ONLY 2 options
Design shows Male and Female only (not Non-binary, Other):
```tsx
{ value: 'male', label: 'Male', icon: require('../../icons/male-sign.png') }
{ value: 'female', label: 'Female', icon: require('../../icons/women-sign.png') }
```
Each is a full-width outlined pill: border `#E5E5E5`, selected state: border `#E8756A` (coral), icon tinted coral.

### `(onboarding)/i-want-to-meet.tsx`
- 3 gender options: Male, Female, Both (same pill style as gender screen)
- "Between ages" section below with range slider `18-100`, currently showing `18-30`
- Slider track coral color, two thumb handles

### `(onboarding)/upload-photos.tsx`
- Title: "Add 2 more photos" (or "Add X more photos" counting empties)
- 3×2 grid of rounded square slots (borderRadius 16)
- First slot: empty pink bg, just a `+` for photo upload
- Other 5 slots show category icons with labels: Activity, Pet, Hobbies, Trips, Chill
- Each uses the PNG icons from Pages design (basketball, paw, puzzle, airplane, coffee)
- Small hint text: "Users with 3 photos receive 8x more likes."
- Skip top-right, Next bottom
- NOTE: photos are picked locally but NOT yet uploaded to backend (pending task)

### Main app swipe screen `(app)/index.tsx`
- White header: "Swipe" left, filter icon right
- Light blue banner below header: "Verify now or you wont be seen by other users" + "Verify now" coral button
- Full-screen swipe card (photo fills most of screen)
- Card shows: name + age bottom-left, verified badge, distance badge
- 5 action buttons overlaid at card bottom: undo (yellow), reject (red X), super-like (blue star), like (green heart), boost (purple lightning)
- Use PNG icons from `Main Page/Icons/` for the action buttons

### `(app)/matches.tsx` — Chats screen
- Two sections: NEW MATCHES (horizontal avatar bubbles for matches with no messages) and MESSAGES (chat list)
- Each chat row: avatar, name, last message preview, timestamp, unread badge
- Tapping any item opens `/(app)/chat/{matchId}`

### `(app)/chat/[matchId].tsx` — Chat screen
- Header: back button, avatar, name, verified badge
- Messages: my messages right (coral bubble), their messages left (gray bubble)
- Read receipts: ✓ (sent) / ✓✓ in coral (read)
- Input bar at bottom with send button
- Polls for new messages every 4s while in foreground

### `(app)/likes.tsx` — Liked you screen
- Shows people who liked you that you haven't swiped on yet
- Photos are blurred (BlurView intensity 55)
- Shows name/age, school/job/hobby tags below each card
- Upgrade banner nudge

### `(app)/profile.tsx`
- Gear icon top-right → navigates to `/(app)/settings`

---

## Key patterns

### Image paths with spaces — always relative, never `@/` alias
```tsx
require('../../Main Page/Icons/Main-page-icon.png')  // ✅
require('@/Main Page/Icons/...')                      // ❌ breaks
```

### No CSS in React Native — use LinearGradient component
```tsx
<LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={styles.x} />
// NOT: style={{ background: 'linear-gradient(...)' }}
```

### Brand colors
- Coral/brand: `#E8756A`
- Gradient: `#F7541B` → `#FF1F71`
- Dark auth background placeholder: `#1C0F0A`

### Auth redirect pattern (FINAL — do not change)
```
app/_layout.tsx   → providers + push notification setup, zero navigation logic
app/index.tsx     → loading screen + <Redirect> after isLoading resolves
```

```tsx
// app/index.tsx
export default function Index() {
  const { isLoading, isAuthenticated, user } = useAuthStore()
  useEffect(() => { if (!isLoading) SplashScreen.hideAsync() }, [isLoading])
  if (isLoading) return <LoadingScreen />
  if (!isAuthenticated) return <Redirect href="/(auth)" />
  if (!user?.isOnboarded) return <Redirect href="/(onboarding)/name" />
  return <Redirect href="/(app)" />
}
```

### Clearing app cache
The Zustand persist key is `'amadoo-auth'` in AsyncStorage. To clear stale state:
- **Easiest**: Settings → Log Out (calls `logout()`, zeroes all state)
- **Nuclear**: `await AsyncStorage.removeItem('amadoo-auth')` then reload

---

## Exact versions (do not change without checking Expo Go compatibility)

```json
"expo": "~54.0.0"
"expo-router": "~6.0.0"
"react": "19.1.0"
"react-native": "0.81.5"
"react-native-reanimated": "~4.1.1"
"react-native-worklets": "~0.5.1"   ← MUST be 0.5.x — Expo Go SDK 54 has 0.5.1 native, 0.6.x causes crash
"expo-linking": "~8.0.12"
"expo-notifications": "~56.0.14"
```

---

## Package manager: bun

bun is installed at `~/.bun/bin/bun`. It may not be in PATH in all shells.

```bash
~/.bun/bin/bun install          # install all deps
~/.bun/bin/bun add some-pkg     # add a package
npx expo install expo-lib       # always use for Expo libraries
npx expo install --fix          # fix version mismatches
```

`.npmrc` has `legacy-peer-deps=true` — never delete it.

## Install sequence (from scratch)

```bash
~/.bun/bin/bun install
npx expo install --fix
npx expo start
```

---

## Backend

Located at `backend/` inside the repo. Runs on port 8000.

```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```

Database: PostgreSQL local, URL in `backend/.env`:
```
DATABASE_URL=postgresql+asyncpg://patricksaade@localhost:5432/amadoo
```

### DB migrations (no Alembic — manual SQL)
Migration files are in `backend/migrations/`. Run with:
```bash
psql postgresql://patricksaade@localhost:5432/amadoo -f backend/migrations/<file>.sql
```
Already applied:
- `add_push_token.sql` — adds `push_token TEXT` to users table

### Backend logging
All routers log with structured `[TAG]` prefixes and ✅/❌ emoji indicators. Set `LOG_LEVEL=DEBUG` in `.env` for verbose output.

### Pyright false positives
The IDE shows "Import could not be resolved" for fastapi, sqlalchemy, etc. — the `.venv` is not configured in the IDE. These are NOT real errors. The backend runs correctly.

---

## Known errors and fixes

| Error | Fix |
|-------|-----|
| `[WorkletsError] Mismatch ... (0.6.x vs 0.5.1)` | Pin `react-native-worklets` to `~0.5.1`, then `bun install` |
| `Cannot find module 'react-native-worklets/plugin'` | Add `"react-native-worklets": "~0.5.1"` to package.json |
| `Unable to resolve "expo-linking"` | Add `"expo-linking": "~8.0.12"` to package.json |
| `npm error ERESOLVE` | Use bun, or ensure `.npmrc` has `legacy-peer-deps=true` |
| `Project is incompatible with this version of Expo Go` | Update Expo Go from App Store (must match SDK 54) |
| `Attempted to navigate before mounting the Root Layout` | Never `router.replace` from `_layout.tsx` — use `<Redirect>` in `app/index.tsx` |
| `spawn bun ENOENT` | bun not in PATH — use `~/.bun/bin/bun` full path |
| OTP sometimes not sending | Fixed: use `asyncio.get_running_loop()` not `get_event_loop()`. Console fallback always prints the code. |
| Push notifications not working | Requires real device — push tokens don't work in iOS Simulator |

---

## Running

```bash
# Frontend
npx expo start
# Expo Go on iPhone (SDK 54), scan QR
# Press 'r' to reload, 'i' for iOS simulator

# Backend
cd backend && source .venv/bin/activate && uvicorn main:app --reload --port 8000
```
