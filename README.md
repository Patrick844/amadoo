# Amadoo — Dating App

A dating app built with Expo (React Native). iOS-first, then Android.

---

## Before you start — one-time setup (do this once)

### 1. Install Homebrew (Mac package manager)
Open **Terminal** and paste:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. Install Node.js
```bash
brew install node
```
Verify: `node --version` should show v20 or higher.

### 3. Install Watchman
```bash
brew install watchman
```

### 4. Install Xcode
- Open the **Mac App Store**
- Search "Xcode" and install (it's free, ~15GB — this takes a while)
- After install, open Xcode once and accept the license
- Then run: `xcode-select --install`

### 5. Install Expo tools
```bash
npm install -g expo-cli eas-cli
```

### 6. Install Expo Go on your iPhone
- Open the App Store on your iPhone
- Search "Expo Go" and install it (it's free)

---

## Running the app for the first time

### Step 1: Install dependencies
Open Terminal, navigate to this folder, and run:
```bash
npm install
```
This downloads all the libraries listed in `package.json`. Takes 1-2 minutes.

### Step 2: Start the development server
```bash
npx expo start
```

You'll see a QR code in the terminal.

### Step 3: Open on your iPhone
- Make sure your iPhone and Mac are on the **same Wi-Fi network**
- Open the **Camera** app on your iPhone
- Point it at the QR code in the terminal
- A banner appears at the top — tap it to open in Expo Go
- The app loads on your phone in a few seconds

**Every time you save a file, the app updates instantly on your phone.**

---

## Running on the iOS Simulator (no iPhone needed)

Make sure Xcode is installed, then:
```bash
npx expo start
# Press 'i' in the terminal
```

An iPhone simulator opens on your Mac screen.

---

## Running on Android (Samsung, etc.)

### Option A: Android Emulator
1. Install Android Studio from https://developer.android.com/studio
2. Open Android Studio → Virtual Device Manager → Create Device
3. Run `npx expo start` and press `a`

### Option B: Physical Android device
1. Install Expo Go from the Google Play Store on your Android phone
2. Run `npx expo start`
3. Scan the QR code with the Expo Go app

---

## Project structure

```
amadoo/
├── app/                    ← All screens (file name = route)
│   ├── (auth)/             ← Login, sign-up, forgot password
│   ├── (onboarding)/       ← Profile setup flow (name → photos)
│   └── (app)/              ← Main app (swipe, likes, chats, profile)
│
├── components/             ← Reusable UI pieces
├── stores/                 ← Global state (Zustand)
├── types/                  ← TypeScript type definitions
├── constants/              ← Colors, config
│
├── Pages design/           ← Your original design mockups
├── Main Page/              ← Main page icons and designs
├── docs/                   ← Learning documentation (read these first!)
│
├── app.json                ← App name, permissions, bundle ID
└── package.json            ← Dependencies
```

---

## Current state of the app

The app has all screens built with UI matching the designs. Everything uses **mock/placeholder data** — no real backend yet.

### What works now:
- Navigation between all screens
- Auth screens (sign up, sign in, forgot password, email verification)
- Full onboarding flow (name → birthday → gender → school → job → hobbies → activities → trips → chill → pet → who to meet → face check → photo upload)
- Swipe screen with gesture (swipe left = reject, swipe right = like, LIKE/NOPE stamps appear)
- Likes screen
- Matches list screen
- Chat screen (sending messages works within the session)
- Profile screen

### What's not connected yet (backend phase):
- Real authentication (sign up / sign in does nothing yet)
- Real profiles from database
- Real matching logic
- Persistent chat messages
- Push notifications

---

## Common commands

| Command | What it does |
|---------|-------------|
| `npm install` | Install all dependencies |
| `npx expo start` | Start dev server + show QR code |
| `npx expo start --ios` | Start and open iOS Simulator |
| `npx expo start --android` | Start and open Android Emulator |
| `npx expo start --clear` | Start and clear the cache (fixes weird bugs) |

---

## Troubleshooting

**App won't load on phone**
- Make sure phone and Mac are on the same Wi-Fi
- Try `npx expo start --clear`

**"Metro bundler" error**
- Run `npx expo start --clear`

**"Unable to resolve module" error**
- Run `npm install` again

**Xcode not found error**
- Make sure Xcode is installed from the Mac App Store
- Run `xcode-select --install`

**Red error screen in app**
- Read the error message — it tells you exactly what's wrong
- Most common: a missing import or a typo in a file name

---

## Next steps (after you can run the app)

1. Read `docs/` to understand how everything works
2. Set up Supabase (free backend): https://supabase.com
3. Set up Apple Developer account ($99/year): https://developer.apple.com/programs/
4. Connect auth screens to real Supabase auth
5. See `docs/08-amadoo-roadmap.md` for the full build plan

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| App framework | Expo SDK 53 |
| Navigation | Expo Router 4 |
| Animations | React Native Reanimated 3 |
| Gestures | React Native Gesture Handler |
| State | Zustand 5 |
| Language | TypeScript |
| Backend (next phase) | Supabase |
