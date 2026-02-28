"""Combat system.

Each tick:
  1. Units with a target_unit_id pursue and attack it.
  2. Units in idle state auto-attack the nearest enemy within attack_range/2.
  3. Towers auto-attack nearest enemy unit in range.
  4. Remove dead units.
"""
from __future__ import annotations

import math
import random
from typing import Optional

from models.game_state import GameState, GameEvent, Unit, Building
from config import BUILDING_STATS


def _dist(ax: float, az: float, bx: float, bz: float) -> float:
    return math.sqrt((ax - bx) ** 2 + (az - bz) ** 2)


def _find_unit_by_id(state: GameState, uid: str) -> Optional[Unit]:
    for team in state.teams.values():
        for u in team.units:
            if u.id == uid:
                return u
    return None


def _find_building_by_id(state: GameState, bid: str) -> Optional[Building]:
    for team in state.teams.values():
        for b in team.buildings:
            if b.id == bid:
                return b
    return None


def _apply_damage(attacker: Unit | Building, target: Unit | Building, state: GameState) -> None:
    atk = attacker.attack if hasattr(attacker, "attack") else 0
    if isinstance(attacker, Unit):
        defense = target.defense if isinstance(target, Unit) else 0
        dmg = max(1, atk - defense)
    else:
        dmg = atk  # tower hits bypass unit defense (simplified)
    target.hp = max(0, target.hp - dmg)


def _nearest_enemy_unit(unit: Unit, state: GameState) -> Optional[Unit]:
    enemy_team_name = "blue" if unit.team == "red" else "red"
    enemy_team = state.teams[enemy_team_name]
    best: Optional[Unit] = None
    best_d = float("inf")
    for e in enemy_team.units:
        if e.state == "dead":
            continue
        d = _dist(unit.position.x, unit.position.z, e.position.x, e.position.z)
        if d < best_d:
            best_d = d
            best = e
    return best


def _move_toward(unit: Unit, tx: float, tz: float, dt: float = 1.0) -> None:
    dx = tx - unit.position.x
    dz = tz - unit.position.z
    dist = math.sqrt(dx * dx + dz * dz)
    if dist < 0.05:
        unit.position.x = tx
        unit.position.z = tz
        return
    step = unit.speed * dt
    if step >= dist:
        unit.position.x = tx
        unit.position.z = tz
    else:
        ratio = step / dist
        unit.position.x += dx * ratio
        unit.position.z += dz * ratio
    unit.state = "moving"


def process_combat(state: GameState) -> None:
    """Run one tick of combat resolution."""
    all_teams = list(state.teams.keys())

    # ── Unit combat ───────────────────────────────────────────────────────────
    for team_name in all_teams:
        team = state.teams[team_name]
        enemy_name = "blue" if team_name == "red" else "red"
        enemy_team = state.teams[enemy_name]

        for unit in team.units:
            if unit.state == "dead":
                continue
            if unit.attack_cooldown > 0:
                unit.attack_cooldown -= 1
                continue

            # Determine target
            target_unit: Optional[Unit] = None
            target_building: Optional[Building] = None

            if unit.target_unit_id:
                t = _find_unit_by_id(state, unit.target_unit_id)
                if t and t.state != "dead":
                    target_unit = t
                elif t is None or t.state == "dead":
                    # Try targeting enemy building instead (fallback)
                    unit.target_unit_id = None

            # Auto-attack if no explicit target and enemy is close
            if not target_unit and unit.state not in ("gathering", "building"):
                auto_range = unit.attack_range * 0.8
                for e in enemy_team.units:
                    if e.state == "dead":
                        continue
                    if _dist(unit.position.x, unit.position.z, e.position.x, e.position.z) <= auto_range:
                        target_unit = e
                        break

            if target_unit:
                d = _dist(unit.position.x, unit.position.z, target_unit.position.x, target_unit.position.z)
                if d <= unit.attack_range:
                    # Attack!
                    unit.state = "attacking"
                    _apply_damage(unit, target_unit, state)
                    unit.attack_cooldown = 1  # 1-tick cooldown
                    if target_unit.hp == 0:
                        target_unit.state = "dead"
                        state.events.append(GameEvent(
                            tick=state.tick,
                            event_type="unit_killed",
                            message=f"{team_name.capitalize()} {unit.unit_type} destroyed {enemy_name} {target_unit.unit_type}",
                            data={"killer": unit.id, "victim": target_unit.id},
                        ))
                        unit.target_unit_id = None
                else:
                    # Move toward target
                    _move_toward(unit, target_unit.position.x, target_unit.position.z)
                continue

            # Attack enemy buildings if commanded (target_unit_id maps to a building)
            # (Handled via direct building HP reduction in process_buildings;
            #  here we allow units to attack buildings if they path to one.)

    # ── Tower auto-attack ────────────────────────────────────────────────────
    for team_name in all_teams:
        enemy_name = "blue" if team_name == "red" else "red"
        for building in state.teams[team_name].buildings:
            if building.building_type != "tower":
                continue
            if building.build_progress < 1.0:
                continue
            stats = BUILDING_STATS["tower"]
            atk_range = stats["attack_range"]
            # Find nearest enemy unit in range
            best: Optional[Unit] = None
            best_d = float("inf")
            for e in state.teams[enemy_name].units:
                if e.state == "dead":
                    continue
                d = _dist(building.position.x, building.position.z, e.position.x, e.position.z)
                if d <= atk_range and d < best_d:
                    best_d = d
                    best = e
            if best:
                dmg = max(1, stats["attack"])
                best.hp = max(0, best.hp - dmg)
                if best.hp == 0:
                    best.state = "dead"
                    state.events.append(GameEvent(
                        tick=state.tick,
                        event_type="unit_killed",
                        message=f"{team_name.capitalize()} tower destroyed {enemy_name} {best.unit_type}",
                        data={"killer": building.id, "victim": best.id},
                    ))

    # ── Building attacks (units targeting buildings) ─────────────────────────
    for team_name in all_teams:
        enemy_name = "blue" if team_name == "red" else "red"
        for unit in state.teams[team_name].units:
            if unit.state == "dead" or unit.state in ("gathering", "building"):
                continue
            if not unit.target_unit_id:
                continue
            # Check if target_unit_id refers to a building
            bld = _find_building_by_id(state, unit.target_unit_id)
            if bld and bld.team != unit.team:
                d = _dist(unit.position.x, unit.position.z, bld.position.x, bld.position.z)
                if d <= unit.attack_range:
                    unit.state = "attacking"
                    dmg = max(1, unit.attack)
                    bld.hp = max(0, bld.hp - dmg)
                    if bld.hp == 0:
                        state.events.append(GameEvent(
                            tick=state.tick,
                            event_type="building_destroyed",
                            message=f"{team_name.capitalize()} destroyed {enemy_name} {bld.building_type}",
                            data={"attacker": unit.id, "building": bld.id},
                        ))
                else:
                    _move_toward(unit, bld.position.x, bld.position.z)

    # ── Remove dead units ────────────────────────────────────────────────────
    for team in state.teams.values():
        team.units = [u for u in team.units if u.state != "dead"]

    # ── Remove destroyed buildings ───────────────────────────────────────────
    for team in state.teams.values():
        team.buildings = [b for b in team.buildings if b.hp > 0]
