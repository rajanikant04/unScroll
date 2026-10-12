import re
from typing import Any
from app.schemas.mission import Mission, MissionCategory

# A. Safety Prohibitions (words/phrases that flag unsafe activities)
UNSAFE_PATTERNS = [
    # Trespassing / restricted areas
    r"\btrespass",
    r"\bprivate property",
    r"\brestricted area",
    r"\bclimb over fence",
    r"\bbreak in",
    # Dangerous stunts / hazards
    r"\bclimb (tree|building|roof|wall|cliff|crane)\b",
    r"\bjump off\b",
    r"\bstand on edge\b",
    r"\bhazardous\b",
    r"\bswim in (river|ocean|lake|flood)\b",
    r"\bhighway\b",
    r"\btrack\b",
    # Traffic danger
    r"\bcross (road|street) without looking\b",
    r"\bstep into traffic\b",
    r"\bmiddle of the road\b",
    # Confronting strangers / harassment
    r"\bconfront\b",
    r"\bfollow (someone|stranger)\b",
    r"\bpressure\b",
    r"\btouch (stranger|someone)\b",
    r"\bdemand\b",
    # Extreme weather
    r"\bstorm\b",
    r"\blightning\b",
    r"\bfreezing cold\b",
    r"\bextreme heat\b",
]

def check_safety(mission: Mission) -> tuple[bool, str]:
    """
    Validates that a mission does not violate safety policies.
    Returns (is_safe, failure_reason).
    """
    text_to_check = f"{mission.title} {' '.join(mission.instructions)} {' '.join(mission.safety_notes)}".lower()

    for pattern in UNSAFE_PATTERNS:
        if re.search(pattern, text_to_check):
            return False, f"Flagged by safety policy: pattern '{pattern}' detected"

    # Enforce basic accessibility alternative presence
    if not mission.accessibility_alternative or len(mission.accessibility_alternative.strip()) < 5:
        return False, "Accessibility alternative is missing or too brief"

    return True, "Safe"

# B. Diversity Validation
def is_diverse(mission: Mission, recent_missions: list[dict[str, Any]]) -> bool:
    """
    Prevents repeated mission IDs and near-duplicate titles from appearing consecutively.
    """
    recent_ids = {item.get("id") for item in recent_missions if "id" in item}
    recent_titles = {
        item.get("title", "").strip().casefold()
        for item in recent_missions
        if "title" in item
    }

    if mission.id in recent_ids:
        return False

    if mission.title.strip().casefold() in recent_titles:
        return False

    return True

# C. Curated Safe Missions Fallback Pool (All 9 Categories)
CURATED_SAFE_MISSIONS: list[dict[str, Any]] = [
    {
        "id": "mission-nature-01",
        "title": "Find a Tree and Observe Its Canopy",
        "category": "nature",
        "duration_minutes": 5,
        "instructions": [
            "Step outdoors into any green space or sidewalk with trees.",
            "Spend two quiet minutes observing the bark and leaves.",
            "Take three deep breaths before looking back at your screen.",
        ],
        "safety_notes": ["Remain on public footpaths or park grounds."],
        "accessibility_alternative": "Observe a houseplant or sky from an open window.",
        "reward_xp": 15,
    },
    {
        "id": "mission-outdoor-01",
        "title": "Rest Your Eyes on the Furthest Horizon",
        "category": "outdoor",
        "duration_minutes": 15,
        "instructions": [
            "Walk outside to an open view or street corner.",
            "Look as far into the distance as you can without squinting.",
            "Let your optical focus soften to release digital eye strain.",
        ],
        "safety_notes": ["Stand safely on the sidewalk clear of bicycle lanes."],
        "accessibility_alternative": "Look through the furthest unobstructed window available.",
        "reward_xp": 25,
    },
    {
        "id": "mission-kindness-01",
        "title": "Leave a Peaceful Gesture for Nature",
        "category": "kindness",
        "duration_minutes": 5,
        "instructions": [
            "Pick up one small piece of dry litter safely with a napkin or glove.",
            "Place it in the nearest trash bin.",
            "Notice the quiet satisfaction of leaving the space slightly better.",
        ],
        "safety_notes": ["Never touch sharp, biological, or unknown objects."],
        "accessibility_alternative": "Smile or nod gently to a passerby or neighbor.",
        "reward_xp": 15,
    },
    {
        "id": "mission-happiness-01",
        "title": "Catch Five Warm Sun Rays or Breeze Touches",
        "category": "happiness",
        "duration_minutes": 5,
        "instructions": [
            "Step into the outdoor air and pause.",
            "Close your eyes and count five distinct sensations of warmth or moving air.",
            "Acknowledge one simple thing you feel grateful for right now.",
        ],
        "safety_notes": ["Ensure you are standing stationary away from pathways."],
        "accessibility_alternative": "Sit comfortably on a balcony or porch bench.",
        "reward_xp": 15,
    },
    {
        "id": "mission-human_connection-01",
        "title": "Exchange a Warm Good Day Nod",
        "category": "human_connection",
        "duration_minutes": 15,
        "instructions": [
            "Take a gentle stroll through your neighborhood or park.",
            "When making natural eye contact with someone, offer a gentle nod or friendly smile.",
            "Notice how brief human connection creates a shared sense of presence.",
        ],
        "safety_notes": ["Respect other people's space and privacy at all times."],
        "accessibility_alternative": "Wave to a friendly neighbor or cashier.",
        "reward_xp": 25,
    },
    {
        "id": "mission-community-01",
        "title": "Discover an Unnoticed Detail in Your Neighborhood",
        "category": "community",
        "duration_minutes": 15,
        "instructions": [
            "Walk down a nearby street you normally walk past quickly.",
            "Look for an architectural detail, a quirky doorstep, or a blooming garden.",
            "Appreciate the silent effort someone put into making it pleasant.",
        ],
        "safety_notes": ["Stay on public sidewalks; never enter private property."],
        "accessibility_alternative": "Explore a neighborhood view from an accessible public plaza.",
        "reward_xp": 25,
    },
    {
        "id": "mission-health-01",
        "title": "Brisk Posture Alignment Walk",
        "category": "health",
        "duration_minutes": 15,
        "instructions": [
            "Roll your shoulders back and lift your chin slightly.",
            "Walk with intention for ten minutes, keeping your eyes up away from screens.",
            "Focus on rhythmic inhales and exhales in sync with your footsteps.",
        ],
        "safety_notes": ["Wear comfortable flat walking footwear."],
        "accessibility_alternative": "Perform gentle seated neck and shoulder rolls in the fresh air.",
        "reward_xp": 25,
    },
    {
        "id": "mission-creativity-01",
        "title": "Color Hunt: Spot Three Shades of Green or Amber",
        "category": "creativity",
        "duration_minutes": 5,
        "instructions": [
            "Look around your immediate outdoor surroundings.",
            "Identify three subtle variations of color in nature (moss, olive, jade, amber).",
            "Give each color your own whimsical name in your mind.",
        ],
        "safety_notes": ["Do not touch unfamiliar plants or fungi."],
        "accessibility_alternative": "Observe the color gradations in sky and clouds from any window.",
        "reward_xp": 15,
    },
    {
        "id": "mission-exploration-01",
        "title": "Follow the Scent of Fresh Air",
        "category": "exploration",
        "duration_minutes": 30,
        "instructions": [
            "Embark on a deliberate sensory stroll without a navigation map.",
            "Turn down a quiet tree-lined path or pedestrian alleyway you haven't taken recently.",
            "Stop for two minutes at the furthest point and soak in the stillness.",
        ],
        "safety_notes": ["Stay in well-lit, populated, familiar public areas."],
        "accessibility_alternative": "Explore a new quiet seating corner in your local park.",
        "reward_xp": 40,
    },
]

def get_curated_fallback(category: MissionCategory | None = None, recent_missions: list[dict[str, Any]] | None = None) -> Mission:
    """
    Returns a guaranteed safe, vetted curated mission matching requested category or diversity.
    """
    recent_missions = recent_missions or []
    recent_ids = {m.get("id") for m in recent_missions}

    candidates = [
        m for m in CURATED_SAFE_MISSIONS
        if (category is None or m["category"] == category) and m["id"] not in recent_ids
    ]

    if not candidates:
        candidates = [m for m in CURATED_SAFE_MISSIONS if (category is None or m["category"] == category)]

    if not candidates:
        candidates = CURATED_SAFE_MISSIONS

    chosen = candidates[0]
    return Mission(**chosen)
