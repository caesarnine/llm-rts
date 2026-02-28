import { useRef } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Unit, TeamState } from '../types'

const TEAM_COLOR: Record<string, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
}

const TEAM_EMISSIVE: Record<string, string> = {
  red: '#7f1d1d',
  blue: '#1e3a8a',
}

const UNIT_HEIGHT: Record<string, number> = {
  worker: 0.5,
  warrior: 0.7,
  archer: 0.65,
  scout: 0.6,
}

function UnitMesh({ unit }: { unit: Unit }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const h = UNIT_HEIGHT[unit.unit_type] ?? 0.6
  const y = h / 2 + 0.15

  // Imperative lerp — avoids JSX position fighting with useFrame
  useFrame((_, delta) => {
    if (!meshRef.current) return
    const tx = unit.position.x + 0.5
    const tz = unit.position.z + 0.5
    const factor = Math.min(1, delta * 10)
    meshRef.current.position.x += (tx - meshRef.current.position.x) * factor
    meshRef.current.position.z += (tz - meshRef.current.position.z) * factor
  })

  const color = TEAM_COLOR[unit.team] ?? '#ffffff'
  const emissive = unit.state === 'attacking' ? (TEAM_EMISSIVE[unit.team] ?? '#000') : '#000000'
  const hpFrac = unit.hp / unit.max_hp
  const hpColor = hpFrac > 0.6 ? '#22c55e' : hpFrac > 0.3 ? '#f59e0b' : '#ef4444'

  return (
    <mesh
      ref={meshRef}
      // Initial position only — subsequent positions driven by useFrame
      position={[unit.position.x + 0.5, y, unit.position.z + 0.5]}
      castShadow
    >
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
        color={color}
        roughness={0.65}
        emissive={emissive}
        emissiveIntensity={0.5}
      />

      {/* HP bar — always rendered relative to mesh */}
      <Html
        position={[0, h / 2 + 0.3, 0]}
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
    </mesh>
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
