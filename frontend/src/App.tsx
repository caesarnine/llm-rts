import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { useWebSocket } from './network/useWebSocket'
import GameScene from './scene/GameScene'
import HUD from './ui/HUD'
import CommanderPanel from './ui/CommanderPanel'
import EventLog from './ui/EventLog'
import { useGameStore } from './store/gameStore'

function Overlay() {
  const connected = useGameStore((s) => s.connected)
  const phase = useGameStore((s) => s.gameState?.phase)
  const winner = useGameStore((s) => s.gameState?.winner)

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {/* Connection banner */}
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

      {/* Winner banner */}
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

      <HUD />
      <CommanderPanel />
      <EventLog />
    </div>
  )
}

export default function App() {
  useWebSocket()

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas shadows gl={{ antialias: true }}>
        <Suspense fallback={null}>
          <GameScene />
        </Suspense>
      </Canvas>
      <Overlay />
    </div>
  )
}
