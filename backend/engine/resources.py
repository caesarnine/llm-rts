"""Resource gathering system.

Workers with gather_target_id set move to the node and gather when adjacent.
Completed mine buildings auto-harvest the nearest resource node.
"""
from __future__ import annotations

import math
from typing import Optional

from models.game_state import GameState, GameEvent, ResourceNode, Unit
from config import GATHER_RATE, MINE_GATHER_RATE, TECH_TREE


GATHER_PROXIMITY = 1.8  # distance at which a worker can gather


def _dist(ax: float, az: float, bx: float, bz: float) -> float:
    return math.sqrt((ax - bx) ** 2 + (az - bz) ** 2)


def _find_node(state: GameState, nid: str) -> Optional[ResourceNode]:
    return next((n for n in state.resource_nodes if n.id == nid), None)


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


def process_resources(state: GameState) -> None:
    """Run one tick of resource gathering."""

    # ── Worker gathering ──────────────────────────────────────────────────────
    for team_name, team in state.teams.items():
        for unit in team.units:
            if unit.state == "dead":
                continue
            if not unit.gather_target_id:
                continue

            node = _find_node(state, unit.gather_target_id)
            if node is None or node.remaining <= 0:
                unit.gather_target_id = None
                unit.state = "idle"
                continue

            d = _dist(unit.position.x, unit.position.z, node.position.x, node.position.z)
            if d <= GATHER_PROXIMITY:
                # Gather! Apply war_economy bonus if researched
                rate = GATHER_RATE
                if "war_economy" in team.researched_techs:
                    rate += int(TECH_TREE["war_economy"]["effect"]["value"])
                amount = min(rate, node.remaining)
                node.remaining -= amount
                team.resources[node.resource_type] = (
                    team.resources.get(node.resource_type, 0) + amount
                )
                team.stats_resources_gathered += amount
                unit.state = "gathering"
            else:
                _move_toward(unit, node.position.x, node.position.z)

    # ── Mine building auto-harvest ────────────────────────────────────────────
    for team_name, team in state.teams.items():
        for building in team.buildings:
            if building.building_type != "mine":
                continue
            if building.build_progress < 1.0:
                continue

            # Find linked or nearest resource node
            if building.linked_resource_id:
                node = _find_node(state, building.linked_resource_id)
            else:
                # Link to nearest non-depleted node
                node = None
                best_d = float("inf")
                for n in state.resource_nodes:
                    if n.remaining > 0:
                        d = _dist(
                            building.position.x, building.position.z,
                            n.position.x, n.position.z,
                        )
                        if d < best_d:
                            best_d = d
                            node = n
                if node:
                    building.linked_resource_id = node.id

            if node and node.remaining > 0:
                amount = min(MINE_GATHER_RATE, node.remaining)
                node.remaining -= amount
                team.resources[node.resource_type] = (
                    team.resources.get(node.resource_type, 0) + amount
                )

    # Remove fully depleted nodes
    state.resource_nodes = [n for n in state.resource_nodes if n.remaining > 0]
