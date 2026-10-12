import os
from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv

# Ensure .env is loaded from backend directory or current directory
backend_dir = Path(__file__).resolve().parent.parent
env_backend = backend_dir / ".env"
if env_backend.exists():
    load_dotenv(dotenv_path=env_backend)
load_dotenv()

class Settings(BaseModel):
    ELEVENLABS_API_KEY: str = os.getenv("ELEVENLABS_API_KEY", "")
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "gemma2:2b")
    HF_TOKEN: str = os.getenv("HF_TOKEN", "")
    HF_MODEL: str = os.getenv("HF_MODEL", "google/gemma-2-2b-it")

settings = Settings()