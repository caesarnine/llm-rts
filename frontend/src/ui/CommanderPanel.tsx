import { useState } from 'react'
import { useGameStore } from '../store/gameStore'

function TeamPanel({ team }: { team: 'red' | 'blue' }) {
  const summary = useGameStore((s) => s.gameState?.teams[team]?.commander_summary ?? '')
  const reasoning = useGameStore((s) => s.gameState?.teams[team]?.commander_reasoning ?? '')
  const model = useGameStore((s) => s.gameState?.teams[team]?.commander_model ?? '')
  const [showReasoning, setShowReasoning] = useState(false)

  if (!summary && !reasoning) return null

  const isRed = team === 'red'
  const bg = isRed ? 'rgba(80,20,20,0.8)' : 'rgba(20,40,100,0.8)'
  const border = isRed ? 'rgba(239,68,68,0.3)' : 'rgba(59,130,246,0.3)'
  const labelColor = isRed ? '#fca5a5' : '#93c5fd'
  const textColor = isRed ? '#e8b4b4' : '#b4cde8'

  // Extract short model name from full identifier
  const shortModel = model ? model.split(':').pop()?.slice(0, 20) ?? model : ''

  return (
    <div style={{
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: 6, padding: '5px 8px',
      backdropFilter: 'blur(6px)',
      maxWidth: 260,
    }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 6,
        marginBottom: 2,
      }}>
        <span style={{ fontSize: 9, color: labelColor, fontWeight: 'bold', letterSpacing: 0.5 }}>
          {team.toUpperCase()} CMDR
        </span>
        {shortModel && (
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>
            {shortModel}
          </span>
        )}
      </div>
      <div style={{ fontSize: 10, color: textColor, lineHeight: 1.3 }}>{summary}</div>
      {reasoning && (
        <>
          <button
            onClick={() => setShowReasoning(!showReasoning)}
            style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
              cursor: 'pointer', fontSize: 8, padding: '3px 0 0', fontFamily: 'inherit',
              pointerEvents: 'auto',
            }}
          >
            {showReasoning ? '▾ hide reasoning' : '▸ show reasoning'}
          </button>
          {showReasoning && (
            <div style={{
              fontSize: 9, color: 'rgba(255,255,255,0.45)', lineHeight: 1.3,
              marginTop: 3, paddingTop: 3,
              borderTop: '1px solid rgba(255,255,255,0.08)',
              maxHeight: 120, overflowY: 'auto',
            }}>
              {reasoning}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function CommanderPanel() {
  const phase = useGameStore((s) => s.gameState?.phase)
  if (phase !== 'running') return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <TeamPanel team="red" />
      <TeamPanel team="blue" />
    </div>
  )
}
