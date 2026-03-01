import { useGameStore } from '../store/gameStore'
import type { TeamState } from '../types'

function score(team: TeamState): number {
  const units     = team.units.reduce((s, u) => s + u.hp, 0)
  const resources = Object.values(team.resources).reduce((a, b) => a + b, 0) / 8
  const buildings = team.buildings.reduce((s, b) => s + b.hp * b.build_progress, 0) / 4
  return Math.max(0, units + resources + buildings)
}

export default function StrengthBar() {
  const teams = useGameStore((s) => s.gameState?.teams)
  const phase = useGameStore((s) => s.gameState?.phase)

  if (!teams || phase === 'starting') return null

  const redScore  = score(teams.red)
  const blueScore = score(teams.blue)
  const total     = redScore + blueScore
  const redPct    = total === 0 ? 50 : (redScore / total) * 100

  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0, right: 0,
      height: 6,
      display: 'flex',
      pointerEvents: 'none',
    }}>
      {/* Red side */}
      <div style={{
        width: `${redPct}%`,
        background: 'linear-gradient(90deg, #991b1b, #ef4444)',
        transition: 'width 0.6s ease',
        boxShadow: redPct > 55 ? '2px 0 8px #ef4444' : undefined,
      }} />
      {/* Blue side */}
      <div style={{
        flex: 1,
        background: 'linear-gradient(90deg, #3b82f6, #1e40af)',
        boxShadow: redPct < 45 ? '-2px 0 8px #3b82f6' : undefined,
      }} />

      {/* Score readout */}
      <div style={{
        position: 'absolute',
        top: 8,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        fontSize: 10,
        fontFamily: 'monospace',
        pointerEvents: 'none',
      }}>
        <span style={{ color: '#fca5a5' }}>{Math.round(redScore)}</span>
        <span style={{ color: '#6b7280' }}>vs</span>
        <span style={{ color: '#93c5fd' }}>{Math.round(blueScore)}</span>
      </div>
    </div>
  )
}
