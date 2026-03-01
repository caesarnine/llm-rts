import { useGameStore } from '../store/gameStore'
import type { GameEvent } from '../types'

const EVENT_COLOR: Record<string, string> = {
  unit_killed: '#ef4444',
  building_destroyed: '#f97316',
  building_complete: '#22c55e',
  unit_trained: '#a3e635',
  build_started: '#fbbf24',
  game_over: '#ffffff',
}

function EventRow({ event }: { event: GameEvent }) {
  const color = EVENT_COLOR[event.event_type] ?? '#9ca3af'
  return (
    <div style={{
      fontSize: 10, lineHeight: 1.35,
      borderLeft: `2px solid ${color}`,
      paddingLeft: 5,
      color: '#c4c4c4',
      marginBottom: 1,
    }}>
      <span style={{ color: '#555', marginRight: 4 }}>t{event.tick}</span>
      {event.message}
    </div>
  )
}

export default function EventLog() {
  const events = useGameStore((s) => s.eventLog)
  const phase = useGameStore((s) => s.gameState?.phase)

  if (phase !== 'running' && phase !== 'finished') return null
  if (events.length === 0) return null

  const recent = events.slice(-14).reverse()

  return (
    <div style={{
      width: 260,
      background: 'rgba(10,10,20,0.82)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 6,
      padding: '6px 8px',
      backdropFilter: 'blur(6px)',
      maxHeight: 180,
      overflow: 'hidden',
    }}>
      <div style={{ fontSize: 9, color: '#555', fontWeight: 'bold', marginBottom: 4, letterSpacing: 1 }}>
        BATTLE LOG
      </div>
      {recent.map((e, i) => (
        <EventRow key={`${e.tick}-${i}`} event={e} />
      ))}
    </div>
  )
}
