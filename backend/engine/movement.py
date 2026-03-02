"""Shared terrain-aware movement helpers."""
from __future__ import annotations

import math
from typing import Optional

from config import ABILITY_DEFS
from engine.pathfinding import a_star, is_walkable
from models.game_state import GameState, Unit

_NEIGHBORS = [
    (0, 0),
    (1, 0), (-1, 0), (0, 1), (0, -1),
    (1, 1), (-1, 1), (1, -1), (-1, -1),
]


def _nearest_walkable_cell(
    terrain: list[list[int]],
    tx: int,
    tz: int,
    max_radius: int = 2,
) -> Optional[tuple[int, int]]:
    if is_walkable(terrain, tx, tz):
        return (tx, tz)

    for radius in range(1, max_radius + 1):
        for ox, oz in _NEIGHBORS:
            nx = tx + ox * radius
            nz = tz + oz * radius
            if is_walkable(terrain, nx, nz):
                return (nx, nz)
    return None


def _step_toward(unit: Unit, tx: float, tz: float, dt: float = 1.0) -> bool:
    dx = tx - unit.position.x
    dz = tz - unit.position.z
    dist = math.sqrt(dx * dx + dz * dz)
    if dist < 0.05:
        unit.position.x = tx
        unit.position.z = tz
        unit.state = "moving"
        return False

    step = unit.speed * dt
    if unit.ability_active == "sprint":
        step *= ABILITY_DEFS.get(unit.unit_type, {}).get("speed_multiplier", 1.0)

    if step >= dist:
        unit.position.x = tx
        unit.position.z = tz
    else:
        unit.position.x += dx / dist * step
        unit.position.z += dz / dist * step
    unit.state = "moving"
    return True


def move_unit_with_pathfinding(
    state: GameState,
    unit: Unit,
    tx: float,
    tz: float,
    dt: float = 1.0,
) -> bool:
    """Move unit one step toward target while respecting impassable terrain."""
    if unit.state == "dead":
        return False
    if unit.ability_active == "shield_wall":
        return False

    terrain = state.terrain
    start = (int(unit.position.x), int(unit.position.z))
    target = _nearest_walkable_cell(terrain, int(tx), int(tz))
    if target is None:
        return False

    if start == target:
        return _step_toward(unit, tx, tz, dt)

    path = a_star(terrain, start, target)
    if not path:
        return False

    next_x, next_z = path[0]
    return _step_toward(unit, float(next_x), float(next_z), dt)
