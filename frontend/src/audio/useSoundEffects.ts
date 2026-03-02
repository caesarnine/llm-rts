import { useEffect, useRef } from 'react'
import { useGameStore } from '../store/gameStore'
import {
  playSwordClash,
  playBowShot,
  playBuildingComplete,
  playCaptureTaken,
  playUnitDeath,
  startAmbient,
  setMuted,
} from './SoundManager'

export function useSoundEffects() {
  const eventLog = useGameStore((s) => s.eventLog)
  const phase = useGameStore((s) => s.gameState?.phase)
  const muted = useGameStore((s) => s.muted)
  const prevLen = useRef(0)

  // Start ambient when game runs
  useEffect(() => {
    if (phase === 'running' && !muted) {
      startAmbient()
    }
  }, [phase, muted])

  // Mute control
  useEffect(() => {
    setMuted(muted)
  }, [muted])

  // Map events to sounds
  useEffect(() => {
    if (muted) return
    const newEvents = eventLog.slice(prevLen.current)
    prevLen.current = eventLog.length

    for (const e of newEvents) {
      switch (e.event_type) {
        case 'unit_killed':
          playUnitDeath()
          break
        case 'building_destroyed':
          playUnitDeath()
          break
        case 'building_complete':
          playBuildingComplete()
          break
        case 'capture_point_taken':
          playCaptureTaken()
          break
        case 'unit_trained':
          // Melee attack sound as a "unit ready" cue
          playSwordClash()
          break
      }
    }

    // Play combat sounds for attack events (throttled — check if any unit is attacking)
    if (newEvents.some((e) => e.event_type === 'unit_killed')) {
      // Already handled
    }
  }, [eventLog, muted])
}
