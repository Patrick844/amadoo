# Amadoo — How to share the app with your friend (zero tech knowledge)

The easiest way: **Expo Go** (no App Store needed, free, takes 5 minutes).

---

## What your friend needs to do (send them this)

1. **Download Expo Go** from the App Store (iPhone) or Google Play (Android).  
   Search: "Expo Go" — it's the white icon with a triangle.

2. **Open the link** Patrick sends you (it looks like `exp://...` or a QR code).

3. **Scan or tap** → the app opens inside Expo Go.

That's it. Every time Patrick pushes an update, just shake the phone inside Expo Go and tap "Reload".

---

## What you (Patrick) need to do

### Step 1 — Start the dev server on your Mac

```bash
cd ~/Desktop/Personal/project/amadoo
npx expo start --tunnel
```

The `--tunnel` flag makes it accessible from any network (not just your WiFi).  
It will show a QR code in the terminal.

### Step 2 — Share the link

- Take a screenshot of the QR code and send it, OR
- Copy the `exp://...` URL shown in the terminal and send it via iMessage/WhatsApp

Your friend scans the QR code with their iPhone camera (or with the Expo Go app's scanner).

> **Your Mac must stay on and connected to the internet while they're testing.**

---

## Better option — Expo EAS (for sharing without keeping your Mac on)

This builds and hosts the app in the cloud. Free tier is fine for testing.

### One-time setup (you do this once)

```bash
npm install -g eas-cli
eas login          # create a free account at expo.dev if you don't have one
eas build:configure
```

### Build a preview APK/IPA

```bash
# For iPhone (requires Apple Developer account - $99/year) or use Android:
eas build --profile preview --platform android
# or
eas build --profile preview --platform ios
```

Once built, EAS gives you a URL like `https://expo.dev/artifacts/...`.  
Send that URL to your friend. They tap it, install the app, done.

---

## Cheapest/fastest option for iPhone without Apple account — TestFlight via EAS

1. Sign up for Apple Developer Program ($99/year): developer.apple.com
2. Run `eas build --platform ios --profile preview`
3. Run `eas submit --platform ios` → uploads to TestFlight
4. Invite your friend's Apple ID in App Store Connect
5. They install TestFlight from App Store → they get the app

---

## Quick summary

| Option | Cost | Your Mac needs to be on? | Setup time |
|--------|------|--------------------------|------------|
| Expo Go + tunnel | Free | YES | 1 min |
| EAS build (Android) | Free | No | 15 min |
| TestFlight (iOS) | $99/yr | No | 1 hour |

**For now: use `npx expo start --tunnel` and send the QR code.** It's the fastest for early testing.
