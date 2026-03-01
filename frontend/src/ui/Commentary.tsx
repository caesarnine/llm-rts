import { useGameStore } from '../store/gameStore'

export default function Commentary() {
  const commentary = useGameStore((s) => s.gameState?.commentary ?? '')

  if (!commentary) return null

  return (
    <div
      key={commentary}
      style={{
        maxWidth: 480,
        background: 'rgba(0,0,0,0.72)',
        border: '1px solid rgba(251,191,36,0.3)',
        borderRadius: 8,
        padding: '6px 16px',
        fontStyle: 'italic',
        color: '#fbbf24',
        fontSize: 12,
        textAlign: 'center',
        animation: 'commentary-fade 0.5s ease-in',
        letterSpacing: '0.01em',
        lineHeight: 1.4,
      }}
    >
      {commentary}
      <style>{`
        @keyframes commentary-fade {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
