import { useGameStore } from '../store/gameStore'

export default function CommanderPanel() {
  const redSummary = useGameStore((s) => s.gameState?.teams.red?.commander_summary ?? '')
  const blueSummary = useGameStore((s) => s.gameState?.teams.blue?.commander_summary ?? '')
  const phase = useGameStore((s) => s.gameState?.phase)

  if (phase !== 'running' || (!redSummary && !blueSummary)) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 240 }}>
      {redSummary && (
        <div style={{
          background: 'rgba(80,20,20,0.8)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 6, padding: '5px 8px',
          backdropFilter: 'blur(6px)',
        }}>
          <div style={{ fontSize: 9, color: '#fca5a5', fontWeight: 'bold', marginBottom: 2, letterSpacing: 0.5 }}>
            RED CMDR
          </div>
          <div style={{ fontSize: 10, color: '#e8b4b4', lineHeight: 1.3 }}>{redSummary}</div>
        </div>
      )}
      {blueSummary && (
        <div style={{
          background: 'rgba(20,40,100,0.8)',
          border: '1px solid rgba(59,130,246,0.3)',
          borderRadius: 6, padding: '5px 8px',
          backdropFilter: 'blur(6px)',
        }}>
          <div style={{ fontSize: 9, color: '#93c5fd', fontWeight: 'bold', marginBottom: 2, letterSpacing: 0.5 }}>
            BLUE CMDR
          </div>
          <div style={{ fontSize: 10, color: '#b4cde8', lineHeight: 1.3 }}>{blueSummary}</div>
        </div>
      )}
    </div>
  )
}
