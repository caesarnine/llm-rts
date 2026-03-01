import { useRef, useCallback } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Unit, TeamState } from '../types'
import { useGameStore } from '../store/gameStore'

const TEAM_COLOR: Record<string, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
}

const UNIT_HEIGHT: Record<string, number> = {
  worker: 0.5,
  warrior: 0.7,
  archer: 0.65,
  scout: 0.6,
}

const STATE_RING_COLOR: Record<string, string> = {
  idle: '#6b7280',
  moving: '#60a5fa',
  attacking: '#ef4444',
  gathering: '#fbbf24',
  building: '#a78bfa',
  dead: '#000000',
}

function WorkerModel({ color, h, isGathering }: { color: string; h: number; isGathering: boolean }) {
  const pickaxeRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (pickaxeRef.current && isGathering) {
      pickaxeRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 8) * 0.6
    }
  })

  return (
    <>
      {/* Body */}
      <mesh position={[0, h / 2 + 0.15, 0]} castShadow>
        <boxGeometry args={[0.28, h, 0.28]} />
        <meshStandardMaterial color={color} roughness={0.65} emissive={color} emissiveIntensity={0.05} />
      </mesh>
      {/* Pickaxe */}
      <group ref={pickaxeRef} position={[0.2, h * 0.7, 0]}>
        <mesh position={[0, 0.12, 0]} rotation={[0, 0, -0.3]}>
          <boxGeometry args={[0.04, 0.25, 0.04]} />
          <meshStandardMaterial color="#8B7355" roughness={0.9} />
        </mesh>
        <mesh position={[0.06, 0.25, 0]}>
          <boxGeometry args={[0.14, 0.04, 0.04]} />
          <meshStandardMaterial color="#888" roughness={0.5} metalness={0.4} />
        </mesh>
      </group>
    </>
  )
}

function WarriorModel({ color, h }: { color: string; h: number }) {
  return (
    <>
      {/* Wide body */}
      <mesh position={[0, h / 2 + 0.15, 0]} castShadow>
        <boxGeometry args={[0.38, h, 0.36]} />
        <meshStandardMaterial color={color} roughness={0.55} emissive={color} emissiveIntensity={0.05} />
      </mesh>
      {/* Shield side-plate */}
      <mesh position={[-0.24, h / 2 + 0.15, 0]} castShadow>
        <boxGeometry args={[0.06, h * 0.7, 0.32]} />
        <meshStandardMaterial color="#666" roughness={0.4} metalness={0.6} />
      </mesh>
    </>
  )
}

function ArcherModel({ color, h }: { color: string; h: number }) {
  return (
    <>
      {/* Slim body */}
      <mesh position={[0, h / 2 + 0.15, 0]} castShadow>
        <boxGeometry args={[0.24, h, 0.24]} />
        <meshStandardMaterial color={color} roughness={0.65} emissive={color} emissiveIntensity={0.05} />
      </mesh>
      {/* Bow (torus arc on back) */}
      <mesh position={[0, h * 0.6 + 0.15, -0.16]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.18, 0.02, 6, 12, Math.PI]} />
        <meshStandardMaterial color="#8B6914" roughness={0.7} />
      </mesh>
    </>
  )
}

function ScoutModel({ color, h }: { color: string; h: number }) {
  return (
    <>
      {/* Wedge/arrowhead shape, leaning forward */}
      <group rotation={[0.2, 0, 0]}>
        <mesh position={[0, h / 2 + 0.15, 0]} castShadow>
          <coneGeometry args={[0.2, h, 4]} />
          <meshStandardMaterial color={color} roughness={0.5} emissive={color} emissiveIntensity={0.05} />
        </mesh>
      </group>
    </>
  )
}

function UnitMesh({ unit }: { unit: Unit }) {
  const groupRef = useRef<THREE.Group>(null)
  const ringMatRef = useRef<THREE.MeshBasicMaterial>(null)
  const selectedUnitId = useGameStore((s) => s.selectedUnitId)
  const setSelectedUnitId = useGameStore((s) => s.setSelectedUnitId)
  const isSelected = selectedUnitId === unit.id

  const handleClick = useCallback((e: THREE.Event) => {
    (e as any).stopPropagation?.()
    setSelectedUnitId(isSelected ? null : unit.id)
  }, [unit.id, isSelected, setSelectedUnitId])

  const h = UNIT_HEIGHT[unit.unit_type] ?? 0.6
  const bodyColor = TEAM_COLOR[unit.team] ?? '#ffffff'
  const ringColor = isSelected ? '#ffffff' : (STATE_RING_COLOR[unit.state] ?? '#6b7280')
  const hpFrac = unit.hp / unit.max_hp
  const hpColor = hpFrac > 0.6 ? '#22c55e' : hpFrac > 0.3 ? '#f59e0b' : '#ef4444'
  const isStealthed = unit.is_stealthed

  useFrame((state, delta) => {
    if (!groupRef.current) return

    const tx = unit.position.x + 0.5
    const tz = unit.position.z + 0.5
    const f = Math.min(1, delta * 10)
    groupRef.current.position.x += (tx - groupRef.current.position.x) * f
    groupRef.current.position.z += (tz - groupRef.current.position.z) * f

    // Stealth shimmer: oscillating low opacity
    if (isStealthed) {
      groupRef.current.traverse((child) => {
        if ((child as THREE.Mesh).material && child.type === 'Mesh') {
          const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial
          if (mat.transparent !== undefined) {
            mat.transparent = true
            mat.opacity = 0.15 + Math.sin(state.clock.elapsedTime * 6) * 0.1
          }
        }
      })
    }

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
      onClick={handleClick}
    >
      {/* Invisible click target */}
      <mesh position={[0, h / 2 + 0.15, 0]} visible={false}>
        <boxGeometry args={[0.6, h + 0.3, 0.6]} />
        <meshBasicMaterial />
      </mesh>

      {/* State ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.3, 0]}>
        <ringGeometry args={[isSelected ? 0.35 : 0.3, isSelected ? 0.52 : 0.46, 24]} />
        <meshBasicMaterial
          ref={ringMatRef}
          color={ringColor}
          transparent
          opacity={isSelected ? 1 : 0.75}
          side={THREE.DoubleSide}
          depthTest={false}
        />
      </mesh>

      {/* Unit body by type */}
      {unit.unit_type === 'worker' && (
        <WorkerModel color={bodyColor} h={h} isGathering={unit.state === 'gathering'} />
      )}
      {unit.unit_type === 'warrior' && <WarriorModel color={bodyColor} h={h} />}
      {unit.unit_type === 'archer' && <ArcherModel color={bodyColor} h={h} />}
      {unit.unit_type === 'scout' && <ScoutModel color={bodyColor} h={h} />}

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
