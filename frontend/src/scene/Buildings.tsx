import { useRef } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Building, TeamState } from '../types'

const TEAM_COLOR: Record<string, string> = {
  red: '#991b1b',
  blue: '#1e40af',
}

const TEAM_LIGHT_COLOR: Record<string, string> = {
  red: '#ff4444',
  blue: '#4488ff',
}

const BUILDING_DIMS: Record<string, [number, number, number]> = {
  base: [1.4, 1.2, 1.4],
  barracks: [1.2, 0.9, 1.2],
  tower: [0.6, 1.8, 0.6],
  supply_depot: [0.9, 0.7, 0.9],
}

function TowerMesh({ building, color }: { building: Building; color: string }) {
  const [bw, bh, bd] = BUILDING_DIMS.tower
  const turretRef = useRef<THREE.Mesh>(null)
  const alpha = building.build_progress
  const hpFrac = building.hp / building.max_hp

  // Slowly rotate turret
  useFrame((state) => {
    if (turretRef.current && alpha >= 1) {
      turretRef.current.rotation.y = state.clock.elapsedTime * 0.8
    }
  })

  return (
    <>
      {/* Base column */}
      <mesh position={[0, (bh * alpha) / 2 + 0.15, 0]} castShadow receiveShadow>
        <boxGeometry args={[bw, bh * alpha + 0.01, bd]} />
        <meshStandardMaterial
          color={color}
          roughness={0.6}
          transparent={alpha < 1}
          opacity={0.5 + alpha * 0.5}
          emissive="#ff2200"
          emissiveIntensity={alpha >= 1 ? Math.max(0, (1 - hpFrac) * 0.6) : 0}
        />
      </mesh>
      {/* Turret top */}
      {alpha >= 1 && (
        <group position={[0, bh + 0.15, 0]}>
          <mesh ref={turretRef} position={[0, 0.25, 0]}>
            <coneGeometry args={[0.45, 0.5, 4]} />
            <meshStandardMaterial color={color} roughness={0.5} metalness={0.3} />
          </mesh>
          <pointLight color={TEAM_LIGHT_COLOR[building.team]} intensity={1.5} distance={6} position={[0, 0.5, 0]} />
        </group>
      )}
    </>
  )
}

function BarracksMesh({ building, color }: { building: Building; color: string }) {
  const [bw, bh, bd] = BUILDING_DIMS.barracks
  const hammerRef = useRef<THREE.Mesh>(null)
  const alpha = building.build_progress
  const hpFrac = building.hp / building.max_hp
  const isTraining = building.training_queue.length > 0

  useFrame((state) => {
    if (hammerRef.current && isTraining) {
      hammerRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 6) * 0.5
    }
  })

  return (
    <>
      <mesh position={[0, (bh * alpha) / 2 + 0.15, 0]} castShadow receiveShadow>
        <boxGeometry args={[bw, bh * alpha + 0.01, bd]} />
        <meshStandardMaterial
          color={color}
          roughness={0.6}
          transparent={alpha < 1}
          opacity={0.5 + alpha * 0.5}
          emissive="#ff2200"
          emissiveIntensity={alpha >= 1 ? Math.max(0, (1 - hpFrac) * 0.6) : 0}
        />
      </mesh>
      {/* Hammer when training */}
      {alpha >= 1 && isTraining && (
        <mesh ref={hammerRef} position={[bw / 2 + 0.1, bh * 0.8, 0]}>
          <boxGeometry args={[0.1, 0.4, 0.1]} />
          <meshStandardMaterial color="#888" metalness={0.5} roughness={0.4} />
        </mesh>
      )}
      {alpha >= 1 && (
        <pointLight color={TEAM_LIGHT_COLOR[building.team]} intensity={1} distance={4} position={[0, bh + 0.3, 0]} />
      )}
    </>
  )
}

function BaseMesh({ building, color }: { building: Building; color: string }) {
  const [bw, bh, bd] = BUILDING_DIMS.base
  const lightRef = useRef<THREE.PointLight>(null)
  const flagRef = useRef<THREE.Mesh>(null)
  const alpha = building.build_progress
  const hpFrac = building.hp / building.max_hp

  useFrame((state) => {
    if (lightRef.current) {
      lightRef.current.intensity = 1.5 + Math.sin(state.clock.elapsedTime * 3) * 0.5
    }
    if (flagRef.current) {
      flagRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.3
    }
  })

  return (
    <>
      <mesh position={[0, (bh * alpha) / 2 + 0.15, 0]} castShadow receiveShadow>
        <boxGeometry args={[bw, bh * alpha + 0.01, bd]} />
        <meshStandardMaterial
          color={color}
          roughness={0.5}
          transparent={alpha < 1}
          opacity={0.5 + alpha * 0.5}
          emissive="#ff2200"
          emissiveIntensity={alpha >= 1 ? Math.max(0, (1 - hpFrac) * 0.6) : 0}
        />
      </mesh>
      {/* Flag pole */}
      {alpha >= 1 && (
        <group position={[0, bh + 0.15, 0]}>
          {/* Pole */}
          <mesh position={[0, 0.4, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.8, 6]} />
            <meshStandardMaterial color="#888" metalness={0.4} />
          </mesh>
          {/* Flag */}
          <mesh ref={flagRef} position={[0.15, 0.7, 0]}>
            <boxGeometry args={[0.3, 0.18, 0.02]} />
            <meshStandardMaterial
              color={TEAM_LIGHT_COLOR[building.team]}
              emissive={TEAM_LIGHT_COLOR[building.team]}
              emissiveIntensity={0.3}
            />
          </mesh>
        </group>
      )}
      <pointLight ref={lightRef} color={TEAM_LIGHT_COLOR[building.team]} intensity={2} distance={6} position={[0, bh + 0.5, 0]} />
    </>
  )
}

function SupplyDepotMesh({ building, color }: { building: Building; color: string }) {
  const [bw, bh, bd] = BUILDING_DIMS.supply_depot
  const alpha = building.build_progress
  const hpFrac = building.hp / building.max_hp

  return (
    <>
      {/* Main crate */}
      <mesh position={[0, (bh * alpha) / 2 + 0.15, 0]} castShadow receiveShadow>
        <boxGeometry args={[bw, bh * alpha + 0.01, bd]} />
        <meshStandardMaterial
          color="#8B6914"
          roughness={0.85}
          transparent={alpha < 1}
          opacity={0.5 + alpha * 0.5}
          emissive="#ff2200"
          emissiveIntensity={alpha >= 1 ? Math.max(0, (1 - hpFrac) * 0.6) : 0}
        />
      </mesh>
      {/* Stacked smaller crate */}
      {alpha >= 1 && (
        <mesh position={[0.1, bh + 0.35, 0.05]} castShadow rotation={[0, 0.4, 0]}>
          <boxGeometry args={[bw * 0.6, bh * 0.4, bd * 0.6]} />
          <meshStandardMaterial color="#7a5c14" roughness={0.9} />
        </mesh>
      )}
      {alpha >= 1 && (
        <pointLight color={TEAM_LIGHT_COLOR[building.team]} intensity={0.8} distance={3} position={[0, bh + 0.3, 0]} />
      )}
    </>
  )
}

function BuildingMesh({ building }: { building: Building }) {
  const color = TEAM_COLOR[building.team] ?? '#888'
  const [bw, bh, bd] = BUILDING_DIMS[building.building_type] ?? [1, 1, 1]
  const hpFrac = building.hp / building.max_hp

  return (
    <group position={[building.position.x + 0.5, 0, building.position.z + 0.5]}>
      {building.building_type === 'tower' && <TowerMesh building={building} color={color} />}
      {building.building_type === 'barracks' && <BarracksMesh building={building} color={color} />}
      {building.building_type === 'base' && <BaseMesh building={building} color={color} />}
      {building.building_type === 'supply_depot' && <SupplyDepotMesh building={building} color={color} />}

      {/* HP bar */}
      <Html
        position={[0, bh + 0.6, 0]}
        center
        style={{ pointerEvents: 'none', userSelect: 'none' }}
        distanceFactor={18}
      >
        <div style={{ fontSize: 9, color: '#ddd', textAlign: 'center', marginBottom: 2 }}>
          {building.building_type.replace('_', ' ')}
        </div>
        <div style={{
          width: 40, height: 4,
          background: '#333', border: '1px solid #555', borderRadius: 2, overflow: 'hidden',
        }}>
          <div style={{
            width: `${hpFrac * 100}%`, height: '100%',
            background: hpFrac > 0.5 ? '#22c55e' : '#ef4444',
          }} />
        </div>
        {building.build_progress < 1 && (
          <div style={{
            width: 40, height: 3,
            background: '#555', border: '1px solid #777', borderRadius: 2,
            overflow: 'hidden', marginTop: 1,
          }}>
            <div style={{
              width: `${building.build_progress * 100}%`, height: '100%', background: '#fbbf24',
            }} />
          </div>
        )}
      </Html>
    </group>
  )
}

interface BuildingsProps {
  teams: Record<string, TeamState>
}

export default function Buildings({ teams }: BuildingsProps) {
  return (
    <group>
      {Object.values(teams).map((team) =>
        team.buildings.map((bld) => (
          <BuildingMesh key={bld.id} building={bld} />
        ))
      )}
    </group>
  )
}
