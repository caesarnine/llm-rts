import { useRef, useEffect } from 'react'
import { useGameStore } from '../store/gameStore'

const SIZE = 140

const TERRAIN_MINIMAP_COLOR: Record<number, string> = {
  0: '#3a7d44',
  1: '#1a4a28',
  2: '#7a7a8a',
  3: '#1e3a5f',
}

export default function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameState = useGameStore((s) => s.gameState)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !gameState) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { terrain, map_width: mapW, map_height: mapH, teams, resource_nodes, capture_points } = gameState
    const scaleX = SIZE / mapW
    const scaleZ = SIZE / mapH

    ctx.fillStyle = '#111'
    ctx.fillRect(0, 0, SIZE, SIZE)

    // Terrain
    for (let z = 0; z < terrain.length; z++) {
      for (let x = 0; x < terrain[z].length; x++) {
        ctx.fillStyle = TERRAIN_MINIMAP_COLOR[terrain[z][x]] ?? '#333'
        ctx.fillRect(x * scaleX, z * scaleZ, Math.ceil(scaleX), Math.ceil(scaleZ))
      }
    }

    // Resource nodes
    for (const node of resource_nodes) {
      ctx.fillStyle = node.resource_type === 'gold' ? '#ffd700' : node.resource_type === 'wood' ? '#8B6914' : '#aaa'
      ctx.fillRect(node.position.x * scaleX - 1, node.position.z * scaleZ - 1, 3, 3)
    }

    // Capture points
    for (const cp of capture_points) {
      ctx.fillStyle = cp.owner === 'red' ? '#ef4444' : cp.owner === 'blue' ? '#3b82f6' : '#fbbf24'
      ctx.beginPath()
      ctx.arc(cp.position.x * scaleX, cp.position.z * scaleZ, 3, 0, Math.PI * 2)
      ctx.fill()
    }

    // Buildings
    for (const team of Object.values(teams)) {
      ctx.fillStyle = team.team === 'red' ? '#cc3333' : '#3366cc'
      for (const b of team.buildings) {
        ctx.fillRect(b.position.x * scaleX - 2, b.position.z * scaleZ - 2, 4, 4)
      }
    }

    // Units
    for (const team of Object.values(teams)) {
      ctx.fillStyle = team.team === 'red' ? '#ff6666' : '#6699ff'
      for (const u of team.units) {
        ctx.fillRect(u.position.x * scaleX - 1, u.position.z * scaleZ - 1, 2, 2)
      }
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.1)'
    ctx.lineWidth = 1
    ctx.strokeRect(0, 0, SIZE, SIZE)
  }, [gameState])

  if (!gameState || gameState.phase === 'starting') return null

  return (
    <canvas
      ref={canvasRef}
      width={SIZE}
      height={SIZE}
      style={{
        borderRadius: 4,
        border: '1px solid rgba(255,255,255,0.08)',
        imageRendering: 'pixelated',
      }}
    />
  )
}
