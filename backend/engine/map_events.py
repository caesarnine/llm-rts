"""Map events.

Random map events are intentionally disabled.
"""
from __future__ import annotations

from models.game_state import GameState


def process_map_events(state: GameState) -> None:
    """Map events are disabled; keep related transient state clean."""
    for team in state.teams.values():
        for unit in team.units:
            unit.attack_bonus_temp = 0

    # Defensive cleanup in case old state contains map-event data.
    if state.active_map_events:
        state.active_map_events = []
    state.next_map_event_tick = 0
