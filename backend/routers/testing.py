"""
Hyperion IDE - Advanced Testing & Benchmarking Router
Provides endpoints for:
1. Load Testing (Autocannon)
2. Speed & Performance Testing (Lighthouse)
3. Secret Leak Testing (Gitleaks)
"""
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.config import PROJECT_ROOT
from backend.services.load_test_engine import run_autocannon_benchmark
from backend.services.speed_test_engine import run_lighthouse_audit
from backend.services.secret_test_engine import run_gitleaks_scan

router = APIRouter(prefix="", tags=["testing"])

class LoadTestRequest(BaseModel):
    url: str = Field(..., description="Target URL for HTTP benchmark")
    connections: int = Field(default=10, ge=1, le=100)
    duration: int = Field(default=10, ge=1, le=60)
    pipelining: int = Field(default=1, ge=1, le=10)

class SpeedTestRequest(BaseModel):
    url: str = Field(..., description="Target URL for Lighthouse audit")
    device: str = Field(default="desktop", description="Target device (desktop or mobile)")

class SecretTestRequest(BaseModel):
    workspacePath: Optional[str] = Field(default=None, description="Workspace root directory")
    scanGitHistory: bool = Field(default=False, description="Whether to scan git commit logs")

# 1. LOAD TEST (AUTOCANNON)
@router.post("/testing/load-test")
@router.post("/api/testing/load-test")
async def load_test_endpoint(req: LoadTestRequest):
    try:
        results = run_autocannon_benchmark(
            target_url=req.url,
            connections=req.connections,
            duration=req.duration,
            pipelining=req.pipelining
        )
        return {"success": True, "data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Load test execution error: {str(e)}")

# 2. SPEED TEST (LIGHTHOUSE)
@router.post("/testing/speed-test")
@router.post("/api/testing/speed-test")
async def speed_test_endpoint(req: SpeedTestRequest):
    try:
        results = run_lighthouse_audit(
            target_url=req.url,
            device=req.device
        )
        return {"success": True, "data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Speed test execution error: {str(e)}")

# 3. SECRET TEST (GITLEAKS)
@router.post("/testing/secret-test")
@router.post("/api/testing/secret-test")
async def secret_test_endpoint(req: SecretTestRequest):
    try:
        target_path = req.workspacePath or str(PROJECT_ROOT)
        results = run_gitleaks_scan(
            workspace_path=target_path,
            scan_git_history=req.scanGitHistory
        )
        return {"success": True, "data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Secret test execution error: {str(e)}")

# 4. TESTING SUITE DIAGNOSTICS & STATUS
@router.get("/testing/status")
@router.get("/api/testing/status")
async def testing_status_endpoint():
    import shutil
    return {
        "status": "ready",
        "engines": {
            "autocannon": {
                "cli_available": bool(shutil.which("autocannon")),
                "npx_available": bool(shutil.which("npx")),
                "native_fallback": True
            },
            "lighthouse": {
                "cli_available": bool(shutil.which("lighthouse")),
                "npx_available": bool(shutil.which("npx")),
                "selenium_fallback": True
            },
            "gitleaks": {
                "cli_available": bool(shutil.which("gitleaks")),
                "native_fallback": True
            }
        }
    }
