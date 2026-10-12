from typing import Literal, Optional
from pydantic import BaseModel, Field

MissionCategory = Literal[
    "outdoor",
    "nature",
    "kindness",
    "happiness",
    "human_connection",
    "community",
    "health",
    "creativity",
    "exploration",
]

class Mission(BaseModel):
    id: str
    title: str = Field(min_length=3, max_length=100)
    category: MissionCategory
    duration_minutes: Literal[5, 15, 30]
    instructions: list[str] = Field(min_length=1, max_length=5)
    safety_notes: list[str] = Field(default_factory=list)
    accessibility_alternative: str
    reward_xp: int = Field(ge=0, le=100)

class MissionGenerateRequest(BaseModel):
    category: Optional[MissionCategory] = "nature"
    duration_minutes: Optional[Literal[5, 15, 30]] = 15
    user_notes: Optional[str] = None

class SessionStartRequest(BaseModel):
    mission_id: str
    duration_minutes: Literal[5, 15, 30]

class SessionCompleteRequest(BaseModel):
    elapsed_minutes: int = Field(ge=1, le=120)

class SessionReflectionRequest(BaseModel):
    reflection_text: str = Field(min_length=1)

class LevelInfo(BaseModel):
    level: int
    title: str
    xp_for_next_level: int
    total_xp: int
    unlocked_features: list[str]
