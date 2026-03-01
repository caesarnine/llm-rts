import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore, type DeathEffect } from '../store/gameStore'

// Expanding ring that fades out at a death/destruction position
function DeathRing({ effect }: { effect: DeathEffect }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.MeshBasicMaterial>(null)
  const age = useRef(0)

  const maxAge = effect.isBuilding ? 1.4 : 0.8
  const maxScale = effect.isBuilding ? 4.0 : 2.0
  const color = effect.team === 'red' ? '#ff4444' : '#4488ff'

  useFrame((_, delta) => {
    age.current += delta
    const t = Math.min(age.current / maxAge, 1)

    if (meshRef.current) {
      const s = 0.2 + t * maxScale
      meshRef.current.scale.set(s, s, s)
    }
    if (matRef.current) {
      matRef.current.opacity = Math.max(0, 1 - t * t)
    }
  })

  return (
    <mesh
      ref={meshRef}
      position={[effect.x + 0.5, 0.25, effect.z + 0.5]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <ringGeometry args={[0.3, effect.isBuilding ? 0.6 : 0.45, 24]} />
      <meshBasicMaterial
        ref={matRef}
        color={color}
        transparent
        opacity={1}
        side={THREE.DoubleSide}
        depthTest={false}
      />
    </mesh>
  )
}

// Second inner ring for buildings — gives a more dramatic explosion feel
function BuildingExplosion({ effect }: { effect: DeathEffect }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.MeshBasicMaterial>(null)
  const age = useRef(0)

  useFrame((_, delta) => {
    age.current += delta
    const t = Math.min(age.current / 0.7, 1)
    if (meshRef.current) {
      const s = 0.1 + t * 2.2
      meshRef.current.scale.set(s, s, s)
    }
    if (matRef.current) {
      matRef.current.opacity = Math.max(0, 1 - t)
    }
  })

  return (
    <mesh
      ref={meshRef}
      position={[effect.x + 0.5, 0.3, effect.z + 0.5]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <circleGeometry args={[0.5, 20]} />
      <meshBasicMaterial
        ref={matRef}
        color="#ffaa22"
        transparent
        opacity={1}
        side={THREE.DoubleSide}
        depthTest={false}
      />
    </mesh>
  )
}

export default function Effects() {
  const effects = useGameStore((s) => s.deathEffects)
  const prune = useGameStore((s) => s.pruneDeathEffects)

  // Prune stale effects every second
  useEffect(() => {
    const id = setInterval(prune, 1000)
    return () => clearInterval(id)
  }, [prune])

  return (
    <group>
      {effects.map((e) => (
        <group key={e.id}>
          <DeathRing effect={e} />
          {e.isBuilding && <BuildingExplosion effect={e} />}
        </group>
      ))}
    </group>
  )
}
