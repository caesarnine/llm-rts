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
      fontSize: 11, lineHeight: 1.4,
      borderLeft: `2px solid ${color}`,
      paddingLeft: 6,
      color: '#d1d5db',
      marginBottom: 2,
    }}>
      <span style={{ color: '#6b7280', marginRight: 6 }}>t{event.tick}</span>
      {event.message}
    </div>
  )
}

export default function EventLog() {
  const events = useGameStore((s) => s.eventLog)
  const phase = useGameStore((s) => s.gameState?.phase)

  if (phase !== 'running' && phase !== 'finished') return null
  if (events.length === 0) return null

  const recent = events.slice(-18).reverse()

  return (
    <div style={{
      position: 'absolute', bottom: 60, left: 12,
      width: 300,
      background: 'rgba(10,10,20,0.8)',
      border: '1px solid #333',
      borderRadius: 6,
      padding: '8px 10px',
      backdropFilter: 'blur(4px)',
      pointerEvents: 'none',
      maxHeight: 260,
      overflow: 'hidden',
    }}>
      <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 'bold', marginBottom: 6 }}>
        BATTLE LOG
      </div>
      {recent.map((e, i) => (
        <EventRow key={`${e.tick}-${i}`} event={e} />
      ))}
    </div>
  )
}
