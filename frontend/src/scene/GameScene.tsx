import { PerspectiveCamera, OrbitControls } from '@react-three/drei'
import { useGameStore } from '../store/gameStore'
import Terrain from './Terrain'
import Units from './Units'
import Buildings from './Buildings'
import ResourceNodes from './ResourceNodes'

export default function GameScene() {
  const gameState = useGameStore((s) => s.gameState)

  const mapW = gameState?.map_width ?? 32
  const mapH = gameState?.map_height ?? 32
  const cx = mapW / 2
  const cz = mapH / 2

  return (
    <>
      {/* Set THREE.js scene background (not just the canvas CSS) */}
      <color attach="background" args={['#1a1a2e']} />

      {/* High-angle perspective gives a clean isometric-like look */}
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

      {/* Lighting */}
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[mapW * 0.8, mapW, mapH * 0.5]}
        intensity={1.3}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[-8, 8, -8]} intensity={0.25} color="#8aaeff" />

      {/* Scene content */}
      {gameState ? (
        <>
          <Terrain terrain={gameState.terrain} mapWidth={mapW} mapHeight={mapH} />
          <ResourceNodes nodes={gameState.resource_nodes} />
          <Buildings teams={gameState.teams} />
          <Units teams={gameState.teams} />
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
