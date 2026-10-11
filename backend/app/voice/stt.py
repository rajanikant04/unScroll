import os
import httpx
from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from app.config import settings

# Create an API router with /api/voice prefix
router = APIRouter(prefix="/api/voice", tags=["Voice"])

@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    language_code: str = Query("eng", description="Language code (e.g. 'eng' for English, or 'auto' for auto-detect)"),
    tag_audio_events: bool = Query(False, description="Whether to tag ambient events like [laughter] or [sigh]"),
    diarize: bool = Query(False, description="Whether to perform multi-speaker diarization")
):
    api_key = settings.ELEVENLABS_API_KEY or os.getenv("ELEVENLABS_API_KEY", "")
    if not api_key:
        print("[ElevenLabs STT]: API key missing in settings and environment.")
        raise HTTPException(
            status_code=500,
            detail="ElevenLabs API key missing. Check backend/.env file."
        )

    url = "https://api.elevenlabs.io/v1/speech-to-text"
    
    headers = {
        "xi-api-key": api_key
    }
    
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio recording received.")

    files = {
        "file": (audio.filename or "audio.webm", audio_bytes, audio.content_type or "audio/webm")
    }

    # Enhanced Scribe parameters for clean, high-accuracy speech transcription
    data = {
        "model_id": "scribe_v2",
        "tag_audio_events": "true" if tag_audio_events else "false",
        "diarize": "true" if diarize else "false"
    }

    if language_code and language_code.lower() != "auto":
        data["language_code"] = language_code

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, data=data, files=files, timeout=60.0)
            
            if response.status_code != 200:
                print(f"[ElevenLabs STT Error {response.status_code}]: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Transcription service failed: {response.text}"
                )
            
            result = response.json()
            transcript_text = result.get("text", "").strip()
            return {"transcript": transcript_text}
    except httpx.RequestError as exc:
        print(f"[ElevenLabs STT Request Error]: {exc}")
        raise HTTPException(status_code=502, detail=f"Failed to communicate with ElevenLabs STT: {exc}")