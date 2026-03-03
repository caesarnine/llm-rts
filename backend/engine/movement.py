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
    blocked_cells: Optional[set[tuple[int, int]]] = None,
) -> Optional[tuple[int, int]]:
    blocked = blocked_cells or set()
    if is_walkable(terrain, tx, tz) and (tx, tz) not in blocked:
        return (tx, tz)

    for radius in range(1, max_radius + 1):
        for ox, oz in _NEIGHBORS:
            nx = tx + ox * radius
            nz = tz + oz * radius
            if is_walkable(terrain, nx, nz) and (nx, nz) not in blocked:
                return (nx, nz)
    return None


def occupied_unit_cells(
    state: GameState,
    *,
    exclude_unit_id: Optional[str] = None,
) -> set[tuple[int, int]]:
    occupied: set[tuple[int, int]] = set()
    for team in state.teams.values():
        for other in team.units:
            if other.state == "dead":
                continue
            if exclude_unit_id and other.id == exclude_unit_id:
                continue
            occupied.add((int(other.position.x), int(other.position.z)))
    return occupied


def _terrain_with_unit_blocks(
    terrain: list[list[int]],
    blocked_cells: set[tuple[int, int]],
) -> list[list[int]]:
    if not blocked_cells:
        return terrain

    rows = len(terrain)
    cols = len(terrain[0]) if rows else 0
    blocked_terrain = [row[:] for row in terrain]
    for cx, cz in blocked_cells:
        if 0 <= cz < rows and 0 <= cx < cols and blocked_terrain[cz][cx] not in (2, 3):
            blocked_terrain[cz][cx] = 2
    return blocked_terrain


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
    occupied = occupied_unit_cells(state, exclude_unit_id=unit.id)
    target = _nearest_walkable_cell(terrain, int(tx), int(tz), blocked_cells=occupied)
    if target is None:
        return False

    blocked_for_path = set(occupied)
    blocked_for_path.discard(target)
    terrain_for_path = _terrain_with_unit_blocks(terrain, blocked_for_path)

    if start == target:
        return False

    path = a_star(terrain_for_path, start, target)
    if not path:
        return False

    next_x, next_z = path[0]
    if (next_x, next_z) in occupied:
        return False
    return _step_toward(unit, float(next_x), float(next_z), dt)
