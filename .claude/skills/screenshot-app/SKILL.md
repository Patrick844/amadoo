---
name: screenshot-app
description: Run Amadoo in the iOS Simulator and capture screenshots of each screen so Claude can review design/UX/functionality visually and fix what's broken. Use when asked to "look at the running app", "screenshot the screens", "do a visual pass", or test how something renders on iOS. Requires full Xcode + an iOS Simulator runtime (Command Line Tools alone is NOT enough).
---

# Screenshot the Amadoo app (iOS Simulator)

Goal: see the real app on iOS, screen by screen, by capturing PNGs that Claude then
reads to judge design, spacing, and whether features work — then fix issues in code.

## Prerequisites (one-time, user does this)

1. Install **Xcode** from the Mac App Store (free, large), then open it once and let it
   install the iOS platform/simulator.
2. Point the toolchain at it:
   ```bash
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   ```
3. Verify it's ready (this MUST list a simulator and a runtime):
   ```bash
   xcrun simctl list devices available | grep -i iphone
   xcrun simctl list runtimes | grep -i ios
   ```
If those are empty, stop — Xcode/simulator isn't set up yet.

## Run the app + capture

The Expo dev server is long-running, so start it in the background, boot a simulator,
open the app in Expo Go, then screenshot.

```bash
# 1. Boot a simulator (first available iPhone) and open the Simulator app
DEV=$(xcrun simctl list devices available | grep -m1 -oE "iPhone [0-9].*\(([0-9A-F-]+)\)" | grep -oE "[0-9A-F-]{36}")
xcrun simctl boot "$DEV" 2>/dev/null || true
open -a Simulator

# 2. Start Expo for iOS in the background (installs Expo Go into the sim & opens the app)
#    Run from the project root. Use the background runner so it stays up across turns.
npx expo start --ios
```

Once the app is on screen, capture and review:

```bash
bash .claude/skills/screenshot-app/shoot.sh screenshots <name>
```

Then **Read** `screenshots/<name>.png` to look at it.

## Navigate without manual taps (deep links)

expo-router exposes routes as URLs, so you can jump straight to a screen instead of
tapping through. Use the dev URL form (port may be 8081):

```bash
xcrun simctl openurl booted "exp://127.0.0.1:8081/--/(app)/settings"
xcrun simctl openurl booted "exp://127.0.0.1:8081/--/(app)/subscription"
```
Screenshot after each. For taps inside a screen (e.g. opening a sheet), either deep-link
to the target route or install Maestro later (needs Java + Xcode) for full tap automation.

## Loop for a design pass

For each key screen: deep-link (or navigate) → `shoot.sh` → Read the PNG → note issues →
fix the StyleSheet → reload (press `r` in the Expo terminal or shake → Reload) → re-shoot
to confirm. Screens worth covering: auth welcome/sign-in/sign-up, onboarding (looking-for,
gender, upload-photos), deck, likes, matches, chat, profile, edit-profile, settings,
subscription, a user profile per intent (dating/activity/business) to verify contextual
rendering.

## Notes / gotchas
- Simulator can't use the camera (face-check photo) — pick from the library instead.
- Push notifications don't work in the simulator (real device only).
- Log in with a verified test account so gated screens (deck, likes) render.
- Screenshots go to `screenshots/` (gitignored; add if not).
