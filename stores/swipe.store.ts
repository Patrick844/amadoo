import { create } from 'zustand'
import type { User, Match } from '@/types'

export type PendingMatch = { user: User; matchId: string }

type SwipeStore = {
  deck: User[]
  currentIndex: number
  matches: Match[]
  pendingMatch: PendingMatch | null
  isLoading: boolean
  deckIntent: string | null   // which need the deck is filtered to ("all" = null)
  setDeck: (deck: User[]) => void
  setMatches: (matches: Match[]) => void
  setPendingMatch: (m: PendingMatch | null) => void
  setDeckIntent: (intent: string | null) => void
  advanceDeck: () => void
  rewindDeck: () => void
  setLoading: (loading: boolean) => void
}

export const useSwipeStore = create<SwipeStore>()((set) => ({
  deck: [],
  currentIndex: 0,
  matches: [],
  pendingMatch: null,
  isLoading: false,
  deckIntent: null,

  setDeck: (deck) => set({ deck, currentIndex: 0 }),
  setMatches: (matches) => set({ matches }),
  setPendingMatch: (pendingMatch) => set({ pendingMatch }),
  setDeckIntent: (deckIntent) => set({ deckIntent }),
  advanceDeck: () => set((state) => ({ currentIndex: state.currentIndex + 1 })),
  rewindDeck: () => set((state) => ({ currentIndex: Math.max(0, state.currentIndex - 1) })),
  setLoading: (isLoading) => set({ isLoading }),
}))
