import { create } from 'zustand'
import type { GameState, GameEvent } from '../types'

interface GameStore {
  gameState: GameState | null
  eventLog: GameEvent[]
  connected: boolean
  speed: number
  fogPerspective: 'red' | 'blue' | null  // null = spectator sees all

  setGameState: (state: GameState) => void
  setConnected: (v: boolean) => void
  setSpeed: (v: number) => void
  setFogPerspective: (p: 'red' | 'blue' | null) => void
  appendEvents: (events: GameEvent[]) => void
}

export const useGameStore = create<GameStore>((set) => ({
  gameState: null,
  eventLog: [],
  connected: false,
  speed: 1,
  fogPerspective: null,

  setGameState: (state) =>
    set((s) => ({
      gameState: state,
      eventLog: state.events.length
        ? [...s.eventLog, ...state.events].slice(-100)
        : s.eventLog,
    })),

  setConnected: (v) => set({ connected: v }),

  setSpeed: (v) => set({ speed: v }),

  setFogPerspective: (p) => set({ fogPerspective: p }),

  appendEvents: (events) =>
    set((s) => ({ eventLog: [...s.eventLog, ...events].slice(-100) })),
}))
