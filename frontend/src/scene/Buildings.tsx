import { Html } from '@react-three/drei'
import * as THREE from 'three'
import type { Building, TeamState } from '../types'

const TEAM_COLOR: Record<string, string> = {
  red: '#991b1b',
  blue: '#1e40af',
}

const BUILDING_DIMS: Record<string, [number, number, number]> = {
  base:     [1.4, 1.2, 1.4],
  barracks: [1.2, 0.9, 1.2],
  tower:    [0.6, 1.8, 0.6],
  mine:     [1.0, 0.6, 1.0],
}

function BuildingMesh({ building }: { building: Building }) {
  const [bw, bh, bd] = BUILDING_DIMS[building.building_type] ?? [1, 1, 1]
  const color = TEAM_COLOR[building.team] ?? '#888'
  const alpha = building.build_progress
  const hpFrac = building.hp / building.max_hp

  return (
    <group position={[building.position.x + 0.5, 0, building.position.z + 0.5]}>
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

      {/* Tower variant: cone top */}
      {building.building_type === 'tower' && building.build_progress >= 1 && (
        <mesh position={[0, bh + 0.15 + 0.25, 0]}>
          <coneGeometry args={[0.45, 0.5, 4]} />
          <meshStandardMaterial color={color} roughness={0.5} />
        </mesh>
      )}

      {/* HP bar */}
      <Html
        position={[0, bh + 0.6, 0]}
        center
        style={{ pointerEvents: 'none', userSelect: 'none' }}
        distanceFactor={18}
      >
        <div style={{ fontSize: 9, color: '#ddd', textAlign: 'center', marginBottom: 2 }}>
          {building.building_type}
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
