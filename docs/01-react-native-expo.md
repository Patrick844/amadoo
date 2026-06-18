# 01 — React Native & Expo: What They Are and How They Work

## React Native

React Native is a framework made by Meta (Facebook) that lets you write mobile apps using **JavaScript** and the **React** library (the same React used for websites).

The key insight: React Native doesn't run JavaScript inside a browser. It compiles your components into **real native views**:

```
Your JavaScript code:   <View style={{ backgroundColor: 'red' }} />
↓
On iOS:                 UIView (Swift/Objective-C)
On Android:             android.view.View (Kotlin/Java)
```

This means your app looks and feels native — it uses the real iOS scroll physics, real native buttons, real platform fonts. It's not a web page wrapped in an app shell (that would be Capacitor/Ionic, a different and inferior approach).

### The React Mental Model (important)

React Native uses the same thinking as React for the web. If you've never used React:

**UI = function(state)**

Your screen is a **function** that takes data (state) and returns what to display. When data changes, React re-renders automatically.

```jsx
function ProfileCard({ name, age }) {
  return (
    <View>
      <Text>{name}, {age}</Text>
    </View>
  )
}
```

`View` = a box (like `<div>` on web)  
`Text` = text (like `<p>` or `<span>` on web)  
`Image` = image  
`ScrollView` = scrollable container  
`TouchableOpacity` = a pressable element

---

## Expo

Expo is a layer **on top of React Native** that makes it dramatically easier to work with. Think of it as React Native with batteries included.

### What Expo gives you

| Feature | Without Expo | With Expo |
|---------|-------------|-----------|
| Camera access | Write complex native code | `expo-camera` — 3 lines |
| Push notifications | Configure APNs + FCM manually | `expo-notifications` — configured for you |
| Build .ipa file | Requires Mac + Xcode + certificates | `eas build` — runs in the cloud |
| Submit to App Store | Manual process | `eas submit` — one command |
| Test on phone | Need to set up signing certificates | Scan QR code with Expo Go |
| Icons + splash screen | Complex asset pipeline | Single config file |

### Expo Go vs Expo Dev Client vs EAS Build

This is where most people get confused. There are three ways to run your Expo app:

#### 1. Expo Go (development, no native code)
- Download the **Expo Go** app from the App Store onto your iPhone
- Run `npx expo start` on your Mac
- Scan the QR code → your app runs inside Expo Go
- **Limitation:** Only works if your app doesn't use any "custom native code" (code outside of Expo's built-in libraries)
- **Good for:** Learning, prototyping, early development

#### 2. Expo Dev Client (development, with custom native code)
- A custom version of Expo Go **built specifically for your app**
- Required if you add libraries that have native (Swift/Kotlin) code not in Expo's core
- You build it once with `eas build --profile development`, install on your phone, then develop normally
- **Good for:** Production-grade development once you add custom libraries

#### 3. EAS Build — Production Build
- Builds the real `.ipa` (iOS) or `.aab` (Android) file
- Runs on Expo's cloud servers (you don't need Xcode for this)
- This is what you submit to the App Store
- **Good for:** Shipping to users

### Expo SDK

Expo ships a set of libraries called the **Expo SDK**. Every 3 months they release a new SDK version (currently **SDK 54**, which is what Amadoo uses). These cover:

- `expo-camera` — Camera access
- `expo-image-picker` — Photo library access
- `expo-location` — GPS location
- `expo-notifications` — Push notifications
- `expo-auth-session` — OAuth (Sign in with Apple, Google)
- `expo-file-system` — File access
- `expo-secure-store` — Encrypted key-value storage (for auth tokens)
- `expo-av` — Audio/video playback
- `expo-haptics` — Vibration / haptic feedback
- `expo-linear-gradient` — Gradient backgrounds

---

## Managed Workflow vs Bare Workflow

You'll see these terms in Expo docs.

### Managed Workflow
- Expo manages everything for you
- No `ios/` or `android/` folders in your project
- You configure everything through `app.json`
- Expo builds the native parts for you
- **Best for Amadoo** — start here

### Bare Workflow
- You have the full `ios/` and `android/` native project folders
- You can write native Swift/Kotlin code directly
- More control, more complexity
- Needed only if you require something Expo's SDK doesn't support

**Recommendation:** Start with Managed Workflow. You can "eject" to Bare later if needed.

---

## React Native vs Flutter: The Real Comparison

Since you'll hear about Flutter:

| | React Native + Expo | Flutter |
|-|---------------------|---------|
| Language | JavaScript / TypeScript | Dart |
| Made by | Meta / Expo | Google |
| Rendering | Uses real native components | Draws everything itself (like a game engine) |
| Performance | Very good | Excellent |
| Ecosystem | Massive (npm) | Large but smaller |
| Job market | Much larger | Growing |
| Learning curve | Easier if you know JS | Need to learn Dart |
| Dating apps built with it | Bumble (uses RN) | Multiple apps |

**Conclusion:** React Native + Expo is the right choice for Amadoo given the ecosystem, hiring market, and your starting point.

---

## The Architecture of an Expo App

```
Your Expo App
│
├── JavaScript/TypeScript layer        ← Where you write your code
│   ├── UI components (screens)
│   ├── Navigation logic
│   ├── Business logic
│   └── API calls
│
├── JavaScript Engine (Hermes)         ← Runs your JS code on the device
│   └── Automatically handles by Expo
│
└── Native layer                       ← Expo SDK handles this
    ├── iOS UIKit / SwiftUI
    └── Android Views
```

You only ever touch the top layer. Expo handles the bridge to native.

---

## Key React Native concepts you'll use daily

### Components
Everything is a component — a reusable piece of UI.

```jsx
// A custom card component for Amadoo
function UserCard({ name, age, photo }) {
  return (
    <View style={styles.card}>
      <Image source={{ uri: photo }} style={styles.photo} />
      <Text style={styles.name}>{name}, {age}</Text>
    </View>
  )
}
```

### StyleSheet
Styling in React Native uses JavaScript objects (no CSS files).

```js
const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOpacity: 0.1,
  },
  photo: {
    width: '100%',
    height: 400,
  }
})
```

### useState — local component state
```jsx
const [liked, setLiked] = useState(false)
// When liked changes, the component re-renders
```

### useEffect — side effects (API calls, subscriptions)
```jsx
useEffect(() => {
  // Runs once when the component mounts
  fetchUserProfile()
}, [])
```

### Flexbox
React Native uses Flexbox for layout (same as CSS flexbox, with `flexDirection: 'column'` as the default instead of `row`).

---

## Useful links

- Expo docs: https://docs.expo.dev
- React Native docs: https://reactnative.dev/docs/getting-started
- Expo SDK list: https://docs.expo.dev/versions/latest/
- React Native Paper (UI component library): https://reactnativepaper.com
- NativeWind (Tailwind for React Native): https://www.nativewind.dev
