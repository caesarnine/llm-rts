import type { CSSProperties } from 'react'
import { useGameStore } from '../store/gameStore'

const SPEEDS = [0, 0.5, 1, 2, 4]

const card: CSSProperties = {
  background: 'rgba(10,10,20,0.82)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 6,
  padding: '8px 12px',
  backdropFilter: 'blur(6px)',
}

function TeamResources({ team }: { team: 'red' | 'blue' }) {
  const resources = useGameStore((s) => s.gameState?.teams[team]?.resources)
  const unitCount = useGameStore((s) => s.gameState?.teams[team]?.units.length ?? 0)
  const popCap = useGameStore((s) => s.gameState?.population_cap?.[team] ?? 15)
  const color = team === 'red' ? '#ef4444' : '#3b82f6'

  if (!resources) return null
  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
        <span style={{ color, fontWeight: 'bold', fontSize: 11, textTransform: 'uppercase' }}>
          {team}
        </span>
        <span style={{ color: '#666', fontSize: 10 }}>
          {unitCount}/{popCap}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 10, fontSize: 11, color: '#ccc' }}>
        <span style={{ color: '#fbbf24' }}>{resources.gold}g</span>
        <span style={{ color: '#a3e635' }}>{resources.wood}w</span>
        <span style={{ color: '#94a3b8' }}>{resources.stone}s</span>
      </div>
    </div>
  )
}

function ResourcesSection() {
  return (
    <>
      <TeamResources team="red" />
      <TeamResources team="blue" />
    </>
  )
}

function TickSection() {
  const tick = useGameStore((s) => s.gameState?.tick ?? 0)
  const phase = useGameStore((s) => s.gameState?.phase)
  const thinking = useGameStore((s) => s.gameState?.llm_thinking ?? false)

  return (
    <div style={{ ...card, textAlign: 'center', minWidth: 110 }}>
      <div style={{ fontSize: 10, color: '#666', letterSpacing: 1 }}>TICK</div>
      <div style={{ fontSize: 20, fontWeight: 'bold', letterSpacing: 2, lineHeight: 1.2 }}>{tick}</div>
      {thinking ? (
        <div style={{
          fontSize: 9, marginTop: 3, color: '#fbbf24',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
        }}>
          <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
          THINKING
        </div>
      ) : phase ? (
        <div style={{
          fontSize: 9, marginTop: 2, letterSpacing: 1,
          color: phase === 'running' ? '#22c55e' : phase === 'finished' ? '#ef4444' : '#666',
        }}>
          {phase.toUpperCase()}
        </div>
      ) : null}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function StatusSection() {
  const connected = useGameStore((s) => s.connected)
  const muted = useGameStore((s) => s.muted)
  const setMuted = useGameStore((s) => s.setMuted)

  return (
    <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'auto' }}>
      <button
        onClick={() => setMuted(!muted)}
        style={{
          background: 'none', border: 'none', color: '#888',
          cursor: 'pointer', fontSize: 13, padding: 0, fontFamily: 'inherit',
        }}
        title={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? '🔇' : '🔊'}
      </button>
      <div style={{
        width: 7, height: 7, borderRadius: '50%',
        background: connected ? '#22c55e' : '#ef4444',
      }} />
      <span style={{ fontSize: 10, color: '#666' }}>
        {connected ? 'LIVE' : 'OFF'}
      </span>
    </div>
  )
}

function ControlsSection() {
  const phase = useGameStore((s) => s.gameState?.phase)
  const speed = useGameStore((s) => s.speed)
  const setSpeed = useGameStore((s) => s.setSpeed)
  const connected = useGameStore((s) => s.connected)

  const handleStart = async () => {
    await fetch('/api/game/start', { method: 'POST' })
  }
  const handleRestart = async () => {
    await fetch('/api/game/restart', { method: 'POST' })
  }
  const handleSpeed = async (nextSpeed: number) => {
    setSpeed(nextSpeed)
    try {
      await fetch(`/api/game/speed?speed=${encodeURIComponent(nextSpeed)}`, { method: 'POST' })
    } catch (err) {
      console.warn('Failed to set game speed', err)
    }
  }

  return (
    <div style={{
      display: 'flex', gap: 6, alignItems: 'center',
      pointerEvents: 'auto',
    }}>
      {(!phase || phase === 'starting' || phase === 'finished') && connected && (
        <button onClick={handleStart} style={btnStyle('#1e40af')}>
          Start
        </button>
      )}

      {phase === 'running' && (
        <>
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => handleSpeed(s)}
              style={btnStyle(speed === s ? '#4b5563' : '#1f2937')}
            >
              {s === 0 ? '⏸' : `${s}×`}
            </button>
          ))}
          <button onClick={handleRestart} style={btnStyle('#7f1d1d')}>
            ✕
          </button>
        </>
      )}
    </div>
  )
}

/* ── Exported component: renders the requested section ── */

interface HUDProps {
  section: 'resources' | 'tick' | 'status' | 'controls'
}

export default function HUD({ section }: HUDProps) {
  switch (section) {
    case 'resources': return <ResourcesSection />
    case 'tick':      return <TickSection />
    case 'status':    return <StatusSection />
    case 'controls':  return <ControlsSection />
  }
}

function btnStyle(bg: string): CSSProperties {
  return {
    background: bg,
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 4,
    color: '#d1d5db',
    cursor: 'pointer',
    fontSize: 11,
    padding: '4px 8px',
    fontFamily: 'inherit',
  }
}
