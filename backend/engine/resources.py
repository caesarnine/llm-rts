"""Resource gathering system.

Workers gather into carried cargo and must return that cargo to their base
before it becomes usable.
"""
from __future__ import annotations

import math
from typing import Optional

from models.game_state import Building, GameState, ResourceNode
from config import GATHER_RATE, TECH_TREE, WORKER_CARGO_CAP
from engine.movement import move_unit_with_pathfinding


GATHER_PROXIMITY = 1.8  # distance at which a worker can gather
DEPOSIT_PROXIMITY = 2.0  # distance at which a worker can deposit at base


def _dist(ax: float, az: float, bx: float, bz: float) -> float:
    return math.sqrt((ax - bx) ** 2 + (az - bz) ** 2)


def _find_node(state: GameState, nid: str) -> Optional[ResourceNode]:
    return next((n for n in state.resource_nodes if n.id == nid), None)


def _find_team_base(state: GameState, team_name: str) -> Optional[Building]:
    team = state.teams[team_name]
    for b in team.buildings:
        if b.building_type == "base" and b.hp > 0 and b.build_progress >= 1.0:
            return b
    return None


def process_resources(state: GameState) -> None:
    """Run one tick of resource gathering."""

    # ── Worker gathering & deposit loop ───────────────────────────────────────
    for team_name, team in state.teams.items():
        base = _find_team_base(state, team_name)

        for unit in team.units:
            if unit.state == "dead":
                continue
            if not unit.gather_target_id:
                continue

            node = _find_node(state, unit.gather_target_id)
            has_cargo = unit.carried_amount > 0 and unit.carried_resource_type is not None
            resource_type_changed = (
                has_cargo
                and node is not None
                and unit.carried_resource_type != node.resource_type
            )
            should_deposit = (
                has_cargo
                and (
                    unit.carried_amount >= WORKER_CARGO_CAP
                    or node is None
                    or node.remaining <= 0
                    or resource_type_changed
                )
            )

            if should_deposit:
                if base is None:
                    unit.state = "idle"
                    continue

                d_base = _dist(unit.position.x, unit.position.z, base.position.x, base.position.z)
                if d_base <= DEPOSIT_PROXIMITY:
                    carried_amount = unit.carried_amount
                    carried_type = unit.carried_resource_type
                    if carried_type:
                        team.resources[carried_type] = team.resources.get(carried_type, 0) + carried_amount
                        team.stats_resources_gathered += carried_amount
                    unit.carried_amount = 0
                    unit.carried_resource_type = None

                    if node is None or node.remaining <= 0:
                        unit.gather_target_id = None
                        unit.state = "idle"
                    else:
                        unit.state = "gathering"
                else:
                    move_unit_with_pathfinding(state, unit, base.position.x, base.position.z)
                continue

            if node is None or node.remaining <= 0:
                unit.gather_target_id = None
                unit.state = "idle"
                continue

            d_node = _dist(unit.position.x, unit.position.z, node.position.x, node.position.z)
            if d_node <= GATHER_PROXIMITY:
                # Gather into worker cargo. Cargo only becomes usable at base deposit.
                rate = GATHER_RATE
                if "war_economy" in team.researched_techs:
                    rate += int(TECH_TREE["war_economy"]["effect"]["value"])

                free_capacity = max(0, WORKER_CARGO_CAP - unit.carried_amount)
                if free_capacity <= 0:
                    continue

                amount = min(rate, node.remaining, free_capacity)
                if amount <= 0:
                    continue

                node.remaining -= amount
                unit.carried_amount += amount
                if unit.carried_resource_type is None:
                    unit.carried_resource_type = node.resource_type
                unit.state = "gathering"
            else:
                move_unit_with_pathfinding(state, unit, node.position.x, node.position.z)

    # Remove fully depleted nodes
    state.resource_nodes = [n for n in state.resource_nodes if n.remaining > 0]
