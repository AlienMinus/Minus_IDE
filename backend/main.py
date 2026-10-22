"""
Hyperion IDE - Production FastAPI Server
Modular Python backend serving real Selenium 4 WebDriver automation and Local Qwen AI services.
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
from backend.routers import selenium, ai, health
from backend.services.selenium_engine import global_selenium_engine

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print(f"[FastAPI] Hyperion Backend initialized on http://{HOST}:{PORT}", flush=True)
    yield
    # Shutdown
    print("[FastAPI] Shutting down. Cleaning up Selenium WebDriver...", flush=True)
    global_selenium_engine.close_driver()
    print("[FastAPI] Cleaned up resources successfully.", flush=True)

app = FastAPI(
    title="Hyperion IDE Python Backend",
    description="Production FastAPI service for Selenium 4 Test Automation and Local Qwen Coder AI",
    version="2.0.0",
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

# Register modular routers
app.include_router(health.router)
app.include_router(selenium.router)
app.include_router(ai.router)

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
