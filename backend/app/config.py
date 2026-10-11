import os
from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseModel):
    ELEVENLABS_API_KEY: str = os.getenv("ELEVENLABS_API_KEY", "")

settings = Settings()