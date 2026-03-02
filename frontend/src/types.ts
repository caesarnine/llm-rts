// Mirror of the backend Pydantic models (serialised JSON shapes)

export interface Position {
  x: number
  y: number
  z: number
}

export type UnitType = 'worker' | 'warrior' | 'archer' | 'scout'
export type UnitState = 'idle' | 'moving' | 'attacking' | 'gathering' | 'building' | 'dead'
export type Team = 'red' | 'blue'
export type BuildingType = 'base' | 'barracks' | 'tower' | 'mine' | 'supply_depot'
export type ResourceType = 'gold' | 'wood' | 'stone'
export type GamePhase = 'starting' | 'running' | 'finished'

export interface Unit {
  id: string
  team: Team
  unit_type: UnitType
  position: Position
  hp: number
  max_hp: number
  attack: number
  defense: number
  speed: number
  vision: number
  attack_range: number
  state: UnitState
  attack_bonus_temp: number
  target_position: Position | null
  target_unit_id: string | null
  path: number[][]
  gather_target_id: string | null
  build_target_id: string | null
  attack_cooldown: number
  // Ability fields
  ability_cooldown: number
  ability_active: string | null
  ability_ticks_remaining: number
  is_stealthed: boolean
}

export interface Building {
  id: string
  team: Team
  building_type: BuildingType
  position: Position
  hp: number
  max_hp: number
  build_progress: number
  training_queue: Array<{ unit_type: UnitType; ticks_remaining: number }>
  linked_resource_id: string | null
}

export interface ResourceNode {
  id: string
  position: Position
  resource_type: ResourceType
  remaining: number
  max_remaining: number
}

export interface TeamState {
  team: Team
  resources: Record<ResourceType, number>
  units: Unit[]
  buildings: Building[]
  visible_cells: number[][]
  commander_summary: string
  commander_reasoning: string
  commander_model: string
  researched_techs: string[]
  research_queue: { tech_id?: string; ticks_remaining?: number }
  stats_units_trained: number
  stats_units_lost: number
  stats_resources_gathered: number
  stats_damage_dealt: number
  stats_buildings_built: number
}

export interface GameEvent {
  tick: number
  event_type: string
  message: string
  data: Record<string, unknown>
}

export interface CapturePoint {
  id: string
  position: Position
  owner: Team | null
  progress: Record<string, number>
  gold_per_tick: number
  radius: number
}

export type MapEventType = 'gold_cache' | 'supercharge' | 'resource_refresh'

export interface MapEvent {
  id: string
  event_type: MapEventType
  position: Position
  tick_started: number
  duration: number
  data: Record<string, unknown>
}

export interface GameState {
  tick: number
  map_width: number
  map_height: number
  terrain: number[][]
  teams: Record<Team, TeamState>
  resource_nodes: ResourceNode[]
  capture_points: CapturePoint[]
  active_map_events: MapEvent[]
  population_cap: Record<string, number>
  phase: GamePhase
  winner: string | null
  events: GameEvent[]
  llm_thinking: boolean
  commentary: string
}
