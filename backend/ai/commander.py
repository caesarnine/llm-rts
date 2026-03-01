"""Commander implementations.

BaseCommander  – abstract interface
RandomCommander – scripted/random orders for testing (no LLM)
LLMCommander   – calls Claude via pydantic-ai
"""
from __future__ import annotations

import logging
import math
import random
from abc import ABC, abstractmethod
from typing import Optional

from models.game_state import GameState, Unit, ResourceNode, CapturePoint
from models.actions import (
    AbilityCommand,
    AttackCommand,
    CommanderActions,
    GatherCommand,
    MoveCommand,
    TrainCommand,
)
from config import TRAIN_COSTS, ABILITY_DEFS, settings
from ai.prompts import format_state_for_llm, SYSTEM_PROMPTS

logger = logging.getLogger(__name__)


def _dist(ax: float, az: float, bx: float, bz: float) -> float:
    return math.sqrt((ax - bx) ** 2 + (az - bz) ** 2)


# ── Base ──────────────────────────────────────────────────────────────────────


class BaseCommander(ABC):
    @abstractmethod
    async def get_actions(self, state: GameState, team_name: str) -> CommanderActions:
        ...


# ── Random / scripted ─────────────────────────────────────────────────────────


class RandomCommander(BaseCommander):
    """Heuristic commander for testing — no LLM required."""

    def __init__(self, team_name: str, seed: Optional[int] = None) -> None:
        self.team_name = team_name
        self.rng = random.Random(seed)

    async def get_actions(self, state: GameState, team_name: str) -> CommanderActions:
        team = state.teams[team_name]
        enemy_name = "blue" if team_name == "red" else "red"
        enemy_team = state.teams[enemy_name]
        commands = []

        workers = [u for u in team.units if u.unit_type == "worker" and u.state != "dead"]
        fighters = [
            u for u in team.units
            if u.unit_type in ("warrior", "archer", "scout") and u.state != "dead"
        ]
        idle_workers = [w for w in workers if w.state == "idle"]
        available_nodes = [n for n in state.resource_nodes if n.remaining > 0]
        barracks_list = [
            b for b in team.buildings
            if b.building_type == "barracks" and b.build_progress >= 1.0
        ]

        # Workers: send idle ones to gather
        for worker in idle_workers:
            if not available_nodes:
                break
            node = min(
                available_nodes,
                key=lambda n: _dist(worker.position.x, worker.position.z, n.position.x, n.position.z),
            )
            commands.append(GatherCommand(unit_ids=[worker.id], resource_node_id=node.id))

        # Fighters: split between pressing the enemy base and handling nearby threats
        enemy_units = [u for u in enemy_team.units if u.state != "dead"]
        enemy_buildings = enemy_team.buildings
        enemy_base = next((b for b in enemy_buildings if b.building_type == "base"), None)
        # Fall back to any building if base is gone somehow
        fallback_building = enemy_base or (enemy_buildings[0] if enemy_buildings else None)

        for i, fighter in enumerate(fighters):
            if fighter.state not in ("idle", "moving"):
                continue
            # Odd-indexed fighters always press the base; even-indexed handle units first
            press_base = (i % 2 == 1) and fallback_building
            if press_base:
                commands.append(AttackCommand(unit_ids=[fighter.id], target_unit_id=fallback_building.id))
            elif enemy_units:
                target = min(
                    enemy_units,
                    key=lambda u: _dist(fighter.position.x, fighter.position.z, u.position.x, u.position.z),
                )
                commands.append(AttackCommand(unit_ids=[fighter.id], target_unit_id=target.id))
            elif fallback_building:
                commands.append(AttackCommand(unit_ids=[fighter.id], target_unit_id=fallback_building.id))

        # Send one idle fighter toward the nearest unowned/enemy-owned capture point
        uncaptured_cps = [
            cp for cp in state.capture_points
            if cp.owner != team_name
        ]
        idle_fighters = [f for f in fighters if f.state == "idle"]
        if uncaptured_cps and idle_fighters:
            fighter = idle_fighters[0]
            target_cp = min(
                uncaptured_cps,
                key=lambda cp: _dist(fighter.position.x, fighter.position.z, cp.position.x, cp.position.z),
            )
            commands.append(MoveCommand(
                unit_ids=[fighter.id],
                target=target_cp.position,
            ))

        # Use abilities heuristically
        for unit in team.units:
            if unit.state == "dead" or unit.ability_cooldown > 0 or unit.ability_active:
                continue
            ability_def = ABILITY_DEFS.get(unit.unit_type)
            if not ability_def:
                continue
            # Warrior: shield wall when near enemies
            if unit.unit_type == "warrior" and unit.state == "attacking":
                commands.append(AbilityCommand(unit_ids=[unit.id]))
            # Scout: stealth when idle or moving toward enemy
            elif unit.unit_type == "scout" and unit.state in ("idle", "moving"):
                commands.append(AbilityCommand(unit_ids=[unit.id]))
            # Archer: volley on cluster of enemies
            elif unit.unit_type == "archer" and enemy_units:
                nearest = min(enemy_units, key=lambda u: _dist(unit.position.x, unit.position.z, u.position.x, u.position.z))
                from models.game_state import Position as Pos
                commands.append(AbilityCommand(unit_ids=[unit.id], target=Pos(x=nearest.position.x, z=nearest.position.z)))
            # Worker: sprint when gathering
            elif unit.unit_type == "worker" and unit.state == "gathering":
                commands.append(AbilityCommand(unit_ids=[unit.id]))

        # Train warriors if we can afford it and have a barracks
        gold = team.resources.get("gold", 0)
        warrior_cost = TRAIN_COSTS["warrior"]["gold"]
        for bld in barracks_list:
            if not bld.training_queue and gold >= warrior_cost:
                commands.append(TrainCommand(building_id=bld.id, unit_type="warrior"))
                gold -= warrior_cost

        summary_parts = []
        if workers:
            summary_parts.append(f"{len(workers)} workers gathering")
        if fighters:
            summary_parts.append(f"{len(fighters)} fighters attacking")
        if uncaptured_cps:
            summary_parts.append(f"contesting {len(uncaptured_cps)} capture point(s)")
        summary = "; ".join(summary_parts) or "Holding position"

        return CommanderActions(commands=commands, summary=summary)


# ── LLM via pydantic-ai ───────────────────────────────────────────────────────


class LLMCommander(BaseCommander):
    """Calls an LLM via pydantic-ai with rolling conversation history."""

    def __init__(self, team_name: str) -> None:
        self.team_name = team_name
        self._agent = self._build_agent()
        self._fallback = RandomCommander(team_name)
        self._history: list = []   # pydantic-ai ModelMessage list (grows unbounded)

    def _build_agent(self):  # type: ignore[return]
        try:
            from pydantic_ai import Agent  # type: ignore[import]

            system_prompt = SYSTEM_PROMPTS.get(self.team_name, SYSTEM_PROMPTS["red"])
            agent = Agent(
                settings.llm_model,
                output_type=CommanderActions,
                system_prompt=system_prompt,
            )
            logger.info("LLM commander built for team=%s model=%s", self.team_name, settings.llm_model)
            return agent
        except ImportError:
            logger.warning("pydantic-ai not available; LLMCommander will fall back to RandomCommander")
            return None

    async def get_actions(self, state: GameState, team_name: str) -> CommanderActions:
        if self._agent is None:
            logger.debug("LLM agent not initialised for %s, using fallback", team_name)
            return await self._fallback.get_actions(state, team_name)

        prompt = format_state_for_llm(state, team_name)
        try:
            result = await self._agent.run(prompt, message_history=self._history)
            actions: CommanderActions = result.output

            self._history = result.all_messages()

            logger.debug(
                "LLM actions for %s: %d commands (history=%d msgs)",
                team_name, len(actions.commands), len(self._history),
            )
            return actions
        except Exception as exc:
            logger.warning("LLM commander failed for %s (%s), using fallback", team_name, exc)
            return await self._fallback.get_actions(state, team_name)
