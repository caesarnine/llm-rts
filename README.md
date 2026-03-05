# LLM Battle Arena RTS

Two LLM-controlled teams compete in a real-time strategy game on an isometric 3D map.

## Quick Start

### Backend

```bash
cd backend

# Copy env and add your key
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY=sk-ant-...

# Install dependencies and run
uv sync
uv run python main.py
```

Server starts at `http://localhost:8000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

### Starting a game

1. Open the browser — you'll see the isometric map.
2. Click **Start** to run with LLM commanders.

---

## Architecture

```
browser ←── WebSocket (JSON) ──→ FastAPI backend
                                       │
                              ┌────────┴────────┐
                              │   Game Loop      │
                              │   2 ticks/sec    │
                              └────────┬────────┘
                              ┌────────┴────────┐
                        Red Commander    Blue Commander
                          (LLM)            (LLM)
```

### Backend (`backend/`)

| File | Purpose |
|------|---------|
| `main.py` | FastAPI app, WebSocket `/ws`, REST `/api/game/*` |
| `config.py` | All game balance constants and settings |
| `models/game_state.py` | Pydantic models for all game state |
| `models/actions.py` | Commander command models |
| `engine/map_generator.py` | Symmetric procedural map generation |
| `engine/pathfinding.py` | A* on the terrain grid |
| `engine/combat.py` | Damage, auto-attack, tower defense |
| `engine/resources.py` | Worker gather/carry/deposit economy |
| `engine/buildings.py` | Construction progress, unit training |
| `engine/fog_of_war.py` | Per-team vision computation |
| `engine/game_loop.py` | Central tick loop and command dispatch |
| `ai/commander.py` | `LLMCommander` |
| `ai/prompts.py` | State-to-text formatting for LLM |

### Frontend (`frontend/src/`)

| File | Purpose |
|------|---------|
| `App.tsx` | Root — R3F Canvas + overlay |
| `store/gameStore.ts` | Zustand store (game state, event log) |
| `network/useWebSocket.ts` | WebSocket with auto-reconnect |
| `scene/GameScene.tsx` | Isometric camera + lighting |
| `scene/Terrain.tsx` | Instanced terrain tile rendering |
| `scene/Units.tsx` | Animated unit meshes with HP bars |
| `scene/Buildings.tsx` | Building meshes with progress bars |
| `scene/ResourceNodes.tsx` | Spinning resource crystal meshes |
| `ui/HUD.tsx` | Resources, tick counter, speed controls |
| `ui/CommanderPanel.tsx` | LLM strategy readouts |
| `ui/EventLog.tsx` | Scrolling battle feed |

---

## Game Rules

- **Goal:** Destroy the enemy base.
- **Units:** worker · warrior · archer · scout
- **Buildings:** base · barracks · tower · supply_depot
- **Resources:** gold · wood · stone
- Commanders issue orders every 30 ticks (~15 seconds at 2 Hz).
- Towers auto-attack nearby enemy units.
- Workers gather into cargo when assigned to a resource node.
- Gathered resources become usable only after workers deposit them at their base.

## Adjusting Game Balance

Edit `backend/config.py`:
- `UNIT_STATS` — HP, attack, defense, speed, vision per unit type
- `BUILDING_STATS` — HP, vision, attack per building type
- `TRAIN_COSTS` / `TRAIN_TIME` — training economy
- `BUILDING_COSTS` / `BUILDING_BUILD_TIME` — construction economy
- `settings.tick_rate` — game speed (ticks per second)
- `settings.llm_command_interval` — how often LLM is called

## WebSocket Protocol

**Server → Client:** Full `GameState` JSON every tick.

**Client → Server:**
```json
{ "type": "set_speed", "speed": 2.0 }
{ "type": "restart", "seed": 42 }
{ "type": "ping" }
```
