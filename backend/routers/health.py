"""
FastAPI Router for Health Check and System Diagnostics.
"""
import sys
import os
from fastapi import APIRouter

router = APIRouter(tags=["health"])

@router.get("/health")
@router.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "service": "Hyperion IDE FastAPI Backend",
        "version": "2.0.0",
        "python_version": sys.version,
        "pid": os.getpid()
    }
