import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { TeamState, GameEvent } from '../types'

const MAX_PARTICLES = 200
const DUST_LIFETIME = 0.5
const DEATH_LIFETIME = 1.0

interface Particle {
  position: THREE.Vector3
  velocity: THREE.Vector3
  color: THREE.Color
  age: number
  maxAge: number
  size: number
}

interface ParticlesProps {
  teams: Record<string, TeamState>
  events: GameEvent[]
}

export default function Particles({ teams, events }: ParticlesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const particles = useRef<Particle[]>([])
  const dummy = useMemo(() => new THREE.Matrix4(), [])
  const prevEventCount = useRef(0)

  // Spawn death fragments from events
  useMemo(() => {
    if (events.length === prevEventCount.current) return
    prevEventCount.current = events.length

    for (const e of events) {
      if (e.event_type === 'unit_killed' || e.event_type === 'building_destroyed') {
        const x = (e.data.x as number) ?? 0
        const z = (e.data.z as number) ?? 0
        const team = (e.data.team as string) ?? 'red'
        const color = team === 'red' ? '#ef4444' : '#3b82f6'
        const count = e.event_type === 'building_destroyed' ? 12 : 6

        for (let i = 0; i < count && particles.current.length < MAX_PARTICLES; i++) {
          particles.current.push({
            position: new THREE.Vector3(x + 0.5, 0.4, z + 0.5),
            velocity: new THREE.Vector3(
              (Math.random() - 0.5) * 4,
              Math.random() * 3 + 1,
              (Math.random() - 0.5) * 4,
            ),
            color: new THREE.Color(color),
            age: 0,
            maxAge: DEATH_LIFETIME,
            size: 0.06 + Math.random() * 0.06,
          })
        }
      }
    }
  }, [events])

  // Spawn dust trails from moving units (throttled)
  const dustTimer = useRef(0)

  useFrame((state, delta) => {
    dustTimer.current += delta
    if (dustTimer.current > 0.15) {
      dustTimer.current = 0
      for (const team of Object.values(teams)) {
        for (const unit of team.units) {
          if (unit.state !== 'moving' || particles.current.length >= MAX_PARTICLES) continue
          // Only 1 in 3 moving units get dust
          if (Math.random() > 0.33) continue
          particles.current.push({
            position: new THREE.Vector3(
              unit.position.x + 0.5 + (Math.random() - 0.5) * 0.2,
              0.15,
              unit.position.z + 0.5 + (Math.random() - 0.5) * 0.2,
            ),
            velocity: new THREE.Vector3(0, 0.3, 0),
            color: new THREE.Color('#c4a56a'),
            age: 0,
            maxAge: DUST_LIFETIME,
            size: 0.04,
          })
        }
      }
    }

    // Update particles
    const alive: Particle[] = []
    for (const p of particles.current) {
      p.age += delta
      if (p.age >= p.maxAge) continue
      // Gravity for death fragments
      if (p.maxAge > 0.6) {
        p.velocity.y -= 9.8 * delta
      }
      p.position.addScaledVector(p.velocity, delta)
      if (p.position.y < 0) p.position.y = 0
      alive.push(p)
    }
    particles.current = alive

    // Update instanced mesh
    const mesh = meshRef.current
    if (!mesh) return

    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (i < alive.length) {
        const p = alive[i]
        const t = p.age / p.maxAge
        const scale = p.size * (1 - t * 0.5)
        dummy.compose(
          p.position,
          new THREE.Quaternion(),
          new THREE.Vector3(scale, scale, scale),
        )
        mesh.setMatrixAt(i, dummy)
        mesh.setColorAt(i, p.color)
      } else {
        // Hide unused
        dummy.compose(
          new THREE.Vector3(0, -10, 0),
          new THREE.Quaternion(),
          new THREE.Vector3(0, 0, 0),
        )
        mesh.setMatrixAt(i, dummy)
      }
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_PARTICLES]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  )
}
