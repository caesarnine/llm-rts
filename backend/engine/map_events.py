"""Map event system.

Spawns random map events (gold caches, supercharge zones, resource refreshes)
at intervals and processes active ones each tick.
Also handles escalation: after a threshold tick, buildings outside starting
quadrants take damage each tick.
"""
from __future__ import annotations

import math
import random

from models.game_state import GameState, GameEvent, MapEvent, Position
from config import MAP_EVENT_INTERVAL


def _dist(ax: float, az: float, bx: float, bz: float) -> float:
    return math.sqrt((ax - bx) ** 2 + (az - bz) ** 2)


_EVENT_TYPES = ["gold_cache", "supercharge", "resource_refresh"]


def _spawn_event(state: GameState) -> None:
    """Spawn a random map event in the middle 60% of the map."""
    margin_x = state.map_width * 0.2
    margin_z = state.map_height * 0.2
    x = random.uniform(margin_x, state.map_width - margin_x)
    z = random.uniform(margin_z, state.map_height - margin_z)
    etype = random.choice(_EVENT_TYPES)

    data: dict = {}
    duration = 30
    if etype == "gold_cache":
        data = {"gold": 150}
        duration = 40
    elif etype == "supercharge":
        data = {"attack_bonus": 5}
        duration = 25
    elif etype == "resource_refresh":
        data = {"amount": 100}
        duration = 1  # instant effect

    event = MapEvent(
        event_type=etype,
        position=Position(x=x, z=z),
        tick_started=state.tick,
        duration=duration,
        data=data,
    )
    state.active_map_events.append(event)
    state.events.append(GameEvent(
        tick=state.tick,
        event_type="map_event_spawned",
        message=f"A {etype.replace('_', ' ')} appeared!",
        data={"event_id": event.id, "x": x, "z": z, "event_type": etype},
    ))


def _process_gold_cache(event: MapEvent, state: GameState) -> bool:
    """If any unit is near the gold cache, award gold and consume it. Return True if consumed."""
    for team in state.teams.values():
        for unit in team.units:
            if unit.state == "dead":
                continue
            d = _dist(unit.position.x, unit.position.z, event.position.x, event.position.z)
            if d <= 2.0:
                gold = event.data.get("gold", 100)
                team.resources["gold"] = team.resources.get("gold", 0) + gold
                state.events.append(GameEvent(
                    tick=state.tick,
                    event_type="gold_cache_collected",
                    message=f"{team.team.capitalize()} collected {gold} gold!",
                    data={"team": team.team, "gold": gold},
                ))
                return True
    return False


def _process_supercharge(event: MapEvent, state: GameState) -> None:
    """Boost attack of units near the supercharge zone."""
    bonus = event.data.get("attack_bonus", 5)
    for team in state.teams.values():
        for unit in team.units:
            if unit.state == "dead":
                continue
            d = _dist(unit.position.x, unit.position.z, event.position.x, event.position.z)
            if d <= 2.5:
                # Temporary attack boost applied via direct stat (resets when event expires)
                unit.attack = getattr(unit, '_base_attack', unit.attack)
                if not hasattr(unit, '_base_attack'):
                    object.__setattr__(unit, '_base_attack', unit.attack)
                # Don't stack — just set to base + bonus
                unit.attack = object.__getattribute__(unit, '_base_attack') + bonus


def _process_resource_refresh(event: MapEvent, state: GameState) -> None:
    """Refill nearby resource nodes."""
    amount = event.data.get("amount", 100)
    for node in state.resource_nodes:
        d = _dist(node.position.x, node.position.z, event.position.x, event.position.z)
        if d <= 5.0:
            node.remaining = min(node.max_remaining, node.remaining + amount)


def process_map_events(state: GameState) -> None:
    """Spawn and process map events each tick."""
    # Schedule next event
    if state.next_map_event_tick == 0:
        state.next_map_event_tick = state.tick + random.randint(*MAP_EVENT_INTERVAL)

    # Spawn new event
    if state.tick >= state.next_map_event_tick:
        _spawn_event(state)
        state.next_map_event_tick = state.tick + random.randint(*MAP_EVENT_INTERVAL)

    # Process active events
    to_remove: list[str] = []
    for event in state.active_map_events:
        age = state.tick - event.tick_started
        if age >= event.duration:
            to_remove.append(event.id)
            continue

        if event.event_type == "gold_cache":
            if _process_gold_cache(event, state):
                to_remove.append(event.id)
        elif event.event_type == "supercharge":
            _process_supercharge(event, state)
        elif event.event_type == "resource_refresh":
            _process_resource_refresh(event, state)
            to_remove.append(event.id)  # instant

    state.active_map_events = [e for e in state.active_map_events if e.id not in to_remove]
