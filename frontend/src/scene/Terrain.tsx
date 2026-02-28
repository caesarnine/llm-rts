import { useMemo } from 'react'
import * as THREE from 'three'

const TERRAIN_COLORS: Record<number, string> = {
  0: '#3a7d44',  // grass — medium green
  1: '#1a4a28',  // forest — dark green
  2: '#7a7a8a',  // mountain — grey
  3: '#1e3a5f',  // water — dark blue
}

const TERRAIN_HEIGHT: Record<number, number> = {
  0: 0.12,
  1: 0.28,
  2: 0.55,
  3: 0.06,
}

interface TerrainProps {
  terrain: number[][]
  mapWidth: number
  mapHeight: number
}

export default function Terrain({ terrain, mapWidth, mapHeight }: TerrainProps) {
  // Build instanced meshes per terrain type for performance
  const byType = useMemo(() => {
    const map: Record<number, THREE.Matrix4[]> = { 0: [], 1: [], 2: [], 3: [] }
    for (let z = 0; z < terrain.length; z++) {
      for (let x = 0; x < terrain[z].length; x++) {
        const t = terrain[z][x]
        const h = TERRAIN_HEIGHT[t] ?? 0.12
        const mat = new THREE.Matrix4().compose(
          new THREE.Vector3(x + 0.5, h / 2 - 0.05, z + 0.5),
          new THREE.Quaternion(),
          new THREE.Vector3(0.97, h, 0.97),
        )
        ;(map[t] ??= []).push(mat)
      }
    }
    return map
  }, [terrain])

  return (
    <group>
      {/* Ground plane */}
      <mesh position={[mapWidth / 2, -0.1, mapHeight / 2]} receiveShadow>
        <boxGeometry args={[mapWidth + 2, 0.2, mapHeight + 2]} />
        <meshStandardMaterial color="#1e2a18" />
      </mesh>

      {/* Terrain tiles by type */}
      {([0, 1, 2, 3] as const).map((ttype) => {
        const matrices = byType[ttype]
        if (!matrices?.length) return null
        const color = TERRAIN_COLORS[ttype]
        return (
          <instancedMesh
            key={ttype}
            args={[undefined, undefined, matrices.length]}
            receiveShadow
            castShadow={ttype === 2}
            ref={(mesh) => {
              if (!mesh) return
              matrices.forEach((m, i) => mesh.setMatrixAt(i, m))
              mesh.instanceMatrix.needsUpdate = true
            }}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color={color}
              roughness={ttype === 3 ? 0.05 : 0.85}
              metalness={ttype === 3 ? 0.1 : 0}
            />
          </instancedMesh>
        )
      })}
    </group>
  )
}
