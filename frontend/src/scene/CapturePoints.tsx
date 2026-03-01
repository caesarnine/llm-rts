import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import type { CapturePoint } from '../types'

const TEAM_COLORS: Record<string, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
}
const NEUTRAL_COLOR = '#9ca3af'
const CONTESTED_COLOR = '#fbbf24'

function CapturePointMesh({ cp }: { cp: CapturePoint }) {
  const pillarRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.MeshStandardMaterial>(null)

  const isContested =
    Object.values(cp.progress).filter((v) => v > 0).length > 1

  const color = isContested
    ? CONTESTED_COLOR
    : cp.owner
    ? TEAM_COLORS[cp.owner]
    : NEUTRAL_COLOR

  const maxProgress = Math.max(0, ...Object.values(cp.progress))

  useFrame((_, delta) => {
    if (pillarRef.current) {
      pillarRef.current.rotation.y += delta * 0.6
    }
    if (matRef.current) {
      const pulse = isContested
        ? 0.4 + 0.4 * Math.sin(Date.now() * 0.005)
        : cp.owner
        ? 0.25
        : 0.05
      matRef.current.emissiveIntensity = pulse
    }
  })

  return (
    <group position={[cp.position.x, 0, cp.position.z]}>
      {/* Pillar */}
      <mesh ref={pillarRef} position={[0, 0.75, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.25, 1.5, 8]} />
        <meshStandardMaterial
          ref={matRef}
          color={color}
          emissive={color}
          emissiveIntensity={0.2}
          roughness={0.3}
          metalness={0.6}
        />
      </mesh>

      {/* Base platform */}
      <mesh position={[0, 0.04, 0]} receiveShadow>
        <cylinderGeometry args={[0.55, 0.55, 0.08, 16]} />
        <meshStandardMaterial color={color} roughness={0.8} metalness={0.2} opacity={0.7} transparent />
      </mesh>

      {/* Capture progress ring */}
      {maxProgress > 0 && (
        <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.6, 0.6 + 0.18 * maxProgress, 32, 1, 0, Math.PI * 2 * maxProgress]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.6}
            side={THREE.DoubleSide}
            depthTest={false}
          />
        </mesh>
      )}

      {/* Label */}
      <Html
        position={[0, 2.0, 0]}
        center
        distanceFactor={18}
        style={{ pointerEvents: 'none' }}
      >
        <div style={{
          background: 'rgba(0,0,0,0.65)',
          border: `1px solid ${color}`,
          borderRadius: 4,
          padding: '2px 6px',
          fontSize: 10,
          color: color,
          whiteSpace: 'nowrap',
          textAlign: 'center',
          fontFamily: 'monospace',
          lineHeight: 1.4,
        }}>
          <div>{cp.owner ? cp.owner.toUpperCase() : 'NEUTRAL'}</div>
          <div style={{ color: '#fbbf24', fontSize: 9 }}>+{cp.gold_per_tick}g/tick</div>
        </div>
      </Html>
    </group>
  )
}

export default function CapturePoints({ nodes }: { nodes: CapturePoint[] }) {
  return (
    <>
      {nodes.map((cp) => (
        <CapturePointMesh key={cp.id} cp={cp} />
      ))}
    </>
  )
}
