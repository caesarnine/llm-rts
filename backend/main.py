"""FastAPI entry point — WebSocket + REST API."""
from __future__ import annotations

import json
import logging
import os
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from engine.game_loop import GameManager
from ai.commander import LLMCommander, RandomCommander

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="LLM Battle Arena", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global game manager ───────────────────────────────────────────────────────

manager = GameManager()


def _build_commanders(use_llm: bool) -> dict:
    if use_llm:
        red_model = settings.llm_model_red or settings.llm_model
        blue_model = settings.llm_model_blue or settings.llm_model
        logger.info("Using LLM commanders (red=%s, blue=%s)", red_model, blue_model)
        return {
            "red":  LLMCommander("red", model=red_model),
            "blue": LLMCommander("blue", model=blue_model),
        }
    else:
        logger.info("Using random commanders")
        return {
            "red":  RandomCommander("red"),
            "blue": RandomCommander("blue"),
        }


# ── REST endpoints ────────────────────────────────────────────────────────────


def _set_commander_models(use_llm: bool) -> None:
    """Set commander_model on each team state for frontend display."""
    if not manager.state:
        return
    for team_name, team in manager.state.teams.items():
        if use_llm:
            if team_name == "red":
                team.commander_model = settings.llm_model_red or settings.llm_model
            else:
                team.commander_model = settings.llm_model_blue or settings.llm_model
        else:
            team.commander_model = "RandomCommander"


@app.post("/api/game/start")
async def start_game(seed: Optional[int] = None, use_llm: bool = True):
    manager.commanders = _build_commanders(use_llm)
    manager.start(seed=seed)
    _set_commander_models(use_llm)
    return {"status": "started", "seed": seed, "use_llm": use_llm}


@app.post("/api/game/restart")
async def restart_game(seed: Optional[int] = None, use_llm: bool = True):
    manager.stop()
    manager.commanders = _build_commanders(use_llm)
    manager.start(seed=seed)
    _set_commander_models(use_llm)
    return {"status": "restarted", "seed": seed}


@app.get("/api/game/state")
async def get_state():
    if manager.state is None:
        return {"phase": "not_started"}
    return manager.state.model_dump()


@app.get("/api/health")
async def health():
    return {"status": "ok"}


# ── WebSocket ─────────────────────────────────────────────────────────────────


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    manager.add_client(ws)
    logger.info("WebSocket client connected. Total: %d", len(manager.clients))

    # Send current state immediately if game is running
    if manager.state:
        await ws.send_text(manager.state.model_dump_json())

    try:
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
                mtype = msg.get("type")

                if mtype == "ping":
                    await ws.send_text('{"type":"pong"}')

                elif mtype == "set_speed":
                    speed = float(msg.get("speed", 1.0))
                    manager.set_speed(speed)

                elif mtype == "toggle_fog":
                    manager.fog_perspective = msg.get("perspective")

                elif mtype == "restart":
                    seed = msg.get("seed")
                    use_llm = msg.get("use_llm", True)
                    manager.stop()
                    manager.commanders = _build_commanders(use_llm)
                    manager.start(seed=seed)
                    _set_commander_models(use_llm)
                    await ws.send_text('{"type":"restarted"}')

            except (json.JSONDecodeError, ValueError) as exc:
                logger.warning("Bad client message: %s (%s)", raw, exc)

    except WebSocketDisconnect:
        manager.remove_client(ws)
        logger.info("WebSocket client disconnected. Total: %d", len(manager.clients))


# ── Dev entry point ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
    )
