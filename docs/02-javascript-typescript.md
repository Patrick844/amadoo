# 02 — JavaScript & TypeScript: The Language of Your App

## Why JavaScript?

React Native apps are written in **JavaScript** (or its typed superset, **TypeScript**).
JavaScript is the most widely used programming language in the world. It runs:
- In every web browser
- On servers (Node.js)
- Inside your React Native app (via the Hermes engine on the device)

You write one language for your mobile app, your web dashboard, and your backend API if you want.

---

## TypeScript (what you'll actually use)

TypeScript is JavaScript with **types**. Every new Expo project defaults to TypeScript.

### What are types?

Types tell the code what kind of data a variable holds. This catches bugs *before* you run the app.

```typescript
// JavaScript — no types, bug-prone
function greet(user) {
  return "Hello " + user.nme  // typo: 'nme' instead of 'name' — no error until runtime
}

// TypeScript — types, bug caught at compile time
type User = {
  name: string
  age: number
  photos: string[]
}

function greet(user: User) {
  return "Hello " + user.nme  // ❌ Error immediately: Property 'nme' does not exist
}
```

**For Amadoo**, TypeScript will save you enormous time because your data structures (UserProfile, Match, Message) are complex. Types prevent passing the wrong data to the wrong function.

---

## The essentials you need to know

### Variables
```typescript
const name = "Patrick"        // const: never reassigned
let age = 25                  // let: can be reassigned
// Never use var — it's old and has scope bugs
```

### Functions
```typescript
// Regular function
function calculateAge(birthYear: number): number {
  return new Date().getFullYear() - birthYear
}

// Arrow function (more common in React Native)
const calculateAge = (birthYear: number): number => {
  return new Date().getFullYear() - birthYear
}

// Arrow function shorthand (single expression)
const calculateAge = (birthYear: number): number => new Date().getFullYear() - birthYear
```

### Objects
```typescript
type UserProfile = {
  id: string
  name: string
  age: number
  bio: string
  photos: string[]       // array of URLs
  location: {
    lat: number
    lng: number
  }
}

const profile: UserProfile = {
  id: "abc123",
  name: "Sarah",
  age: 24,
  bio: "Love hiking and coffee",
  photos: ["https://...", "https://..."],
  location: { lat: 33.88, lng: 35.49 }
}
```

### Arrays
```typescript
const photos = ["url1", "url2", "url3"]

// map — transform each item
const thumbnails = photos.map(url => url + "?w=200")

// filter — keep items that match condition
const verified = users.filter(user => user.isVerified === true)

// find — get first item that matches
const match = users.find(user => user.id === "abc123")
```

### Async/Await — how you make API calls
This is critical. Network requests take time. You can't freeze the app waiting for them.

```typescript
// This fetches user profiles from your backend
async function fetchNearbyUsers(userId: string): Promise<UserProfile[]> {
  try {
    const response = await fetch('https://api.amadoo.com/users/nearby')
    const data = await response.json()
    return data.users
  } catch (error) {
    console.error("Failed to fetch users:", error)
    return []
  }
}

// In a component, call it like this:
useEffect(() => {
  async function load() {
    const users = await fetchNearbyUsers(currentUserId)
    setNearbyUsers(users)
  }
  load()
}, [])
```

### Destructuring (you'll see this everywhere)
```typescript
// Object destructuring
const { name, age, photos } = userProfile
// Same as:
const name = userProfile.name
const age = userProfile.age

// Array destructuring
const [firstPhoto, secondPhoto] = photos

// Function parameters
function UserCard({ name, age, photo }: UserProfile) {
  // instead of props.name, props.age, etc.
}
```

### Optional chaining `?.` and nullish coalescing `??`
```typescript
// Without optional chaining — crashes if user is null
const age = user.profile.age  // ❌ crash if user or profile is null

// With optional chaining — safe
const age = user?.profile?.age  // returns undefined if anything is null

// Nullish coalescing — default value if null/undefined
const displayAge = user?.age ?? "Age unknown"
```

### Imports and Exports (how files share code)
```typescript
// In components/UserCard.tsx — export your component
export function UserCard({ name }: { name: string }) {
  return <Text>{name}</Text>
}

// Or default export
export default function UserCard({ name }: { name: string }) {
  return <Text>{name}</Text>
}

// In another file — import it
import { UserCard } from './components/UserCard'
import UserCard from './components/UserCard'    // for default exports
```

---

## TypeScript types you'll define for Amadoo

```typescript
// types/index.ts — put all your types here

export type Gender = 'male' | 'female' | 'non-binary' | 'other'

export type User = {
  id: string
  name: string
  age: number
  gender: Gender
  bio?: string                    // ? means optional
  photos: string[]
  school?: string
  job?: string
  hobbies: string[]
  interestedIn: Gender[]
  location: Coordinates
  isVerified: boolean
  createdAt: string
}

export type Coordinates = {
  latitude: number
  longitude: number
}

export type Match = {
  id: string
  users: [string, string]        // tuple: exactly 2 user IDs
  createdAt: string
  lastMessage?: Message
}

export type Message = {
  id: string
  matchId: string
  senderId: string
  content: string
  sentAt: string
  readAt?: string
}

export type SwipeAction = 'like' | 'dislike' | 'super_like'
```

---

## Common React Native + TypeScript patterns

### Component with typed props
```typescript
type Props = {
  user: User
  onLike: () => void
  onDislike: () => void
}

export function SwipeCard({ user, onLike, onDislike }: Props) {
  return (
    <View>
      <Image source={{ uri: user.photos[0] }} />
      <Text>{user.name}, {user.age}</Text>
    </View>
  )
}
```

### useState with types
```typescript
const [currentUser, setCurrentUser] = useState<User | null>(null)
const [matches, setMatches] = useState<Match[]>([])
const [isLoading, setIsLoading] = useState<boolean>(false)
```

---

## Resources

- TypeScript Handbook: https://www.typescriptlang.org/docs/handbook/intro.html
- JavaScript for beginners (MDN): https://developer.mozilla.org/en-US/docs/Learn/JavaScript/First_steps
- TypeScript playground (try it in browser): https://www.typescriptlang.org/play
