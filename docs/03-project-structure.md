# 03 — Project Structure: How an Expo App is Organized

## Creating a new Expo project

```bash
npx create-expo-app@latest amadoo --template blank-typescript
cd amadoo
bun install
npx expo start
```

This gives you a working app in about 30 seconds.

---

## What you get out of the box

```
amadoo/
├── app/                    ← Your screens (using Expo Router)
│   ├── _layout.tsx         ← Root layout (navigation setup)
│   ├── index.tsx           ← Entry screen
│   └── (tabs)/             ← Tab-based screens
│       ├── _layout.tsx
│       ├── index.tsx
│       └── profile.tsx
│
├── components/             ← Reusable UI components
├── assets/                 ← Images, fonts, icons
├── constants/              ← Colors, sizes, config values
├── hooks/                  ← Custom React hooks
├── types/                  ← TypeScript type definitions
│
├── app.json                ← App configuration (name, icon, permissions)
├── package.json            ← Dependencies list
├── tsconfig.json           ← TypeScript config
└── node_modules/           ← Installed libraries (never edit this)
```

---

## The recommended structure for Amadoo

Here's how I'd organize Amadoo specifically:

```
amadoo/
│
├── app/                              ← Expo Router: file = screen
│   ├── _layout.tsx                   ← Root: check auth, set theme
│   ├── (auth)/                       ← Auth screens (not shown when logged in)
│   │   ├── _layout.tsx
│   │   ├── index.tsx                 ← main-login-sign-in screen
│   │   ├── sign-up.tsx              ← Sign up with email
│   │   ├── sign-in.tsx              ← Login by email
│   │   ├── forgot-password.tsx
│   │   ├── enter-new-password.tsx
│   │   └── verify-email.tsx
│   │
│   ├── (onboarding)/                 ← Onboarding flow (after sign up)
│   │   ├── _layout.tsx
│   │   ├── name.tsx
│   │   ├── birthday.tsx
│   │   ├── gender.tsx
│   │   ├── school.tsx
│   │   ├── job.tsx
│   │   ├── hobbies.tsx
│   │   ├── activities.tsx
│   │   ├── trips.tsx
│   │   ├── chill.tsx
│   │   ├── pet.tsx
│   │   ├── i-want-to-meet.tsx
│   │   ├── face-check.tsx
│   │   └── upload-photos.tsx
│   │
│   └── (app)/                        ← Main app (logged in + onboarded)
│       ├── _layout.tsx               ← Tab bar layout
│       ├── index.tsx                 ← Main swipe screen
│       ├── likes.tsx                 ← Likes you screen
│       ├── matches.tsx               ← Chats / matches screen
│       ├── profile.tsx               ← My profile
│       └── chat/
│           └── [matchId].tsx         ← Individual chat (dynamic route)
│
├── components/
│   ├── ui/                           ← Generic: buttons, inputs, cards
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Avatar.tsx
│   │   └── ProgressBar.tsx
│   │
│   ├── cards/
│   │   ├── SwipeCard.tsx             ← The main tinder-style swipe card
│   │   └── MatchCard.tsx
│   │
│   └── onboarding/
│       ├── MultiSelect.tsx           ← Hobbies/activities selection
│       └── OnboardingHeader.tsx
│
├── services/                         ← API calls (talking to your backend)
│   ├── api.ts                        ← Base fetch wrapper
│   ├── auth.service.ts               ← Login, signup, logout
│   ├── users.service.ts              ← Get profiles, update profile
│   ├── matches.service.ts            ← Swipe, get matches
│   └── messages.service.ts          ← Send/receive messages
│
├── stores/                           ← App-wide state (Zustand)
│   ├── auth.store.ts                 ← Current user, auth token
│   ├── swipe.store.ts                ← Current deck of cards
│   └── matches.store.ts             ← Matches and messages
│
├── types/
│   └── index.ts                      ← User, Match, Message types
│
├── constants/
│   ├── colors.ts                     ← Your brand colors
│   ├── fonts.ts
│   └── config.ts                     ← API base URL, etc.
│
├── hooks/
│   ├── useAuth.ts                    ← Auth state helper
│   └── useSwipe.ts                   ← Swipe gesture logic
│
├── assets/
│   ├── icons/                        ← Your PNG icons (from Main Page/Icons)
│   ├── images/                       ← Splash screen, logo
│   └── fonts/
│
├── app.json                          ← App config
├── eas.json                          ← Build profiles (dev / staging / prod)
└── package.json
```

---

## Expo Router — file-based routing

**Expo Router** is the standard way to handle navigation in modern Expo apps. It works like Next.js for the web: **the file name = the screen route**.

```
app/index.tsx               → /              (first screen)
app/profile.tsx             → /profile
app/(auth)/sign-in.tsx      → /sign-in       (group: folders with () don't add to URL)
app/chat/[matchId].tsx      → /chat/abc123   (dynamic segment)
```

### Route groups `()`
Folders with parentheses `(auth)`, `(app)`, `(onboarding)` are **route groups**. They let you:
- Share a layout (like a tab bar) across multiple screens
- Organize files without affecting the URL path
- Show/hide sections based on auth state

### `_layout.tsx`
Every folder can have a `_layout.tsx` file that wraps all screens in that group. This is where you put:
- Tab bars
- Navigation headers
- Auth guards (redirect to login if not authenticated)

---

## app.json — your app's birth certificate

```json
{
  "expo": {
    "name": "Amadoo",
    "slug": "amadoo",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "backgroundColor": "#FFFFFF"
    },
    "ios": {
      "bundleIdentifier": "com.yourname.amadoo",
      "buildNumber": "1",
      "infoPlist": {
        "NSCameraUsageDescription": "Amadoo needs camera access for profile photos",
        "NSPhotoLibraryUsageDescription": "Amadoo needs photo access for profile photos",
        "NSLocationWhenInUseUsageDescription": "Amadoo uses your location to show nearby people"
      }
    },
    "android": {
      "package": "com.yourname.amadoo",
      "versionCode": 1,
      "permissions": ["CAMERA", "READ_MEDIA_IMAGES", "ACCESS_FINE_LOCATION"]
    }
  }
}
```

The `bundleIdentifier` for iOS and `package` for Android uniquely identify your app. Choose them carefully — they're hard to change later. Convention: `com.yourname.appname`.

---

## package.json — your dependencies

This is the actual Amadoo `package.json` with the correct SDK 54 versions:

```json
{
  "name": "amadoo",
  "version": "1.0.0",
  "dependencies": {
    "expo": "~54.0.0",
    "expo-router": "~6.0.0",
    "react": "19.1.0",
    "react-native": "0.81.5",
    "expo-camera": "~17.0.10",
    "expo-image-picker": "~17.0.11",
    "expo-secure-store": "~15.0.8",
    "expo-haptics": "~15.0.8",
    "expo-linear-gradient": "~15.0.8",
    "expo-blur": "~15.0.0",
    "expo-asset": "~12.0.13",
    "expo-linking": "~8.0.12",
    "expo-file-system": "~19.0.22",
    "expo-constants": "~18.0.13",
    "expo-splash-screen": "~31.0.13",
    "expo-status-bar": "~3.0.9",
    "expo-font": "~14.0.0",
    "expo-image": "~3.0.0",
    "zustand": "^5.0.3",
    "react-native-gesture-handler": "~2.28.0",
    "react-native-reanimated": "~4.1.1",
    "react-native-worklets": "~0.6.0",
    "react-native-safe-area-context": "~5.6.0",
    "react-native-screens": "~4.16.0",
    "react-native-web": "^0.21.0",
    "@react-native-async-storage/async-storage": "2.2.0",
    "@react-native-community/datetimepicker": "8.4.4"
  },
  "devDependencies": {
    "@babel/core": "^7.25.2",
    "typescript": "^5.3.3",
    "@types/react": "~19.1.10"
  }
}
```

**Important notes:**
- `react-native-reanimated` v4 requires `react-native-worklets` as a separate peer dependency — they split into two packages. Both must be installed.
- Use `bun install` (not `npm install`) — bun is 10-25x faster and handles peer dependency conflicts better.
- A `.npmrc` file with `legacy-peer-deps=true` is also needed so that any internal npm calls (from Expo tooling) also skip peer dep conflicts.

Run `bun install` to install everything listed here.

→ See `10-package-managers-and-deps.md` for the full story on bun vs npm and how to avoid install errors.

---

## node_modules — never touch this

This folder contains all your installed libraries. It can be gigabytes in size. It's auto-generated by `bun install` and is in `.gitignore` (not committed to git). If you delete it, run `bun install` to restore it.

---

## Key files you'll edit daily

| File | Purpose |
|------|---------|
| `app/` screens | Your UI, what users see |
| `services/` | API calls to your backend |
| `stores/` | Global state (user session, data) |
| `components/` | Reusable UI pieces |
| `constants/colors.ts` | Your brand colors (change once, applies everywhere) |
| `app.json` | App name, version, permissions |
| `eas.json` | Build configuration |
