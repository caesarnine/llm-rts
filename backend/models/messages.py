from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel

from .game_state import GameState


# ── Server → Client ──────────────────────────────────────────────────────────

class GameStateMessage(BaseModel):
    type: Literal["game_state"] = "game_state"
    state: GameState


class ErrorMessage(BaseModel):
    type: Literal["error"] = "error"
    message: str


class PongMessage(BaseModel):
    type: Literal["pong"] = "pong"


ServerMessage = GameStateMessage | ErrorMessage | PongMessage


# ── Client → Server ──────────────────────────────────────────────────────────

class SetSpeedMessage(BaseModel):
    type: Literal["set_speed"] = "set_speed"
    speed: float   # 0 = pause, 1 = normal, 2 = fast, etc.


class ToggleFogMessage(BaseModel):
    type: Literal["toggle_fog"] = "toggle_fog"
    perspective: Optional[str] = None   # "red" | "blue" | null (spectator sees all)


class RestartMessage(BaseModel):
    type: Literal["restart"] = "restart"
    seed: Optional[int] = None


class PingMessage(BaseModel):
    type: Literal["ping"] = "ping"


ClientMessage = SetSpeedMessage | ToggleFogMessage | RestartMessage | PingMessage
