from __future__ import annotations

from typing import Annotated, Literal, Union

from pydantic import BaseModel, Field

from .game_state import Position


class MoveCommand(BaseModel):
    """Move one or more units toward a map position."""
    type: Literal["move"] = "move"
    unit_ids: list[str]
    target: Position


class AttackCommand(BaseModel):
    """Order units to attack a specific enemy unit or building."""
    type: Literal["attack"] = "attack"
    unit_ids: list[str]
    target_unit_id: str


class GatherCommand(BaseModel):
    """Send workers to gather from a resource node."""
    type: Literal["gather"] = "gather"
    unit_ids: list[str]
    resource_node_id: str


class BuildCommand(BaseModel):
    """Order workers to construct a building at a position."""
    type: Literal["build"] = "build"
    building_type: Literal["barracks", "tower", "mine", "supply_depot"]
    position: Position
    worker_ids: list[str]


class TrainCommand(BaseModel):
    """Queue a unit for training at a barracks."""
    type: Literal["train"] = "train"
    building_id: str
    unit_type: Literal["worker", "warrior", "archer", "scout"]


class AbilityCommand(BaseModel):
    """Activate the special ability for one or more units."""
    type: Literal["ability"] = "ability"
    unit_ids: list[str]
    target: Position | None = None   # used for volley targeting


AnyCommand = Annotated[
    Union[MoveCommand, AttackCommand, GatherCommand, BuildCommand, TrainCommand, AbilityCommand],
    Field(discriminator="type"),
]


class ResearchCommand(BaseModel):
    """Start researching a technology at your base."""
    type: Literal["research"] = "research"
    tech_id: str


AnyCommandWithResearch = Annotated[
    Union[MoveCommand, AttackCommand, GatherCommand, BuildCommand, TrainCommand, AbilityCommand, ResearchCommand],
    Field(discriminator="type"),
]


class CommanderActions(BaseModel):
    """All commands issued by a commander in one decision cycle."""
    reasoning: str = Field(
        default="",
        description="Your strategic analysis: what threats do you see, what's your plan, and WHY are you issuing these specific commands? 2-4 sentences.",
    )
    commands: list[AnyCommandWithResearch] = Field(default_factory=list)
    summary: str = Field(
        default="",
        description="1–2 sentence description of your strategy this turn.",
    )
