import { create } from 'zustand'
import type { GameState, GameEvent } from '../types'

export interface DeathEffect {
  id: string
  x: number
  z: number
  team: string
  isBuilding: boolean
  createdAt: number
}

interface GameStore {
  gameState: GameState | null
  eventLog: GameEvent[]
  deathEffects: DeathEffect[]
  connected: boolean
  speed: number
  fogPerspective: 'red' | 'blue' | null

  setGameState: (state: GameState) => void
  setConnected: (v: boolean) => void
  setSpeed: (v: number) => void
  setFogPerspective: (p: 'red' | 'blue' | null) => void
  pruneDeathEffects: () => void
}

let effectCounter = 0

function extractDeathEffects(events: GameEvent[]): DeathEffect[] {
  const now = Date.now()
  return events
    .filter(e => e.event_type === 'unit_killed' || e.event_type === 'building_destroyed')
    .map(e => ({
      id: `${now}-${effectCounter++}`,
      x: (e.data.x as number) ?? 0,
      z: (e.data.z as number) ?? 0,
      team: (e.data.team as string) ?? 'red',
      isBuilding: e.event_type === 'building_destroyed',
      createdAt: now,
    }))
}

export const useGameStore = create<GameStore>((set) => ({
  gameState: null,
  eventLog: [],
  deathEffects: [],
  connected: false,
  speed: 1,
  fogPerspective: null,

  setGameState: (state) =>
    set((s) => {
      const newEffects = state.events.length ? extractDeathEffects(state.events) : []
      return {
        gameState: state,
        eventLog: state.events.length
          ? [...s.eventLog, ...state.events].slice(-100)
          : s.eventLog,
        deathEffects: [...s.deathEffects, ...newEffects],
      }
    }),

  setConnected: (v) => set({ connected: v }),
  setSpeed: (v) => set({ speed: v }),
  setFogPerspective: (p) => set({ fogPerspective: p }),

  // Call periodically to prune effects older than 2s
  pruneDeathEffects: () =>
    set((s) => ({
      deathEffects: s.deathEffects.filter(e => Date.now() - e.createdAt < 2000),
    })),
}))
