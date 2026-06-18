# 05 — State & Data: How Information Flows Through the App

## What is "state"?

**State** is any information that can change and that your UI needs to react to.

Examples in Amadoo:
- "Is the user logged in?" → affects which screens are shown
- "What's the current deck of profiles to swipe?" → affects the main screen
- "Did I get a new match?" → triggers a popup
- "Is this button loading?" → shows a spinner

When state changes → React automatically updates the UI. You never manually update the DOM like in vanilla JavaScript. You just change the data, and the screen updates.

---

## Three levels of state

### 1. Local state — inside one component
Used for: is a dropdown open, what's typed in an input field, is this photo selected

```typescript
import { useState } from 'react'

function NameScreen() {
  const [name, setName] = useState('')    // starts empty

  return (
    <TextInput
      value={name}
      onChangeText={setName}             // updates state as user types
      placeholder="Your first name"
    />
  )
}
```

### 2. Context — shared between a subtree of components
Used for: theme (dark/light mode), current user's language preference

React Context lets you pass data down a component tree without passing it as props through every level. Good for things that rarely change.

### 3. Global state (Zustand) — shared across the whole app
Used for: auth session, the profile deck, matches list, chat messages

This is the most important one for Amadoo. You'll use **Zustand** — the most popular lightweight state management library for React Native.

---

## Zustand — global state management

### Why Zustand?
- Simple: ~10 lines to set up a store
- No boilerplate (Redux required 5 files for one piece of state)
- Works perfectly with TypeScript
- Fast

### Creating a store

```typescript
// stores/auth.store.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

type User = {
  id: string
  name: string
  email: string
  isOnboarded: boolean
}

type AuthStore = {
  user: User | null
  token: string | null
  isLoading: boolean
  setUser: (user: User) => void
  setToken: (token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: true,

      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      logout: () => set({ user: null, token: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),  // persists across app restarts
    }
  )
)
```

### Using a store in a screen

```typescript
function ProfileScreen() {
  // Read state
  const user = useAuthStore(state => state.user)
  const logout = useAuthStore(state => state.logout)

  return (
    <View>
      <Text>Hello, {user?.name}</Text>
      <Button title="Logout" onPress={logout} />
    </View>
  )
}
```

### The swipe store (for the main screen)

```typescript
// stores/swipe.store.ts
type SwipeStore = {
  deck: User[]               // profiles to swipe through
  currentIndex: number
  isLoading: boolean
  fetchDeck: () => Promise<void>
  swipeRight: (userId: string) => void    // like
  swipeLeft: (userId: string) => void     // dislike
  superLike: (userId: string) => void
}

export const useSwipeStore = create<SwipeStore>()((set, get) => ({
  deck: [],
  currentIndex: 0,
  isLoading: false,

  fetchDeck: async () => {
    set({ isLoading: true })
    const profiles = await usersService.getNearbyProfiles()
    set({ deck: profiles, currentIndex: 0, isLoading: false })
  },

  swipeRight: async (userId) => {
    const result = await matchesService.like(userId)
    if (result.isMatch) {
      // trigger match popup
    }
    set(state => ({ currentIndex: state.currentIndex + 1 }))
  },

  swipeLeft: (userId) => {
    matchesService.dislike(userId)
    set(state => ({ currentIndex: state.currentIndex + 1 }))
  },
}))
```

---

## Making API calls — talking to your backend

Your backend is a separate server running 24/7. Your app talks to it via HTTP requests.

### The base API setup

```typescript
// services/api.ts
import { useAuthStore } from '@/stores/auth.store'

const BASE_URL = 'https://api.amadoo.com'  // your backend URL

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = useAuthStore.getState().token

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      ...options.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Request failed')
  }

  return response.json()
}
```

### Auth service

```typescript
// services/auth.service.ts
import { apiRequest } from './api'

export const authService = {
  async signUp(email: string, password: string) {
    return apiRequest<{ user: User; token: string }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },

  async signIn(email: string, password: string) {
    return apiRequest<{ user: User; token: string }>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },

  async forgotPassword(email: string) {
    return apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  },
}
```

### Using a service in a screen

```typescript
function SignInScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setUser = useAuthStore(state => state.setUser)
  const setToken = useAuthStore(state => state.setToken)

  async function handleSignIn() {
    setIsLoading(true)
    setError(null)
    try {
      const { user, token } = await authService.signIn(email, password)
      setUser(user)
      setToken(token)
      // navigation happens automatically via the root layout auth check
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <View>
      <TextInput value={email} onChangeText={setEmail} placeholder="Email" />
      <TextInput value={password} onChangeText={setPassword} secureTextEntry />
      {error && <Text style={{ color: 'red' }}>{error}</Text>}
      <Button title={isLoading ? "Loading..." : "Sign In"} onPress={handleSignIn} />
    </View>
  )
}
```

---

## Data persistence — keeping data after the app closes

By default, state lives in memory. When the user closes the app, it's gone.
For data that must survive app restarts (auth token, user profile), you need persistence.

| Library | Use for |
|---------|---------|
| **AsyncStorage** | Simple key-value storage (like localStorage on web). For settings, cached data. |
| **expo-secure-store** | Encrypted storage. For sensitive data like **auth tokens**. |
| **Zustand persist** | Makes your Zustand stores persist to AsyncStorage automatically. |

```typescript
// Saving the auth token securely (on login)
import * as SecureStore from 'expo-secure-store'

await SecureStore.setItemAsync('auth_token', token)

// Reading it back (on app startup)
const token = await SecureStore.getItemAsync('auth_token')
```

---

## Real-time data — for chat and match notifications

Some data shouldn't wait for the user to pull it — it should be **pushed** to the app instantly.
Examples: new match, new message, someone liked you.

For this you'll use **WebSockets** or **Supabase Realtime**.

```typescript
// Listening for new messages via Supabase Realtime
import { supabase } from '@/lib/supabase'

useEffect(() => {
  const subscription = supabase
    .channel(`match:${matchId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `match_id=eq.${matchId}`,
    }, (payload) => {
      // New message arrived — add to state
      setMessages(prev => [...prev, payload.new as Message])
    })
    .subscribe()

  return () => {
    supabase.removeChannel(subscription)  // cleanup when screen unmounts
  }
}, [matchId])
```

---

## Summary: data flow in Amadoo

```
User taps "Like" button
        │
        ▼
SwipeCard component calls onLike()
        │
        ▼
useSwipeStore.swipeRight(userId) — Zustand action
        │
        ├─── calls matchesService.like(userId) ─────► Your backend API
        │                                                    │
        │                                              Stores in DB
        │                                              Checks if mutual
        │                                              Returns { isMatch: true }
        ▼
    if isMatch:
        ├─── show match popup (local state)
        └─── add to matches list (Zustand store)
```

---

## Resources

- Zustand docs: https://docs.pmnd.rs/zustand/getting-started/introduction
- TanStack Query (async state management): https://tanstack.com/query/latest
- AsyncStorage: https://react-native-async-storage.github.io/async-storage/
- Supabase Realtime: https://supabase.com/docs/guides/realtime
