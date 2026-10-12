import os
import json
import uuid
import httpx
from typing import Any
from pydantic import ValidationError
from app.config import settings
from app.schemas.mission import Mission, MissionCategory
from app.services.policy_engine import check_safety, is_diverse, get_curated_fallback

SYSTEM_PROMPT = """
You are an expert mindful outdoor wellness coach for the TouchGrass/unScroll application.
Your goal is to generate short, screen-free, restorative outdoor challenges for users stepping away from their phones.

Output MUST be strictly valid JSON conforming to the following schema:
{
  "title": "A short, engaging title (3-60 chars)",
  "instructions": ["Step 1", "Step 2", "Step 3"],
  "safety_notes": ["Safety reminder (public space, traffic awareness)"],
  "accessibility_alternative": "Alternative option for seated/mobility-limited users",
  "reward_xp": 15
}

Safety rules:
- No trespassing or restricted areas.
- No climbing roofs, walls, cliffs, or dangerous stunts.
- Stay on public paths; observe traffic safety.
- No confronting strangers or pressuring anyone.
- Always include an accessible alternative.
"""

async def check_ollama_status() -> dict[str, Any]:
    """
    Checks if Ollama is running and inspects installed models.
    """
    base_url = settings.OLLAMA_BASE_URL.rstrip("/")
    tags_url = f"{base_url}/api/tags"

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(tags_url)
            if resp.status_code == 200:
                data = resp.json()
                models = [m.get("name", "") for m in data.get("models", [])]
                gemma_models = [m for m in models if "gemma" in m.lower()]
                has_configured_model = any(settings.OLLAMA_MODEL in m for m in models)

                return {
                    "running": True,
                    "ollama_url": base_url,
                    "configured_model": settings.OLLAMA_MODEL,
                    "model_available": has_configured_model or bool(gemma_models),
                    "gemma_models_installed": gemma_models,
                    "all_installed_models": models,
                    "message": "Ollama is running and ready." if (has_configured_model or gemma_models) else f"Ollama is running, but Gemma is not yet pulled. Run: 'ollama run {settings.OLLAMA_MODEL}'",
                }
    except Exception as exc:
        return {
            "running": False,
            "ollama_url": base_url,
            "configured_model": settings.OLLAMA_MODEL,
            "model_available": False,
            "gemma_models_installed": [],
            "all_installed_models": [],
            "message": f"Ollama is not running at {base_url}. To start, run: 'ollama run {settings.OLLAMA_MODEL}' in terminal ({exc}). Safe curated missions are active as fallback.",
        }

async def check_ai_status() -> dict[str, Any]:
    """
    Checks active AI provider status (Hugging Face Serverless API and local Ollama).
    """
    ollama_info = await check_ollama_status()
    has_hf = bool(settings.HF_TOKEN)
    masked_token = (
        f"{settings.HF_TOKEN[:6]}...{settings.HF_TOKEN[-4:]}"
        if (has_hf and len(settings.HF_TOKEN) > 10)
        else ("configured" if has_hf else "none")
    )

    return {
        "active_provider": "huggingface" if has_hf else "ollama",
        "huggingface": {
            "configured": has_hf,
            "model": settings.HF_MODEL,
            "token": masked_token,
            "status": (
                "Ready (Hugging Face Serverless Inference active)"
                if has_hf
                else "Not configured (add HF_TOKEN in .env to enable)"
            ),
        },
        "ollama": ollama_info,
    }

async def resolve_target_model(client: httpx.AsyncClient) -> str:
    """
    Finds the best matching installed Gemma model, defaulting to settings.OLLAMA_MODEL.
    """
    base_url = settings.OLLAMA_BASE_URL.rstrip("/")
    try:
        resp = await client.get(f"{base_url}/api/tags", timeout=2.0)
        if resp.status_code == 200:
            installed = [m.get("name", "") for m in resp.json().get("models", [])]
            # Exact or prefix match
            for m in installed:
                if settings.OLLAMA_MODEL in m:
                    return m
            # Any Gemma match
            for m in installed:
                if "gemma" in m.lower():
                    return m
    except Exception:
        pass
    return settings.OLLAMA_MODEL

def build_user_prompt(category: MissionCategory, duration_minutes: int, user_notes: str | None) -> str:
    prompt = f"Generate a {duration_minutes}-minute outdoor mission in the '{category}' category."
    if user_notes:
        prompt += f" User preference note: {user_notes}."
    prompt += "\nOutput ONLY raw JSON conforming to schema. No markdown ticks, no preamble."
    return prompt

async def call_huggingface_model(category: MissionCategory, duration_minutes: int, user_notes: str | None) -> dict[str, Any] | None:
    """
    Calls Hugging Face Serverless Inference API for Gemma 2.
    """
    if not settings.HF_TOKEN:
        return None

    model_id = settings.HF_MODEL or "google/gemma-2-2b-it"
    user_prompt = build_user_prompt(category, duration_minutes, user_notes)
    headers = {
        "Authorization": f"Bearer {settings.HF_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model_id,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        "max_tokens": 512,
        "temperature": 0.7,
    }

    # Attempt 1: Chat Completions endpoints (Model-specific and Router)
    chat_endpoints = [
        f"https://api-inference.huggingface.co/models/{model_id}/v1/chat/completions",
        "https://router.huggingface.co/hf-inference/v1/chat/completions",
    ]

    for hf_url in chat_endpoints:
        try:
            async with httpx.AsyncClient(timeout=35.0) as client:
                resp = await client.post(hf_url, headers=headers, json=payload)
                if resp.status_code == 200:
                    body = resp.json()
                    raw_response = body.get("choices", [{}])[0].get("message", {}).get("content", "")
                    cleaned = raw_response.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
                    return json.loads(cleaned)
                else:
                    print(f"[Hugging Face API {hf_url} Notice {resp.status_code}]: {resp.text}")
        except Exception as exc:
            print(f"[Hugging Face API {hf_url} Notice]: Request failed ({exc}).")

    # Attempt 2: Raw text-generation endpoint fallback
    try:
        raw_url = f"https://api-inference.huggingface.co/models/{model_id}"
        async with httpx.AsyncClient(timeout=35.0) as client:
            resp = await client.post(
                raw_url,
                headers=headers,
                json={
                    "inputs": f"{SYSTEM_PROMPT}\n\nUser request: {user_prompt}",
                    "parameters": {"max_new_tokens": 512, "temperature": 0.7},
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, list) and len(data) > 0:
                    gen_text = data[0].get("generated_text", "")
                    gen_text = gen_text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
                    if "{" in gen_text and "}" in gen_text:
                        start = gen_text.find("{")
                        end = gen_text.rfind("}") + 1
                        return json.loads(gen_text[start:end])
            else:
                print(f"[Hugging Face Raw API Notice {resp.status_code}]: {resp.text}")
    except Exception as exc:
        print(f"[Hugging Face Raw API Notice]: Request failed ({exc}).")

    return None

async def call_gemma_model(category: MissionCategory, duration_minutes: int, user_notes: str | None) -> dict[str, Any] | None:
    """
    Dispatches generation to Hugging Face Serverless API (if HF_TOKEN is provided)
    or local Ollama server, falling back safely if neither is reachable.
    """
    # 1. Use Hugging Face if HF_TOKEN is configured
    if settings.HF_TOKEN:
        hf_result = await call_huggingface_model(category, duration_minutes, user_notes)
        if hf_result:
            return hf_result

    # 2. Otherwise use local Ollama
    base_url = settings.OLLAMA_BASE_URL.rstrip("/")
    generate_url = f"{base_url}/api/generate"
    user_prompt = build_user_prompt(category, duration_minutes, user_notes)

    async with httpx.AsyncClient(timeout=60.0) as client:
        model_name = await resolve_target_model(client)
        payload = {
            "model": model_name,
            "prompt": f"{SYSTEM_PROMPT}\n\nUser request: {user_prompt}",
            "format": "json",
            "stream": False,
            "options": {
                "temperature": 0.7,
                "top_p": 0.9,
            },
        }

        try:
            resp = await client.post(generate_url, json=payload)
            if resp.status_code == 200:
                body = resp.json()
                raw_response = body.get("response", "")
                cleaned = raw_response.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
                return json.loads(cleaned)
            else:
                print(f"[Ollama Error {resp.status_code}]: {resp.text}")
        except Exception as exc:
            print(f"[Gemma Service Notice]: Local model call failed ({exc}). Using verified policy fallback.")
            return None

async def generate_mission_with_policy(
    category: MissionCategory = "nature",
    duration_minutes: int = 15,
    user_notes: str | None = None,
    recent_missions: list[dict[str, Any]] | None = None,
) -> Mission:
    """
    Implements the Step 7 policy engine orchestrator:
    1. Call Gemma model (up to 2 attempts).
    2. Validate against Pydantic Mission schema.
    3. Run safety and diversity policies.
    4. Return valid mission or curated safe fallback.
    """
    recent_missions = recent_missions or []

    for attempt in range(2):
        model_output = await call_gemma_model(category, duration_minutes, user_notes)
        if not model_output or not isinstance(model_output, dict):
            continue

        try:
            candidate_id = f"gemma-{category[:3]}-{uuid.uuid4().hex[:6]}"
            candidate = Mission(
                id=candidate_id,
                title=model_output.get("title", ""),
                category=category,
                duration_minutes=duration_minutes if duration_minutes in [5, 15, 30] else 15,
                instructions=model_output.get("instructions", []),
                safety_notes=model_output.get("safety_notes", []),
                accessibility_alternative=model_output.get("accessibility_alternative", "Observe from an open window."),
                reward_xp=int(model_output.get("reward_xp", duration_minutes)),
            )

            # Safety check
            is_safe, reason = check_safety(candidate)
            if not is_safe:
                print(f"[Policy Engine]: Attempt {attempt + 1} failed safety: {reason}")
                continue

            # Diversity check
            if not is_diverse(candidate, recent_missions):
                print(f"[Policy Engine]: Attempt {attempt + 1} failed diversity.")
                continue

            # Mission successfully verified!
            return candidate

        except (ValidationError, Exception) as val_err:
            print(f"[Policy Engine]: Attempt {attempt + 1} validation error: {val_err}")
            continue

    # Step 7.C Failure Handling: return safe curated mission
    print("[Policy Engine]: Returning curated safe mission fallback.")
    return get_curated_fallback(category, recent_missions)
