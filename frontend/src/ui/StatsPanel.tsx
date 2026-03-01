import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useGameStore } from '../store/gameStore'

const TECH_NAMES: Record<string, string> = {
  iron_weapons: 'Iron Weapons',
  fletching: 'Fletching',
  reinforced_armor: 'Reinforced Armor',
  swift_boots: 'Swift Boots',
  fortification: 'Fortification',
  war_economy: 'War Economy',
  siege_engineering: 'Siege Engineering',
  battle_tactics: 'Battle Tactics',
}

const card: CSSProperties = {
  background: 'rgba(10,10,20,0.85)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 6,
  padding: '6px 10px',
  backdropFilter: 'blur(6px)',
}

function StatRow({ label, red, blue }: { label: string; red: number; blue: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, lineHeight: 1.6 }}>
      <span style={{ color: '#ef4444', minWidth: 30, textAlign: 'right' }}>{red}</span>
      <span style={{ color: '#888', flex: 1, textAlign: 'center', fontSize: 9 }}>{label}</span>
      <span style={{ color: '#3b82f6', minWidth: 30 }}>{blue}</span>
    </div>
  )
}

function TechList({ team }: { team: 'red' | 'blue' }) {
  const researched = useGameStore((s) => s.gameState?.teams[team]?.researched_techs ?? [])
  const queue = useGameStore((s) => s.gameState?.teams[team]?.research_queue)
  const color = team === 'red' ? '#ef4444' : '#3b82f6'
  const dimColor = team === 'red' ? 'rgba(239,68,68,0.4)' : 'rgba(59,130,246,0.4)'

  return (
    <div>
      <div style={{ fontSize: 8, color, letterSpacing: 0.5, fontWeight: 'bold', marginBottom: 2 }}>
        {team.toUpperCase()}
      </div>
      {researched.length === 0 && !queue?.tech_id && (
        <div style={{ fontSize: 9, color: '#555' }}>None</div>
      )}
      {researched.map(tid => (
        <div key={tid} style={{ fontSize: 9, color: '#aaa' }}>
          {TECH_NAMES[tid] ?? tid}
        </div>
      ))}
      {queue?.tech_id && (
        <div style={{ fontSize: 9, color: dimColor }}>
          {TECH_NAMES[queue.tech_id] ?? queue.tech_id} ({queue.ticks_remaining}t)
        </div>
      )}
    </div>
  )
}

export default function StatsPanel() {
  const [open, setOpen] = useState(false)
  const phase = useGameStore((s) => s.gameState?.phase)
  const red = useGameStore((s) => s.gameState?.teams.red)
  const blue = useGameStore((s) => s.gameState?.teams.blue)

  if (phase !== 'running' || !red || !blue) return null

  return (
    <div style={{ pointerEvents: 'auto' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: 'rgba(10,10,20,0.8)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 4, color: '#888',
          cursor: 'pointer', fontSize: 9, padding: '3px 8px',
          fontFamily: 'inherit', letterSpacing: 0.5,
        }}
      >
        {open ? '▾ STATS' : '▸ STATS'}
      </button>
      {open && (
        <div style={{ ...card, marginTop: 4, minWidth: 180 }}>
          <StatRow label="Units Trained" red={red.stats_units_trained} blue={blue.stats_units_trained} />
          <StatRow label="Units Lost" red={red.stats_units_lost} blue={blue.stats_units_lost} />
          <StatRow label="Damage Dealt" red={red.stats_damage_dealt} blue={blue.stats_damage_dealt} />
          <StatRow label="Resources" red={red.stats_resources_gathered} blue={blue.stats_resources_gathered} />
          <StatRow label="Buildings" red={red.stats_buildings_built} blue={blue.stats_buildings_built} />
          <div style={{
            marginTop: 6, paddingTop: 4,
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{
              fontSize: 8, color: '#666', letterSpacing: 0.5,
              fontWeight: 'bold', marginBottom: 4,
            }}>
              RESEARCH
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <TechList team="red" />
              <TechList team="blue" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
