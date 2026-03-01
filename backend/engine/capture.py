"""Capture point processing: contests, progress, resource generation."""
from __future__ import annotations

import math

from models.game_state import GameState, GameEvent


def _dist2d(ax: float, az: float, bx: float, bz: float) -> float:
    return math.sqrt((ax - bx) ** 2 + (az - bz) ** 2)


def process_capture(state: GameState) -> None:
    """Update capture point progress each tick and award resources to owners."""
    for cp in state.capture_points:
        # Count alive units per team within radius
        counts: dict[str, int] = {}
        for team_name, team in state.teams.items():
            n = sum(
                1 for u in team.units
                if u.state != "dead"
                and _dist2d(u.position.x, u.position.z, cp.position.x, cp.position.z) <= cp.radius
            )
            if n > 0:
                counts[team_name] = n

        if len(counts) > 1:
            # Contested — no progress change
            pass
        elif len(counts) == 1:
            capturing_team = next(iter(counts))
            unit_count = counts[capturing_team]
            gain = 0.05 * unit_count
            current = cp.progress.get(capturing_team, 0.0)
            cp.progress[capturing_team] = min(1.0, current + gain)

            # Check capture
            if cp.progress[capturing_team] >= 1.0 and cp.owner != capturing_team:
                old_owner = cp.owner
                cp.owner = capturing_team
                # Reset other team's progress
                for other in list(cp.progress.keys()):
                    if other != capturing_team:
                        cp.progress[other] = 0.0
                state.events.append(GameEvent(
                    tick=state.tick,
                    event_type="capture_point_taken",
                    message=f"{capturing_team.capitalize()} captured {cp.id}!",
                    data={"capture_point_id": cp.id, "team": capturing_team, "from": old_owner},
                ))
        else:
            # No units — decay all progress
            for team_name in list(cp.progress.keys()):
                cp.progress[team_name] = max(0.0, cp.progress.get(team_name, 0.0) - 0.01)

        # Award gold to owner each tick
        if cp.owner and cp.owner in state.teams:
            state.teams[cp.owner].resources["gold"] = (
                state.teams[cp.owner].resources.get("gold", 0) + cp.gold_per_tick
            )
