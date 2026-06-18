import Constants from 'expo-constants'
import type { User, Gender, Intent } from '@/types'

function getBaseUrl(): string {
  // 1. Explicit env var wins — set EXPO_PUBLIC_API_URL in .env.local (local builds) and as
  //    a GitHub Actions secret (CI OTA). This is the single source of truth for the backend.
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL

  // 2. Production safety net if the env var is somehow missing — the hosted backend (Render).
  //    Update this to your real Render URL once the service is created.
  if (!__DEV__) return 'https://amadoo-api.onrender.com'

  // 3. Dev fallback: derive the Mac's LAN IP from the Expo dev-server host
  //    so the phone reaches the backend even when the Mac's IP changes.
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost
  const lanIp = hostUri?.split(':')[0]
  if (lanIp) return `http://${lanIp}:8000`

  return 'http://localhost:8000'
}

export const API_BASE_URL = getBaseUrl()

// ── Fetch helper with automatic token refresh ─────────────────────────────────

type FetchOptions = {
  method?: string
  body?: object
  token?: string | null
}

// Simple mutex — prevents multiple concurrent 401s from each triggering a refresh
let refreshPromise: Promise<string> | null = null

async function doRefresh(): Promise<string> {
  // Lazy import to avoid circular dependency at module load time
  const { useAuthStore } = await import('@/stores/auth.store')
  const { refreshToken, setTokens, logout } = useAuthStore.getState()

  if (!refreshToken) {
    logout()
    throw new Error('Session expired. Please sign in again.')
  }

  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })

  if (!res.ok) {
    logout()
    throw new Error('Session expired. Please sign in again.')
  }

  const tokens: TokenResponse = await res.json()
  setTokens(tokens.access_token, tokens.refresh_token)
  return tokens.access_token
}

async function apiFetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = opts
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  // 401 → refresh token once, then retry
  if (res.status === 401 && token) {
    if (!refreshPromise) refreshPromise = doRefresh().finally(() => { refreshPromise = null })
    const newToken = await refreshPromise

    const retryRes = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: { ...headers, Authorization: `Bearer ${newToken}` },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!retryRes.ok) {
      const err = await retryRes.json().catch(() => ({}))
      throw new Error(err.detail ?? `HTTP ${retryRes.status}`)
    }
    if (retryRes.status === 204) return undefined as T
    return retryRes.json() as Promise<T>
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? `HTTP ${res.status}`)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// ── API response types ────────────────────────────────────────────────────────

export type TokenResponse = {
  access_token: string
  refresh_token: string
  token_type: string
}

export type MeOut = {
  id: string
  email: string
  is_email_verified: boolean
  is_face_verified: boolean
  is_onboarded: boolean
  is_premium: boolean
}

export type ProfileOut = {
  id: string
  user_id: string
  name: string
  birthday: string
  gender: string
  bio?: string
  school?: string
  job?: string
  industry?: string
  looking_for: string[]
  dating_goal?: string
  hangout_vibes: string[]
  height_cm?: number
  workout?: string
  drinking?: string
  smoking?: string
  religion?: string
  vibe?: string
  is_incognito: boolean
  has_pet: boolean
  intents: string[]
  hobbies: string[]
  activities: string[]
  trips: string[]
  chill_vibes: string[]
  want_to_meet: string[]
  age_range_min: number
  age_range_max: number
}

export type UserCard = {
  id: string
  name: string
  age: number
  gender: string
  bio?: string
  photos: string[]
  school?: string
  job?: string
  height_cm?: number
  hobbies: string[]
  activities: string[]
  trips: string[]
  chill_vibes: string[]
  has_pet: boolean
  intents?: string[]
  is_face_verified: boolean
  distance_km?: number
  industry?: string | null
  looking_for?: string[]
  dating_goal?: string | null
  hangout_vibes?: string[]
  workout?: string | null
  drinking?: string | null
  smoking?: string | null
  religion?: string | null
  vibe?: string | null
}

export type NearbyUser = {
  id: string
  name: string
  age: number
  photo?: string | null
  distance_km: number
  latitude: number   // approximate (jittered) — never exact
  longitude: number
  intents?: string[]
  is_face_verified: boolean
}

export type SwipeResponse = {
  matched: boolean
  match_id?: string
}

export type ApiMessage = {
  id: string
  match_id: string
  sender_id: string
  content?: string
  type: string
  image_url?: string
  sent_at: string
  read_at?: string
}

export type ApiMatch = {
  id: string
  other_user: UserCard
  created_at: string
  is_active: boolean
  last_message?: ApiMessage
  unread_count: number
}

// ── Converters ────────────────────────────────────────────────────────────────

function calcAge(birthday: string): number {
  const bday = new Date(birthday)
  const today = new Date()
  let age = today.getFullYear() - bday.getFullYear()
  if (
    today.getMonth() < bday.getMonth() ||
    (today.getMonth() === bday.getMonth() && today.getDate() < bday.getDate())
  ) age--
  return age
}

export function resolvePhoto(url: string): string {
  if (!url) return url
  if (url.startsWith('/')) return `${API_BASE_URL}${url}`
  try {
    const u = new URL(url)
    // Only rewrite paths served by our backend (its BASE_URL is baked in at upload time
    // and may point to an old IP/ngrok URL). External URLs (Unsplash, etc.) pass through.
    if (u.pathname.startsWith('/uploads/')) {
      return `${API_BASE_URL}${u.pathname}`
    }
    return url
  } catch {
    return url
  }
}

export function cardToUser(card: UserCard): User {
  return {
    id: card.id,
    name: card.name,
    age: card.age,
    gender: card.gender as Gender,
    bio: card.bio,
    photos: card.photos.map(resolvePhoto),
    school: card.school,
    job: card.job,
    height: card.height_cm,
    hobbies: card.hobbies,
    activities: card.activities,
    trips: card.trips,
    chillVibes: card.chill_vibes,
    hasPet: card.has_pet,
    intents: (card.intents ?? []) as Intent[],
    industry: card.industry ?? undefined,
    lookingFor: card.looking_for ?? [],
    datingGoal: card.dating_goal ?? undefined,
    hangoutVibes: card.hangout_vibes ?? [],
    isVerified: card.is_face_verified,
    isOnboarded: true,
    distanceKm: card.distance_km,
    wantToMeet: [],
    createdAt: new Date().toISOString(),
    workout: card.workout ?? undefined,
    drinking: card.drinking ?? undefined,
    smoking: card.smoking ?? undefined,
    religion: card.religion ?? undefined,
    vibe: card.vibe ?? undefined,
  }
}

export function profileToUser(me: MeOut, profile: ProfileOut): User {
  return {
    id: me.id,
    name: profile.name,
    age: calcAge(profile.birthday),
    gender: profile.gender as Gender,
    bio: profile.bio,
    photos: [],
    school: profile.school,
    job: profile.job,
    height: profile.height_cm,
    hobbies: profile.hobbies,
    activities: profile.activities,
    trips: profile.trips,
    chillVibes: profile.chill_vibes,
    hasPet: profile.has_pet,
    intents: (profile.intents ?? []) as Intent[],
    industry: profile.industry ?? undefined,
    lookingFor: profile.looking_for ?? [],
    datingGoal: profile.dating_goal ?? undefined,
    hangoutVibes: profile.hangout_vibes ?? [],
    wantToMeet: profile.want_to_meet as Gender[],
    isVerified: me.is_face_verified,
    isOnboarded: me.is_onboarded,
    isIncognito: profile.is_incognito,
    createdAt: new Date().toISOString(),
    workout: profile.workout ?? undefined,
    drinking: profile.drinking ?? undefined,
    smoking: profile.smoking ?? undefined,
    religion: profile.religion ?? undefined,
    vibe: profile.vibe ?? undefined,
  }
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const api = {
  // Auth
  signIn: (email: string, password: string) =>
    apiFetch<TokenResponse>('/auth/signin', { method: 'POST', body: { email, password } }),

  signUp: (email: string, password: string) =>
    apiFetch<{ detail: string }>('/auth/signup', { method: 'POST', body: { email, password } }),

  verifyEmail: (email: string, code: string) =>
    apiFetch<TokenResponse>('/auth/verify-email', { method: 'POST', body: { email, code } }),

  forgotPassword: (email: string) =>
    apiFetch<{ detail: string }>('/auth/forgot-password', { method: 'POST', body: { email } }),

  resetPassword: (email: string, code: string, newPassword: string) =>
    apiFetch<{ detail: string }>('/auth/reset-password', {
      method: 'POST',
      body: { email, code, new_password: newPassword },
    }),

  getMe: (token: string) =>
    apiFetch<MeOut>('/auth/me', { token }),

  deleteAccount: (token: string) =>
    apiFetch<{ detail: string }>('/auth/me', { method: 'DELETE', token }),

  getMyProfile: (token: string) =>
    apiFetch<ProfileOut>('/profile/me', { token }),

  // Profile
  createProfile: (token: string, name: string, birthday: string, gender: string) =>
    apiFetch<ProfileOut>('/profile', { method: 'POST', body: { name, birthday, gender }, token }),

  updateProfile: (token: string, data: Record<string, unknown>) =>
    apiFetch<ProfileOut>('/profile/me', { method: 'PATCH', body: data, token }),

  // Swipes
  getDeck: (token: string, intent?: string | null) =>
    apiFetch<UserCard[]>(intent ? `/deck?intent=${encodeURIComponent(intent)}` : '/deck', { token }),

  postSwipe: (token: string, swipedId: string, action: 'like' | 'dislike' | 'super_like') =>
    apiFetch<SwipeResponse>('/swipes', { method: 'POST', body: { swiped_id: swipedId, action }, token }),

  getLikes: (token: string) =>
    apiFetch<UserCard[]>('/likes', { token }),

  getUser: (token: string, userId: string) =>
    apiFetch<UserCard>(`/users/${userId}`, { token }),

  // Location / map
  updateLocation: (token: string, latitude: number, longitude: number) =>
    apiFetch<{ detail: string }>('/profile/me/location', { method: 'PATCH', body: { latitude, longitude }, token }),

  getNearby: (token: string, radiusKm = 3) =>
    apiFetch<NearbyUser[]>(`/nearby?radius_km=${radiusKm}`, { token }),

  // Push notifications
  registerPushToken: (token: string, pushToken: string) =>
    apiFetch<{ detail: string }>('/auth/push-token', { method: 'PUT', body: { push_token: pushToken }, token }),

  // Photos
  getMyPhotos: (token: string) =>
    apiFetch<{ id: string; url: string; position: number; category: string | null }[]>('/profile/me/photos', { token }),

  uploadPhoto: async (token: string, uri: string, position: number, category?: string): Promise<void> => {
    const buildBody = () => {
      const formData = new FormData()
      formData.append('position', String(position))
      if (category) formData.append('category', category)
      formData.append('file', { uri, type: 'image/jpeg', name: `photo_${position}.jpg` } as any)
      return formData
    }
    const send = (authToken: string) =>
      fetch(`${API_BASE_URL}/profile/me/photos`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: buildBody(),
      })

    let res = await send(token)
    if (res.status === 401) {
      if (!refreshPromise) refreshPromise = doRefresh().finally(() => { refreshPromise = null })
      const newToken = await refreshPromise
      res = await send(newToken)
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail ?? `HTTP ${res.status}`)
    }
  },

  // Identity verification (the "verified members only" gate)
  submitFaceVerification: async (token: string, uri: string): Promise<{ is_face_verified: boolean; status: string }> => {
    const send = (authToken: string) => {
      const fd = new FormData()
      fd.append('file', { uri, type: 'image/jpeg', name: 'face.jpg' } as any)
      return fetch(`${API_BASE_URL}/verification/face`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: fd,
      })
    }
    let res = await send(token)
    if (res.status === 401) {
      if (!refreshPromise) refreshPromise = doRefresh().finally(() => { refreshPromise = null })
      const newToken = await refreshPromise
      res = await send(newToken)
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail ?? `HTTP ${res.status}`)
    }
    return res.json()
  },

  // Subscription (Premium entitlement). NOTE: real purchases must be validated via
  // RevenueCat/StoreKit before the backend grants — these hit the dev grant endpoint.
  activateSubscription: (token: string) =>
    apiFetch<{ is_premium: boolean }>('/subscription/activate', { method: 'POST', token }),
  cancelSubscription: (token: string) =>
    apiFetch<{ is_premium: boolean }>('/subscription/cancel', { method: 'POST', token }),

  // Matches & messages
  getMatches: (token: string) =>
    apiFetch<ApiMatch[]>('/matches', { token }),

  getMessages: (token: string, matchId: string, afterId?: string) => {
    const qs = afterId ? `?after_id=${afterId}` : ''
    return apiFetch<ApiMessage[]>(`/matches/${matchId}/messages${qs}`, { token })
  },

  sendMessage: (token: string, matchId: string, content: string) =>
    apiFetch<ApiMessage>(`/matches/${matchId}/messages`, {
      method: 'POST',
      body: { content, type: 'text' },
      token,
    }),

  // Safety
  reportUser: (token: string, reportedId: string, reason: string, details?: string) =>
    apiFetch<{ detail: string }>('/reports', {
      method: 'POST',
      body: { reported_id: reportedId, reason, details },
      token,
    }),

  blockUser: (token: string, blockedId: string) =>
    apiFetch<{ detail: string }>('/blocks', { method: 'POST', body: { blocked_id: blockedId }, token }),

  unblockUser: (token: string, blockedId: string) =>
    apiFetch<void>(`/blocks/${blockedId}`, { method: 'DELETE', token }),

  unmatch: (token: string, matchId: string) =>
    apiFetch<void>(`/matches/${matchId}`, { method: 'DELETE', token }),
}
