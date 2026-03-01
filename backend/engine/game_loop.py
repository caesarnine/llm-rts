"""Central game manager: tick loop, command application, WebSocket broadcast."""
from __future__ import annotations

import asyncio
import logging
import math
from typing import Optional, TYPE_CHECKING

from fastapi import WebSocket

from models.game_state import GameState, GameEvent, Position, Building
from models.actions import (
    CommanderActions,
    MoveCommand,
    AttackCommand,
    GatherCommand,
    BuildCommand,
    TrainCommand,
)
from engine.pathfinding import a_star, is_walkable
from engine.map_generator import generate_map
from engine.fog_of_war import compute_fog_of_war
from engine.combat import process_combat
from engine.resources import process_resources
from engine.buildings import process_buildings
from engine.capture import process_capture
from config import (
    settings,
    BUILDING_COSTS,
    BUILDING_STATS,
    TRAIN_COSTS,
    TRAIN_TIME,
    UNIT_STATS,
)

if TYPE_CHECKING:
    from ai.commander import BaseCommander

logger = logging.getLogger(__name__)


def _check_win_condition(state: GameState) -> None:
    for team_name, team in state.teams.items():
        has_base = any(b.building_type == "base" and b.hp > 0 for b in team.buildings)
        if not has_base:
            enemy = "blue" if team_name == "red" else "red"
            state.phase = "finished"
            state.winner = enemy
            state.events.append(GameEvent(
                tick=state.tick,
                event_type="game_over",
                message=f"{enemy.capitalize()} team wins!",
                data={"winner": enemy},
            ))


def _apply_commands(state: GameState, team_name: str, actions: CommanderActions) -> None:
    team = state.teams[team_name]
    unit_map = {u.id: u for u in team.units if u.state != "dead"}
    building_map = {b.id: b for b in team.buildings}

    # Build lookup for enemy units/buildings for validation
    enemy_name = "blue" if team_name == "red" else "red"
    all_unit_ids: set[str] = set()
    all_building_ids: set[str] = set()
    for t in state.teams.values():
        for u in t.units:
            all_unit_ids.add(u.id)
        for b in t.buildings:
            all_building_ids.add(b.id)

    node_map = {n.id: n for n in state.resource_nodes}

    for cmd in actions.commands:
        try:
            if isinstance(cmd, MoveCommand):
                for uid in cmd.unit_ids:
                    unit = unit_map.get(uid)
                    if not unit:
                        continue
                    tx, tz = int(cmd.target.x), int(cmd.target.z)
                    if not is_walkable(state.terrain, tx, tz):
                        continue
                    path = a_star(
                        state.terrain,
                        (int(unit.position.x), int(unit.position.z)),
                        (tx, tz),
                    )
                    unit.target_position = cmd.target
                    unit.path = [[float(x), float(z)] for x, z in path]
                    unit.target_unit_id = None
                    unit.gather_target_id = None
                    unit.build_target_id = None
                    unit.state = "moving"

            elif isinstance(cmd, AttackCommand):
                for uid in cmd.unit_ids:
                    unit = unit_map.get(uid)
                    if not unit:
                        continue
                    # Target can be unit or building
                    if cmd.target_unit_id in all_unit_ids or cmd.target_unit_id in all_building_ids:
                        unit.target_unit_id = cmd.target_unit_id
                        unit.gather_target_id = None
                        unit.build_target_id = None
                        unit.path = []

            elif isinstance(cmd, GatherCommand):
                node = node_map.get(cmd.resource_node_id)
                if not node:
                    continue
                for uid in cmd.unit_ids:
                    unit = unit_map.get(uid)
                    if not unit or unit.unit_type != "worker":
                        continue
                    unit.gather_target_id = cmd.resource_node_id
                    unit.target_unit_id = None
                    unit.build_target_id = None
                    unit.path = []
                    unit.state = "moving"

            elif isinstance(cmd, BuildCommand):
                cost = BUILDING_COSTS.get(cmd.building_type, {})
                can_afford = all(
                    team.resources.get(r, 0) >= v for r, v in cost.items()
                )
                if not can_afford:
                    continue
                bx, bz = int(cmd.position.x), int(cmd.position.z)
                if not is_walkable(state.terrain, bx, bz):
                    continue
                # Deduct cost
                for r, v in cost.items():
                    team.resources[r] -= v
                # Create the building at 0% progress
                stats = BUILDING_STATS[cmd.building_type]
                new_bld = Building(
                    team=team_name,  # type: ignore[arg-type]
                    building_type=cmd.building_type,  # type: ignore[arg-type]
                    position=Position(x=float(bx), z=float(bz)),
                    hp=stats["hp"],
                    max_hp=stats["hp"],
                    build_progress=0.0,
                )
                team.buildings.append(new_bld)
                state.events.append(GameEvent(
                    tick=state.tick,
                    event_type="build_started",
                    message=f"{team_name.capitalize()} started building a {cmd.building_type}",
                    data={"building_id": new_bld.id},
                ))
                # Assign workers
                for wid in cmd.worker_ids:
                    worker = unit_map.get(wid)
                    if worker and worker.unit_type == "worker":
                        worker.build_target_id = new_bld.id
                        worker.gather_target_id = None
                        worker.target_unit_id = None
                        worker.path = []

            elif isinstance(cmd, TrainCommand):
                bld = building_map.get(cmd.building_id)
                if not bld or bld.building_type != "barracks" or bld.build_progress < 1.0:
                    continue
                cost = TRAIN_COSTS.get(cmd.unit_type, {})
                can_afford = all(team.resources.get(r, 0) >= v for r, v in cost.items())
                if not can_afford:
                    continue
                for r, v in cost.items():
                    team.resources[r] -= v
                bld.training_queue.append({
                    "unit_type": cmd.unit_type,
                    "ticks_remaining": TRAIN_TIME[cmd.unit_type],
                })

        except Exception as exc:
            logger.warning("Error applying command %s: %s", cmd, exc)

    # Update commander summary
    if actions.summary:
        team.commander_summary = actions.summary


def _process_movement(state: GameState) -> None:
    """Move units along their computed paths each tick."""
    for team in state.teams.values():
        for unit in team.units:
            if unit.state == "dead":
                continue
            if unit.gather_target_id or unit.build_target_id or unit.target_unit_id:
                continue   # handled by other systems
            if not unit.path:
                if unit.state == "moving":
                    unit.state = "idle"
                    unit.target_position = None
                continue

            next_wp = unit.path[0]
            tx, tz = float(next_wp[0]), float(next_wp[1])
            dx = tx - unit.position.x
            dz = tz - unit.position.z
            dist = math.sqrt(dx * dx + dz * dz)

            step = unit.speed
            if step >= dist:
                unit.position.x, unit.position.z = tx, tz
                unit.path.pop(0)
                if not unit.path:
                    unit.state = "idle"
                    unit.target_position = None
            else:
                unit.position.x += dx / dist * step
                unit.position.z += dz / dist * step
                unit.state = "moving"


class GameManager:
    def __init__(self) -> None:
        self.state: Optional[GameState] = None
        self.clients: set[WebSocket] = set()
        self.speed: float = 1.0
        self.fog_perspective: Optional[str] = None  # None = no fog (spectator sees all)
        self._loop_task: Optional[asyncio.Task] = None
        self._pending_commands: dict[str, CommanderActions] = {}
        self.commanders: dict[str, "BaseCommander"] = {}
        self._seed: Optional[int] = None
        self._recent_events: list[GameEvent] = []

        from ai.commentator import LLMCommentator
        self._commentator = LLMCommentator()

    # ── Lifecycle ─────────────────────────────────────────────────────────────

    def start(self, seed: Optional[int] = None) -> None:
        self._seed = seed
        self.state = generate_map(seed=seed)
        compute_fog_of_war(self.state)
        self._pending_commands.clear()
        if self._loop_task:
            self._loop_task.cancel()
        self._loop_task = asyncio.create_task(self._tick_loop())
        logger.info("Game started (seed=%s)", seed)

    def stop(self) -> None:
        if self._loop_task:
            self._loop_task.cancel()
            self._loop_task = None

    # ── WebSocket clients ──────────────────────────────────────────────────────

    def add_client(self, ws: WebSocket) -> None:
        self.clients.add(ws)

    def remove_client(self, ws: WebSocket) -> None:
        self.clients.discard(ws)

    # ── Tick loop ─────────────────────────────────────────────────────────────

    async def _tick_loop(self) -> None:
        while self.state and self.state.phase == "running":
            t0 = asyncio.get_event_loop().time()

            await self._process_tick()
            await self._broadcast()

            self.state.tick += 1

            # Every N ticks: pause the game and await both commanders + commentator concurrently
            if self.state.tick % settings.llm_command_interval == 0:
                self.state.llm_thinking = True
                await self._broadcast()   # let frontend show the "thinking" indicator

                coros = [self._request_orders(t) for t in self.commanders]
                coros.append(self._request_commentary())
                await asyncio.gather(*coros, return_exceptions=True)

                self.state.llm_thinking = False
                self._recent_events.clear()
                # commands are now in _pending_commands; applied on next _process_tick

            elapsed = asyncio.get_event_loop().time() - t0
            tick_duration = 1.0 / (settings.tick_rate * max(0.1, self.speed))
            sleep_time = tick_duration - elapsed
            if sleep_time > 0:
                await asyncio.sleep(sleep_time)

        # Game over — broadcast final state
        if self.state:
            await self._broadcast()

    async def _process_tick(self) -> None:
        assert self.state
        self.state.events = []  # fresh event list each tick

        # Apply queued commander commands
        for team_name, actions in list(self._pending_commands.items()):
            _apply_commands(self.state, team_name, actions)
        self._pending_commands.clear()

        _process_movement(self.state)
        process_combat(self.state)
        process_resources(self.state)
        process_buildings(self.state)
        process_capture(self.state)
        compute_fog_of_war(self.state)
        _check_win_condition(self.state)

        # Accumulate events for commentator
        self._recent_events.extend(self.state.events)

    async def _request_orders(self, team_name: str) -> None:
        if not self.state:
            return
        commander = self.commanders.get(team_name)
        if not commander:
            return
        try:
            actions = await commander.get_actions(self.state, team_name)
            self._pending_commands[team_name] = actions
        except Exception as exc:
            logger.error("Commander %s error: %s", team_name, exc)

    async def _request_commentary(self) -> None:
        if not self.state:
            return
        try:
            text = await self._commentator.get_commentary(self.state, self._recent_events)
            if text:
                self.state.commentary = text
        except Exception as exc:
            logger.debug("Commentary error: %s", exc)

    # ── Broadcasting ──────────────────────────────────────────────────────────

    async def _broadcast(self) -> None:
        if not self.state or not self.clients:
            return
        payload = self.state.model_dump_json()
        dead: set[WebSocket] = set()
        for ws in self.clients:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.add(ws)
        self.clients -= dead

    # ── Speed control ─────────────────────────────────────────────────────────

    def set_speed(self, speed: float) -> None:
        self.speed = max(0.0, speed)
