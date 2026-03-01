import type { CSSProperties } from 'react'
import { useGameStore } from '../store/gameStore'
import type { Unit } from '../types'

const card: CSSProperties = {
  background: 'rgba(10,10,20,0.88)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 6,
  padding: '8px 10px',
  backdropFilter: 'blur(6px)',
  minWidth: 160,
  pointerEvents: 'auto',
}

function BarStat({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div style={{ marginBottom: 3 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#999', marginBottom: 1 }}>
        <span>{label}</span>
        <span>{value}/{max}</span>
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}

function StatLine({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#aaa', lineHeight: 1.6 }}>
      <span style={{ color: '#666' }}>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function findUnit(state: ReturnType<typeof useGameStore.getState>['gameState'], id: string): Unit | null {
  if (!state) return null
  for (const team of Object.values(state.teams)) {
    const u = team.units.find(u => u.id === id)
    if (u) return u
  }
  return null
}

export default function UnitInspector() {
  const selectedId = useGameStore((s) => s.selectedUnitId)
  const unit = useGameStore((s) => selectedId ? findUnit(s.gameState, selectedId) : null)
  const setSelectedUnitId = useGameStore((s) => s.setSelectedUnitId)

  if (!unit) return null

  const teamColor = unit.team === 'red' ? '#ef4444' : '#3b82f6'
  const abilityStatus = unit.ability_active
    ? `${unit.ability_active} (${unit.ability_ticks_remaining}t)`
    : unit.ability_cooldown > 0
      ? `CD: ${unit.ability_cooldown}t`
      : 'Ready'

  return (
    <div style={card}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4,
      }}>
        <div>
          <span style={{ color: teamColor, fontSize: 11, fontWeight: 'bold', textTransform: 'capitalize' }}>
            {unit.unit_type}
          </span>
          <span style={{ color: '#555', fontSize: 8, marginLeft: 4 }}>#{unit.id}</span>
        </div>
        <button
          onClick={() => setSelectedUnitId(null)}
          style={{
            background: 'none', border: 'none', color: '#555',
            cursor: 'pointer', fontSize: 12, padding: 0, lineHeight: 1,
          }}
        >
          x
        </button>
      </div>

      <BarStat label="HP" value={unit.hp} max={unit.max_hp} color={teamColor} />

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 8px',
        marginTop: 4,
      }}>
        <StatLine label="ATK" value={unit.attack} />
        <StatLine label="DEF" value={unit.defense} />
        <StatLine label="SPD" value={unit.speed.toFixed(1)} />
        <StatLine label="RNG" value={unit.attack_range.toFixed(1)} />
        <StatLine label="VIS" value={unit.vision.toFixed(1)} />
        <StatLine label="State" value={unit.state} />
      </div>

      <div style={{
        marginTop: 4, paddingTop: 3,
        borderTop: '1px solid rgba(255,255,255,0.06)',
        fontSize: 9, color: '#888',
      }}>
        <StatLine label="Ability" value={abilityStatus} />
        {unit.is_stealthed && (
          <div style={{ fontSize: 8, color: '#a78bfa', marginTop: 2 }}>STEALTHED</div>
        )}
      </div>

      <div style={{
        fontSize: 8, color: '#555', marginTop: 4,
        textAlign: 'center',
      }}>
        ({unit.position.x.toFixed(1)}, {unit.position.z.toFixed(1)})
      </div>
    </div>
  )
}
