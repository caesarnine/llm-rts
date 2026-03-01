import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { MapEvent } from '../types'

function GoldCache({ event }: { event: MapEvent }) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 2
      meshRef.current.position.y = 1.0 + Math.sin(state.clock.elapsedTime * 3) * 0.2
    }
  })

  return (
    <group position={[event.position.x, 0, event.position.z]}>
      <mesh ref={meshRef} position={[0, 1.0, 0]}>
        <octahedronGeometry args={[0.4, 0]} />
        <meshStandardMaterial
          color="#ffd700"
          emissive="#ffa500"
          emissiveIntensity={0.8}
          metalness={0.8}
          roughness={0.1}
        />
      </mesh>
      <pointLight position={[0, 1.2, 0]} color="#ffd700" intensity={2} distance={4} />
    </group>
  )
}

function Supercharge({ event }: { event: MapEvent }) {
  const ringRef = useRef<THREE.Mesh>(null)
  const beamRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.y = state.clock.elapsedTime * 3
    }
    if (beamRef.current) {
      const pulse = 0.5 + Math.sin(state.clock.elapsedTime * 5) * 0.3
      ;(beamRef.current.material as THREE.MeshBasicMaterial).opacity = pulse
    }
  })

  return (
    <group position={[event.position.x, 0, event.position.z]}>
      {/* Light beam */}
      <mesh ref={beamRef} position={[0, 3, 0]}>
        <cylinderGeometry args={[0.15, 0.4, 6, 8]} />
        <meshBasicMaterial color="#aa44ff" transparent opacity={0.5} depthTest={false} />
      </mesh>
      {/* Rotating torus */}
      <mesh ref={ringRef} position={[0, 1.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.6, 0.08, 8, 24]} />
        <meshStandardMaterial
          color="#bb66ff"
          emissive="#9933ff"
          emissiveIntensity={0.8}
        />
      </mesh>
      <pointLight position={[0, 2, 0]} color="#9933ff" intensity={2} distance={5} />
    </group>
  )
}

function ResourceRefresh({ event }: { event: MapEvent }) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 2
      // Fade out as it nears expiry — but resource refresh is instant, so just sparkle
      const scale = 0.8 + Math.sin(state.clock.elapsedTime * 6) * 0.2
      groupRef.current.scale.setScalar(scale)
    }
  })

  return (
    <group ref={groupRef} position={[event.position.x, 0.8, event.position.z]}>
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          position={[
            Math.cos((i / 4) * Math.PI * 2) * 0.5,
            0,
            Math.sin((i / 4) * Math.PI * 2) * 0.5,
          ]}
        >
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial
            color="#22ff88"
            emissive="#11cc66"
            emissiveIntensity={1.0}
          />
        </mesh>
      ))}
    </group>
  )
}

interface MapEventsProps {
  events: MapEvent[]
}

export default function MapEvents({ events }: MapEventsProps) {
  if (!events || events.length === 0) return null

  return (
    <group>
      {events.map((event) => {
        switch (event.event_type) {
          case 'gold_cache':
            return <GoldCache key={event.id} event={event} />
          case 'supercharge':
            return <Supercharge key={event.id} event={event} />
          case 'resource_refresh':
            return <ResourceRefresh key={event.id} event={event} />
          default:
            return null
        }
      })}
    </group>
  )
}
