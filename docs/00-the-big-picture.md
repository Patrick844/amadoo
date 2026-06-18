# 00 — The Big Picture: How Mobile App Development Works

## What you're actually building

A mobile app is a program that runs **on the user's device** (iPhone or Android phone), not in a browser.
When you open Instagram, Tinder, or Uber — those are native apps. They live on the device, they get installed from the App Store / Play Store, and they have access to the camera, GPS, notifications, etc.

Your app (Amadoo) will:
- Live on users' phones
- Communicate with a **backend server** you run (for storing profiles, matching logic, chat messages)
- Use device features like the camera (for face check + photo upload)

---

## The two worlds: Native vs Cross-Platform

### Option A — Fully Native (Swift / Kotlin)
You write **two completely separate apps**:
- iOS app in **Swift** (Apple's language)
- Android app in **Kotlin** (Google's language)

**Pros:** Maximum performance, full access to every platform feature.  
**Cons:** Double the code, double the work, need to learn two languages. This is what teams at big companies do with dedicated iOS and Android engineers.

### Option B — Cross-Platform (React Native / Flutter)
You write **one codebase** that runs on both iOS and Android.

| Tool | Language | Made by |
|------|----------|---------|
| **React Native** | JavaScript / TypeScript | Meta (Facebook) |
| **Flutter** | Dart | Google |
| **Expo** | JavaScript / TypeScript (built on React Native) | Expo team |

**Recommendation for Amadoo: Expo (which uses React Native under the hood).**  
Reasons:
- One codebase → iOS + Android
- JavaScript/TypeScript — the most widely known language
- Massive ecosystem and community
- Expo makes the hard parts (build, deploy, device testing) dramatically simpler
- Used in production by real companies (Coinbase, Shopify tools, many startups)

---

## The three layers of your app

Every app like Amadoo has three layers. Understanding this prevents a lot of confusion.

```
┌─────────────────────────────────────┐
│  MOBILE APP (React Native / Expo)   │  ← What users see and interact with
│  Runs on the user's iPhone/Android  │
└────────────────┬────────────────────┘
                 │ HTTP requests (API calls)
┌────────────────▼────────────────────┐
│  BACKEND / API SERVER               │  ← Your business logic
│  Runs on a cloud server (24/7)      │     (matching, auth, chat)
└────────────────┬────────────────────┘
                 │
┌────────────────▼────────────────────┐
│  DATABASE + STORAGE                 │  ← Where all data lives
│  User profiles, photos, messages    │
└─────────────────────────────────────┘
```

The mobile app never talks directly to the database. It always goes through your API server.

---

## Development vs Production — the two environments

This is a critical concept that trips up beginners.

### Development
- Running the app **on your own Mac or a simulator**
- The app connects to a test server or local server
- You can see errors, reload instantly, experiment freely
- No App Store involved

### Production
- The app is **compiled into a real binary file** (.ipa for iOS, .aab for Android)
- That binary is uploaded to the App Store / Play Store
- Real users download and install it
- Bugs are serious — you can't push fixes instantly (App Store review takes 1-3 days)

You always develop first, test thoroughly, then ship to production.

---

## The tools you'll hear about (demystified)

| Term | What it is |
|------|-----------|
| **React Native** | The framework that lets you write iOS/Android apps in JavaScript |
| **Expo** | A toolchain and set of libraries built on top of React Native. Makes everything easier. |
| **Expo Go** | A phone app you install on your real iPhone to preview your app instantly during development |
| **EAS (Expo Application Services)** | Expo's cloud service that builds your app into a real .ipa / .aab file |
| **Metro** | The JavaScript bundler that compiles your code. Runs automatically, you rarely touch it. |
| **Xcode** | Apple's IDE (required on Mac to build for iOS). You won't write code in it but it must be installed. |
| **Android Studio** | Google's IDE (required to run an Android simulator on Mac). |
| **bun** | The package manager used in Amadoo — how you install libraries (`bun install`). 10-25x faster than npm. |
| **TypeScript** | JavaScript with types. Catches bugs before you run the code. You'll use this. |
| **Node.js** | The runtime that lets JavaScript run on your Mac (outside of a browser). Required for React Native. |

---

## What happens when you "run" your app in development

1. You type `npx expo start` in your terminal (after running `bun install` once)
2. Metro starts — it watches your code files for changes
3. A QR code appears
4. You scan it with **Expo Go** on your real iPhone → your app loads instantly
5. Every time you save a file, the app updates on your phone in ~1 second (this is called **Fast Refresh**)

No App Store. No compilation. Instant feedback. This is the magic of Expo for development.

---

## The path from zero to App Store (high level)

```
1. Install tools          (Node, Expo CLI, Xcode)
2. Create Expo project    (npx create-expo-app)
3. Build screens          (code your UI in React Native)
4. Add navigation         (move between screens)
5. Connect to backend     (API calls for real data)
6. Test on real device    (Expo Go or TestFlight)
7. Build for production   (EAS Build → creates .ipa file)
8. Submit to App Store    (EAS Submit or manual upload)
9. Apple reviews          (1–3 days)
10. App goes live!
```

---

## For Amadoo specifically

Given your designs, you need:

- **Frontend:** Expo (React Native) — iOS first, then Android
- **Backend:** Node.js + Express **or** a Backend-as-a-Service like Supabase
- **Database:** PostgreSQL (for profiles, matches) + Redis (for real-time features)
- **Real-time chat:** Supabase Realtime **or** Socket.io
- **Media storage:** AWS S3 or Supabase Storage (for profile photos)
- **Auth:** Email/password + possibly Apple Sign In (required by Apple if you offer social login)
- **Push notifications:** Expo Notifications (wraps Apple APNs + Google FCM)

→ See `06-backend-architecture.md` for a full breakdown.

---

## Next steps

Read the files in this order:
1. `01-react-native-expo.md` — React Native and Expo in depth
2. `02-javascript-typescript.md` — The language
3. `03-project-structure.md` — How files are organized
4. `04-navigation.md` — How screens connect
5. `05-state-and-data.md` — How data flows through the app
6. `06-backend-architecture.md` — The server side
7. `07-dev-to-production.md` — Simulators, TestFlight, App Store
8. `08-amadoo-plan.md` — Your specific roadmap
