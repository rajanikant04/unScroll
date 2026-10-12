from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.voice.tts import router as tts_router
from app.voice.stt import router as stt_router
from app.routers.missions import router as missions_router

app = FastAPI(title="unScroll / TouchGrass API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from pathlib import Path
from fastapi.staticfiles import StaticFiles

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

app.include_router(tts_router)
app.include_router(stt_router)
app.include_router(missions_router)

# Mount frontend build in production if available
frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if not frontend_dist.exists():
    fallback_dist = Path(__file__).resolve().parent.parent / "dist"
    if fallback_dist.exists():
        frontend_dist = fallback_dist

if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
else:
    @app.get("/")
    def root():
        return {"message": "unScroll API is running"}