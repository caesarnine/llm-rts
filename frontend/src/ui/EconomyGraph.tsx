import { useRef, useEffect } from 'react'
import { useGameStore } from '../store/gameStore'

const W = 180
const H = 50
const MAX_POINTS = 60

export default function EconomyGraph() {
  const svgRef = useRef<SVGSVGElement>(null)
  const history = useRef<{ red: number[]; blue: number[] }>({ red: [], blue: [] })
  const gameState = useGameStore((s) => s.gameState)

  useEffect(() => {
    if (!gameState || gameState.phase !== 'running') return

    const redGold = gameState.teams.red?.resources?.gold ?? 0
    const blueGold = gameState.teams.blue?.resources?.gold ?? 0

    history.current.red.push(redGold)
    history.current.blue.push(blueGold)

    if (history.current.red.length > MAX_POINTS) {
      history.current.red.shift()
      history.current.blue.shift()
    }
  }, [gameState?.tick])

  if (!gameState || gameState.phase !== 'running') return null

  const redData = history.current.red
  const blueData = history.current.blue
  const maxVal = Math.max(10, ...redData, ...blueData)

  const toPath = (data: number[]) => {
    if (data.length < 2) return ''
    return data
      .map((v, i) => {
        const x = (i / (MAX_POINTS - 1)) * W
        const y = H - (v / maxVal) * (H - 4)
        return `${i === 0 ? 'M' : 'L'}${x},${y}`
      })
      .join(' ')
  }

  return (
    <div>
      <div style={{ fontSize: 9, color: '#555', marginBottom: 2, letterSpacing: 1 }}>GOLD</div>
      <svg
        ref={svgRef}
        width={W}
        height={H}
        style={{
          background: 'rgba(10,10,20,0.7)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 4,
        }}
      >
        <path d={toPath(redData)} fill="none" stroke="#ef4444" strokeWidth={1.5} opacity={0.8} />
        <path d={toPath(blueData)} fill="none" stroke="#3b82f6" strokeWidth={1.5} opacity={0.8} />
      </svg>
    </div>
  )
}
