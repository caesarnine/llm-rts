"""Fog-of-war computation.

Each team sees all cells within vision range of their units and buildings.
Vision range is a circle on the grid.
"""
from __future__ import annotations

import math

from models.game_state import GameState
from config import BUILDING_STATS


def compute_fog_of_war(state: GameState) -> None:
    """Update visible_cells for each team in-place."""
    for team_name, team in state.teams.items():
        visible: set[tuple[int, int]] = set()

        # Units contribute vision
        for unit in team.units:
            if unit.state == "dead":
                continue
            ux, uz = int(unit.position.x), int(unit.position.z)
            r = int(math.ceil(unit.vision))
            for dz in range(-r, r + 1):
                for dx in range(-r, r + 1):
                    if dx * dx + dz * dz <= r * r:
                        cx, cz = ux + dx, uz + dz
                        if 0 <= cx < state.map_width and 0 <= cz < state.map_height:
                            visible.add((cx, cz))

        # Buildings contribute vision (only complete buildings)
        for building in team.buildings:
            if building.build_progress < 1.0:
                continue
            bx, bz = int(building.position.x), int(building.position.z)
            r = int(math.ceil(BUILDING_STATS[building.building_type]["vision"]))
            for dz in range(-r, r + 1):
                for dx in range(-r, r + 1):
                    if dx * dx + dz * dz <= r * r:
                        cx, cz = bx + dx, bz + dz
                        if 0 <= cx < state.map_width and 0 <= cz < state.map_height:
                            visible.add((cx, cz))

        team.visible_cells = [[x, z] for x, z in visible]


def get_visible_set(team_name: str, state: GameState) -> set[tuple[int, int]]:
    team = state.teams[team_name]
    return {(c[0], c[1]) for c in team.visible_cells}
