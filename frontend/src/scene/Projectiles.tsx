import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { TeamState } from '../types'

interface Projectile {
  id: string
  from: THREE.Vector3
  to: THREE.Vector3
  team: string
  startTime: number
  duration: number
}

const FLIGHT_DURATION = 0.5 // seconds

interface ProjectilesProps {
  teams: Record<string, TeamState>
}

export default function Projectiles({ teams }: ProjectilesProps) {
  const projectiles = useRef<Projectile[]>([])
  const prevAttacking = useRef<Set<string>>(new Set())
  const groupRef = useRef<THREE.Group>(null)
  const meshPool = useRef<THREE.Mesh[]>([])

  // Detect new archer attacks to spawn projectiles
  useMemo(() => {
    const currentAttacking = new Set<string>()

    for (const team of Object.values(teams)) {
      for (const unit of team.units) {
        if (unit.unit_type !== 'archer' || unit.state !== 'attacking' || !unit.target_unit_id) continue
        const key = `${unit.id}->${unit.target_unit_id}`
        currentAttacking.add(key)

        if (!prevAttacking.current.has(key)) {
          // Find target position
          let targetPos: THREE.Vector3 | null = null
          for (const t of Object.values(teams)) {
            for (const u of t.units) {
              if (u.id === unit.target_unit_id) {
                targetPos = new THREE.Vector3(u.position.x + 0.5, 0.6, u.position.z + 0.5)
                break
              }
            }
            if (targetPos) break
            for (const b of t.buildings) {
              if (b.id === unit.target_unit_id) {
                targetPos = new THREE.Vector3(b.position.x + 0.5, 0.7, b.position.z + 0.5)
                break
              }
            }
            if (targetPos) break
          }

          if (targetPos) {
            projectiles.current.push({
              id: `proj-${Date.now()}-${Math.random()}`,
              from: new THREE.Vector3(unit.position.x + 0.5, 0.8, unit.position.z + 0.5),
              to: targetPos,
              team: unit.team,
              startTime: -1, // set on first frame
              duration: FLIGHT_DURATION,
            })
          }
        }
      }
    }
    prevAttacking.current = currentAttacking
  }, [teams])

  useFrame((state) => {
    const now = state.clock.elapsedTime

    // Initialize start times
    for (const p of projectiles.current) {
      if (p.startTime < 0) p.startTime = now
    }

    // Remove expired
    projectiles.current = projectiles.current.filter((p) => now - p.startTime < p.duration)

    // Ensure enough meshes in pool
    const group = groupRef.current
    if (!group) return

    while (meshPool.current.length < projectiles.current.length) {
      const geo = new THREE.ConeGeometry(0.06, 0.2, 4)
      const mat = new THREE.MeshBasicMaterial({ color: '#ffaa44' })
      const mesh = new THREE.Mesh(geo, mat)
      group.add(mesh)
      meshPool.current.push(mesh)
    }

    // Hide extra
    for (let i = 0; i < meshPool.current.length; i++) {
      meshPool.current[i].visible = i < projectiles.current.length
    }

    // Animate
    for (let i = 0; i < projectiles.current.length; i++) {
      const p = projectiles.current[i]
      const mesh = meshPool.current[i]
      const t = Math.min(1, (now - p.startTime) / p.duration)

      // Parabolic arc
      const x = p.from.x + (p.to.x - p.from.x) * t
      const z = p.from.z + (p.to.z - p.from.z) * t
      const baseY = p.from.y + (p.to.y - p.from.y) * t
      const arcY = Math.sin(t * Math.PI) * 1.5 // arc height

      mesh.position.set(x, baseY + arcY, z)

      // Orient toward travel direction
      const dx = p.to.x - p.from.x
      const dz = p.to.z - p.from.z
      mesh.rotation.z = -Math.PI / 2
      mesh.rotation.y = Math.atan2(dx, dz)

      // Color by team
      const mat = mesh.material as THREE.MeshBasicMaterial
      mat.color.set(p.team === 'red' ? '#ff6644' : '#4488ff')
    }
  })

  return <group ref={groupRef} />
}
