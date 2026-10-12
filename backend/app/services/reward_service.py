from app.schemas.mission import LevelInfo

# Step 8.1 — Simple, configurable reward calculation
def calculate_reward(completed_minutes: int, reflection_saved: bool) -> int:
    """
    Calculates XP:
    Mission XP = Completed Minutes (capped at 30 min)
    Reflection XP = 10 XP bonus
    """
    mission_xp = max(0, min(completed_minutes, 30))
    reflection_xp = 10 if reflection_saved else 0
    return mission_xp + reflection_xp

# Step 8.2 — Level progression thresholds and feature unlocks
LEVEL_THRESHOLDS = [
    (1, 0, "Sprout Observer", ["Personal & Nature Grounding Missions"]),
    (2, 50, "Gentle Wanderer", ["Sensory Detox Mode"]),
    (3, 120, "Canopy Seeker", ["Extended 30m Quests"]),
    (4, 210, "Earth Grounded", ["Circadian Reset Missions"]),
    (5, 320, "Social Explorer", ["Social Mode Unlocked"]),
    (6, 450, "Trail Weaver", ["Community Acts of Kindness"]),
    (7, 600, "Horizon Gazer", ["Creative Audio Reflections"]),
    (8, 770, "Sanctuary Keeper", ["Custom Mindful Micro-routines"]),
    (9, 950, "Wilderness Alchemist", ["Neighborhood Discovery Badges"]),
    (10, 1150, "Wayfinder Master", ["Shareable Journey Card Unlocked"]),
]

def get_level(total_xp: int) -> LevelInfo:
    """
    Derives user level, unlocked features, and XP remaining for next level
    from a single consistent source of truth.
    """
    current_level = 1
    current_title = LEVEL_THRESHOLDS[0][2]
    unlocked_features = list(LEVEL_THRESHOLDS[0][3])
    next_xp = LEVEL_THRESHOLDS[1][1]

    for i, (lvl, min_xp, title, features) in enumerate(LEVEL_THRESHOLDS):
        if total_xp >= min_xp:
            current_level = lvl
            current_title = title
            if i > 0:
                unlocked_features.extend(features)
            if i + 1 < len(LEVEL_THRESHOLDS):
                next_xp = LEVEL_THRESHOLDS[i + 1][1]
            else:
                next_xp = min_xp + 200

    xp_needed = max(0, next_xp - total_xp)

    return LevelInfo(
        level=current_level,
        title=current_title,
        xp_for_next_level=xp_needed,
        total_xp=total_xp,
        unlocked_features=unlocked_features,
    )
