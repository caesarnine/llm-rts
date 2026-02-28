import { useGameStore } from '../store/gameStore'

export default function CommanderPanel() {
  const redSummary = useGameStore((s) => s.gameState?.teams.red?.commander_summary ?? '')
  const blueSummary = useGameStore((s) => s.gameState?.teams.blue?.commander_summary ?? '')
  const phase = useGameStore((s) => s.gameState?.phase)

  if (phase !== 'running' || (!redSummary && !blueSummary)) return null

  return (
    <div style={{
      position: 'absolute', bottom: 60, right: 12,
      display: 'flex', flexDirection: 'column', gap: 6,
      maxWidth: 280, pointerEvents: 'none',
    }}>
      {redSummary && (
        <div style={{
          background: 'rgba(127,29,29,0.85)',
          border: '1px solid #991b1b',
          borderRadius: 6, padding: '8px 12px',
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{ fontSize: 10, color: '#fca5a5', fontWeight: 'bold', marginBottom: 3 }}>
            🔴 RED COMMANDER
          </div>
          <div style={{ fontSize: 11, color: '#fecaca', lineHeight: 1.4 }}>{redSummary}</div>
        </div>
      )}
      {blueSummary && (
        <div style={{
          background: 'rgba(30,64,175,0.85)',
          border: '1px solid #1d4ed8',
          borderRadius: 6, padding: '8px 12px',
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{ fontSize: 10, color: '#93c5fd', fontWeight: 'bold', marginBottom: 3 }}>
            🔵 BLUE COMMANDER
          </div>
          <div style={{ fontSize: 11, color: '#bfdbfe', lineHeight: 1.4 }}>{blueSummary}</div>
        </div>
      )}
    </div>
  )
}
