import httpx
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.config import settings

# Create an API router with /api/voice prefix
router = APIRouter(prefix="/api/voice", tags=["Voice"])

class NarrateRequest(BaseModel):
    text: str
    voice_id: str = "21m00Tcm4TlvDq8ikWAM"  # Default voice ID (Rachel)

@router.post("/narrate")
async def narrate_text(payload: NarrateRequest):
    ELEVENLABS_API_KEY = settings.ELEVENLABS_API_KEY
    if not ELEVENLABS_API_KEY:
        raise HTTPException(status_code=500, detail="ElevenLabs API key not set on server.")

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{payload.voice_id}"
    
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY
    }
    
    data = {
        "text": payload.text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.5
        }
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=data, headers=headers, timeout=30.0)
        
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to generate audio from ElevenLabs.")

        # Stream audio back to frontend chunk-by-chunk
        return StreamingResponse(response.aiter_bytes(), media_type="audio/mpeg")