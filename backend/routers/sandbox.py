"""
Hyperion IDE - Sandbox API Router (FastAPI Production Implementation)
Replaces Express /api/sandbox router with full parity: code execution, terminal streaming,
filesystem management, ports scanning, compiler linting, preview proxy, curl proxy, and REPL.
"""
import os
import json
import time
import requests
import asyncio
import platform
import subprocess
from pathlib import Path
from typing import Dict, Any, List, Optional
from urllib.parse import urlparse

from fastapi import APIRouter, Request, Response, HTTPException
from fastapi.responses import HTMLResponse, FileResponse, StreamingResponse
from pydantic import BaseModel

from backend.services.sandbox_engine import (
    get_runtimes_info,
    execute_code,
    execute_command,
    kill_process_tree,
    normalize_path,
    resolve_workspace_path,
    validate_path,
    read_workspace_tree,
    pick_native_folder,
    get_active_ports,
    lint_code
)
from backend.services.stream_engine import global_stream_engine
from backend.services.repl_engine import global_repl_manager

router = APIRouter(tags=["sandbox"])


# Pydantic Schemas
class RunCodeRequest(BaseModel):
    language: Optional[str] = "javascript"
    code: Optional[str] = ""
    filename: Optional[str] = None
    args: Optional[List[str]] = []
    stdin: Optional[str] = ""
    timeoutMs: Optional[int] = 15000
    files: Optional[List[Dict[str, Any]]] = []


class CommandRequest(BaseModel):
    command: str
    cwd: Optional[str] = None
    virtualFiles: Optional[List[Dict[str, Any]]] = []
    timeoutMs: Optional[int] = 30000
    profile: Optional[str] = "powershell"


class StreamRequest(BaseModel):
    streamId: Optional[str] = None
    command: str
    cwd: Optional[str] = None
    virtualFiles: Optional[List[Dict[str, Any]]] = []
    timeoutMs: Optional[int] = 0
    profile: Optional[str] = "powershell"


class StdinRequest(BaseModel):
    streamId: str
    data: str


class KillRequest(BaseModel):
    pid: Optional[int] = None


class WorkspaceResolveRequest(BaseModel):
    folderName: Optional[str] = None
    sampleFiles: Optional[List[str]] = []


class WorkspaceTreeRequest(BaseModel):
    path: str
    maxDepth: Optional[int] = 3


class WorkspaceRevealRequest(BaseModel):
    path: str


class WorkspaceDeleteRequest(BaseModel):
    path: str


class WorkspaceRenameRequest(BaseModel):
    oldPath: str
    newPath: str


class LintRequest(BaseModel):
    language: Optional[str] = ""
    code: Optional[str] = ""
    filename: Optional[str] = ""


class CurlProxyRequest(BaseModel):
    method: Optional[str] = "GET"
    url: str
    headers: Optional[Dict[str, Any]] = {}
    body: Optional[Any] = None
    timeoutMs: Optional[int] = 30000


class ReplStartRequest(BaseModel):
    sessionId: str
    runtime: Optional[str] = "python"
    cwd: Optional[str] = None


class ReplEvalRequest(BaseModel):
    sessionId: str
    code: str


class ReplExitRequest(BaseModel):
    sessionId: str


# -------------------------------------------------------------
# STATUS & RUNTIMES
# -------------------------------------------------------------
@router.get("/sandbox/status")
@router.get("/api/sandbox/status")
async def get_status():
    info = get_runtimes_info()
    return {
        "status": "online",
        "message": "Hyperion Sandbox Service Active (Python FastAPI)",
        "data": info
    }


# -------------------------------------------------------------
# CODE EXECUTION
# -------------------------------------------------------------
@router.post("/sandbox/run")
@router.post("/api/sandbox/run")
async def run_code(req: RunCodeRequest):
    if req.code is None:
        raise HTTPException(status_code=400, detail="Code content is required.")
    res = execute_code(
        language=req.language or "javascript",
        code=req.code,
        filename=req.filename,
        args=req.args or [],
        stdin=req.stdin or "",
        timeout_ms=req.timeoutMs or 15000,
        files=req.files or []
    )
    return res


# -------------------------------------------------------------
# SHELL COMMAND EXECUTION
# -------------------------------------------------------------
@router.post("/sandbox/command")
@router.post("/api/sandbox/command")
async def run_command_endpoint(req: CommandRequest):
    res = execute_command(
        command=req.command,
        cwd=req.cwd,
        virtual_files=req.virtualFiles or [],
        timeout_ms=req.timeoutMs or 30000,
        profile=req.profile or "powershell"
    )
    return res


# -------------------------------------------------------------
# STREAMING COMMAND EXECUTION (SSE)
# -------------------------------------------------------------
@router.post("/sandbox/stream")
@router.post("/api/sandbox/stream")
async def stream_command_endpoint(req: StreamRequest):
    stream_id = req.streamId or f"stream_{int(time.time() * 1000)}"
    active_stream = global_stream_engine.create_stream(
        stream_id=stream_id,
        command=req.command,
        cwd=req.cwd,
        virtual_files=req.virtualFiles or [],
        timeout_ms=req.timeoutMs or 0,
        profile=req.profile or "powershell"
    )

    async def event_generator():
        while not active_stream.finished:
            try:
                # Poll queue
                item_type, data = active_stream.queue.get(timeout=0.1)
                if item_type == "chunk":
                    yield f"data: {json.dumps({'type': 'output', 'data': data})}\n\n"
                elif item_type == "exit":
                    yield f"data: {json.dumps({'type': 'exit', 'code': data})}\n\n"
                    break
            except Exception:
                await asyncio.sleep(0.02)
                continue

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.post("/sandbox/stdin")
@router.post("/api/sandbox/stdin")
async def stream_stdin_endpoint(req: StdinRequest):
    stream = global_stream_engine.get_stream(req.streamId)
    if not stream:
        raise HTTPException(status_code=404, detail="Active process not found or exited")
    ok = stream.write_stdin(req.data)
    return {"success": ok}


@router.post("/sandbox/kill")
@router.post("/api/sandbox/kill")
async def kill_process_endpoint(req: KillRequest):
    if req.pid:
        kill_process_tree(req.pid)
        return {"success": True, "message": f"Process {req.pid} killed."}
    return {"success": False, "error": "No PID provided"}


# -------------------------------------------------------------
# WORKSPACE & FILESYSTEM OPERATIONS
# -------------------------------------------------------------
@router.post("/sandbox/workspace/resolve")
@router.post("/api/sandbox/workspace/resolve")
async def workspace_resolve(req: WorkspaceResolveRequest):
    resolved = resolve_workspace_path(req.folderName, req.sampleFiles or [])
    return {"success": bool(resolved), "path": resolved}


@router.get("/sandbox/workspace/validate")
@router.get("/api/sandbox/workspace/validate")
async def workspace_validate(path: Optional[str] = None):
    return validate_path(path)


@router.post("/sandbox/workspace/pick")
@router.post("/api/sandbox/workspace/pick")
async def workspace_pick():
    chosen = pick_native_folder()
    return {"success": bool(chosen), "path": chosen}


@router.post("/sandbox/workspace/tree")
@router.post("/api/sandbox/workspace/tree")
async def workspace_tree(req: WorkspaceTreeRequest):
    tree = read_workspace_tree(req.path, max_depth=req.maxDepth or 3)
    return {"success": True, "tree": tree}


@router.get("/sandbox/workspace/file")
@router.get("/api/sandbox/workspace/file")
async def workspace_file(path: str):
    if not path:
        raise HTTPException(status_code=400, detail="path is required")
    resolved = normalize_path(path)
    if not os.path.isfile(resolved):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(resolved)


@router.post("/sandbox/workspace/reveal")
@router.post("/api/sandbox/workspace/reveal")
async def workspace_reveal(req: WorkspaceRevealRequest):
    resolved = normalize_path(req.path)
    if platform.system() == "Windows":
        subprocess.Popen(f'explorer /select,"{resolved.replace("/", "\\\\")}"', shell=True)
    elif platform.system() == "Darwin":
        subprocess.Popen(["open", "-R", resolved])
    else:
        subprocess.Popen(["xdg-open", resolved])
    return {"success": True}


@router.post("/sandbox/workspace/delete")
@router.post("/api/sandbox/workspace/delete")
async def workspace_delete(req: WorkspaceDeleteRequest):
    resolved = normalize_path(req.path)
    if os.path.exists(resolved):
        if os.path.isdir(resolved):
            import shutil
            shutil.rmtree(resolved, ignore_errors=True)
        else:
            try:
                os.unlink(resolved)
            except Exception:
                pass
        return {"success": True}
    return {"success": True, "message": "File did not exist on disk"}


@router.post("/sandbox/workspace/rename")
@router.post("/api/sandbox/workspace/rename")
async def workspace_rename(req: WorkspaceRenameRequest):
    old_p = normalize_path(req.oldPath)
    new_p = normalize_path(req.newPath)
    if os.path.exists(old_p):
        os.rename(old_p, new_p)
        return {"success": True}
    return {"success": False, "error": "Source file does not exist"}


# -------------------------------------------------------------
# PORTS & LINTING
# -------------------------------------------------------------
@router.get("/sandbox/ports")
@router.get("/api/sandbox/ports")
async def get_ports_endpoint():
    ports = get_active_ports()
    return {"success": True, "ports": ports}


@router.post("/sandbox/lint")
@router.post("/api/sandbox/lint")
async def lint_endpoint(req: LintRequest):
    return lint_code(req.language or "", req.code or "", req.filename or "")


# -------------------------------------------------------------
# PREVIEW PROXY (Transparent in-memory HTML injection)
# -------------------------------------------------------------
@router.get("/sandbox/preview-proxy")
@router.get("/api/sandbox/preview-proxy")
async def preview_proxy_endpoint(url: Optional[str] = "http://localhost:5174", request: Request = None):
    clean_url = (url or "http://localhost:5174").strip()
    if not clean_url.startswith("http://") and not clean_url.startswith("https://"):
        clean_url = f"http://{clean_url}"

    parsed = urlparse(clean_url)
    target_origin = f"{parsed.scheme}://{parsed.netloc}"
    target_route = (parsed.path or "/") + (f"?{parsed.query}" if parsed.query else "")

    try:
        req_headers = {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "User-Agent": request.headers.get("user-agent", "HyperionIDE-Preview") if request else "HyperionIDE-Preview"
        }
        res = requests.get(clean_url, headers=req_headers, timeout=10)
        if not res.ok:
            return HTMLResponse(f"<h3>Preview Proxy Error: Target returned status {res.status_code}</h3>", status_code=res.status_code)

        html = res.text

        head_injections = f"""
  <base href="{target_origin}/">
  <!-- Hyperion IDE Client-Side Route Normalizer (Prevents 404 in BrowserRouter on load/refresh) -->
  <script>
    (function() {{
      try {{
        var expectedPath = {json.dumps(target_route or '/')};
        if (window.location.pathname.startsWith('/api/sandbox/preview-proxy')) {{
          window.history.replaceState(null, '', expectedPath);
        }}
      }} catch (err) {{}}
    }})();
  </script>"""

        if "<head>" in html:
            html = html.replace("<head>", f"<head>\n{head_injections}")
        elif "<html>" in html:
            html = html.replace("<html>", f"<html>\n<head>{head_injections}</head>")
        else:
            html = f"{head_injections}\n{html}"

        bridge_script = """
    <!-- Hyperion IDE In-Memory Automation Bridge (Zero files modified on disk) -->
    <script>
      (function() {
        if (window.__hyperion_bridge_active__) return;
        window.__hyperion_bridge_active__ = true;

        function resolveEl(sel) {
          if (!sel || typeof sel !== 'string') return null;
          try {
            if (sel.startsWith('text:') || sel.startsWith('text=')) {
              const textVal = sel.replace(/^text[:=]\\s*/, '').toLowerCase();
              const all = Array.from(document.querySelectorAll('a, button, span, h1, h2, h3, p, label, li, [role="button"]'));
              for (const el of all) {
                if ((el.innerText || el.textContent || '').trim().toLowerCase() === textVal) return el;
              }
              for (const el of all) {
                if ((el.innerText || el.textContent || '').toLowerCase().includes(textVal)) return el;
              }
              return null;
            }
            if (sel.startsWith('//') || sel.startsWith('(//')) {
              return document.evaluate(sel, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            }
            return document.querySelector(sel);
          } catch (e) { return null; }
        }

        window.addEventListener('message', function(e) {
          if (!e.data || e.data.source !== 'hyperion-selenium') return;
          const { action, selector, value, reqId } = e.data;

          try {
            if (action === 'PING') {
              window.parent.postMessage({ source: 'hyperion-preview', type: 'PONG', url: window.location.href, title: document.title, ready: true }, '*');
              return;
            }

            if (action === 'DUMP_DOM') {
              const items = Array.from(document.querySelectorAll('a, button, input, textarea, select, h1, h2, h3, img, [role="button"]')).map(el => {
                const r = el.getBoundingClientRect();
                return {
                  tagName: el.tagName.toLowerCase(),
                  id: el.id || '',
                  className: el.className || '',
                  text: (el.innerText || el.textContent || '').trim().slice(0, 60),
                  rect: { left: r.left, top: r.top, width: r.width, height: r.height }
                };
              });
              window.parent.postMessage({ source: 'hyperion-preview', reqId, success: true, elements: items }, '*');
              return;
            }

            if (action === 'GET_RECT') {
              const el = resolveEl(selector);
              if (!el) {
                window.parent.postMessage({ source: 'hyperion-preview', reqId, success: false, error: 'Element not found' }, '*');
                return;
              }
              const r = el.getBoundingClientRect();
              window.parent.postMessage({
                source: 'hyperion-preview',
                reqId,
                success: true,
                tagName: el.tagName.toLowerCase(),
                innerText: (el.innerText || el.textContent || '').trim().slice(0, 50),
                rect: { left: r.left, top: r.top, width: r.width, height: r.height }
              }, '*');
              return;
            }

            if (action === 'CLICK') {
              const el = resolveEl(selector);
              if (!el) {
                window.parent.postMessage({ source: 'hyperion-preview', reqId, success: false, error: 'Element not found' }, '*');
                return;
              }
              try { el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }); } catch {}
              const r = el.getBoundingClientRect();
              el.focus?.();
              el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
              el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
              el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, buttons: 1 }));
              el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, buttons: 1 }));
              el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
              el.click?.();
              window.parent.postMessage({
                source: 'hyperion-preview',
                reqId,
                success: true,
                tagName: el.tagName.toLowerCase(),
                rect: { left: r.left, top: r.top, width: r.width, height: r.height }
              }, '*');
              return;
            }

            if (action === 'TYPE') {
              const el = resolveEl(selector);
              if (!el) {
                window.parent.postMessage({ source: 'hyperion-preview', reqId, success: false, error: 'Element not found' }, '*');
                return;
              }
              try { el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }); } catch {}
              const r = el.getBoundingClientRect();
              el.focus?.();
              el.value = value;
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
              window.parent.postMessage({
                source: 'hyperion-preview',
                reqId,
                success: true,
                rect: { left: r.left, top: r.top, width: r.width, height: r.height }
              }, '*');
              return;
            }
          } catch (err) {
            window.parent.postMessage({ source: 'hyperion-preview', reqId, success: false, error: err.message }, '*');
          }
        });

        window.parent.postMessage({ source: 'hyperion-preview', type: 'BRIDGE_READY', url: window.location.href, title: document.title }, '*');
      })();
    </script>
"""
        if "</body>" in html:
            html = html.replace("</body>", f"{bridge_script}\n</body>")
        else:
            html += bridge_script

        return HTMLResponse(content=html, media_type="text/html; charset=utf-8")
    except Exception as e:
        return HTMLResponse(f"<h3>Proxy Error: {str(e)}</h3>", status_code=500)


# -------------------------------------------------------------
# CURL PROXY (Postman-like endpoint testing with CORS bypass)
# -------------------------------------------------------------
@router.post("/sandbox/curl-proxy")
@router.post("/api/sandbox/curl-proxy")
async def curl_proxy_endpoint(req: CurlProxyRequest):
    start_time = time.time()
    try:
        clean_headers = {k: str(v) for k, v in (req.headers or {}).items() if k.lower() not in ("host", "connection", "content-length")}
        if "user-agent" not in {k.lower(): k for k in clean_headers}:
            clean_headers["User-Agent"] = "Hyperion-API-Client/1.0 (Windows NT 10.0; Win64; x64)"

        timeout_sec = min(max(float(req.timeoutMs or 30000) / 1000.0, 1.0), 120.0)

        data = None
        json_data = None
        if req.body and req.method.upper() in ("POST", "PUT", "PATCH", "DELETE"):
            if isinstance(req.body, (dict, list)):
                json_data = req.body
            else:
                data = str(req.body).encode("utf-8")

        response = requests.request(
            method=req.method.upper(),
            url=req.url,
            headers=clean_headers,
            data=data,
            json=json_data,
            timeout=timeout_sec,
            allow_redirects=True
        )

        duration_ms = int((time.time() - start_time) * 1000)
        raw_text = response.text
        size_bytes = len(response.content)

        parsed_data = None
        content_type = response.headers.get("content-type", "")
        if "application/json" in content_type:
            try:
                parsed_data = response.json()
            except Exception:
                parsed_data = raw_text
        else:
            parsed_data = raw_text

        return {
            "success": True,
            "status": response.status_code,
            "statusText": response.reason,
            "durationMs": duration_ms,
            "sizeBytes": size_bytes,
            "headers": dict(response.headers),
            "data": parsed_data,
            "rawText": raw_text
        }
    except Exception as e:
        duration_ms = int((time.time() - start_time) * 1000)
        return {
            "success": False,
            "status": 0,
            "statusText": "Connection Failed",
            "durationMs": duration_ms,
            "error": str(e),
            "data": None
        }


# -------------------------------------------------------------
# REPL SESSIONS
# -------------------------------------------------------------
@router.post("/sandbox/repl/start")
@router.post("/api/sandbox/repl/start")
async def repl_start_endpoint(req: ReplStartRequest):
    data = global_repl_manager.start_session(
        session_id=req.sessionId,
        runtime=req.runtime or "python",
        cwd=req.cwd
    )
    return {"success": True, "data": data}


@router.post("/sandbox/repl/eval")
@router.post("/api/sandbox/repl/eval")
async def repl_eval_endpoint(req: ReplEvalRequest):
    data = global_repl_manager.eval_code(
        session_id=req.sessionId,
        code=req.code
    )
    return {"success": True, "data": data}


@router.post("/sandbox/repl/exit")
@router.post("/api/sandbox/repl/exit")
async def repl_exit_endpoint(req: ReplExitRequest):
    return global_repl_manager.exit_session(req.sessionId)
