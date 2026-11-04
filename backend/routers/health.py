"""
FastAPI Router for Health Check, System Diagnostics, and Root API endpoints.
Provides complete observability for Hyperion IDE frontend services and API testing.
"""
import sys
import os
import time
import platform
from fastapi import APIRouter

router = APIRouter(tags=["health"])

_START_TIME = time.time()


@router.get("/")
@router.get("/api")
async def root_index():
    """Root welcome endpoint for API discovery."""
    return {
        "status": "ok",
        "message": "Welcome to the HyperionIDE API 🫱🏻‍🫲🏻",
        "service": "Hyperion IDE Production Backend",
        "version": "3.0.0",
        "framework": "FastAPI (Python 3)",
        "endpoints": {
            "health": "/api/health",
            "sandbox_status": "/api/sandbox/status",
            "ai_status": "/api/ai/status",
            "selenium_status": "/api/selenium/status",
            "ports": "/api/sandbox/ports",
            "swagger_docs": "/docs",
            "redoc": "/redoc"
        }
    }


@router.get("/health")
@router.get("/api/health")
@router.get("/status")
@router.get("/api/status")
@router.post("/health")
@router.post("/api/health")
async def health_check():
    """
    Comprehensive health check and system diagnostic endpoint.
    Used by frontend health checks, cURL testing proxy, and external monitors.
    """
    uptime_sec = round(time.time() - _START_TIME, 2)
    return {
        "status": "ok",
        "service": "Hyperion IDE Production Backend",
        "version": "3.0.0",
        "framework": "FastAPI (Python)",
        "uptime_seconds": uptime_sec,
        "timestamp": int(time.time() * 1000),
        "system": {
            "os": f"{platform.system()} {platform.release()}",
            "platform": platform.platform(),
            "architecture": platform.machine(),
            "python_version": sys.version.split()[0],
            "pid": os.getpid()
        },
        "endpoints": {
            "root": "/",
            "api_root": "/api",
            "health": "/health",
            "api_health": "/api/health",
            "sandbox": "/api/sandbox/status",
            "ai": "/api/ai/status",
            "selenium": "/api/selenium/status",
            "curl_proxy": "/api/sandbox/curl-proxy",
            "preview_proxy": "/api/sandbox/preview-proxy"
        }
    }

