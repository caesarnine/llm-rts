import { useGameStore } from '../store/gameStore'

export default function Commentary() {
  const commentary = useGameStore((s) => s.gameState?.commentary ?? '')

  if (!commentary) return null

  return (
    <div
      key={commentary}
      style={{
        position: 'absolute',
        bottom: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        maxWidth: 560,
        background: 'rgba(0,0,0,0.72)',
        border: '1px solid rgba(251,191,36,0.4)',
        borderRadius: 8,
        padding: '8px 18px',
        fontStyle: 'italic',
        color: '#fbbf24',
        fontSize: 14,
        textAlign: 'center',
        animation: 'commentary-fade 0.5s ease-in',
        pointerEvents: 'none',
        letterSpacing: '0.01em',
      }}
    >
      {commentary}
      <style>{`
        @keyframes commentary-fade {
          from { opacity: 0; transform: translateX(-50%) translateY(6px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  )
}
