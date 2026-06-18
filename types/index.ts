export type Gender = 'male' | 'female'

// What a user is on Amadoo for. A profile can have several at once; two people
// can match if any of their intents overlap. (Phase 1: three first-class intents.
// The former "friends" intent was folded into "activity".)
export type Intent = 'dating' | 'activity' | 'business'

export type User = {
  id: string
  name: string
  age: number
  gender: Gender
  bio?: string
  photos: string[]
  school?: string
  job?: string
  height?: number
  hobbies: string[]
  activities: string[]
  trips: string[]
  chillVibes: string[]
  hasPet: boolean
  intents: Intent[]
  industry?: string
  lookingFor?: string[]
  datingGoal?: string
  hangoutVibes?: string[]
  wantToMeet: Gender[]
  isVerified: boolean
  isOnboarded: boolean
  isIncognito?: boolean
  isPremium?: boolean
  location?: Coordinates
  distanceKm?: number
  createdAt: string
  lastActive?: string
  // Lifestyle (populated for detail views; usually empty on swipe cards)
  workout?: string
  drinking?: string
  smoking?: string
  religion?: string
  vibe?: string
}

export type Coordinates = {
  latitude: number
  longitude: number
}

export type Match = {
  id: string
  user: User
  createdAt: string
  lastMessage?: Message
  unreadCount: number
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

export type OnboardingData = {
  name?: string
  birthday?: Date
  gender?: Gender
  intents?: Intent[]
  school?: string
  job?: string
  industry?: string
  lookingFor?: string[]
  datingGoal?: string
  hangoutVibes?: string[]
  heightCm?: number
  workout?: string
  drinking?: string
  smoking?: string
  religion?: string
  vibe?: string
  hobbies?: string[]
  activities?: string[]
  trips?: string[]
  chillVibes?: string[]
  hasPet?: boolean
  wantToMeet?: Gender[]
  ageRangeMin?: number
  ageRangeMax?: number
  photos?: string[]
  faceVerified?: boolean
}
