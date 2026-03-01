import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const GRASS_SHADES = ['#2d6b35', '#3a7d44', '#47914f', '#358a3f', '#2a7030']
const FOREST_BASE = '#1a4a28'
const MOUNTAIN_COLOR = '#7a7a8a'
const WATER_COLOR = '#1e3a5f'

const TERRAIN_HEIGHT: Record<number, number> = {
  0: 0.12,
  1: 0.28,
  2: 0.55,
  3: 0.06,
}

// Simple hash for deterministic per-tile variation
function tileHash(x: number, z: number): number {
  let h = (x * 374761393 + z * 668265263) >>> 0
  h = ((h ^ (h >> 13)) * 1274126177) >>> 0
  return (h ^ (h >> 16)) >>> 0
}

interface TerrainProps {
  terrain: number[][]
  mapWidth: number
  mapHeight: number
}

function WaterTiles({ matrices }: { matrices: THREE.Matrix4[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const basePositions = useRef<Float32Array | null>(null)

  // Store base Y positions
  useMemo(() => {
    const positions = new Float32Array(matrices.length)
    const tmp = new THREE.Vector3()
    matrices.forEach((m, i) => {
      tmp.setFromMatrixPosition(m)
      positions[i] = tmp.y
    })
    basePositions.current = positions
  }, [matrices])

  useFrame((state) => {
    if (!meshRef.current || !basePositions.current) return
    const t = state.clock.elapsedTime
    const tmp = new THREE.Matrix4()
    const pos = new THREE.Vector3()
    const quat = new THREE.Quaternion()
    const scale = new THREE.Vector3()

    for (let i = 0; i < matrices.length; i++) {
      meshRef.current.getMatrixAt(i, tmp)
      tmp.decompose(pos, quat, scale)
      const wave = Math.sin(t * 1.5 + pos.x * 0.8 + pos.z * 0.6) * 0.03
      pos.y = basePositions.current[i] + wave
      tmp.compose(pos, quat, scale)
      meshRef.current.setMatrixAt(i, tmp)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, matrices.length]}
      receiveShadow
      onUpdate={(mesh) => {
        matrices.forEach((m, i) => mesh.setMatrixAt(i, m))
        mesh.instanceMatrix.needsUpdate = true
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={WATER_COLOR}
        roughness={0.05}
        metalness={0.15}
        emissive="#0a1a3a"
        emissiveIntensity={0.2}
      />
    </instancedMesh>
  )
}

export default function Terrain({ terrain, mapWidth, mapHeight }: TerrainProps) {
  const { grassData, forestData, mountainData, waterMatrices, treeData } = useMemo(() => {
    const grassMatrices: THREE.Matrix4[] = []
    const grassColors: THREE.Color[] = []
    const forestMatrices: THREE.Matrix4[] = []
    const mountainMatrices: THREE.Matrix4[] = []
    const waterMats: THREE.Matrix4[] = []
    // Tree instances: cones for canopy, cylinders for trunks
    const treePosns: { x: number; z: number; scale: number }[] = []

    for (let z = 0; z < terrain.length; z++) {
      for (let x = 0; x < terrain[z].length; x++) {
        const t = terrain[z][x]
        const h = TERRAIN_HEIGHT[t] ?? 0.12
        const mat = new THREE.Matrix4().compose(
          new THREE.Vector3(x + 0.5, h / 2 - 0.05, z + 0.5),
          new THREE.Quaternion(),
          new THREE.Vector3(0.97, h, 0.97),
        )

        if (t === 0) {
          grassMatrices.push(mat)
          const shade = GRASS_SHADES[tileHash(x, z) % GRASS_SHADES.length]
          grassColors.push(new THREE.Color(shade))
        } else if (t === 1) {
          forestMatrices.push(mat)
          // 3 trees per forest tile at pseudo-random offsets
          const hash = tileHash(x, z)
          for (let i = 0; i < 3; i++) {
            const subHash = tileHash(x + i * 7, z + i * 13)
            const ox = (((subHash >> 0) & 0xff) / 255) * 0.6 - 0.3
            const oz = (((subHash >> 8) & 0xff) / 255) * 0.6 - 0.3
            const sc = 0.6 + (((subHash >> 16) & 0xff) / 255) * 0.5
            treePosns.push({ x: x + 0.5 + ox, z: z + 0.5 + oz, scale: sc })
          }
        } else if (t === 2) {
          // Multi-box mountain cluster (2-3 boxes per tile)
          const hash = tileHash(x, z)
          const count = 2 + (hash % 2)
          for (let i = 0; i < count; i++) {
            const subH = tileHash(x + i * 5, z + i * 11)
            const oh = 0.4 + (((subH >> 0) & 0xff) / 255) * 0.5
            const ox = (((subH >> 8) & 0xff) / 255) * 0.4 - 0.2
            const oz = (((subH >> 16) & 0xff) / 255) * 0.4 - 0.2
            const sw = 0.3 + (((subH >> 4) & 0xff) / 255) * 0.35
            const sd = 0.3 + (((subH >> 12) & 0xff) / 255) * 0.35
            mountainMatrices.push(
              new THREE.Matrix4().compose(
                new THREE.Vector3(x + 0.5 + ox, oh / 2 - 0.05, z + 0.5 + oz),
                new THREE.Quaternion(),
                new THREE.Vector3(sw, oh, sd),
              )
            )
          }
        } else if (t === 3) {
          waterMats.push(mat)
        }
      }
    }

    return {
      grassData: { matrices: grassMatrices, colors: grassColors },
      forestData: { matrices: forestMatrices },
      mountainData: { matrices: mountainMatrices },
      waterMatrices: waterMats,
      treeData: treePosns,
    }
  }, [terrain])

  // Tree canopy + trunk instanced meshes
  const { canopyMatrices, trunkMatrices } = useMemo(() => {
    const canopy: THREE.Matrix4[] = []
    const trunk: THREE.Matrix4[] = []
    for (const t of treeData) {
      const canopyH = 0.5 * t.scale
      const trunkH = 0.3 * t.scale
      canopy.push(
        new THREE.Matrix4().compose(
          new THREE.Vector3(t.x, TERRAIN_HEIGHT[1] + trunkH + canopyH * 0.4, t.z),
          new THREE.Quaternion(),
          new THREE.Vector3(t.scale * 0.35, canopyH, t.scale * 0.35),
        )
      )
      trunk.push(
        new THREE.Matrix4().compose(
          new THREE.Vector3(t.x, TERRAIN_HEIGHT[1] + trunkH * 0.4, t.z),
          new THREE.Quaternion(),
          new THREE.Vector3(t.scale * 0.08, trunkH, t.scale * 0.08),
        )
      )
    }
    return { canopyMatrices: canopy, trunkMatrices: trunk }
  }, [treeData])

  return (
    <group>
      {/* Ground plane */}
      <mesh position={[mapWidth / 2, -0.1, mapHeight / 2]} receiveShadow>
        <boxGeometry args={[mapWidth + 2, 0.2, mapHeight + 2]} />
        <meshStandardMaterial color="#1e2a18" />
      </mesh>

      {/* Grass with per-tile color variation */}
      {grassData.matrices.length > 0 && (
        <instancedMesh
          args={[undefined, undefined, grassData.matrices.length]}
          receiveShadow
          ref={(mesh) => {
            if (!mesh) return
            grassData.matrices.forEach((m, i) => mesh.setMatrixAt(i, m))
            // Per-instance colors
            const colors = new Float32Array(grassData.matrices.length * 3)
            grassData.colors.forEach((c, i) => {
              colors[i * 3] = c.r
              colors[i * 3 + 1] = c.g
              colors[i * 3 + 2] = c.b
            })
            mesh.geometry.setAttribute('color', new THREE.InstancedBufferAttribute(colors, 3))
            mesh.instanceMatrix.needsUpdate = true
          }}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial vertexColors roughness={0.85} metalness={0} />
        </instancedMesh>
      )}

      {/* Forest base tiles */}
      {forestData.matrices.length > 0 && (
        <instancedMesh
          args={[undefined, undefined, forestData.matrices.length]}
          receiveShadow
          ref={(mesh) => {
            if (!mesh) return
            forestData.matrices.forEach((m, i) => mesh.setMatrixAt(i, m))
            mesh.instanceMatrix.needsUpdate = true
          }}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={FOREST_BASE} roughness={0.85} />
        </instancedMesh>
      )}

      {/* Tree canopies */}
      {canopyMatrices.length > 0 && (
        <instancedMesh
          args={[undefined, undefined, canopyMatrices.length]}
          castShadow
          ref={(mesh) => {
            if (!mesh) return
            canopyMatrices.forEach((m, i) => mesh.setMatrixAt(i, m))
            mesh.instanceMatrix.needsUpdate = true
          }}
        >
          <coneGeometry args={[1, 1, 6]} />
          <meshStandardMaterial color="#1d5c2e" roughness={0.8} />
        </instancedMesh>
      )}

      {/* Tree trunks */}
      {trunkMatrices.length > 0 && (
        <instancedMesh
          args={[undefined, undefined, trunkMatrices.length]}
          castShadow
          ref={(mesh) => {
            if (!mesh) return
            trunkMatrices.forEach((m, i) => mesh.setMatrixAt(i, m))
            mesh.instanceMatrix.needsUpdate = true
          }}
        >
          <cylinderGeometry args={[1, 1, 1, 6]} />
          <meshStandardMaterial color="#5c3a1e" roughness={0.9} />
        </instancedMesh>
      )}

      {/* Mountains (jagged multi-box clusters) */}
      {mountainData.matrices.length > 0 && (
        <instancedMesh
          args={[undefined, undefined, mountainData.matrices.length]}
          castShadow
          receiveShadow
          ref={(mesh) => {
            if (!mesh) return
            mountainData.matrices.forEach((m, i) => mesh.setMatrixAt(i, m))
            mesh.instanceMatrix.needsUpdate = true
          }}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={MOUNTAIN_COLOR} roughness={0.75} metalness={0.1} />
        </instancedMesh>
      )}

      {/* Water (animated) */}
      {waterMatrices.length > 0 && <WaterTiles matrices={waterMatrices} />}
    </group>
  )
}
