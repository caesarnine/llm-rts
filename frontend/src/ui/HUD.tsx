import type { CSSProperties } from 'react'
import { useGameStore } from '../store/gameStore'

const SPEEDS = [0, 0.5, 1, 2, 4]

const card: CSSProperties = {
  background: 'rgba(10,10,20,0.85)',
  border: '1px solid #333',
  borderRadius: 6,
  padding: '8px 12px',
  backdropFilter: 'blur(4px)',
}

function TeamResources({ team }: { team: 'red' | 'blue' }) {
  const resources = useGameStore((s) => s.gameState?.teams[team]?.resources)
  const unitCount = useGameStore((s) => s.gameState?.teams[team]?.units.length ?? 0)
  const color = team === 'red' ? '#ef4444' : '#3b82f6'

  if (!resources) return null
  return (
    <div style={{ ...card, pointerEvents: 'none' }}>
      <div style={{ color, fontWeight: 'bold', fontSize: 12, marginBottom: 4 }}>
        {team.toUpperCase()} TEAM ({unitCount} units)
      </div>
      <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
        <span>🪙 {resources.gold}</span>
        <span>🪵 {resources.wood}</span>
        <span>🪨 {resources.stone}</span>
      </div>
    </div>
  )
}

export default function HUD() {
  const tick = useGameStore((s) => s.gameState?.tick ?? 0)
  const phase = useGameStore((s) => s.gameState?.phase)
  const thinking = useGameStore((s) => s.gameState?.llm_thinking ?? false)
  const speed = useGameStore((s) => s.speed)
  const setSpeed = useGameStore((s) => s.setSpeed)
  const connected = useGameStore((s) => s.connected)

  const handleStart = async () => {
    await fetch('/api/game/start?use_llm=false', { method: 'POST' })
  }
  const handleStartLLM = async () => {
    await fetch('/api/game/start?use_llm=true', { method: 'POST' })
  }
  const handleRestart = async () => {
    await fetch('/api/game/restart?use_llm=false', { method: 'POST' })
  }

  return (
    <>
      {/* Top-left: resources */}
      <div style={{
        position: 'absolute', top: 12, left: 12,
        display: 'flex', flexDirection: 'column', gap: 6,
        pointerEvents: 'auto',
      }}>
        <TeamResources team="red" />
        <TeamResources team="blue" />
      </div>

      {/* Top-center: tick + phase + thinking indicator */}
      <div style={{
        position: 'absolute', top: 12, left: '50%',
        transform: 'translateX(-50%)',
        ...card, textAlign: 'center', pointerEvents: 'none',
        minWidth: 120,
      }}>
        <div style={{ fontSize: 11, color: '#aaa' }}>TICK</div>
        <div style={{ fontSize: 20, fontWeight: 'bold', letterSpacing: 2 }}>{tick}</div>
        {thinking ? (
          <div style={{ fontSize: 10, marginTop: 4, color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
            COMMANDERS THINKING
          </div>
        ) : phase ? (
          <div style={{
            fontSize: 10, marginTop: 2,
            color: phase === 'running' ? '#22c55e' : phase === 'finished' ? '#ef4444' : '#888',
          }}>
            {phase.toUpperCase()}
          </div>
        ) : null}
      </div>

      {/* Spin keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Bottom-center: controls */}
      <div style={{
        position: 'absolute', bottom: 16, left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex', gap: 8, alignItems: 'center',
        pointerEvents: 'auto',
      }}>
        {/* Start buttons (before game) */}
        {(!phase || phase === 'starting' || phase === 'finished') && connected && (
          <>
            <button onClick={handleStart} style={btnStyle('#374151')}>
              Start (Random AI)
            </button>
            <button onClick={handleStartLLM} style={btnStyle('#1e40af')}>
              Start (Claude AI)
            </button>
          </>
        )}

        {/* Speed controls */}
        {phase === 'running' && (
          <>
            <span style={{ fontSize: 11, color: '#888' }}>SPEED:</span>
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                style={btnStyle(speed === s ? '#4b5563' : '#1f2937')}
              >
                {s === 0 ? '⏸' : `${s}×`}
              </button>
            ))}
            <button onClick={handleRestart} style={btnStyle('#7f1d1d')}>
              Restart
            </button>
          </>
        )}
      </div>

      {/* Connection dot */}
      <div style={{
        position: 'absolute', top: 12, right: 12,
        display: 'flex', alignItems: 'center', gap: 6,
        ...card, pointerEvents: 'none',
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: connected ? '#22c55e' : '#ef4444',
        }} />
        <span style={{ fontSize: 11, color: '#aaa' }}>
          {connected ? 'LIVE' : 'OFFLINE'}
        </span>
      </div>
    </>
  )
}

function btnStyle(bg: string): CSSProperties {
  return {
    background: bg,
    border: '1px solid #555',
    borderRadius: 4,
    color: '#e0e0e0',
    cursor: 'pointer',
    fontSize: 12,
    padding: '5px 10px',
    fontFamily: 'inherit',
  }
}
