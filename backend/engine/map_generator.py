"""Symmetric map generator for a fair 2-team RTS game.

Strategy:
  1. Generate the top-left quadrant with clusters of terrain features.
  2. Mirror it point-symmetrically (180° rotation) to the bottom-right quadrant.
  3. Place resource nodes symmetrically.
  4. Place starting bases in the corners.
"""
from __future__ import annotations

import random
import uuid
from typing import Optional

from models.game_state import (
    Building,
    GameState,
    Position,
    ResourceNode,
    TeamState,
    Unit,
)
from config import (
    UNIT_STATS,
    BUILDING_STATS,
    settings,
)


def _short_id() -> str:
    return str(uuid.uuid4())[:8]


def _place_cluster(
    terrain: list[list[int]],
    cx: int,
    cz: int,
    radius: int,
    ttype: int,
    rng: random.Random,
    protected: set[tuple[int, int]],
    width: int,
    height: int,
) -> None:
    for dz in range(-radius, radius + 1):
        for dx in range(-radius, radius + 1):
            if dx * dx + dz * dz > radius * radius:
                continue
            nx, nz = cx + dx, cz + dz
            if 0 <= nx < width and 0 <= nz < height:
                if (nx, nz) not in protected and rng.random() < 0.75:
                    terrain[nz][nx] = ttype


def generate_map(
    width: int = settings.map_width,
    height: int = settings.map_height,
    seed: Optional[int] = None,
) -> GameState:
    rng = random.Random(seed)

    # 0=grass everywhere
    terrain: list[list[int]] = [[0] * width for _ in range(height)]

    # Protected starting zones (keep clear around bases)
    hw, hh = width // 2, height // 2
    red_base = (2, 2)
    blue_base = (width - 3, height - 3)
    protected: set[tuple[int, int]] = set()
    for dz in range(-4, 5):
        for dx in range(-4, 5):
            protected.add((red_base[0] + dx, red_base[1] + dz))
            protected.add((blue_base[0] + dx, blue_base[1] + dz))

    # Generate features only in the top-left quadrant, then mirror
    def mirror(cx: int, cz: int) -> tuple[int, int]:
        return (width - 1 - cx, height - 1 - cz)

    # Forest clusters
    for _ in range(4):
        cx = rng.randint(4, hw - 2)
        cz = rng.randint(4, hh - 2)
        r = rng.randint(2, 4)
        _place_cluster(terrain, cx, cz, r, 1, rng, protected, width, height)
        mx, mz = mirror(cx, cz)
        _place_cluster(terrain, mx, mz, r, 1, rng, protected, width, height)

    # Mountain clusters
    for _ in range(3):
        cx = rng.randint(5, hw - 3)
        cz = rng.randint(5, hh - 3)
        r = rng.randint(1, 3)
        _place_cluster(terrain, cx, cz, r, 2, rng, protected, width, height)
        mx, mz = mirror(cx, cz)
        _place_cluster(terrain, mx, mz, r, 2, rng, protected, width, height)

    # ── Resource nodes (symmetric pairs) ──────────────────────────────────────
    resource_nodes: list[ResourceNode] = []

    def add_resource_pair(
        cx: int, cz: int, rtype: str, amount: int
    ) -> None:
        # Snap to nearest grass cell
        for node_x, node_z in [(cx, cz), mirror(cx, cz)]:
            terrain[node_z][node_x] = 0  # ensure walkable
            resource_nodes.append(
                ResourceNode(
                    position=Position(x=float(node_x), z=float(node_z)),
                    resource_type=rtype,  # type: ignore[arg-type]
                    remaining=amount,
                    max_remaining=amount,
                )
            )

    # Gold nodes
    add_resource_pair(6, 4, "gold", 500)
    add_resource_pair(4, 8, "gold", 400)
    add_resource_pair(10, 6, "gold", 350)

    # Wood nodes (near forest areas)
    add_resource_pair(8, 12, "wood", 400)
    add_resource_pair(12, 5, "wood", 350)

    # Stone nodes (near mountains)
    add_resource_pair(9, 10, "stone", 300)
    add_resource_pair(5, 13, "stone", 250)

    # ── Teams ─────────────────────────────────────────────────────────────────
    def make_team(team: str, bx: int, bz: int) -> TeamState:
        base_stats = BUILDING_STATS["base"]
        base = Building(
            team=team,  # type: ignore[arg-type]
            building_type="base",
            position=Position(x=float(bx), z=float(bz)),
            hp=base_stats["hp"],
            max_hp=base_stats["hp"],
            build_progress=1.0,
        )

        units: list[Unit] = []
        # 3 workers + 2 warriors
        offsets = [
            (1, 0), (0, 1), (1, 1),   # workers
            (2, 0), (0, 2),            # warriors
        ]
        types = ["worker", "worker", "worker", "warrior", "warrior"]
        for (dx, dz), utype in zip(offsets, types):
            sx = bx + (dx if team == "red" else -dx)
            sz = bz + (dz if team == "red" else -dz)
            stats = UNIT_STATS[utype]
            units.append(
                Unit(
                    team=team,  # type: ignore[arg-type]
                    unit_type=utype,  # type: ignore[arg-type]
                    position=Position(x=float(sx), z=float(sz)),
                    hp=stats["hp"],
                    max_hp=stats["hp"],
                    attack=stats["attack"],
                    defense=stats["defense"],
                    speed=stats["speed"],
                    vision=stats["vision"],
                    attack_range=stats["attack_range"],
                )
            )

        return TeamState(
            team=team,  # type: ignore[arg-type]
            resources={
                "gold": settings.starting_gold,
                "wood": settings.starting_wood,
                "stone": settings.starting_stone,
            },
            units=units,
            buildings=[base],
        )

    teams = {
        "red":  make_team("red",  red_base[0],  red_base[1]),
        "blue": make_team("blue", blue_base[0], blue_base[1]),
    }

    return GameState(
        map_width=width,
        map_height=height,
        terrain=terrain,
        teams=teams,
        resource_nodes=resource_nodes,
        phase="running",
    )
