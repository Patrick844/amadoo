import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { User, OnboardingData } from '@/types'

const DUMMY_USER: User = {
  id: 'user-1',
  name: 'Patrick',
  age: 26,
  gender: 'male',
  photos: [],
  hobbies: [],
  activities: [],
  trips: [],
  chillVibes: [],
  hasPet: false,
  intents: ['dating'],
  wantToMeet: ['female'],
  isVerified: false,
  isOnboarded: true,
  createdAt: new Date().toISOString(),
}

type AuthStore = {
  user: User | null
  token: string | null
  refreshToken: string | null
  onboardingData: OnboardingData
  isLoading: boolean
  isAuthenticated: boolean
  isPremium: boolean
  setUser: (user: User) => void
  setToken: (token: string) => void
  setTokens: (access: string, refresh: string) => void
  setPremium: (value: boolean) => void
  updateOnboarding: (data: Partial<OnboardingData>) => void
  updateUser: (data: Partial<User>) => void
  login: () => void
  register: () => void
  completeOnboarding: () => void
  logout: () => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      onboardingData: {},
      isLoading: true,
      isAuthenticated: false,
      isPremium: false,

      setUser: (user) => set({ user, isAuthenticated: true }),
      setToken: (token) => set({ token }),
      setTokens: (access, refresh) => set({ token: access, refreshToken: refresh, isAuthenticated: true }),
      setPremium: (isPremium) => set({ isPremium }),
      updateOnboarding: (data) =>
        set((state) => ({ onboardingData: { ...state.onboardingData, ...data } })),
      updateUser: (data) =>
        set((state) => ({ user: state.user ? { ...state.user, ...data } : null })),

      login: () =>
        set({ user: DUMMY_USER, isAuthenticated: true, token: 'dummy-token' }),

      register: () =>
        set({
          user: { ...DUMMY_USER, isOnboarded: false },
          isAuthenticated: true,
          token: 'dummy-token',
        }),

      completeOnboarding: () =>
        set((s) => ({
          user: s.user ? { ...s.user, isOnboarded: true } : null,
          onboardingData: {},
        })),

      logout: () =>
        set({ user: null, token: null, isAuthenticated: false, onboardingData: {}, isPremium: false }),

      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'amadoo-auth',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setLoading(false)
      },
    }
  )
)
