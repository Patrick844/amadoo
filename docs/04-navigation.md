# 04 — Navigation: Moving Between Screens

## What is navigation?

When you tap "Sign In" on the login screen and a new screen slides in — that's navigation.
When you tap the bottom tab bar to switch between Discover / Likes / Chats — that's also navigation.

In a browser, navigation is just clicking links that change the URL.
In a mobile app, it works differently: screens are organized in a **stack** (like a pile of cards) and you can push new screens on top or pop them off.

---

## Expo Router — the modern standard

Expo Router is what you'll use. It's built on top of **React Navigation** (the most popular navigation library) but with one big improvement: **file-based routing**.

### How it works

You put your screen files in the `app/` folder.
The file path = the route. That's it.

```
app/index.tsx           → The first screen (/)
app/profile.tsx         → The profile screen (/profile)
app/(auth)/login.tsx    → The login screen (/login)
```

To navigate between screens:
```typescript
import { router } from 'expo-router'

// Go to a screen
router.push('/profile')

// Go back
router.back()

// Replace current screen (can't go back)
router.replace('/(app)')
```

---

## The three navigation patterns in mobile apps

### 1. Stack Navigator — screens that slide in/out
Used for: auth flow, onboarding, opening a profile, going into a chat

```
Login screen → tap "Sign up" → Sign up screen slides in from right
              ← tap back    → Login screen slides back in
```

In Expo Router, a stack is the default inside any folder that has a `_layout.tsx` with `<Stack />`.

```typescript
// app/(auth)/_layout.tsx
import { Stack } from 'expo-router'

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
```

Any file inside `app/(auth)/` becomes a screen in this stack.

---

### 2. Tab Navigator — bottom tab bar
Used for: main app sections (Discover, Likes, Chats, Profile)

This is the bottom bar you see in Amadoo's main page design.

```typescript
// app/(app)/_layout.tsx
import { Tabs } from 'expo-router'
import { Image } from 'react-native'

export default function AppLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Discover',
          tabBarIcon: ({ focused }) => (
            <Image source={require('@/assets/icons/Main-page-icon.png')} />
          ),
        }}
      />
      <Tabs.Screen name="likes" options={{ title: 'Likes' }} />
      <Tabs.Screen name="matches" options={{ title: 'Chats' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  )
}
```

---

### 3. Modal — screen that slides up from the bottom
Used for: settings, filters, photo viewer, match popup ("It's a Match!")

```typescript
// Navigate to a modal
router.push('/match-popup')

// In _layout.tsx, mark it as a modal
<Stack.Screen name="match-popup" options={{ presentation: 'modal' }} />
```

---

## Auth flow: redirect based on login state

This is one of the most important patterns. When the app starts:
- If the user is **not logged in** → show the auth screens
- If logged in but **not onboarded** → show the onboarding screens
- If logged in and onboarded → show the main app

```typescript
// app/_layout.tsx — root layout
import { useEffect } from 'react'
import { router, Slot } from 'expo-router'
import { useAuthStore } from '@/stores/auth.store'

export default function RootLayout() {
  const { user, isOnboarded, isLoading } = useAuthStore()

  useEffect(() => {
    if (isLoading) return  // wait until we know the auth state

    if (!user) {
      router.replace('/(auth)')        // not logged in → auth screens
    } else if (!isOnboarded) {
      router.replace('/(onboarding)')  // logged in, not done onboarding
    } else {
      router.replace('/(app)')         // full access
    }
  }, [user, isOnboarded, isLoading])

  return <Slot />  // renders the current screen
}
```

---

## Dynamic routes — for individual chats

When you have something like a chat screen for each match, you use a **dynamic route**:

```
app/(app)/chat/[matchId].tsx
```

The `[matchId]` is a placeholder. When you navigate to `/chat/abc123`, the screen gets `matchId = "abc123"`.

```typescript
// Navigate to a specific chat
router.push(`/chat/${match.id}`)

// In the chat screen, read the matchId
import { useLocalSearchParams } from 'expo-router'

export default function ChatScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>()
  // now fetch messages for this matchId
}
```

---

## Passing data between screens

### Option 1: URL params (for IDs and simple values)
```typescript
// Navigate with a parameter
router.push(`/profile/${userId}`)

// In the screen, read it
const { userId } = useLocalSearchParams()
```

### Option 2: Global store (for complex data)
If you need to pass a full user object, put it in your global state (Zustand store) before navigating, and read it in the next screen.

```typescript
// Before navigating
useSwipeStore.getState().setSelectedUser(user)
router.push('/profile-detail')

// In the screen
const selectedUser = useSwipeStore(state => state.selectedUser)
```

---

## Amadoo's full navigation map

```
App starts
    │
    ▼
Root layout checks auth state
    │
    ├── Not logged in ──────────────────────────────────────────────────────┐
    │                                                                        │
    │   (auth) Stack                                                         │
    │   ├── index.tsx           ← main-login-sign-in.png                    │
    │   ├── sign-up.tsx         ← Sign-in-with-email-page.png               │
    │   ├── sign-in.tsx         ← login-by-email.png                        │
    │   ├── forgot-password.tsx ← Forgot-password-page.png                  │
    │   ├── new-password.tsx    ← enter-new-password-page.png               │
    │   └── verify-email.tsx    ← email-verificaiton.png                    │
    │                                                                        │
    ├── Logged in, not onboarded ────────────────────────────────────────┐  │
    │                                                                     │  │
    │   (onboarding) Stack                                                │  │
    │   ├── name.tsx            ← Name.png                                │  │
    │   ├── birthday.tsx        ← birthday.png                            │  │
    │   ├── gender.tsx          ← Gender.png                              │  │
    │   ├── school.tsx          ← school.png                              │  │
    │   ├── job.tsx             ← job.png                                 │  │
    │   ├── hobbies.tsx         ← hobbies.png                             │  │
    │   ├── activities.tsx      ← actifities.png                          │  │
    │   ├── trips.tsx           ← trips.png                               │  │
    │   ├── chill.tsx           ← chill.png                               │  │
    │   ├── pet.tsx             ← pet.png                                 │  │
    │   ├── i-want-to-meet.tsx  ← I-want-to-meet.png                     │  │
    │   ├── face-check.tsx      ← Face-check.png                          │  │
    │   └── upload-photos.tsx   ← Upload-your-images.png                  │  │
    │                                                                     │  │
    └── Logged in + onboarded ───────────────────────────────────────┐   │  │
                                                                      │   │  │
        (app) Tabs                                                    │   │  │
        ├── index.tsx           ← Main-page.png (swipe cards)        │   │  │
        ├── likes.tsx           ← Likes you screen                   │   │  │
        ├── matches.tsx         ← Chats list                         │   │  │
        ├── profile.tsx         ← My profile                         │   │  │
        └── chat/[matchId].tsx  ← Individual chat                    │   │  │
```

---

## Resources

- Expo Router docs: https://docs.expo.dev/router/introduction/
- React Navigation (underlying library): https://reactnavigation.org/docs/getting-started
