import { useMemo, useRef } from 'react'
import { Line } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { TeamState } from '../types'

interface AttackLinesProps {
  teams: Record<string, TeamState>
}

interface AttackPair {
  from: [number, number, number]
  to: [number, number, number]
  isArcher: boolean
  team: string
}

export default function AttackLines({ teams }: AttackLinesProps) {
  // Build a flat id→position map covering all units and buildings
  const posMap = useMemo(() => {
    const map = new Map<string, [number, number, number]>()
    for (const team of Object.values(teams)) {
      for (const u of team.units) {
        map.set(u.id, [u.position.x + 0.5, 0.55, u.position.z + 0.5])
      }
      for (const b of team.buildings) {
        map.set(b.id, [b.position.x + 0.5, 0.7, b.position.z + 0.5])
      }
    }
    return map
  }, [teams])

  const pairs = useMemo<AttackPair[]>(() => {
    const result: AttackPair[] = []
    for (const team of Object.values(teams)) {
      for (const unit of team.units) {
        if (unit.state !== 'attacking' || !unit.target_unit_id) continue
        const from = posMap.get(unit.id)
        const to = posMap.get(unit.target_unit_id)
        if (!from || !to) continue
        result.push({
          from,
          to,
          isArcher: unit.unit_type === 'archer',
          team: unit.team,
        })
      }
    }
    return result
  }, [teams, posMap])

  // Pulse opacity via a ref so we don't re-render every frame
  const opacityRef = useRef(0.8)
  useFrame((state) => {
    opacityRef.current = 0.35 + Math.abs(Math.sin(state.clock.elapsedTime * 7)) * 0.65
  })

  // Wrapper so we can drive opacity imperatively
  function PulsingLine({ pair }: { pair: AttackPair }) {
    const lineRef = useRef<any>(null)
    useFrame(() => {
      if (lineRef.current?.material) {
        lineRef.current.material.opacity = opacityRef.current
      }
    })

    const color = pair.team === 'red' ? '#ff7070' : '#70a8ff'
    const width = pair.isArcher ? 1.2 : 2.5

    return (
      <Line
        ref={lineRef}
        points={[pair.from, pair.to]}
        color={color}
        lineWidth={width}
        transparent
        opacity={0.8}
        depthTest={false}
      />
    )
  }

  if (!pairs.length) return null

  return (
    <group>
      {pairs.map((pair, i) => (
        <PulsingLine key={i} pair={pair} />
      ))}
    </group>
  )
}
