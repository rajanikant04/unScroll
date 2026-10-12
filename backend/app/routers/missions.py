import time
import uuid
from typing import Any
from fastapi import APIRouter, HTTPException, Query
from app.schemas.mission import (
    Mission,
    MissionCategory,
    MissionGenerateRequest,
    SessionStartRequest,
    SessionCompleteRequest,
    SessionReflectionRequest,
)
from app.services.reward_service import calculate_reward, get_level
from app.services.policy_engine import get_curated_fallback
from app.services.gemma_service import generate_mission_with_policy, check_ollama_status, check_ai_status

router = APIRouter(tags=["Missions & Journey"])

# In-memory storage for sessions and journey tracking (stateful prototype)
SESSIONS_DB: dict[str, dict[str, Any]] = {}
JOURNEY_DB: dict[str, Any] = {
    "total_minutes": 0,
    "completed_count": 0,
    "total_xp": 0,
    "streak": 0,
    "last_active_date": "",
    "reflections": [],
    "week_activity": [],
}

# -----------------------------------------------------------------
# 1. Missions API
# -----------------------------------------------------------------
@router.api_route("/api/missions/status", methods=["GET", "HEAD"])
@router.api_route("/api/missions/ollama-status", methods=["GET", "HEAD"])
@router.api_route("/missions/ollama-status", methods=["GET", "HEAD"])
async def get_missions_ai_status():
    """
    Checks connection to active AI providers (Hugging Face / Ollama).
    """
    return await check_ai_status()

@router.get("/api/missions/next", response_model=Mission)
async def get_next_mission(category: MissionCategory | None = None):
    """
    Retrieves the next suitable curated safe mission.
    """
    recent = list(SESSIONS_DB.values())[-5:]
    return get_curated_fallback(category, recent)

@router.post("/api/missions/generate", response_model=Mission)
async def generate_mission(request: MissionGenerateRequest):
    """
    Generates a mission using Gemma 2 and validates it through the safety policy engine.
    """
    recent = list(SESSIONS_DB.values())[-5:]
    mission = await generate_mission_with_policy(
        category=request.category or "nature",
        duration_minutes=request.duration_minutes or 15,
        user_notes=request.user_notes,
        recent_missions=recent,
    )
    return mission

# -----------------------------------------------------------------
# 2. Sessions API (Lifecycle & Idempotent XP calculation)
# -----------------------------------------------------------------
# @router.post("/sessions")
@router.post("/api/sessions")
async def start_session(req: SessionStartRequest):
    """
    Starts an outdoor session and sets the active timestamp.
    """
    session_id = f"sess-{uuid.uuid4().hex[:8]}"
    start_time = int(time.time() * 1000)
    end_time = start_time + (req.duration_minutes * 60 * 1000)

    session = {
        "id": session_id,
        "mission_id": req.mission_id,
        "duration_minutes": req.duration_minutes,
        "start_at": start_time,
        "end_at": end_time,
        "completed": False,
        "completed_minutes": 0,
        "reflection_saved": False,
        "reflection_text": "",
        "xp_earned": 0,
    }
    SESSIONS_DB[session_id] = session
    return {"session_id": session_id, "start_at": start_time, "end_at": end_time}

# @router.post("/sessions/{session_id}/complete")
@router.post("/api/sessions/{session_id}/complete")
async def complete_session(session_id: str, req: SessionCompleteRequest):
    """
    Completes a mission session. Idempotent: does not award XP twice.
    """
    session = SESSIONS_DB.get(session_id)
    if not session:
        # Auto-create if direct ID provided
        session = {
            "id": session_id,
            "mission_id": "custom",
            "duration_minutes": req.elapsed_minutes,
            "start_at": int(time.time() * 1000),
            "end_at": int(time.time() * 1000),
            "completed": False,
            "completed_minutes": 0,
            "reflection_saved": False,
            "reflection_text": "",
            "xp_earned": 0,
        }
        SESSIONS_DB[session_id] = session

    # Idempotency check: if already completed, return existing XP
    if session.get("completed"):
        return {
            "status": "already_completed",
            "completed_minutes": session["completed_minutes"],
            "xp_earned": session["xp_earned"],
        }

    completed_minutes = min(max(req.elapsed_minutes, 1), 120)
    base_xp = calculate_reward(completed_minutes, reflection_saved=False)

    session["completed"] = True
    session["completed_minutes"] = completed_minutes
    session["xp_earned"] = base_xp

    # Update global journey stats
    JOURNEY_DB["total_minutes"] += completed_minutes
    JOURNEY_DB["completed_count"] += 1
    JOURNEY_DB["total_xp"] += base_xp

    # Update today's activity bar
    if JOURNEY_DB["week_activity"]:
        JOURNEY_DB["week_activity"][-1]["minutes"] += completed_minutes
        JOURNEY_DB["week_activity"][-1]["completed"] = True

    level_info = get_level(JOURNEY_DB["total_xp"])

    return {
        "status": "completed",
        "completed_minutes": completed_minutes,
        "xp_earned": base_xp,
        "level_info": level_info.model_dump(),
    }

# @router.post("/sessions/{session_id}/reflection")
@router.post("/api/sessions/{session_id}/reflection")
async def save_session_reflection(session_id: str, req: SessionReflectionRequest):
    """
    Saves a reflection for an active or completed session. Awards +10 Reflection XP.
    """
    session = SESSIONS_DB.get(session_id)
    if not session:
        session = {
            "id": session_id,
            "mission_id": "custom",
            "duration_minutes": 15,
            "completed": True,
            "completed_minutes": 15,
            "reflection_saved": False,
            "reflection_text": "",
            "xp_earned": 15,
        }
        SESSIONS_DB[session_id] = session

    bonus_xp = 0
    if not session.get("reflection_saved"):
        session["reflection_saved"] = True
        session["reflection_text"] = req.reflection_text
        bonus_xp = 10
        session["xp_earned"] += bonus_xp
        JOURNEY_DB["total_xp"] += bonus_xp

    new_reflection = {
        "id": f"ref-{int(time.time() * 1000)}",
        "session_id": session_id,
        "mission_title": "Mindful Outdoor Reset",
        "duration_minutes": session.get("completed_minutes", 15),
        "xp_earned": session["xp_earned"],
        "reflection_text": req.reflection_text,
        "timestamp": "Today, Just now",
    }
    JOURNEY_DB["reflections"].insert(0, new_reflection)

    level_info = get_level(JOURNEY_DB["total_xp"])

    return {
        "status": "saved",
        "bonus_xp": bonus_xp,
        "total_session_xp": session["xp_earned"],
        "level_info": level_info.model_dump(),
        "reflection": new_reflection,
    }

# -----------------------------------------------------------------
# 3. Journey API (Progress, Levels, 7-Day History)
# -----------------------------------------------------------------
# @router.get("/journey")
@router.get("/api/journey")
async def get_journey():
    """
    Returns full journey metrics, current level info, unlocks, and recent reflections.
    """
    level_info = get_level(JOURNEY_DB["total_xp"])
    return {
        "total_minutes": JOURNEY_DB["total_minutes"],
        "completed_count": JOURNEY_DB["completed_count"],
        "streak": JOURNEY_DB["streak"],
        "total_xp": JOURNEY_DB["total_xp"],
        "level_info": level_info.model_dump(),
        "reflections": JOURNEY_DB["reflections"],
    }

# @router.get("/journey/week")
@router.get("/api/journey/week")
async def get_journey_week():
    """
    Returns seven days of outdoor activity data for the weekly tracker.
    """
    return {"days": JOURNEY_DB["week_activity"]}
