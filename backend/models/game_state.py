from __future__ import annotations

import uuid
from typing import Literal, Optional

from pydantic import BaseModel, Field


def _short_id() -> str:
    return str(uuid.uuid4())[:8]


class Position(BaseModel):
    x: float
    y: float = 0.0
    z: float


class Unit(BaseModel):
    id: str = Field(default_factory=_short_id)
    team: Literal["red", "blue"]
    unit_type: Literal["worker", "warrior", "archer", "scout"]
    position: Position
    hp: int
    max_hp: int
    attack: int
    defense: int
    speed: float
    vision: float
    attack_range: float
    state: Literal["idle", "moving", "attacking", "gathering", "building", "dead"] = "idle"
    attack_bonus_temp: int = 0

    # Commander-set targets
    target_position: Optional[Position] = None
    target_unit_id: Optional[str] = None

    # Ability state
    ability_cooldown: int = 0        # ticks until ability can be used again
    ability_active: Optional[str] = None    # currently active ability name
    ability_ticks_remaining: int = 0 # ticks left on active ability
    is_stealthed: bool = False

    # Internal engine state (not shown to LLM)
    path: list[list[float]] = Field(default_factory=list)   # waypoints [[x,z], ...]
    gather_target_id: Optional[str] = None
    build_target_id: Optional[str] = None
    attack_cooldown: int = 0   # ticks until next attack


class Building(BaseModel):
    id: str = Field(default_factory=_short_id)
    team: Literal["red", "blue"]
    building_type: Literal["base", "barracks", "tower", "mine", "supply_depot"]
    position: Position
    hp: int
    max_hp: int
    build_progress: float = 1.0   # 0→1; 1 = complete

    # Barracks training queue: each entry {"unit_type": str, "ticks_remaining": int}
    training_queue: list[dict] = Field(default_factory=list)

    # Mine auto-gather: links to the nearest resource node
    linked_resource_id: Optional[str] = None


class ResourceNode(BaseModel):
    id: str = Field(default_factory=_short_id)
    position: Position
    resource_type: Literal["gold", "wood", "stone"]
    remaining: int
    max_remaining: int = 500


class TeamState(BaseModel):
    team: Literal["red", "blue"]
    resources: dict[str, int] = Field(
        default_factory=lambda: {"gold": 0, "wood": 0, "stone": 0}
    )
    units: list[Unit] = Field(default_factory=list)
    buildings: list[Building] = Field(default_factory=list)
    # Cells visible this tick — list of [x, z] ints
    visible_cells: list[list[int]] = Field(default_factory=list)
    # Last commander strategy summary (shown in UI)
    commander_summary: str = ""
    commander_reasoning: str = ""
    commander_model: str = ""   # which LLM model is running this team

    # Tech tree
    researched_techs: list[str] = Field(default_factory=list)
    research_queue: dict = Field(default_factory=dict)  # {"tech_id": str, "ticks_remaining": int}

    # Cumulative stats
    stats_units_trained: int = 0
    stats_units_lost: int = 0
    stats_resources_gathered: int = 0
    stats_damage_dealt: int = 0
    stats_buildings_built: int = 0


class GameEvent(BaseModel):
    tick: int
    event_type: str
    message: str
    data: dict = Field(default_factory=dict)


class MapEvent(BaseModel):
    id: str = Field(default_factory=_short_id)
    event_type: Literal["gold_cache", "supercharge", "resource_refresh"]
    position: Position
    tick_started: int
    duration: int = 30          # ticks before expiry
    data: dict = Field(default_factory=dict)


class CapturePoint(BaseModel):
    id: str = Field(default_factory=_short_id)
    position: Position
    owner: Optional[str] = None       # 'red', 'blue', or None
    progress: dict[str, float] = Field(default_factory=dict)  # team -> 0.0–1.0
    gold_per_tick: int = 3
    radius: float = 2.0


class GameState(BaseModel):
    tick: int = 0
    map_width: int
    map_height: int
    terrain: list[list[int]]          # terrain[row][col]; 0=grass,1=forest,2=mountain,3=water
    teams: dict[str, TeamState]
    resource_nodes: list[ResourceNode]
    capture_points: list[CapturePoint] = Field(default_factory=list)
    phase: Literal["starting", "running", "finished"] = "starting"
    winner: Optional[str] = None
    events: list[GameEvent] = Field(default_factory=list)   # events from THIS tick
    active_map_events: list[MapEvent] = Field(default_factory=list)
    population_cap: dict[str, int] = Field(default_factory=dict)  # team -> cap
    next_map_event_tick: int = 0
    llm_thinking: bool = False   # True while commanders are being queried (game paused)
    commentary: str = ""
