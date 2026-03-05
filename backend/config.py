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
    llm_model_red: str = ""   # per-team override; empty = use llm_model
    llm_model_blue: str = ""  # per-team override; empty = use llm_model

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
}

BUILDING_COSTS: dict[str, dict[str, int]] = {
    "barracks": {"gold": 100, "wood": 50,  "stone": 0},
    "tower":    {"gold": 50,  "wood": 0,   "stone": 50},
}

BUILDING_BUILD_TIME: dict[str, int] = {  # ticks
    "barracks": 20,
    "tower":    15,
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
WORKER_CARGO_CAP: int = 25    # max carried resources before returning to base
WORKER_BUILD_RATE: float = 0.05   # build_progress added per worker per tick

# ── Terrain bonuses ───────────────────────────────────────────────────────────
TERRAIN_DEFENSE_BONUS: dict[int, float] = {1: 0.30}          # forest = +30% defense
TERRAIN_RANGE_BONUS: dict[int, float] = {2: 1.0}             # mountain = +1 range for ranged

# ── Counter system ────────────────────────────────────────────────────────────
COUNTER_MULTIPLIERS: dict[tuple[str, str], float] = {
    ("warrior", "archer"): 1.5,
    ("archer", "scout"): 1.5,
    ("scout", "warrior"): 1.5,
}

# ── Abilities ─────────────────────────────────────────────────────────────────
ABILITY_DEFS: dict[str, dict] = {
    "warrior": {"name": "shield_wall", "duration": 8, "cooldown": 30, "damage_reduction": 0.5, "blocks_movement": True},
    "archer":  {"name": "volley", "duration": 0, "cooldown": 25, "aoe_radius": 2.5, "aoe_damage": 10},
    "scout":   {"name": "stealth", "duration": 12, "cooldown": 35},
    "worker":  {"name": "sprint", "duration": 6, "cooldown": 20, "speed_multiplier": 2.0},
}

# ── Population cap ────────────────────────────────────────────────────────────
POPULATION_CAP_BASE: int = 15
POPULATION_PER_DEPOT: int = 5

# ── Supply depot ──────────────────────────────────────────────────────────────
BUILDING_STATS["supply_depot"] = {"hp": 200, "vision": 3, "attack": 0, "attack_range": 0.0}
BUILDING_COSTS["supply_depot"] = {"gold": 60, "wood": 40, "stone": 0}
BUILDING_BUILD_TIME["supply_depot"] = 12

# ── Map events ────────────────────────────────────────────────────────────────
MAP_EVENT_INTERVAL: tuple[int, int] = (60, 90)   # ticks between random events

# ── Tech tree ─────────────────────────────────────────────────────────────────
TECH_TREE: dict[str, dict] = {
    # Tier 1 — no prerequisites
    "iron_weapons": {
        "name": "Iron Weapons", "tier": 1,
        "cost": {"gold": 100, "wood": 50, "stone": 0},
        "research_time": 20, "requires_count": 0, "requires_tier": 0,
        "effect": {"type": "unit_stat", "unit_types": ["warrior", "scout"], "stat": "attack", "value": 3},
        "description": "+3 attack for warriors & scouts",
    },
    "fletching": {
        "name": "Fletching", "tier": 1,
        "cost": {"gold": 75, "wood": 50, "stone": 0},
        "research_time": 18, "requires_count": 0, "requires_tier": 0,
        "effect": {"type": "unit_stat", "unit_types": ["archer"], "stat": "attack_range", "value": 1.0},
        "description": "+1 range for archers",
    },
    "reinforced_armor": {
        "name": "Reinforced Armor", "tier": 1,
        "cost": {"gold": 100, "wood": 0, "stone": 50},
        "research_time": 20, "requires_count": 0, "requires_tier": 0,
        "effect": {"type": "unit_stat", "unit_types": ["warrior", "archer", "scout"], "stat": "defense", "value": 2},
        "description": "+2 defense for combat units",
    },
    "swift_boots": {
        "name": "Swift Boots", "tier": 1,
        "cost": {"gold": 75, "wood": 25, "stone": 0},
        "research_time": 15, "requires_count": 0, "requires_tier": 0,
        "effect": {"type": "unit_stat", "unit_types": ["worker", "warrior", "archer", "scout"], "stat": "speed", "value": 0.5},
        "description": "+0.5 speed for all units",
    },
    # Tier 2 — requires 1 tier-1 tech
    "fortification": {
        "name": "Fortification", "tier": 2,
        "cost": {"gold": 150, "wood": 0, "stone": 100},
        "research_time": 30, "requires_count": 1, "requires_tier": 1,
        "effect": {"type": "building_hp", "value": 100},
        "description": "+100 max HP for all buildings",
    },
    "war_economy": {
        "name": "War Economy", "tier": 2,
        "cost": {"gold": 150, "wood": 75, "stone": 0},
        "research_time": 25, "requires_count": 1, "requires_tier": 1,
        "effect": {"type": "gather_bonus", "value": 2},
        "description": "+2 gather rate for workers",
    },
    "siege_engineering": {
        "name": "Siege Engineering", "tier": 2,
        "cost": {"gold": 200, "wood": 0, "stone": 100},
        "research_time": 30, "requires_count": 1, "requires_tier": 1,
        "effect": {"type": "building_damage_bonus", "value": 0.5},
        "description": "+50% damage vs buildings",
    },
    # Tier 3 — requires 2 tier-2 techs
    "battle_tactics": {
        "name": "Battle Tactics", "tier": 3,
        "cost": {"gold": 300, "wood": 100, "stone": 100},
        "research_time": 40, "requires_count": 2, "requires_tier": 2,
        "effect": {"type": "ability_cooldown_reduction", "value": 0.5},
        "description": "Ability cooldowns recharge 50% faster",
    },
}
