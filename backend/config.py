from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    model_config = {"env_file": ".env", "extra": "ignore"}

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    # Game loop
    tick_rate: float = 2.0          # ticks per second
    map_width: int = 32
    map_height: int = 32
    llm_command_interval: int = 30  # ticks between LLM calls (game pauses while they think)

    # Starting resources per team
    starting_gold: int = 200
    starting_wood: int = 100
    starting_stone: int = 50

    # LLM — full pydantic-ai model string including provider prefix.
    # Examples:
    #   anthropic:claude-sonnet-4-20250514
    #   google-gla:gemini-2.5-flash-preview
    #   openai:gpt-4o
    llm_model: str = "google-gla:gemini-3-flash-preview"

    # API keys — pydantic-ai reads these from the environment automatically.
    # Set whichever key matches your chosen llm_model provider.
    anthropic_api_key: str = ""   # ANTHROPIC_API_KEY
    google_api_key: str = ""      # GOOGLE_API_KEY (for google-gla models)

    # CORS
    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
        ]
    )


settings = Settings()

# ── Unit balance ──────────────────────────────────────────────────────────────
UNIT_STATS: dict[str, dict] = {
    "worker":  {"hp": 50,  "attack": 5,  "defense": 1, "speed": 1.5, "vision": 4, "attack_range": 1.5},
    "warrior": {"hp": 100, "attack": 15, "defense": 5, "speed": 2.0, "vision": 5, "attack_range": 1.5},
    "archer":  {"hp": 80,  "attack": 12, "defense": 3, "speed": 2.0, "vision": 6, "attack_range": 4.0},
    "scout":   {"hp": 60,  "attack": 8,  "defense": 2, "speed": 4.0, "vision": 8, "attack_range": 1.5},
}

BUILDING_STATS: dict[str, dict] = {
    "base":     {"hp": 1000, "vision": 8,  "attack": 0,  "attack_range": 0.0},
    "barracks": {"hp": 300,  "vision": 5,  "attack": 0,  "attack_range": 0.0},
    "tower":    {"hp": 200,  "vision": 8,  "attack": 10, "attack_range": 6.0},
    "mine":     {"hp": 150,  "vision": 4,  "attack": 0,  "attack_range": 0.0},
}

BUILDING_COSTS: dict[str, dict[str, int]] = {
    "barracks": {"gold": 100, "wood": 50,  "stone": 0},
    "tower":    {"gold": 50,  "wood": 0,   "stone": 50},
    "mine":     {"gold": 75,  "wood": 25,  "stone": 0},
}

BUILDING_BUILD_TIME: dict[str, int] = {  # ticks
    "barracks": 20,
    "tower":    15,
    "mine":     10,
}

TRAIN_COSTS: dict[str, dict[str, int]] = {
    "worker":  {"gold": 30, "wood": 0,  "stone": 0},
    "warrior": {"gold": 75, "wood": 0,  "stone": 0},
    "archer":  {"gold": 50, "wood": 25, "stone": 0},
    "scout":   {"gold": 40, "wood": 0,  "stone": 0},
}

TRAIN_TIME: dict[str, int] = {  # ticks
    "worker":  5,
    "warrior": 8,
    "archer":  7,
    "scout":   6,
}

GATHER_RATE: int = 5          # resources per tick per worker
MINE_GATHER_RATE: int = 3     # auto-gather per tick from a completed mine building
WORKER_BUILD_RATE: float = 0.05   # build_progress added per worker per tick
