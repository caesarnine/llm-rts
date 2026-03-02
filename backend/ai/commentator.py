"""Sports-announcer style running commentary via LLM."""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from models.game_state import GameState, GameEvent

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = (
    "You are an enthusiastic but concise sports commentator for an AI battle arena. "
    "Give a single punchy 1-2 sentence line (max 120 chars) about what just happened. "
    "Be dramatic. No markdown. No bullet points. Just plain text."
)


class LLMCommentator:
    def __init__(self) -> None:
        self._agent = self._build_agent()

    def _build_agent(self):  # type: ignore[return]
        try:
            from pydantic_ai import Agent  # type: ignore[import]
            from config import settings

            agent = Agent(
                settings.llm_model,
                output_type=str,
                system_prompt=_SYSTEM_PROMPT,
            )
            logger.info("LLM commentator built")
            return agent
        except Exception as exc:
            logger.warning("Commentator disabled (%s)", exc)
            return None

    async def get_commentary(
        self,
        state: "GameState",
        recent_events: "list[GameEvent]",
    ) -> str:
        if self._agent is None:
            return ""

        red = state.teams["red"]
        blue = state.teams["blue"]

        red_units = sum(1 for u in red.units if u.state != "dead")
        blue_units = sum(1 for u in blue.units if u.state != "dead")
        red_hp = sum(u.hp for u in red.units if u.state != "dead")
        blue_hp = sum(u.hp for u in blue.units if u.state != "dead")

        cp_lines = []
        for cp in state.capture_points:
            owner = cp.owner or "Neutral"
            red_pct = int(cp.progress.get("red", 0) * 100)
            blue_pct = int(cp.progress.get("blue", 0) * 100)
            cp_lines.append(f"  {cp.id}: {owner} (Red {red_pct}% / Blue {blue_pct}%)")

        event_lines = [f"  [{e.event_type}] {e.message}" for e in recent_events[-5:]]

        prompt = (
            f"Tick {state.tick}\n"
            f"Red: {red_units} units, {red_hp} total HP, {red.resources.get('gold', 0)} gold\n"
            f"Blue: {blue_units} units, {blue_hp} total HP, {blue.resources.get('gold', 0)} gold\n"
            f"Capture Points:\n" + ("\n".join(cp_lines) or "  (none)") + "\n"
            f"Recent Events:\n" + ("\n".join(event_lines) or "  (none)")
        )

        try:
            result = await self._agent.run(prompt)
            text: str = result.output
            return text[:200]  # safety cap
        except Exception as exc:
            logger.debug("Commentator failed: %s", exc)
            return ""
