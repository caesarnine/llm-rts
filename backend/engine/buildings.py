"""Building construction and unit training.

Construction:
  Workers with build_target_id move to the site and increment build_progress.

Training:
  Barracks process their training queue each tick.
  Completed units spawn adjacent to the building.
"""
from __future__ import annotations

import math
from typing import Optional

from models.game_state import Building, GameEvent, GameState, Position, Unit
from config import (
    BUILDING_BUILD_TIME,
    UNIT_STATS,
    WORKER_BUILD_RATE,
)
from engine.movement import move_unit_with_pathfinding, occupied_unit_cells
from engine.research import get_tech_bonuses


BUILD_PROXIMITY = 1.8


def _dist(ax: float, az: float, bx: float, bz: float) -> float:
    return math.sqrt((ax - bx) ** 2 + (az - bz) ** 2)


def _build_progress_per_tick(building_type: str) -> float:
    base_time = max(1, BUILDING_BUILD_TIME.get(building_type, 20))
    base_increment = 1.0 / base_time
    # Keep WORKER_BUILD_RATE as a global tuning multiplier (0.05 = neutral).
    return base_increment * (WORKER_BUILD_RATE / 0.05)


def _find_building_by_id(state: GameState, bid: str) -> Optional[Building]:
    for team in state.teams.values():
        for b in team.buildings:
            if b.id == bid:
                return b
    return None


def _spawn_position(building: Building, state: GameState) -> Position:
    """Find an open cell adjacent to the building to spawn a unit."""
    bx, bz = int(building.position.x), int(building.position.z)

    occupied = occupied_unit_cells(state)
    for team in state.teams.values():
        for other in team.buildings:
            if other.hp > 0:
                occupied.add((int(other.position.x), int(other.position.z)))

    spawn_offsets = [
        (1, 0), (0, 1), (-1, 0), (0, -1),
        (1, 1), (-1, 1), (1, -1), (-1, -1),
        (2, 0), (0, 2), (-2, 0), (0, -2),
    ]

    for dx, dz in spawn_offsets:
        nx, nz = bx + dx, bz + dz
        if not (0 <= nx < state.map_width and 0 <= nz < state.map_height):
            continue
        if state.terrain[nz][nx] in (2, 3):
            continue
        if (nx, nz) in occupied:
            continue
        return Position(x=float(nx), z=float(nz))

    # Fallback: preserve previous behavior if no free nearby cell exists.
    for dx, dz in spawn_offsets:
        nx, nz = bx + dx, bz + dz
        if 0 <= nx < state.map_width and 0 <= nz < state.map_height and state.terrain[nz][nx] not in (2, 3):
            return Position(x=float(nx), z=float(nz))
    return Position(x=float(bx + 1), z=float(bz))


def process_buildings(state: GameState) -> None:
    """Run one tick of building construction and unit training."""

    # ── Construction ─────────────────────────────────────────────────────────
    for team_name, team in state.teams.items():
        for unit in team.units:
            if unit.state == "dead" or not unit.build_target_id:
                continue

            site = _find_building_by_id(state, unit.build_target_id)
            if site is None or site.build_progress >= 1.0:
                unit.build_target_id = None
                unit.state = "idle"
                continue

            d = _dist(unit.position.x, unit.position.z, site.position.x, site.position.z)
            if d <= BUILD_PROXIMITY:
                site.build_progress = min(
                    1.0,
                    site.build_progress + _build_progress_per_tick(site.building_type),
                )
                unit.state = "building"
                if site.build_progress >= 1.0:
                    team.stats_buildings_built += 1
                    state.events.append(GameEvent(
                        tick=state.tick,
                        event_type="building_complete",
                        message=f"{team_name.capitalize()} completed a {site.building_type}",
                        data={"building_id": site.id, "team": team_name},
                    ))
            else:
                move_unit_with_pathfinding(state, unit, site.position.x, site.position.z)

    # ── Unit training ─────────────────────────────────────────────────────────
    for team_name, team in state.teams.items():
        for building in team.buildings:
            if building.building_type != "barracks":
                continue
            if building.build_progress < 1.0:
                continue
            if not building.training_queue:
                continue

            entry = building.training_queue[0]
            entry["ticks_remaining"] -= 1

            if entry["ticks_remaining"] <= 0:
                building.training_queue.pop(0)
                utype = entry["unit_type"]
                stats = UNIT_STATS[utype]
                spawn = _spawn_position(building, state)
                # Apply tech bonuses to newly spawned unit
                bonuses = get_tech_bonuses(team.researched_techs, utype)
                hp_val = stats["hp"] + int(bonuses.get("hp", 0))
                new_unit = Unit(
                    team=team_name,  # type: ignore[arg-type]
                    unit_type=utype,  # type: ignore[arg-type]
                    position=spawn,
                    hp=hp_val,
                    max_hp=hp_val,
                    attack=stats["attack"] + int(bonuses.get("attack", 0)),
                    defense=stats["defense"] + int(bonuses.get("defense", 0)),
                    speed=stats["speed"] + bonuses.get("speed", 0),
                    vision=stats["vision"] + bonuses.get("vision", 0),
                    attack_range=stats["attack_range"] + bonuses.get("attack_range", 0),
                )
                team.units.append(new_unit)
                team.stats_units_trained += 1
                state.events.append(GameEvent(
                    tick=state.tick,
                    event_type="unit_trained",
                    message=f"{team_name.capitalize()} trained a {utype}",
                    data={"unit_id": new_unit.id, "team": team_name, "unit_type": utype},
                ))
