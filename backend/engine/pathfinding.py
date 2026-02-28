"""A* pathfinding on the terrain grid.

Terrain costs:
  0 = grass    → 1
  1 = forest   → 2
  2 = mountain → impassable
  3 = water    → impassable
"""
from __future__ import annotations

import heapq
import math
from typing import Optional


TERRAIN_COST = {0: 1, 1: 2, 2: None, 3: None}

# 8-directional movement
_NEIGHBORS = [
    (-1, -1), (0, -1), (1, -1),
    (-1,  0),           (1,  0),
    (-1,  1), (0,  1),  (1,  1),
]


def is_walkable(terrain: list[list[int]], cx: int, cz: int) -> bool:
    rows = len(terrain)
    cols = len(terrain[0]) if rows else 0
    if not (0 <= cz < rows and 0 <= cx < cols):
        return False
    return terrain[cz][cx] not in (2, 3)


def a_star(
    terrain: list[list[int]],
    start: tuple[int, int],
    end: tuple[int, int],
) -> list[tuple[int, int]]:
    """Return a list of (x, z) grid cells from start (exclusive) to end (inclusive).
    Returns [] if no path exists.
    """
    if start == end:
        return []

    rows = len(terrain)
    cols = len(terrain[0]) if rows else 0

    def h(a: tuple[int, int], b: tuple[int, int]) -> float:
        return math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)

    open_set: list[tuple[float, tuple[int, int]]] = []
    heapq.heappush(open_set, (0.0, start))
    came_from: dict[tuple[int, int], tuple[int, int]] = {}
    g: dict[tuple[int, int], float] = {start: 0.0}

    while open_set:
        _, current = heapq.heappop(open_set)

        if current == end:
            path: list[tuple[int, int]] = []
            while current in came_from:
                path.append(current)
                current = came_from[current]
            path.reverse()
            return path

        cx, cz = current
        for dx, dz in _NEIGHBORS:
            nx, nz = cx + dx, cz + dz
            if not (0 <= nz < rows and 0 <= nx < cols):
                continue
            t = terrain[nz][nx]
            cost = TERRAIN_COST.get(t)
            if cost is None:
                continue
            # Diagonal moves cost √2 × cell cost
            move_cost = cost * (math.sqrt(2) if dx != 0 and dz != 0 else 1.0)
            ng = g[current] + move_cost
            neighbor = (nx, nz)
            if ng < g.get(neighbor, float("inf")):
                came_from[neighbor] = current
                g[neighbor] = ng
                f = ng + h(neighbor, end)
                heapq.heappush(open_set, (f, neighbor))

    return []  # no path
