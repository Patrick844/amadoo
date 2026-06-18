# 08 — Amadoo: Your Specific Build Plan

## What you have

Based on the designs in your `/amadoo/` folder:

### Auth screens (5 screens)
- `main-login-sign-in.png` — Welcome / splash
- `Sign-in-with-email-page.png` — Sign up form
- `login-by-email.png` — Sign in form
- `Forgot-password-page.png` — Forgot password
- `enter-new-password-page.png` — Reset password
- `email-verificaiton.png` — Email verification pending

### Onboarding screens (14 screens)
- `Name.png`, `birthday.png`, `Gender.png`
- `school.png`, `job.png`
- `hobbies.png`, `actifities.png`, `trips.png`, `chill.png`
- `pet.png`
- `I-want-to-meet.png`
- `Face-check.png`, `error-if-face-not-clear.png`
- `Upload-your-images.png`

### Main app (3 screens + icons)
- `Main-page.png` — Swipe card interface
- `main-page-with-buttons.png` — With like/reject/super-like buttons
- **Icons:** back, boost, chats, green dot, likes-you, main-page, my-profile, reject, suggested, super-like

---

## The recommended tech stack for Amadoo

| Layer | Technology | Why |
|-------|-----------|-----|
| Mobile app | Expo SDK 54 (React Native 0.81.5) | Cross-platform, fast development |
| Navigation | Expo Router v6 | File-based, modern standard |
| Language | TypeScript + React 19.1.0 | Type safety, latest React features |
| UI library | React Native (custom components) | Full design control |
| Animations | React Native Reanimated v4 + react-native-worklets | Smooth swipe gestures |
| State | Zustand v5 | Simple, TypeScript-friendly |
| Backend | Supabase | Auth + DB + Storage + Realtime in one |
| Swipe gestures | react-native-gesture-handler | Industry standard |
| Photo picker | expo-image-picker | Built-in Expo library |
| Camera (face check) | expo-camera | Built-in Expo library |
| Push notifications | expo-notifications | Built-in Expo library |
| Location | expo-location | Built-in Expo library |
| Package manager | bun | 10-25x faster than npm |

---

## Phase 1 — Foundation (Week 1-2)

### Goal: App runs on your phone, navigation works, screens exist

**Step 1.1: Setup (Day 1)**
```bash
# Install tools (if not done)
brew install node watchman
curl -fsSL https://bun.sh/install | bash  # install bun package manager
# Install Xcode from Mac App Store
# Install Expo Go on your iPhone (must match SDK 54)

# Create the project
npx create-expo-app@latest amadoo --template blank-typescript
cd amadoo
bun install
npx expo install --fix   # fixes any version mismatches
npx expo start
```

> **Version note:** Amadoo uses Expo SDK 54, React 19.1.0, React Native 0.81.5, and Expo Router v6. Make sure you download **Expo Go for SDK 54** from the App Store — the version must match your project's SDK.

**Step 1.2: Create the folder structure**

Create these folders in your project:
```
app/
  (auth)/
  (onboarding)/
  (app)/
components/
services/
stores/
types/
constants/
```

**Step 1.3: Define your types**

Create `types/index.ts` with your User, Match, Message types (see `02-javascript-typescript.md`).

**Step 1.4: Build the navigation shell**

Create `_layout.tsx` files in each route group. Each screen can be an empty `<View>` with a `<Text>` for now — just get the navigation working.

**Step 1.5: Build each screen as a skeleton**

Take each design PNG and build the corresponding screen. Start with static content (no real data), just match the visual design.

---

## Phase 2 — UI (Week 3-4)

### Goal: Every screen looks exactly like the designs

**Order to build screens:**

1. **Splash / loading screen** — `loading-page-.png`
2. **Auth screens** (in order: welcome → signup → signin → forgot → verify)
3. **Onboarding screens** (in order: name → birthday → gender → ... → face check → photos)
4. **Main swipe screen** — this is the most complex UI
5. **Matches / chats list**
6. **Chat screen**
7. **My profile screen**

**Key UI components to build:**

```typescript
// The swipe card — your most important component
// Use react-native-gesture-handler + reanimated for smooth swipes
components/cards/SwipeCard.tsx

// The onboarding multi-select (hobbies, activities, etc.)
components/onboarding/MultiSelect.tsx

// Bottom tab bar (custom, matching your icon designs)
components/navigation/TabBar.tsx

// The action buttons (like, reject, super-like)
components/cards/ActionButtons.tsx
```

**The swipe card physics:**

`react-native-gesture-handler` and `react-native-reanimated` are already in Amadoo's `package.json`. Note that Reanimated v4 requires the `react-native-worklets` peer dependency — both are already installed.

The swipe gesture is the most technically complex part of the UI. The custom implementation in `app/(app)/index.tsx` uses Reanimated v4's `useAnimatedStyle` and `useSharedValue` for smooth 60fps swipe animations. This is built from scratch so the physics feel exactly like the designs — no third-party swiper library needed.

---

## Phase 3 — Backend (Week 5-6)

### Goal: Real authentication and profile creation works

**Step 3.1: Create your Supabase project**
1. Go to supabase.com → New project
2. Name it "amadoo"
3. Choose a region close to your users (e.g., us-east-1 for US/Lebanon)
4. Copy your `Project URL` and `anon key` from Settings → API

**Step 3.2: Create database tables**

In Supabase SQL editor, run:
```sql
-- Enable PostGIS for location queries
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE users (
  id UUID REFERENCES auth.users PRIMARY KEY,
  name TEXT,
  birthday DATE,
  gender TEXT,
  bio TEXT,
  school TEXT,
  job TEXT,
  hobbies TEXT[] DEFAULT '{}',
  activities TEXT[] DEFAULT '{}',
  photos TEXT[] DEFAULT '{}',
  want_to_meet TEXT[] DEFAULT '{}',
  is_onboarded BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  location GEOGRAPHY(POINT),
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE swipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  swiper_id UUID REFERENCES users(id),
  swiped_id UUID REFERENCES users(id),
  action TEXT CHECK (action IN ('like', 'dislike', 'super_like')),
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(swiper_id, swiped_id)
);

CREATE TABLE matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID REFERENCES users(id),
  user2_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES matches(id),
  sender_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  sent_at TIMESTAMP DEFAULT now(),
  read_at TIMESTAMP
);
```

**Step 3.3: Connect your app to Supabase**

```bash
bun add @supabase/supabase-js
```

Create `lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureStore,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
```

**Step 3.4: Wire up auth**

Replace the placeholder sign-in form with real Supabase auth calls.

**Step 3.5: Wire up onboarding**

After auth, the onboarding flow saves each step to the user's row in Supabase.

---

## Phase 4 — Core features (Week 7-9)

### Goal: Swiping, matching, and chatting work end to end

**Priority order:**
1. **Profile fetching** — load real nearby profiles into the swipe deck
2. **Swipe logic** — like/dislike records in DB, match detection
3. **Match notification** — "It's a Match!" popup when a match is created
4. **Matches list** — see all your current matches
5. **Chat** — send and receive messages in real-time (Supabase Realtime)
6. **Push notifications** — notify users when matched or messaged

---

## Phase 5 — Polish (Week 10-11)

- Smooth animations (match popup, swipe physics)
- Empty states ("No more profiles nearby")
- Error states (no internet, failed upload)
- Photo upload and reordering
- Profile editing
- Settings screen
- Boost feature

---

## Phase 6 — Launch (Week 12)

**Before submitting:**
- [ ] Sign up for Apple Developer account ($99) at developer.apple.com
- [ ] Create App Store listing in App Store Connect
- [ ] Write privacy policy (you MUST have one — use a generator)
- [ ] Take screenshots on iPhone 6.7" and 5.5" simulators
- [ ] Build production: `eas build --platform ios --profile production`
- [ ] Test on TestFlight with 5-10 real people
- [ ] Fix bugs from TestFlight
- [ ] Submit: `eas submit --platform ios`
- [ ] Wait for Apple review (1-3 days)

---

## Estimated timeline

| Phase | Duration | Milestone |
|-------|----------|-----------|
| Foundation | 2 weeks | App runs, navigation works |
| UI | 2 weeks | All screens look right |
| Backend | 2 weeks | Auth and profiles work |
| Core features | 3 weeks | Swiping and matching work |
| Polish | 2 weeks | Ready for TestFlight |
| Launch | 1 week | Live on App Store |
| **Total** | **~12 weeks** | |

This assumes part-time work (~3-4 hours/day). Full-time would be 6-8 weeks.

---

## The honest hard parts

1. **Swipe gesture physics** — making it feel as good as Tinder takes work. Use a library first.
2. **Photo face-check** — you have a "Face-check" screen. This requires a face detection library (`expo-face-detector` or a cloud API like AWS Rekognition). Plan extra time for this.
3. **Real-time chat** — Supabase Realtime makes this much easier than building it yourself.
4. **Location-based matching** — PostGIS (PostgreSQL extension) handles the geo queries. Supabase has it built in.
5. **App Store approval** — Dating apps get extra scrutiny. Have a solid moderation plan and clear ToS/Privacy Policy.

---

## First thing to do RIGHT NOW

1. Sign up for an **Apple Developer account** (it takes time to verify): https://developer.apple.com/programs/enroll/
2. Sign up for a **Supabase account** (free): https://supabase.com
3. Sign up for an **Expo account** (free): https://expo.dev
4. Install Xcode from the Mac App Store (takes time to download — start this now)
5. Once Xcode is done, come back and we'll initialize the project together
