import { useRef } from 'react'
import { PerspectiveCamera, OrbitControls, Stars } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../store/gameStore'
import Terrain from './Terrain'
import Units from './Units'
import Buildings from './Buildings'
import ResourceNodes from './ResourceNodes'
import AttackLines from './AttackLines'
import Effects from './Effects'
import CapturePoints from './CapturePoints'
import MapEvents from './MapEvents'
import AbilityEffects from './AbilityEffects'
import Projectiles from './Projectiles'
import Particles from './Particles'

const DAY_CYCLE = 120 // ticks per full cycle

function DayNightCycle({ tick, mapW, mapH }: { tick: number; mapW: number; mapH: number }) {
  const ambientRef = useRef<THREE.AmbientLight>(null)
  const dirRef = useRef<THREE.DirectionalLight>(null)

  useFrame(() => {
    const phase = (tick % DAY_CYCLE) / DAY_CYCLE // 0→1
    // 0→0.5 = day, 0.5→1 = night
    const dayFactor = Math.cos(phase * Math.PI * 2) * 0.5 + 0.5 // 1 at noon, 0 at midnight

    if (ambientRef.current) {
      const warmR = 0.35 + dayFactor * 0.25
      const warmG = 0.30 + dayFactor * 0.25
      const warmB = 0.25 + dayFactor * 0.15
      ambientRef.current.color.setRGB(warmR, warmG, warmB)
      ambientRef.current.intensity = 0.3 + dayFactor * 0.4
    }

    if (dirRef.current) {
      dirRef.current.intensity = 0.4 + dayFactor * 1.0
      const angle = phase * Math.PI * 2
      dirRef.current.position.set(
        mapW * 0.5 + Math.cos(angle) * mapW * 0.6,
        8 + dayFactor * 20,
        mapH * 0.5 + Math.sin(angle) * mapH * 0.4,
      )
    }
  })

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.55} />
      <directionalLight
        ref={dirRef}
        position={[mapW * 0.8, 25, mapH * 0.5]}
        intensity={1.3}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[-8, 8, -8]} intensity={0.15} color="#8aaeff" />
    </>
  )
}

export default function GameScene() {
  const gameState = useGameStore((s) => s.gameState)

  const mapW = gameState?.map_width ?? 32
  const mapH = gameState?.map_height ?? 32
  const cx = mapW / 2
  const cz = mapH / 2
  const tick = gameState?.tick ?? 0

  return (
    <>
      <color attach="background" args={['#0d0d1a']} />
      <fog attach="fog" args={['#0d0d1a', 40, 90]} />

      <PerspectiveCamera
        makeDefault
        position={[cx + 18, 30, cz + 30]}
        fov={55}
      />

      <OrbitControls
        target={[cx, 0, cz]}
        minDistance={8}
        maxDistance={90}
        maxPolarAngle={Math.PI / 2.4}
        minPolarAngle={Math.PI / 8}
        enablePan
        panSpeed={0.8}
        zoomSpeed={1.2}
      />

      <Stars radius={80} depth={50} count={2000} factor={3} saturation={0.2} fade speed={0.5} />

      <DayNightCycle tick={tick} mapW={mapW} mapH={mapH} />

      {gameState ? (
        <>
          <Terrain terrain={gameState.terrain} mapWidth={mapW} mapHeight={mapH} />
          <ResourceNodes nodes={gameState.resource_nodes} />
          <CapturePoints nodes={gameState.capture_points} />
          <Buildings teams={gameState.teams} />
          <Units teams={gameState.teams} />
          <AttackLines teams={gameState.teams} />
          <AbilityEffects teams={gameState.teams} />
          <Projectiles teams={gameState.teams} />
          <Particles teams={gameState.teams} events={gameState.events} />
          <MapEvents events={gameState.active_map_events ?? []} />
          <Effects />
        </>
      ) : (
        <mesh position={[cx, -0.05, cz]} receiveShadow>
          <boxGeometry args={[mapW + 2, 0.1, mapH + 2]} />
          <meshStandardMaterial color="#2d4a1e" />
        </mesh>
      )}
    </>
  )
}
