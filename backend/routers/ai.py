"""
FastAPI Router for Hyperion IDE AI, Cypher Code Security, and Local Qwen Coder Services.
Full feature parity with server/routes/ai.js.
"""
import os
import asyncio
import requests
from pathlib import Path
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from backend.config import HF_TOKEN, QWEN_MODEL_ID, PROJECT_ROOT
from backend.services.local_ai import global_local_ai
from backend.services.security_scanner import (
    run_security_analysis,
    parse_gitignore,
    discover_codebase_files,
    generate_cypher_intelligence_response
)

router = APIRouter(tags=["ai"])


class ChatMessage(BaseModel):
    role: Optional[str] = "user"
    sender: Optional[str] = None
    content: Optional[str] = ""
    text: Optional[str] = None


class ChatRequest(BaseModel):
    mode: Optional[str] = "security"
    model: Optional[str] = "qwen-local"
    code: Optional[str] = ""
    filename: Optional[str] = "Active Code"
    prompt: Optional[str] = ""
    messages: Optional[List[Dict[str, Any]]] = []
    file: Optional[Dict[str, Any]] = None
    max_tokens: Optional[int] = 512
    temperature: Optional[float] = 0.2


class SecurityScanRequest(BaseModel):
    code: Optional[str] = ""
    filename: Optional[str] = "source_file"
    language: Optional[str] = "javascript"


class ScanFileRequest(BaseModel):
    filePath: Optional[str] = ""
    workspacePath: Optional[str] = None
    code: Optional[str] = None
    filename: Optional[str] = None


class ExplainRequest(BaseModel):
    code: Optional[str] = ""
    filename: Optional[str] = "active_file"
    prompt: Optional[str] = ""


class FixRequest(BaseModel):
    code: Optional[str] = ""
    filename: Optional[str] = "active_file"
    prompt: Optional[str] = ""


class GenerateRequest(BaseModel):
    prompt: str
    language: Optional[str] = "javascript"
    mode: Optional[str] = "generate"


# -------------------------------------------------------------
# AI STATUS & METRICS
# -------------------------------------------------------------
@router.get("/ai/status")
@router.get("/api/ai/status")
async def get_ai_status():
    """Query AI service status, model cache state, and configured models."""
    cache = global_local_ai.get_cache_info()
    is_loaded = global_local_ai.model is not None
    local_status = cache.get("status", "offline") if not is_loaded else "ready"
    has_hf_token = bool(HF_TOKEN and len(HF_TOKEN) > 10)

    return {
        "success": True,
        "hfConfigured": has_hf_token,
        "localAi": {
            "running": local_status != "offline",
            "status": local_status,
            "isLoaded": is_loaded,
            "model": QWEN_MODEL_ID,
            "device": "cpu"
        },
        "model_id": QWEN_MODEL_ID,
        "is_loaded": is_loaded,
        "is_loading": global_local_ai.is_loading,
        "load_error": global_local_ai.load_error,
        "cache": cache,
        "models": [
            {"id": "qwen-local", "name": "Qwen 2.5 Coder 0.5B (Local CPU - Offline)", "tag": "Local CPU / Offline", "isLocal": True},
            {"id": "meta-llama/Llama-3.1-8B-Instruct", "name": "Meta LLaMA 3.1 8B Instruct", "tag": "Recommended"},
            {"id": "Qwen/Qwen2.5-Coder-32B-Instruct", "name": "Qwen 2.5 Coder 32B (Cloud)", "tag": "Code Specialized"},
            {"id": "deepseek-ai/DeepSeek-R1", "name": "DeepSeek R1", "tag": "Reasoning"}
        ],
        "defaultModel": "qwen-local",
        "features": [
            "code-security-analysis",
            "vulnerability-scanner",
            "secure-code-refactor",
            "interactive-chat",
            "local-code-generation",
            "explain-code",
            "apply-fixes"
        ]
    }


@router.post("/ai/load")
@router.post("/api/ai/load")
async def load_ai_model():
    """Initiate loading Qwen model weights into CPU RAM."""
    ok, msg = global_local_ai.load_model()
    return {
        "success": ok,
        "message": msg,
        "is_loaded": global_local_ai.model is not None
    }


# -------------------------------------------------------------
# CODE SECURITY ANALYSIS & SAST
# -------------------------------------------------------------
@router.post("/ai/security-scan")
@router.post("/api/ai/security-scan")
async def security_scan(req: SecurityScanRequest):
    analysis = run_security_analysis(req.code or "", req.filename or "source_file")
    return {
        "success": True,
        **analysis
    }


@router.get("/ai/codebase-files")
@router.get("/api/ai/codebase-files")
async def get_codebase_files(workspacePath: Optional[str] = Query(None)):
    default_root = str(PROJECT_ROOT)
    workspace_root = workspacePath or default_root

    gitignore_path = os.path.join(workspace_root, ".gitignore")
    rules = parse_gitignore(gitignore_path)
    files = discover_codebase_files(workspace_root, rules)

    return {
        "success": True,
        "workspaceRoot": workspace_root,
        "totalFiles": len(files),
        "files": files
    }


@router.post("/ai/scan-codebase-file")
@router.post("/api/ai/scan-codebase-file")
async def scan_codebase_file(req: ScanFileRequest):
    content = req.code
    file_name = req.filename or os.path.basename(req.filePath or "source_file")

    if content is None and req.filePath:
        target_path = req.filePath
        if not os.path.isabs(target_path) and req.workspacePath:
            target_path = os.path.join(req.workspacePath, target_path)
        if os.path.isfile(target_path):
            try:
                content = Path(target_path).read_text(encoding="utf-8", errors="ignore")
            except Exception as e:
                return {
                    "success": False,
                    "error": f"Failed to read file: {str(e)}",
                    "findings": [],
                    "riskLevel": "LOW",
                    "counts": {"critical": 0, "high": 0, "medium": 0, "low": 0, "total": 0}
                }

    analysis = run_security_analysis(content or "", file_name)
    findings = analysis["findings"]
    counts = {
        "critical": sum(1 for f in findings if f["severity"] == "CRITICAL"),
        "high": sum(1 for f in findings if f["severity"] == "HIGH"),
        "medium": sum(1 for f in findings if f["severity"] == "MEDIUM"),
        "low": sum(1 for f in findings if f["severity"] == "LOW"),
        "total": len(findings)
    }

    return {
        "success": True,
        "filePath": req.filePath,
        "filename": file_name,
        "riskLevel": analysis["riskLevel"],
        "counts": counts,
        "findings": findings,
        "markdown": analysis["markdown"]
    }


# -------------------------------------------------------------
# INTERACTIVE CHAT & LLM ROUTER
# -------------------------------------------------------------
@router.post("/ai/chat")
@router.post("/api/ai/chat")
async def chat_endpoint(req: ChatRequest):
    messages = req.messages or []
    model = (req.model or "qwen-local").strip()
    user_prompt = req.prompt or ""
    raw_code_snippet = req.code or ""

    last_message = messages[-1] if messages else {}
    if not user_prompt:
        user_prompt = last_message.get("text") or last_message.get("content") or ""

    if not raw_code_snippet:
        raw_code_snippet = (
            (req.file and req.file.get("content"))
            or (last_message.get("fileFragment") and last_message["fileFragment"].get("content"))
            or ""
        )

    target_file_name = (
        (req.file and req.file.get("name"))
        or (last_message.get("fileFragment") and last_message["fileFragment"].get("name"))
        or req.filename
        or "Active Code"
    )

    has_hf_token = bool(HF_TOKEN and len(HF_TOKEN) > 10)
    is_qwen_requested = model == "qwen-local" or "qwen" in model.lower()

    # 1. Route to Local Qwen Coder AI Service if requested or if qwen-local is selected
    if is_qwen_requested and (not has_hf_token or model == "qwen-local"):
        local_mode = req.mode or ("explain" if "explain" in user_prompt.lower() else ("fix" if "fix" in user_prompt.lower() else "generate"))
        if global_local_ai.model is not None:
            try:
                # Format prompts
                sys_prompt = "You are Qwen Coder, an expert code security and programming assistant in Hyperion IDE."
                chat_msgs = [{"role": "system", "content": sys_prompt}]
                if messages:
                    for m in messages:
                        r = m.get("role") or ("assistant" if m.get("sender") == "assistant" else "user")
                        c = m.get("content") or m.get("text") or ""
                        if c:
                            chat_msgs.append({"role": r, "content": c})
                else:
                    content = user_prompt
                    if raw_code_snippet:
                        content += f"\n\n[File: `{target_file_name}`]\n```\n{raw_code_snippet}\n```"
                    chat_msgs.append({"role": "user", "content": content})

                res = global_local_ai.run_inference(
                    chat_msgs,
                    max_new_tokens=min(req.max_tokens or 512, 1024),
                    temperature=float(req.temperature if req.temperature is not None else 0.2)
                )
                return {
                    "success": True,
                    "message": res["text"],
                    "provider": "qwen-local-fastapi",
                    "model": QWEN_MODEL_ID,
                    "metrics": {
                        "tokens": res["tokens"],
                        "duration_sec": res["duration_sec"],
                        "tokens_per_sec": res["tokens_per_sec"]
                    }
                }
            except Exception as e:
                # Fall through to Cypher engine fallback
                pass

        # If model is loading or not loaded yet, initiate background load and return rich Cypher fallback
        cache_info = global_local_ai.get_cache_info()
        if cache_info.get("downloaded") and not global_local_ai.is_loading:
            global_local_ai.load_model()

        cypher_fallback = generate_cypher_intelligence_response(user_prompt, raw_code_snippet, QWEN_MODEL_ID, False, target_file_name)
        return {
            "success": True,
            "message": f"> ℹ️ *[Local Qwen CPU]: Offline engine initializing or weights loading into CPU memory. Falling back to Cypher Intelligence Engine.*\n\n{cypher_fallback}",
            "provider": "cypher-security-engine",
            "model": "qwen-local"
        }

    # 2. Try Hugging Face Router API if token is configured (skip for local-only models)
    if has_hf_token and model != "qwen-local":
        hf_model = "Qwen/Qwen2.5-Coder-32B-Instruct" if "qwen" in model.lower() else model
        try:
            system_prompt = (
                "You are Cypher, an expert AI Code Security Analyst and programming assistant in Hyperion IDE.\n"
                "You specialize in Application Security (AppSec), OWASP Top 10, CWE, CVE, and secure coding practices.\n"
                "When evaluating code or answering questions:\n"
                "1. Always analyze for security risks (SQL injection, XSS, RCE, hardcoded secrets, SSRF, path traversal).\n"
                "2. Rate the risk level (CRITICAL, HIGH, MEDIUM, LOW, or SECURE).\n"
                "3. Provide concrete, hardened code remediations.\n"
                "4. Keep explanations clear, well-formatted with markdown and code blocks."
            )
            hf_messages = [{"role": "system", "content": system_prompt}]
            for idx, m in enumerate(messages):
                content = m.get("text") or m.get("content") or ""
                if idx == len(messages) - 1 and raw_code_snippet and raw_code_snippet not in content:
                    content += f"\n\n[Attached Code File: `{target_file_name}`]\n```\n{raw_code_snippet}\n```"
                hf_messages.append({
                    "role": "assistant" if m.get("sender") == "assistant" else "user",
                    "content": content
                })

            def _call_hf_router():
                return requests.post(
                    "https://router.huggingface.co/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {HF_TOKEN}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": hf_model,
                        "messages": hf_messages,
                        "max_tokens": 1024,
                        "temperature": 0.3
                    },
                    timeout=45
                )

            hf_resp = await asyncio.to_thread(_call_hf_router)

            if hf_resp.ok:
                data = hf_resp.json()
                if data.get("choices") and data["choices"][0].get("message", {}).get("content"):
                    return {
                        "success": True,
                        "message": data["choices"][0]["message"]["content"],
                        "provider": "huggingface",
                        "model": model
                    }
        except Exception:
            pass

    # 3. Cypher Intelligence Engine Fallback
    cypher_message = generate_cypher_intelligence_response(user_prompt, raw_code_snippet, model, has_hf_token, target_file_name)
    return {
        "success": True,
        "message": cypher_message,
        "provider": "cypher-security-engine",
        "model": model
    }


# -------------------------------------------------------------
# SPECIALIZED AI WORKFLOW ENDPOINTS (Explain, Fix, Generate)
# -------------------------------------------------------------
@router.post("/ai/explain")
@router.post("/api/ai/explain")
async def explain_code_endpoint(req: ExplainRequest):
    code = req.code or ""
    filename = req.filename or "active_file"
    prompt = req.prompt or "Explain this code in detail with structure, logic, and complexity"

    if global_local_ai.model is not None and code:
        try:
            sys_prompt = (
                "You are Qwen Coder, an expert code analysis assistant in Hyperion IDE.\n"
                "Explain the code clearly:\n"
                "1. High-level summary.\n"
                "2. Logic breakdown.\n"
                "3. Key functions, parameters, return values.\n"
                "4. Time and Space complexity (Big-O).\n"
                "Use clean Markdown formatting."
            )
            chat_msgs = [
                {"role": "system", "content": sys_prompt},
                {"role": "user", "content": f"{prompt}\n\n[File: `{filename}`]\n```\n{code}\n```"}
            ]
            res = global_local_ai.run_inference(chat_msgs, max_new_tokens=600)
            return {"success": True, "message": res["text"], "provider": "qwen-local-fastapi", "metrics": res}
        except Exception:
            pass

    cypher_msg = generate_cypher_intelligence_response(prompt, code, QWEN_MODEL_ID, False, filename)
    return {"success": True, "message": cypher_msg, "provider": "cypher-security-engine"}


@router.post("/ai/fix")
@router.post("/api/ai/fix")
async def fix_code_endpoint(req: FixRequest):
    code = req.code or ""
    filename = req.filename or "active_file"
    prompt = req.prompt or "Fix all bugs, errors, and security vulnerabilities in this code and provide the corrected version."

    if global_local_ai.model is not None and code:
        try:
            sys_prompt = (
                "You are Qwen Coder, an expert debugger and security hardening assistant in Hyperion IDE.\n"
                "1. Identify bugs, logic flaws, or security issues.\n"
                "2. Provide COMPLETE corrected code in a single markdown code block.\n"
                "3. Explain what was fixed."
            )
            chat_msgs = [
                {"role": "system", "content": sys_prompt},
                {"role": "user", "content": f"{prompt}\n\n[File: `{filename}`]\n```\n{code}\n```"}
            ]
            res = global_local_ai.run_inference(chat_msgs, max_new_tokens=700)
            return {"success": True, "message": res["text"], "provider": "qwen-local-fastapi", "metrics": res}
        except Exception:
            pass

    cypher_msg = generate_cypher_intelligence_response(prompt, code, QWEN_MODEL_ID, False, filename)
    return {"success": True, "message": cypher_msg, "provider": "cypher-security-engine"}


@router.post("/ai/generate")
@router.post("/api/ai/generate")
async def generate_code_endpoint(req: GenerateRequest):
    prompt = req.prompt or f"Generate clean {req.language} code"
    lang = req.language or "javascript"

    if global_local_ai.model is not None:
        try:
            sys_prompt = (
                f"You are Qwen Coder, an expert programming assistant in Hyperion IDE.\n"
                f"Generate complete, robust, and well-structured {lang} code based on the specification.\n"
                "Enclose code in markdown code blocks."
            )
            chat_msgs = [
                {"role": "system", "content": sys_prompt},
                {"role": "user", "content": prompt}
            ]
            res = global_local_ai.run_inference(chat_msgs, max_new_tokens=600)
            return {"success": True, "message": res["text"], "provider": "qwen-local-fastapi", "metrics": res}
        except Exception:
            pass

    cypher_msg = generate_cypher_intelligence_response(prompt, "", QWEN_MODEL_ID, False, f"generated.{lang}")
    return {"success": True, "message": cypher_msg, "provider": "cypher-security-engine"}
