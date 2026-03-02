"""Commander implementations.

BaseCommander  – abstract interface
LLMCommander   – calls an LLM via pydantic-ai
"""
from __future__ import annotations

import logging
from abc import ABC, abstractmethod

from models.game_state import GameState
from models.actions import CommanderActions
from config import settings
from ai.prompts import format_state_for_llm, SYSTEM_PROMPTS

logger = logging.getLogger(__name__)
_MAX_HISTORY_MESSAGES = 24


# ── Base ──────────────────────────────────────────────────────────────────────


class BaseCommander(ABC):
    @abstractmethod
    async def get_actions(self, state: GameState, team_name: str) -> CommanderActions:
        ...


# ── LLM via pydantic-ai ───────────────────────────────────────────────────────


class LLMCommander(BaseCommander):
    """Calls an LLM via pydantic-ai with rolling conversation history."""

    def __init__(self, team_name: str, model: str | None = None) -> None:
        self.team_name = team_name
        self.model_name = model or settings.llm_model
        self._agent = self._build_agent()
        self._history: list = []

    def _build_agent(self):  # type: ignore[return]
        try:
            from pydantic_ai import Agent  # type: ignore[import]

            system_prompt = SYSTEM_PROMPTS.get(self.team_name, SYSTEM_PROMPTS["red"])
            agent = Agent(
                self.model_name,
                output_type=CommanderActions,
                system_prompt=system_prompt,
            )
            logger.info("LLM commander built for team=%s model=%s", self.team_name, self.model_name)
            return agent
        except Exception as exc:
            logger.warning(
                "Failed to initialize LLM commander for %s (%s); commander disabled",
                self.team_name,
                exc,
            )
            return None

    async def get_actions(self, state: GameState, team_name: str) -> CommanderActions:
        if self._agent is None:
            logger.error("LLM agent not initialised for %s", team_name)
            return CommanderActions(
                commands=[],
                summary="No command issued (LLM unavailable)",
                reasoning="LLM commander is unavailable, so this cycle issues no commands.",
            )

        prompt = format_state_for_llm(state, team_name)
        try:
            result = await self._agent.run(prompt, message_history=self._history)
            actions: CommanderActions = result.output

            self._history = result.all_messages()[-_MAX_HISTORY_MESSAGES:]

            logger.debug(
                "LLM actions for %s: %d commands (history=%d msgs)",
                team_name, len(actions.commands), len(self._history),
            )
            return actions
        except Exception as exc:
            logger.warning("LLM commander failed for %s (%s)", team_name, exc)
            return CommanderActions(
                commands=[],
                summary="No command issued (LLM error)",
                reasoning="LLM request failed for this cycle, so no commands were sent.",
            )
