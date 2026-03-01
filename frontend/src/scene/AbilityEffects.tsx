import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Unit, TeamState } from '../types'

const SHIELD_COLOR = '#60a5fa'
const SPRINT_COLOR = '#fbbf24'

function ShieldWallDome({ unit }: { unit: Unit }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.MeshStandardMaterial>(null)

  useFrame((state) => {
    if (matRef.current) {
      matRef.current.opacity = 0.15 + Math.sin(state.clock.elapsedTime * 4) * 0.1
    }
    if (meshRef.current) {
      meshRef.current.position.set(unit.position.x + 0.5, 0.4, unit.position.z + 0.5)
    }
  })

  return (
    <mesh ref={meshRef} position={[unit.position.x + 0.5, 0.4, unit.position.z + 0.5]}>
      <sphereGeometry args={[0.6, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial
        ref={matRef}
        color={SHIELD_COLOR}
        emissive={SHIELD_COLOR}
        emissiveIntensity={0.5}
        transparent
        opacity={0.2}
        side={THREE.DoubleSide}
        depthTest={false}
      />
    </mesh>
  )
}

function SprintTrail({ unit }: { unit: Unit }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.MeshBasicMaterial>(null)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.set(unit.position.x + 0.5, 0.25, unit.position.z + 0.5)
      meshRef.current.scale.x = 0.8 + Math.sin(state.clock.elapsedTime * 10) * 0.2
    }
    if (matRef.current) {
      matRef.current.opacity = 0.2 + Math.sin(state.clock.elapsedTime * 8) * 0.15
    }
  })

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[unit.position.x + 0.5, 0.25, unit.position.z + 0.5]}>
      <ringGeometry args={[0.1, 0.35, 12]} />
      <meshBasicMaterial
        ref={matRef}
        color={SPRINT_COLOR}
        transparent
        opacity={0.3}
        depthTest={false}
      />
    </mesh>
  )
}

interface AbilityEffectsProps {
  teams: Record<string, TeamState>
}

export default function AbilityEffects({ teams }: AbilityEffectsProps) {
  const effects: JSX.Element[] = []

  for (const team of Object.values(teams)) {
    for (const unit of team.units) {
      if (!unit.ability_active) continue

      if (unit.ability_active === 'shield_wall') {
        effects.push(<ShieldWallDome key={`sw-${unit.id}`} unit={unit} />)
      } else if (unit.ability_active === 'sprint') {
        effects.push(<SprintTrail key={`sp-${unit.id}`} unit={unit} />)
      }
      // stealth is handled in Units.tsx via opacity
    }
  }

  if (effects.length === 0) return null
  return <group>{effects}</group>
}
