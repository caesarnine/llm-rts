import { useRef } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Unit, TeamState } from '../types'

const TEAM_COLOR: Record<string, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
}

const UNIT_HEIGHT: Record<string, number> = {
  worker:  0.5,
  warrior: 0.7,
  archer:  0.65,
  scout:   0.6,
}

// Ring under the unit shows current state at a glance
const STATE_RING_COLOR: Record<string, string> = {
  idle:       '#6b7280',  // grey
  moving:     '#60a5fa',  // blue
  attacking:  '#ef4444',  // red
  gathering:  '#fbbf24',  // amber
  building:   '#a78bfa',  // purple
  dead:       '#000000',
}

function UnitMesh({ unit }: { unit: Unit }) {
  const groupRef = useRef<THREE.Group>(null)
  const ringMatRef = useRef<THREE.MeshBasicMaterial>(null)

  const h = UNIT_HEIGHT[unit.unit_type] ?? 0.6
  const bodyColor = TEAM_COLOR[unit.team] ?? '#ffffff'
  const ringColor = STATE_RING_COLOR[unit.state] ?? '#6b7280'
  const hpFrac = unit.hp / unit.max_hp
  const hpColor = hpFrac > 0.6 ? '#22c55e' : hpFrac > 0.3 ? '#f59e0b' : '#ef4444'

  useFrame((state, delta) => {
    if (!groupRef.current) return

    // Lerp group toward reported position
    const tx = unit.position.x + 0.5
    const tz = unit.position.z + 0.5
    const f = Math.min(1, delta * 10)
    groupRef.current.position.x += (tx - groupRef.current.position.x) * f
    groupRef.current.position.z += (tz - groupRef.current.position.z) * f

    // Pulse the ring when attacking
    if (ringMatRef.current && unit.state === 'attacking') {
      ringMatRef.current.opacity = 0.4 + Math.abs(Math.sin(state.clock.elapsedTime * 8)) * 0.6
    } else if (ringMatRef.current) {
      ringMatRef.current.opacity = 0.75
    }
  })

  return (
    <group
      ref={groupRef}
      position={[unit.position.x + 0.5, 0, unit.position.z + 0.5]}
    >
      {/* State ring — rendered above terrain regardless of tile height */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.3, 0]}>
        <ringGeometry args={[0.3, 0.46, 24]} />
        <meshBasicMaterial
          ref={ringMatRef}
          color={ringColor}
          transparent
          opacity={0.75}
          side={THREE.DoubleSide}
          depthTest={false}
        />
      </mesh>

      {/* Unit body */}
      <mesh position={[0, h / 2 + 0.15, 0]} castShadow>
        {unit.unit_type === 'archer' ? (
          <coneGeometry args={[0.22, h, 6]} />
        ) : unit.unit_type === 'scout' ? (
          <cylinderGeometry args={[0.14, 0.2, h, 8]} />
        ) : unit.unit_type === 'worker' ? (
          <boxGeometry args={[0.28, h, 0.28]} />
        ) : (
          <boxGeometry args={[0.36, h, 0.36]} />
        )}
        <meshStandardMaterial
          color={bodyColor}
          roughness={0.65}
          emissive={bodyColor}
          emissiveIntensity={unit.state === 'attacking' ? 0.4 : 0.05}
        />
      </mesh>

      {/* HP bar */}
      <Html
        position={[0, h + 0.5, 0]}
        center
        style={{ pointerEvents: 'none', userSelect: 'none' }}
        distanceFactor={20}
      >
        <div style={{
          width: 28, height: 4,
          background: '#222',
          border: '1px solid #555',
          borderRadius: 2,
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${Math.max(0, hpFrac * 100)}%`,
            height: '100%',
            background: hpColor,
          }} />
        </div>
      </Html>
    </group>
  )
}

interface UnitsProps {
  teams: Record<string, TeamState>
}

export default function Units({ teams }: UnitsProps) {
  return (
    <group>
      {Object.values(teams).flatMap((team) =>
        team.units.map((unit) => (
          <UnitMesh key={unit.id} unit={unit} />
        ))
      )}
    </group>
  )
}
