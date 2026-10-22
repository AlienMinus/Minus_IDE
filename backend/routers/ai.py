"""
FastAPI Router for Hyperion IDE Local Qwen Coder AI Engine.
"""
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.services.local_ai import global_local_ai

router = APIRouter(tags=["local_ai"])

class ChatRequest(BaseModel):
    mode: Optional[str] = "generate"
    code: Optional[str] = ""
    filename: Optional[str] = "active_file"
    prompt: Optional[str] = ""
    messages: Optional[List[Dict[str, Any]]] = []
    max_tokens: Optional[int] = 512
    temperature: Optional[float] = 0.2

@router.get("/ai/status")
@router.get("/api/ai/status")
async def get_ai_status():
    """Check AI model cache status and loaded state."""
    cache = global_local_ai.get_cache_info()
    return {
        "success": True,
        "model_id": global_local_ai.model_id,
        "is_loaded": global_local_ai.model is not None,
        "is_loading": global_local_ai.is_loading,
        "load_error": global_local_ai.load_error,
        "cache": cache
    }

@router.post("/ai/load")
@router.post("/api/ai/load")
async def load_ai_model():
    """Initiate loading model into CPU memory."""
    ok, msg = global_local_ai.load_model()
    return {
        "success": ok,
        "message": msg,
        "is_loaded": global_local_ai.model is not None
    }

@router.post("/ai/chat")
@router.post("/api/ai/chat")
@router.post("/ai/generate")
@router.post("/api/ai/generate")
@router.post("/ai/explain")
@router.post("/api/ai/explain")
@router.post("/ai/fix")
@router.post("/api/ai/fix")
async def chat_ai(req: ChatRequest):
    """Generate, explain, or fix code with local Qwen Coder."""
    mode = req.mode or "generate"
    code = req.code or ""
    filename = req.filename or "active_file"
    user_prompt = req.prompt or ""
    raw_messages = req.messages or []
    max_tokens = min(int(req.max_tokens or 512), 1024)
    temp = float(req.temperature if req.temperature is not None else 0.2)

    # Tailored system prompts
    if mode == "explain":
        sys_prompt = (
            "You are Qwen Coder, an expert code analysis assistant in Hyperion IDE.\n"
            "Explain the code clearly:\n"
            "1. High-level summary.\n"
            "2. Logic breakdown.\n"
            "3. Key functions, parameters, return values.\n"
            "4. Time and Space complexity (Big-O).\n"
            "Use clean Markdown formatting."
        )
    elif mode == "fix":
        sys_prompt = (
            "You are Qwen Coder, an expert debugger and security hardening assistant in Hyperion IDE.\n"
            "1. Identify bugs, logic flaws, or security issues.\n"
            "2. Provide COMPLETE corrected code in a single markdown code block.\n"
            "3. Explain what was fixed."
        )
    else:
        sys_prompt = (
            "You are Qwen Coder, an expert programming assistant in Hyperion IDE.\n"
            "Generate complete, robust, and well-structured code based on the user's specification.\n"
            "Enclose code in markdown code blocks."
        )

    chat_messages = [{"role": "system", "content": sys_prompt}]
    if raw_messages:
        for m in raw_messages:
            r = m.get("role") or ("assistant" if m.get("sender") == "assistant" else "user")
            c = m.get("content") or m.get("text") or ""
            if c:
                chat_messages.append({"role": r, "content": c})
    else:
        content = user_prompt
        if code:
            content += f"\n\n[File: `{filename}`]\n```\n{code}\n```"
        chat_messages.append({"role": "user", "content": content})

    if global_local_ai.model is None:
        cache = global_local_ai.get_cache_info()
        if cache["downloaded"]:
            global_local_ai.load_model()
            raise HTTPException(status_code=503, detail="Model is loading into CPU RAM. Please retry in a few seconds.")
        else:
            raise HTTPException(status_code=400, detail=f"Model weights not downloaded ({cache['size_mb']} MB / ~950 MB).")

    try:
        res = global_local_ai.run_inference(chat_messages, max_new_tokens=max_tokens, temperature=temp)
        return {
            "success": True,
            "message": res["text"],
            "model": global_local_ai.model_id,
            "metrics": {
                "tokens": res["tokens"],
                "duration_sec": res["duration_sec"],
                "tokens_per_sec": res["tokens_per_sec"]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")
