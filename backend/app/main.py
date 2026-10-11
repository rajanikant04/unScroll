from fastapi import FastAPI
from app.config import settings
from app.voice.tts import router as tts_router
from app.voice.stt import router as stt_router

app = FastAPI()

@app.get("/")
def root():
    return {"message": "Application is running"}

@app.get("/api")
def api():
    return {"message": "API is running"}

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

app.include_router(tts_router)
app.include_router(stt_router)