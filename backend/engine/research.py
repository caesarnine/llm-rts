"""Tech tree research system.

Each tick:
  1. If a team has an active research, decrement ticks_remaining.
  2. When complete, add to researched_techs, apply effects to existing units/buildings.

Effects are also applied when new units/buildings are created (handled in buildings.py
by checking researched_techs at spawn time — this module provides a helper for that).
"""
from __future__ import annotations

from models.game_state import GameState, GameEvent
from config import TECH_TREE


def get_tech_bonuses(researched: list[str], unit_type: str) -> dict[str, float]:
    """Return cumulative stat bonuses for a unit type from completed research."""
    bonuses: dict[str, float] = {}
    for tech_id in researched:
        tech = TECH_TREE.get(tech_id)
        if not tech:
            continue
        effect = tech["effect"]
        if effect["type"] == "unit_stat" and unit_type in effect.get("unit_types", []):
            stat = effect["stat"]
            bonuses[stat] = bonuses.get(stat, 0) + effect["value"]
    return bonuses


def _apply_tech_effects(state: GameState, team_name: str, tech_id: str) -> None:
    """Apply a newly completed tech's effects to existing units/buildings."""
    tech = TECH_TREE[tech_id]
    effect = tech["effect"]
    team = state.teams[team_name]

    if effect["type"] == "unit_stat":
        for unit in team.units:
            if unit.unit_type in effect.get("unit_types", []):
                current = getattr(unit, effect["stat"], 0)
                setattr(unit, effect["stat"], current + effect["value"])
                # Also bump max_hp if stat is hp
                if effect["stat"] == "hp":
                    unit.max_hp += int(effect["value"])

    elif effect["type"] == "building_hp":
        for bld in team.buildings:
            bld.max_hp += int(effect["value"])
            bld.hp += int(effect["value"])

    # gather_bonus, building_damage_bonus, ability_cooldown_reduction
    # are checked at usage time via researched_techs list


def can_research(team_state, tech_id: str) -> bool:
    """Check if a team meets the prerequisites for a tech."""
    if tech_id in team_state.researched_techs:
        return False
    tech = TECH_TREE.get(tech_id)
    if not tech:
        return False
    req_tier = tech.get("requires_tier", 0)
    req_count = tech.get("requires_count", 0)
    if req_count > 0:
        completed_at_tier = sum(
            1 for tid in team_state.researched_techs
            if TECH_TREE.get(tid, {}).get("tier", 0) >= req_tier
        )
        if completed_at_tier < req_count:
            return False
    return True


def process_research(state: GameState) -> None:
    """Tick research queues for all teams."""
    for team_name, team in state.teams.items():
        if not team.research_queue:
            continue
        tech_id = team.research_queue.get("tech_id")
        if not tech_id:
            continue

        team.research_queue["ticks_remaining"] -= 1
        if team.research_queue["ticks_remaining"] <= 0:
            # Research complete
            team.researched_techs.append(tech_id)
            team.research_queue = {}
            _apply_tech_effects(state, team_name, tech_id)

            tech_name = TECH_TREE[tech_id]["name"]
            state.events.append(GameEvent(
                tick=state.tick,
                event_type="research_complete",
                message=f"{team_name.capitalize()} completed research: {tech_name}",
                data={"team": team_name, "tech_id": tech_id},
            ))
