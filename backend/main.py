"""
Hyperion IDE - Production FastAPI Server
Modular Python backend replacing Node.js server with complete feature parity:
- Sandbox Engine (Compilers, Command Execution, Real-Time SSE Streaming, REPL)
- Filesystem Management (Tree, Reveal, Delete, Rename, File Media Serving)
- Cypher AI Security Intelligence & SAST Engine
- Local Qwen 2.5 Coder AI Model on CPU
- Selenium 4 WebDriver Automation & QA Agent
"""
import sys
import os
from pathlib import Path

# Force stdout/stderr utf-8 for Windows console support
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

# Ensure project root and backend dir are in sys.path
PROJECT_ROOT = str(Path(__file__).resolve().parent.parent)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import HOST, PORT
from backend.routers import health, sandbox, ai, selenium
from backend.services.selenium_engine import global_selenium_engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print(f"[FastAPI] Hyperion Production Backend active on http://{HOST}:{PORT}", flush=True)
    yield
    # Shutdown
    print("[FastAPI] Shutting down. Cleaning up Selenium WebDriver...", flush=True)
    global_selenium_engine.close_driver()
    print("[FastAPI] Cleaned up resources successfully.", flush=True)


app = FastAPI(
    title="Hyperion IDE Production Backend",
    description="Full-featured Python backend replacing Node.js Express server with 100% parity",
    version="3.0.0",
    lifespan=lifespan
)

# Enable CORS for all frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register modular routers (mounted at both /api and root /)
app.include_router(health.router)
app.include_router(sandbox.router)
app.include_router(ai.router)
app.include_router(selenium.router)


def start_server():
    print(f"[Hyperion Production Backend] Starting Uvicorn on {HOST}:{PORT}...", flush=True)
    try:
        uvicorn.run(
            app,
            host=HOST,
            port=PORT,
            log_level="info",
            access_log=True
        )
    except OSError as e:
        if getattr(e, "errno", None) == 10048 or "10048" in str(e):
            print(f"\n[FastAPI] Port {PORT} is already in use by another instance or process.", flush=True)
            print(f"[FastAPI] Hint: Run 'netstat -ano | findstr :{PORT}' to inspect active listeners.\n", flush=True)
        else:
            raise


if __name__ == "__main__":
    start_server()
