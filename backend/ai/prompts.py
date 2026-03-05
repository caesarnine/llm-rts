"""Prompt construction for LLM commanders."""
from __future__ import annotations

from models.game_state import GameState
from engine.fog_of_war import get_visible_set
from engine.research import can_research
from config import TECH_TREE

_TERRAIN_NAMES = {0: "grass", 1: "forest", 2: "mountain", 3: "water"}

_SHARED_SYSTEM_PROMPT = (
    "You are a commander in a real-time strategy game. Win by destroying the enemy base.\n\n"
    "MAP: Grid-based. Terrain — 0=grass, 1=forest(+30% defense), 2=mountain(impassable, +1 range for ranged), 3=water(impassable). "
    "Positions are (x, z) coordinates.\n\n"
    "UNITS: worker(gathers resources & builds), warrior(melee fighter), archer(ranged, attack_range=4), scout(fast, high vision).\n"
    "COUNTER SYSTEM: warrior beats archer (1.5x), archer beats scout (1.5x), scout beats warrior (1.5x).\n"
    "ABILITIES (use 'ability' command with unit_ids): "
    "warrior→shield_wall(50% damage reduction, blocks movement, 8 ticks), "
    "archer→volley(AoE 2.5 radius, 10 damage, needs target position), "
    "scout→stealth(invisible 12 ticks, breaks on attack), "
    "worker→sprint(2x speed 6 ticks). Each ability has a cooldown.\n\n"
    "BUILDINGS: base(HQ — losing it loses), barracks(trains units), tower(auto-attacks), mine(auto-gathers), supply_depot(+5 pop cap).\n"
    "POPULATION CAP: Base cap 15, +5 per supply depot. Cannot train above cap.\n"
    "CAPTURE POINTS: Neutral map objectives. Move units within radius 2 to capture. Owning one generates gold each tick.\n"
    "TECH TREE: Use 'research' command with tech_id to start research (one at a time). "
    "Tier 1 (no prereqs): iron_weapons(+3 atk warriors/scouts), fletching(+1 range archers), "
    "reinforced_armor(+2 def combat units), swift_boots(+0.5 speed all). "
    "Tier 2 (need 1 tier-1): fortification(+100 building HP), war_economy(+2 gather rate), "
    "siege_engineering(+50% vs buildings). "
    "Tier 3 (need 2 tier-2): battle_tactics(ability cooldowns 50% faster). "
    "Research costs resources and takes time. Effects apply immediately to all existing units/buildings.\n\n"
    "Each decision cycle you receive the current game state and must issue commands. "
    "Units keep executing their last orders between your decisions, so focus on high-level intent. "
    "Issue commands as structured data. Include a brief 'reasoning' field explaining your strategic thinking, "
    "and a 'summary' of your strategy."
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
    # Population
    pop_count = len(team.units)
    pop_cap = state.population_cap.get(team_name, 15)
    lines.append(f"POPULATION: {pop_count}/{pop_cap}")

    lines.append(f"\nYOUR UNITS ({len(team.units)}):")
    for u in team.units:
        extra = ""
        if u.state == "gathering":
            extra = f" [gathering {u.gather_target_id}]"
        elif u.state == "building":
            extra = f" [building {u.build_target_id}]"
        elif u.state == "attacking":
            extra = f" [attacking {u.target_unit_id}]"
        ability_str = ""
        if u.ability_active:
            ability_str = f" ability={u.ability_active}({u.ability_ticks_remaining}t)"
        elif u.ability_cooldown > 0:
            ability_str = f" ability_cd={u.ability_cooldown}t"
        else:
            ability_str = " ability=READY"
        lines.append(
            f"  {u.unit_type}#{u.id} pos=({u.position.x:.1f},{u.position.z:.1f}) "
            f"hp={u.hp}/{u.max_hp} state={u.state}{extra}{ability_str}"
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

    # Research status
    lines.append("\nRESEARCH:")
    if team.researched_techs:
        names = [TECH_TREE[tid]["name"] for tid in team.researched_techs if tid in TECH_TREE]
        lines.append(f"  Completed: {', '.join(names)}")
    if team.research_queue:
        tid = team.research_queue.get("tech_id", "")
        ticks_left = team.research_queue.get("ticks_remaining", 0)
        name = TECH_TREE.get(tid, {}).get("name", tid)
        lines.append(f"  In progress: {name} ({ticks_left} ticks left)")
    available = [
        f"{tid}({TECH_TREE[tid]['name']}: {TECH_TREE[tid]['description']}, cost={TECH_TREE[tid]['cost']})"
        for tid in TECH_TREE
        if can_research(team, tid) and tid not in (team.research_queue.get("tech_id") if team.research_queue else "")
    ]
    if available:
        lines.append(f"  Available: {'; '.join(available)}")

    lines.append("\nIssue your commands for this turn.")
    return "\n".join(lines)
