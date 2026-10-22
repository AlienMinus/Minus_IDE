"""
FastAPI Router for Hyperion IDE Selenium Testing & Automation System.
"""
import sys
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel, Field

from backend.services.selenium_engine import global_selenium_engine
from backend.services.test_runner import global_test_runner, get_builtin_templates
from backend.services.qa_agent import global_qa_agent

router = APIRouter(tags=["selenium"])

class ConfigureRequest(BaseModel):
    browser: Optional[str] = None
    headless: Optional[bool] = None
    width: Optional[int] = None
    height: Optional[int] = None
    timeout: Optional[int] = None

class NavigateRequest(BaseModel):
    url: str

class StepRequest(BaseModel):
    action: Optional[str] = "click"
    by: Optional[str] = "css"
    selector: Optional[str] = ""
    value: Optional[Any] = ""
    timeout: Optional[int] = 5
    clearFirst: Optional[bool] = True

class SuiteRequest(BaseModel):
    url: Optional[str] = "http://localhost:5174"
    tests: Optional[List[Dict[str, Any]]] = []
    suiteName: Optional[str] = "Automated QA Suite"

class AgentExploreRequest(BaseModel):
    url: Optional[str] = "http://localhost:5174"
    maxSteps: Optional[int] = 10

class InspectRequest(BaseModel):
    selector: str = "body"
    by: Optional[str] = "css"

@router.get("/status")
@router.get("/api/selenium/status")
async def get_status():
    """Retrieve Selenium engine version, active state, and configuration."""
    drv = global_selenium_engine.driver
    return {
        "success": True,
        "engine": "FastAPI Python Selenium 4 Backend",
        "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        "driver_active": drv is not None,
        "config": global_selenium_engine.config,
        "current_url": drv.current_url if drv else None,
        "title": drv.title if drv else None
    }

@router.post("/session/configure")
@router.post("/api/selenium/session/configure")
async def configure_session(req: ConfigureRequest):
    """Configure browser settings (headless/visible, browser type, viewport)."""
    cfg_dict = req.model_dump(exclude_unset=True)
    updated = global_selenium_engine.configure(cfg_dict)
    return {
        "success": True,
        "message": "Selenium configuration updated",
        "config": updated
    }

@router.post("/session/start")
@router.post("/api/selenium/session/start")
async def start_session():
    """Explicitly launch WebDriver session."""
    try:
        drv = global_selenium_engine.get_or_create_driver()
        return {
            "success": True,
            "message": "Selenium session started",
            "browser": global_selenium_engine.config["browser"],
            "headless": global_selenium_engine.config["headless"],
            "url": drv.current_url
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/session/stop")
@router.post("/api/selenium/session/stop")
async def stop_session():
    """Terminate active WebDriver session."""
    global_selenium_engine.close_driver()
    return {"success": True, "message": "Selenium session terminated"}

@router.post("/navigate")
@router.post("/api/selenium/navigate")
async def navigate(req: NavigateRequest):
    """Navigate to a target URL and capture screenshot."""
    try:
        drv = global_selenium_engine.get_or_create_driver()
        drv.get(req.url)
        return {
            "success": True,
            "url": drv.current_url,
            "title": drv.title,
            "screenshot": global_selenium_engine.capture_screenshot(),
            "consoleLogs": global_selenium_engine.capture_console_logs()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/screenshot")
@router.get("/api/selenium/screenshot")
async def get_screenshot():
    """Capture instant viewport screenshot as base64."""
    shot = global_selenium_engine.capture_screenshot()
    if not shot:
        raise HTTPException(status_code=500, detail="Failed to capture screenshot")
    drv = global_selenium_engine.driver
    return {
        "success": True,
        "screenshot": shot,
        "url": drv.current_url if drv else None,
        "title": drv.title if drv else None
    }

@router.post("/execute-step")
@router.post("/api/selenium/execute-step")
async def execute_step(step: StepRequest):
    """Execute a single Selenium test step."""
    res = global_selenium_engine.execute_step(step.model_dump())
    return res

@router.post("/run-suite")
@router.post("/api/selenium/run-suite")
async def run_suite(suite: SuiteRequest):
    """Run a complete modular test suite and generate a report."""
    res = global_test_runner.run_suite(
        target_url=suite.url or "http://localhost:5174",
        tests=suite.tests or [],
        suite_name=suite.suiteName or "Automated QA Suite"
    )
    return res

@router.post("/agent/explore")
@router.post("/api/selenium/agent/explore")
async def agent_explore(agent_req: AgentExploreRequest):
    """Run autonomous QA agent exploration on target URL."""
    res = global_qa_agent.explore(
        target_url=agent_req.url or "http://localhost:5174",
        max_steps=min(agent_req.maxSteps or 10, 25)
    )
    return res

@router.get("/templates")
@router.get("/api/selenium/templates")
async def get_templates(url: str = "http://localhost:5174"):
    """Retrieve pre-built modular test suite templates."""
    return {
        "success": True,
        "templates": get_builtin_templates(url)
    }

@router.post("/inspect")
@router.post("/api/selenium/inspect")
async def inspect_element(req: InspectRequest):
    """Inspect element details using real Selenium."""
    try:
        drv = global_selenium_engine.get_or_create_driver()
        by_loc = global_selenium_engine.get_by_locator(req.by or "css")
        el = drv.find_element(by_loc, req.selector)
        rect = el.rect
        return {
            "success": True,
            "selector": req.selector,
            "tag": el.tag_name,
            "text": el.text,
            "attributes": {
                "id": el.get_attribute("id"),
                "class": el.get_attribute("class"),
                "name": el.get_attribute("name"),
                "type": el.get_attribute("type"),
                "role": el.get_attribute("role")
            },
            "rect": rect,
            "isDisplayed": el.is_displayed(),
            "isEnabled": el.is_enabled()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
