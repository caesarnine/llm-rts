import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import type { CSSProperties } from 'react'
import { useWebSocket } from './network/useWebSocket'
import GameScene from './scene/GameScene'
import HUD from './ui/HUD'
import CommanderPanel from './ui/CommanderPanel'
import EventLog from './ui/EventLog'
import StrengthBar from './ui/StrengthBar'
import { useGameStore } from './store/gameStore'
import Commentary from './ui/Commentary'
import Minimap from './ui/Minimap'
import EconomyGraph from './ui/EconomyGraph'
import StatsPanel from './ui/StatsPanel'
import UnitInspector from './ui/UnitInspector'
import { useSoundEffects } from './audio/useSoundEffects'

/* ── shared layout styles ─────────────────────────────────────── */

const corner = (
  v: 'top' | 'bottom',
  h: 'left' | 'right',
): CSSProperties => ({
  position: 'absolute',
  [v]: 12,
  [h]: 12,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  alignItems: h === 'right' ? 'flex-end' : 'flex-start',
  pointerEvents: 'none',
})

function Overlay() {
  const connected = useGameStore((s) => s.connected)
  const phase = useGameStore((s) => s.gameState?.phase)
  const winner = useGameStore((s) => s.gameState?.winner)

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {/* ── Full-width strength bar at very top ── */}
      <StrengthBar />

      {/* ── Top-left: team resources ── */}
      <div style={{ ...corner('top', 'left'), top: 22 }}>
        <HUD section="resources" />
      </div>

      {/* ── Top-center: tick / phase / thinking ── */}
      <div style={{
        position: 'absolute', top: 22, left: '50%',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
      }}>
        <HUD section="tick" />
      </div>

      {/* ── Top-right: connection + mute + stats ── */}
      <div style={{ ...corner('top', 'right'), top: 22 }}>
        <HUD section="status" />
        <StatsPanel />
      </div>

      {/* ── Bottom-left column: economy graph, then battle log ── */}
      <div style={{ ...corner('bottom', 'left'), bottom: 50, maxHeight: 'calc(100vh - 160px)' }}>
        <EconomyGraph />
        <EventLog />
      </div>

      {/* ── Bottom-center: commentary + game controls ── */}
      <div style={{
        position: 'absolute', bottom: 12, left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 8,
        pointerEvents: 'none',
      }}>
        <Commentary />
        <HUD section="controls" />
      </div>

      {/* ── Bottom-right column: unit inspector, minimap, then commander panels ── */}
      <div style={{ ...corner('bottom', 'right'), bottom: 50, maxHeight: 'calc(100vh - 160px)' }}>
        <UnitInspector />
        <Minimap />
        <CommanderPanel />
      </div>

      {/* ── Center modals (connection / winner) ── */}
      {!connected && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          background: 'rgba(0,0,0,0.85)', padding: '24px 40px',
          border: '1px solid #444', borderRadius: 8, textAlign: 'center',
          pointerEvents: 'auto',
        }}>
          <div style={{ fontSize: 18, marginBottom: 8 }}>Connecting to server…</div>
          <div style={{ fontSize: 12, color: '#888' }}>Make sure the backend is running on :8000</div>
        </div>
      )}

      {phase === 'finished' && winner && (
        <div style={{
          position: 'absolute', top: '40%', left: '50%',
          transform: 'translate(-50%,-50%)',
          background: 'rgba(0,0,0,0.9)', padding: '32px 56px',
          border: `2px solid ${winner === 'red' ? '#ef4444' : '#3b82f6'}`,
          borderRadius: 12, textAlign: 'center', pointerEvents: 'auto',
        }}>
          <div style={{
            fontSize: 36, fontWeight: 'bold',
            color: winner === 'red' ? '#ef4444' : '#3b82f6',
          }}>
            {winner.toUpperCase()} WINS
          </div>
          <div style={{ fontSize: 14, color: '#aaa', marginTop: 8 }}>
            Refresh or restart to play again
          </div>
        </div>
      )}
    </div>
  )
}

export default function App() {
  useWebSocket()
  useSoundEffects()

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas shadows gl={{ antialias: true, toneMapping: 3 }}>
        <Suspense fallback={null}>
          <GameScene />
        </Suspense>
      </Canvas>
      {/* CSS vignette */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        boxShadow: 'inset 0 0 120px 40px rgba(0,0,0,0.5)',
      }} />
      <Overlay />
    </div>
  )
}
