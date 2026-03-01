"""Prompt construction for LLM commanders."""
from __future__ import annotations

from models.game_state import GameState
from engine.fog_of_war import get_visible_set

_TERRAIN_NAMES = {0: "grass", 1: "forest", 2: "mountain", 3: "water"}

_SHARED_SYSTEM_PROMPT = (
    "You are a commander in a real-time strategy game. Win by destroying the enemy base.\n\n"
    "MAP: Grid-based. Terrain — 0=grass, 1=forest, 2=mountain(impassable), 3=water(impassable). "
    "Positions are (x, z) coordinates.\n\n"
    "UNITS: worker(gathers resources & builds), warrior(melee fighter), archer(ranged, attack_range=4), scout(fast, high vision).\n"
    "BUILDINGS: base(your HQ — losing it loses the game), barracks(trains units), tower(auto-attacks nearby enemies), mine(auto-gathers resources without workers).\n"
    "CAPTURE POINTS: Neutral map objectives. Move units within radius 2 to capture. Owning one generates gold each tick. "
    "Contesting (both teams present) halts progress. Capturing mid-map is key to economic dominance.\n\n"
    "Each decision cycle you receive the current game state and must issue commands. "
    "Units keep executing their last orders between your decisions, so focus on high-level intent. "
    "Issue commands as structured data. Include a brief summary of your strategy."
)

SYSTEM_PROMPTS = {
    "red": _SHARED_SYSTEM_PROMPT,
    "blue": _SHARED_SYSTEM_PROMPT,
}


def format_state_for_llm(state: GameState, team_name: str) -> str:
    """Return a concise text representation of the game state from one team's perspective."""
    team = state.teams[team_name]
    enemy_name = "blue" if team_name == "red" else "red"
    enemy_team = state.teams[enemy_name]
    visible = get_visible_set(team_name, state)

    lines: list[str] = []
    lines.append(f"=== TICK {state.tick} | {team_name.upper()} COMMANDER ===")

    # Resources
    r = team.resources
    lines.append(
        f"RESOURCES: Gold={r.get('gold',0)}, Wood={r.get('wood',0)}, Stone={r.get('stone',0)}"
    )

    # Own units
    lines.append(f"\nYOUR UNITS ({len(team.units)}):")
    for u in team.units:
        extra = ""
        if u.state == "gathering":
            extra = f" [gathering {u.gather_target_id}]"
        elif u.state == "building":
            extra = f" [building {u.build_target_id}]"
        elif u.state == "attacking":
            extra = f" [attacking {u.target_unit_id}]"
        lines.append(
            f"  {u.unit_type}#{u.id} pos=({u.position.x:.1f},{u.position.z:.1f}) "
            f"hp={u.hp}/{u.max_hp} state={u.state}{extra}"
        )

    # Own buildings
    lines.append(f"\nYOUR BUILDINGS ({len(team.buildings)}):")
    for b in team.buildings:
        progress = f" [building {b.build_progress*100:.0f}%]" if b.build_progress < 1.0 else ""
        queue = ""
        if b.training_queue:
            queue = f" [training: {b.training_queue[0]['unit_type']} {b.training_queue[0]['ticks_remaining']}t left]"
        lines.append(
            f"  {b.building_type}#{b.id} pos=({b.position.x:.0f},{b.position.z:.0f}) "
            f"hp={b.hp}/{b.max_hp}{progress}{queue}"
        )

    # Visible enemies
    visible_enemies = [
        u for u in enemy_team.units
        if (int(u.position.x), int(u.position.z)) in visible
    ]
    visible_enemy_buildings = [
        b for b in enemy_team.buildings
        if (int(b.position.x), int(b.position.z)) in visible
    ]
    lines.append(f"\nVISIBLE ENEMIES ({len(visible_enemies)} units, {len(visible_enemy_buildings)} buildings):")
    for u in visible_enemies:
        lines.append(
            f"  {enemy_name}_{u.unit_type}#{u.id} pos=({u.position.x:.1f},{u.position.z:.1f}) hp={u.hp}/{u.max_hp}"
        )
    for b in visible_enemy_buildings:
        lines.append(
            f"  {enemy_name}_{b.building_type}#{b.id} pos=({b.position.x:.0f},{b.position.z:.0f}) hp={b.hp}/{b.max_hp}"
        )

    # Visible resource nodes
    visible_nodes = [
        n for n in state.resource_nodes
        if (int(n.position.x), int(n.position.z)) in visible
    ]
    lines.append(f"\nVISIBLE RESOURCES ({len(visible_nodes)}):")
    for n in visible_nodes:
        lines.append(
            f"  {n.resource_type}#{n.id} pos=({n.position.x:.0f},{n.position.z:.0f}) remaining={n.remaining}"
        )

    # Capture points (always visible — global map feature)
    if state.capture_points:
        lines.append(
            "\nCAPTURE POINTS (stand units within radius=2 to capture; owner earns gold/tick):"
        )
        for cp in state.capture_points:
            owner_str = f"Owned by {cp.owner.upper()}" if cp.owner else "Neutral"
            red_pct = int(cp.progress.get("red", 0) * 100)
            blue_pct = int(cp.progress.get("blue", 0) * 100)
            lines.append(
                f"  {cp.id} pos=({cp.position.x:.0f},{cp.position.z:.0f}): {owner_str} "
                f"[Red {red_pct}% / Blue {blue_pct}%] +{cp.gold_per_tick}g/tick if owned"
            )

    lines.append("\nIssue your commands for this turn.")
    return "\n".join(lines)
