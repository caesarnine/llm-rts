"""Building construction and unit training.

Construction:
  Workers with build_target_id move to the site and increment build_progress.

Training:
  Barracks process their training queue each tick.
  Completed units spawn adjacent to the building.
"""
from __future__ import annotations

import math
import uuid
from typing import Optional

from models.game_state import Building, GameEvent, GameState, Position, Unit
from config import (
    BUILDING_STATS,
    TRAIN_TIME,
    UNIT_STATS,
    WORKER_BUILD_RATE,
)


BUILD_PROXIMITY = 1.8


def _short_id() -> str:
    return str(uuid.uuid4())[:8]


def _dist(ax: float, az: float, bx: float, bz: float) -> float:
    return math.sqrt((ax - bx) ** 2 + (az - bz) ** 2)


def _move_toward(unit: Unit, tx: float, tz: float) -> None:
    dx = tx - unit.position.x
    dz = tz - unit.position.z
    dist = math.sqrt(dx * dx + dz * dz)
    if dist < 0.05:
        unit.position.x, unit.position.z = tx, tz
        return
    step = unit.speed
    if step >= dist:
        unit.position.x, unit.position.z = tx, tz
    else:
        unit.position.x += dx / dist * step
        unit.position.z += dz / dist * step
    unit.state = "moving"


def _find_building_by_id(state: GameState, bid: str) -> Optional[Building]:
    for team in state.teams.values():
        for b in team.buildings:
            if b.id == bid:
                return b
    return None


def _spawn_position(building: Building, state: GameState) -> Position:
    """Find an open cell adjacent to the building to spawn a unit."""
    bx, bz = building.position.x, building.position.z
    for dx, dz in [(1, 0), (0, 1), (-1, 0), (0, -1), (1, 1), (-1, 1)]:
        nx, nz = bx + dx, bz + dz
        if 0 <= int(nx) < state.map_width and 0 <= int(nz) < state.map_height:
            t = state.terrain[int(nz)][int(nx)]
            if t not in (2, 3):
                return Position(x=nx, z=nz)
    return Position(x=bx + 1, z=bz)


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
                site.build_progress = min(1.0, site.build_progress + WORKER_BUILD_RATE)
                unit.state = "building"
                if site.build_progress >= 1.0:
                    state.events.append(GameEvent(
                        tick=state.tick,
                        event_type="building_complete",
                        message=f"{team_name.capitalize()} completed a {site.building_type}",
                        data={"building_id": site.id, "team": team_name},
                    ))
            else:
                _move_toward(unit, site.position.x, site.position.z)

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
                new_unit = Unit(
                    team=team_name,  # type: ignore[arg-type]
                    unit_type=utype,  # type: ignore[arg-type]
                    position=spawn,
                    hp=stats["hp"],
                    max_hp=stats["hp"],
                    attack=stats["attack"],
                    defense=stats["defense"],
                    speed=stats["speed"],
                    vision=stats["vision"],
                    attack_range=stats["attack_range"],
                )
                team.units.append(new_unit)
                state.events.append(GameEvent(
                    tick=state.tick,
                    event_type="unit_trained",
                    message=f"{team_name.capitalize()} trained a {utype}",
                    data={"unit_id": new_unit.id, "team": team_name, "unit_type": utype},
                ))
