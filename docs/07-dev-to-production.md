# 07 — Development to Production: From Your Mac to the App Store

## The big picture

```
Your Mac                    Test devices              App Stores
─────────                   ───────────               ──────────
Write code   ──Expo Go──►  iPhone (your phone)        App Store
                                                       Play Store
             ──EAS Build──► TestFlight (beta testers)
                          ► Internal testing
             ──EAS Submit─► Apple Review (1-3 days)
                          ► Live on App Store ✓
```

---

## Step 0: What you need to install on your Mac

### Required tools

**1. Homebrew** (Mac package manager)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**2. Node.js** (JavaScript runtime — required for everything)
```bash
brew install node
# Verify: node --version  (should show v20 or higher)
```

**3. Watchman** (file watcher, makes Metro faster)
```bash
brew install watchman
```

**4. Xcode** (Apple's IDE — required to build iOS apps)
- Download from the Mac App Store (it's free, ~15GB)
- After install, open it once and accept the license
- Install Command Line Tools: `xcode-select --install`

**5. bun** (fast package manager — recommended over npm)
```bash
curl -fsSL https://bun.sh/install | bash
# Then restart your terminal
bun --version  # verify it installed
```

**6. Expo CLI + EAS CLI** (command-line tools to run and build your project)
```bash
bun install -g expo-cli eas-cli
# Or with npm if you prefer:
# npm install -g expo-cli eas-cli
```

**7. Git** (version control)
```bash
brew install git
```

### Optional but useful

**VS Code** (code editor) — download from code.visualstudio.com
Extensions to install in VS Code:
- ESLint
- Prettier
- React Native Tools
- TypeScript and JavaScript Language Features (built-in)

**Android Studio** (only if you want to run an Android simulator on Mac)
- Download from developer.android.com/studio
- Heavy (~8GB), optional for now since you're building iOS first

---

## Starting a new Expo project

```bash
# Create the project
npx create-expo-app@latest amadoo --template blank-typescript

# Move into the project folder
cd amadoo

# Install dependencies (bun is 10-25x faster than npm)
bun install

# Fix any version mismatches (Expo's version resolver)
npx expo install --fix

# Start the development server
npx expo start
```

> **Note:** If you get peer dependency errors with npm, add a `.npmrc` file to your project root with `legacy-peer-deps=true`. This tells npm to skip strict peer dep checks. See `10-package-managers-and-deps.md` for details.

You'll see output like this:
```
› Metro waiting on exp://192.168.1.10:8081
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)
```

---

## Development: The three ways to run your app

### Method 1: Expo Go on your real iPhone (easiest, start here)

1. Download **Expo Go** from the App Store on your iPhone
2. Make sure your iPhone and Mac are on the **same Wi-Fi network**
3. Run `npx expo start` on your Mac
4. Open your iPhone camera app and scan the QR code in the terminal
5. Your app opens in Expo Go

Every time you save a file on your Mac, the app updates on your phone in ~1 second.

**Limitation:** Expo Go can only run apps that use Expo's built-in libraries. If you add a library with custom native code, you need Method 2.

---

### Method 2: iOS Simulator (no physical phone needed)

A simulator runs an iPhone on your Mac screen.

```bash
npx expo start
# Then press 'i' in the terminal to open iOS simulator
```

Requires Xcode to be installed. The simulator is useful when:
- You don't have your phone nearby
- You want to test multiple screen sizes

**Note:** The simulator has limitations — no camera, no biometrics, slower than a real device.

---

### Method 3: Expo Dev Client (for production-ready development)

When your app needs libraries outside of Expo's core (like a custom payment SDK or a specialized camera library), you build a custom dev client:

```bash
# Build a dev client for your device
eas build --profile development --platform ios

# Install it on your iPhone (you'll get a link to scan)
# Then start development with
npx expo start --dev-client
```

---

## Understanding environments: Development vs Staging vs Production

Most professional apps have three environments:

| Environment | Who uses it | Backend | App Store |
|-------------|-------------|---------|-----------|
| **Development** | You, on your Mac | Local / dev server | No |
| **Staging** | You + testers | Test server with fake data | TestFlight |
| **Production** | Real users | Live server + real DB | App Store |

You configure this in `eas.json`:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_API_URL": "http://localhost:3000",
        "EXPO_PUBLIC_ENV": "development"
      }
    },
    "preview": {
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_API_URL": "https://staging-api.amadoo.com",
        "EXPO_PUBLIC_ENV": "staging"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.amadoo.com",
        "EXPO_PUBLIC_ENV": "production"
      }
    }
  }
}
```

---

## EAS Build — building the real app file

**EAS (Expo Application Services)** is Expo's cloud build service. It takes your code and produces:
- `.ipa` for iOS (App Store)
- `.aab` for Android (Play Store)

You don't need Xcode on your Mac for this — EAS does it in the cloud.

### Setup EAS

```bash
# Login to your Expo account (create one at expo.dev if you don't have one)
eas login

# Configure your project for EAS
eas build:configure
```

### Build for iOS

```bash
# Preview build (for TestFlight testing)
eas build --platform ios --profile preview

# Production build (for App Store)
eas build --platform ios --profile production
```

EAS will:
1. Upload your code to Expo's servers
2. Build it on a Mac server
3. Sign it with your Apple certificates (EAS handles this)
4. Give you a download link

---

## Apple Developer Account — REQUIRED for iOS

To publish on the App Store, you **must** have an Apple Developer account.

- Cost: **$99/year** (USD)
- Sign up at: https://developer.apple.com/programs/enroll/
- You need: an Apple ID, a credit card, personal info

What it gives you:
- Ability to publish to the App Store
- TestFlight (beta testing with up to 10,000 testers)
- Signing certificates (EAS handles requesting these for you)
- App Store Connect access

**Sign up for this before anything else** — it can take 24-48 hours for Apple to verify your account.

---

## App Store submission process

### 1. Prepare your App Store listing
In **App Store Connect** (appstoreconnect.apple.com):
- App name: Amadoo
- Description (what your app does)
- Screenshots (required: 6.7" iPhone, 5.5" iPhone)
- App icon (1024x1024px)
- Keywords (for App Store search)
- Age rating
- Privacy policy URL (REQUIRED — you must host a privacy policy)
- Category: Social Networking

### 2. Build and upload
```bash
# Build production .ipa
eas build --platform ios --profile production

# Submit directly to App Store
eas submit --platform ios
```

Or upload manually via **Transporter** app (free on Mac App Store).

### 3. Apple review
- Apple reviews every app (1-3 business days usually)
- They test your app manually
- Common rejection reasons:
  - Missing privacy policy
  - App crashes
  - Misleading screenshots
  - Missing Apple Sign In (if you have other social logins)
  - Accessing features not declared in permissions

### 4. Go live
Once approved, you can release immediately or schedule a release date.

---

## TestFlight — beta testing before launch

Before publishing to the App Store, test with real people using **TestFlight**.

1. Build a preview version: `eas build --platform ios --profile preview`
2. Upload to App Store Connect
3. Add testers (up to 10,000) via email
4. They install TestFlight app + your app
5. You get crash reports and feedback

Always use TestFlight before shipping to the public. It finds bugs you'd never find in a simulator.

---

## Over-the-air (OTA) updates — push fixes without App Store review

For small code changes (bug fixes, text changes, color tweaks), Expo has **OTA updates**:

```bash
eas update --branch production --message "Fix login bug"
```

This pushes a JavaScript-only update to all users instantly. No App Store review needed.

**Important:** OTA updates only work for JavaScript changes. If you change native code (like adding a new Expo SDK library), you need a full App Store build.

---

## Checklist before submitting to App Store

- [ ] App icon (1024x1024, no transparency, no rounded corners — Apple adds them)
- [ ] Splash screen
- [ ] Privacy policy hosted at a public URL
- [ ] Sign In with Apple implemented (if any social login exists)
- [ ] Camera permission description in app.json
- [ ] Photo library permission description in app.json
- [ ] Location permission description in app.json
- [ ] No test data or placeholder content visible
- [ ] App doesn't crash on launch
- [ ] Tested on a real iPhone (not just simulator)
- [ ] Screenshots taken (use the iOS Simulator for perfect-size screenshots)
- [ ] Age rating set appropriately (dating app: likely 17+)
- [ ] Apple Developer account active ($99/year paid)

---

## Android (when you're ready)

After iOS is live, adding Android is straightforward:

```bash
# Build for Android
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android
```

Requirements:
- **Google Play Developer account:** One-time $25 fee
- Sign up at: https://play.google.com/console
- Review times: 1-7 days (usually faster than Apple)

---

## Resources

- EAS Build docs: https://docs.expo.dev/build/introduction/
- EAS Submit docs: https://docs.expo.dev/submit/introduction/
- App Store Connect: https://appstoreconnect.apple.com
- Apple Developer Program: https://developer.apple.com/programs/
- TestFlight: https://developer.apple.com/testflight/
- Expo OTA updates: https://docs.expo.dev/eas-update/introduction/
