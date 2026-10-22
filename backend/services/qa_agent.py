"""
Hyperion IDE - Autonomous Exploratory QA Agent
Crawls the live preview page using real Selenium 4, checks interactive controls,
audits console warnings/errors, and calculates an Application Health Score.
"""
import time
from typing import Dict, Any, List
from selenium.webdriver.common.by import By
from backend.services.selenium_engine import global_selenium_engine

class AutonomousQAAgent:
    def __init__(self, engine=None):
        self.engine = engine or global_selenium_engine

    def explore(self, target_url: str, max_steps: int = 10) -> Dict[str, Any]:
        drv = self.engine.get_or_create_driver()
        drv.get(target_url)

        thoughts: List[str] = [
            f"Navigated to target URL: {target_url}",
            f"Live page title resolved: '{drv.title}'"
        ]
        findings: List[Dict[str, Any]] = []
        actions_taken = 0

        try:
            links = drv.find_elements(By.TAG_NAME, "a")
            buttons = drv.find_elements(By.TAG_NAME, "button")
            inputs = drv.find_elements(By.TAG_NAME, "input")

            thoughts.append(
                f"DOM discovery scan: Found {len(links)} anchors, {len(buttons)} buttons, {len(inputs)} inputs."
            )

            # 1. Audit dead links (# or empty href)
            empty_links = 0
            for l in links[:15]:
                try:
                    href = l.get_attribute("href")
                    if not href or href == "#" or href.startswith("javascript:void"):
                        empty_links += 1
                except Exception:
                    pass

            if empty_links > 0:
                findings.append({
                    "id": "find_dead_links",
                    "type": "warning",
                    "title": "Placeholder / Dead Anchors Detected",
                    "description": f"Found {empty_links} links using empty href or '#' placeholder targets.",
                    "recommendation": "Replace placeholder '#' with actual routes or use button elements."
                })

            # 2. Audit browser console logs
            logs = self.engine.capture_console_logs()
            severe_logs = [l for l in logs if l.get("level") in ("SEVERE", "ERROR")]
            if severe_logs:
                findings.append({
                    "id": "find_console_errors",
                    "type": "error",
                    "title": "Severe Browser Console Errors Encountered",
                    "description": f"Encountered {len(severe_logs)} runtime console exceptions.",
                    "details": severe_logs[:3],
                    "recommendation": "Inspect and resolve unhandled JavaScript exceptions in the client code."
                })

            # 3. Safely interact with visible buttons
            for btn in buttons[:max_steps]:
                if actions_taken >= max_steps:
                    break
                try:
                    if btn.is_displayed() and btn.is_enabled():
                        btn_text = (btn.text or "").strip() or "icon-button"
                        thoughts.append(f"Exercising clickable element: '{btn_text}'")
                        btn.click()
                        actions_taken += 1
                        time.sleep(0.3)
                except Exception as e:
                    thoughts.append(f"Button click skipped: {str(e)[:50]}")

        except Exception as e:
            findings.append({
                "id": "find_crawl_error",
                "type": "error",
                "title": "Exploration Interrupted",
                "description": str(e),
                "recommendation": "Verify that target URL is reachable and CORS is permissive."
            })

        # Calculate Application Health Score
        score = 100
        for f in findings:
            if f.get("type") == "error":
                score -= 20
            elif f.get("type") == "warning":
                score -= 8
        score = max(min(score, 100), 20)

        screenshot = self.engine.capture_screenshot()

        return {
            "success": True,
            "url": drv.current_url,
            "healthScore": score,
            "thoughts": thoughts,
            "findings": findings,
            "actionsTaken": actions_taken,
            "screenshot": screenshot
        }

# Singleton instance
global_qa_agent = AutonomousQAAgent()
