"""Ability system.

Each tick:
  1. Tick down ability cooldowns for all units.
  2. Tick down active ability durations; on expiry clear the ability state.
"""
from __future__ import annotations

from models.game_state import GameState


def process_abilities(state: GameState) -> None:
    """Tick all ability timers for every unit."""
    for team in state.teams.values():
        for unit in team.units:
            if unit.state == "dead":
                continue

            # Tick cooldown
            if unit.ability_cooldown > 0:
                unit.ability_cooldown -= 1

            # Tick active ability duration
            if unit.ability_active and unit.ability_ticks_remaining > 0:
                unit.ability_ticks_remaining -= 1
                if unit.ability_ticks_remaining <= 0:
                    # Ability expired
                    if unit.ability_active == "stealth":
                        unit.is_stealthed = False
                    unit.ability_active = None
