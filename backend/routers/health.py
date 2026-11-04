"""
FastAPI Router for Health Check and Root API endpoints.
"""
import sys
import os
from fastapi import APIRouter

router = APIRouter(tags=["health"])

@router.get("/")
@router.get("/api")
async def root_index():
    return {"message": "Welcome to the HyperionIDE API 🫱🏻‍🫲🏻"}

@router.get("/health")
@router.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "service": "Hyperion IDE Production Backend",
        "version": "2.0.0",
        "python_version": sys.version,
        "pid": os.getpid()
    }
