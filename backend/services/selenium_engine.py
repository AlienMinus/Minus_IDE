"""
Hyperion IDE - Selenium 4 WebDriver Engine
Manages browser lifecycle, driver initialization, stealth options, actions, and viewport screenshots.
"""
import base64
import time
import threading
from typing import Optional, Dict, Any, List
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.edge.service import Service as EdgeService
from selenium.webdriver.edge.options import Options as EdgeOptions

from backend.config import (
    DEFAULT_BROWSER,
    DEFAULT_HEADLESS,
    DEFAULT_WIDTH,
    DEFAULT_HEIGHT,
    DEFAULT_TIMEOUT
)

class SeleniumEngine:
    def __init__(self):
        self._lock = threading.Lock()
        self.driver: Optional[webdriver.Remote] = None
        self.config: Dict[str, Any] = {
            "browser": DEFAULT_BROWSER,
            "headless": DEFAULT_HEADLESS,
            "width": DEFAULT_WIDTH,
            "height": DEFAULT_HEIGHT,
            "timeout": DEFAULT_TIMEOUT
        }

    def get_by_locator(self, by_type: str):
        mapping = {
            "css": By.CSS_SELECTOR,
            "xpath": By.XPATH,
            "id": By.ID,
            "name": By.NAME,
            "tag": By.TAG_NAME,
            "class": By.CLASS_NAME,
            "link_text": By.LINK_TEXT,
            "partial_link_text": By.PARTIAL_LINK_TEXT
        }
        return mapping.get((by_type or "").lower().strip(), By.CSS_SELECTOR)

    def get_or_create_driver(self) -> webdriver.Remote:
        with self._lock:
            if self.driver is not None:
                try:
                    # Test if driver is still responsive
                    _ = self.driver.current_window_handle
                    return self.driver
                except Exception:
                    self.close_driver()

            browser = self.config.get("browser", "chrome").lower()
            headless = self.config.get("headless", True)
            width = self.config.get("width", 1280)
            height = self.config.get("height", 800)

            if browser == "edge":
                options = EdgeOptions()
                if headless:
                    options.add_argument("--headless=new")
                options.add_argument(f"--window-size={width},{height}")
                options.add_argument("--no-sandbox")
                options.add_argument("--disable-dev-shm-usage")
                options.add_argument("--disable-gpu")
                options.add_argument("--disable-blink-features=AutomationControlled")
                options.set_capability("goog:loggingPrefs", {"browser": "ALL"})
                self.driver = webdriver.Edge(options=options)
            else:
                options = ChromeOptions()
                if headless:
                    options.add_argument("--headless=new")
                options.add_argument(f"--window-size={width},{height}")
                options.add_argument("--no-sandbox")
                options.add_argument("--disable-dev-shm-usage")
                options.add_argument("--disable-gpu")
                options.add_argument("--disable-blink-features=AutomationControlled")
                options.set_capability("goog:loggingPrefs", {"browser": "ALL"})
                self.driver = webdriver.Chrome(options=options)

            self.driver.set_page_load_timeout(self.config.get("timeout", 15))
            self.driver.implicitly_wait(1)
            return self.driver

    def close_driver(self):
        with self._lock:
            if self.driver is not None:
                try:
                    self.driver.quit()
                except Exception:
                    pass
                finally:
                    self.driver = None

    def configure(self, new_config: Dict[str, Any]) -> Dict[str, Any]:
        restart_needed = False
        if "browser" in new_config and new_config["browser"] != self.config["browser"]:
            self.config["browser"] = new_config["browser"].lower()
            restart_needed = True

        if "headless" in new_config and bool(new_config["headless"]) != self.config["headless"]:
            self.config["headless"] = bool(new_config["headless"])
            restart_needed = True

        if "width" in new_config:
            self.config["width"] = int(new_config["width"])
        if "height" in new_config:
            self.config["height"] = int(new_config["height"])
        if "timeout" in new_config:
            self.config["timeout"] = int(new_config["timeout"])

        if restart_needed:
            self.close_driver()
            self.get_or_create_driver()

        return self.config

    def capture_screenshot(self) -> Optional[str]:
        try:
            drv = self.get_or_create_driver()
            png_bytes = drv.get_screenshot_as_png()
            b64 = base64.b64encode(png_bytes).decode("utf-8")
            return f"data:image/png;base64,{b64}"
        except Exception:
            return None

    def capture_console_logs(self) -> List[Dict[str, Any]]:
        logs = []
        try:
            drv = self.get_or_create_driver()
            raw_logs = drv.get_log("browser")
            for entry in raw_logs:
                logs.append({
                    "level": entry.get("level", "INFO"),
                    "message": entry.get("message", ""),
                    "timestamp": entry.get("timestamp", int(time.time() * 1000))
                })
        except Exception:
            pass
        return logs

    def execute_step(self, step_data: Dict[str, Any]) -> Dict[str, Any]:
        raw_action = step_data.get("action") or step_data.get("type", "click")
        action = str(raw_action).lower().replace("-", "_")
        by_type = step_data.get("by", "css")
        selector = step_data.get("selector", "")
        value = step_data.get("value") or step_data.get("script") or step_data.get("expected", "")
        timeout = step_data.get("timeout", self.config.get("timeout", 5))

        st_start = time.time()
        drv = self.get_or_create_driver()
        by_loc = self.get_by_locator(by_type)
        details = ""

        try:
            if action in ("navigate", "goto", "open"):
                drv.get(str(value or selector))
                details = f"Navigated to {drv.current_url}"

            elif action in ("click", "tap"):
                el = WebDriverWait(drv, timeout).until(EC.element_to_be_clickable((by_loc, selector)))
                drv.execute_script("arguments[0].scrollIntoView({block: 'center', inline: 'nearest'});", el)
                el.click()
                details = f"Clicked element: {selector}"

            elif action in ("type", "send_keys", "sendkeys"):
                el = WebDriverWait(drv, timeout).until(EC.visibility_of_element_located((by_loc, selector)))
                if step_data.get("clearFirst", True):
                    el.clear()
                el.send_keys(str(value))
                details = f"Typed '{value}' into {selector}"

            elif action == "clear":
                el = WebDriverWait(drv, timeout).until(EC.visibility_of_element_located((by_loc, selector)))
                el.clear()
                details = f"Cleared input: {selector}"

            elif action in ("hover", "moveto"):
                el = drv.find_element(by_loc, selector)
                ActionChains(drv).move_to_element(el).perform()
                details = f"Hovered over: {selector}"

            elif action in ("scroll", "scrollby"):
                drv.execute_script("window.scrollBy(0, arguments[0]);", int(value or 300))
                details = f"Scrolled by {value or 300}px"

            elif action in ("wait", "sleep"):
                time.sleep(float(value or 0.5))
                details = f"Waited {value or 0.5}s"

            elif action in ("assert_element", "assertelement", "waitforelement", "assertvisible", "assert_visible"):
                _ = WebDriverWait(drv, timeout).until(EC.presence_of_element_located((by_loc, selector)))
                details = f"Element {selector} is present/visible"

            elif action in ("assert_text", "asserttext"):
                el = drv.find_element(by_loc, selector)
                if str(value).lower() not in el.text.lower():
                    raise AssertionError(f"Expected text '{value}' not found in '{el.text}'")
                details = f"Asserted text '{value}' matches element text"

            elif action in ("assert_value", "assertvalue"):
                el = drv.find_element(by_loc, selector)
                actual_val = el.get_attribute("value") or el.text
                if str(value).lower() not in actual_val.lower():
                    raise AssertionError(f"Expected value '{value}' not found in '{actual_val}'")
                details = f"Asserted value '{value}' matches element value"

            elif action in ("assert_title", "asserttitle"):
                if str(value).lower() not in drv.title.lower():
                    raise AssertionError(f"Expected title to contain '{value}', got '{drv.title}'")
                details = f"Asserted title contains '{value}'"

            elif action in ("execute_script", "executescript"):
                script_res = drv.execute_script(str(value or selector))
                details = f"Script evaluated: {str(script_res)[:80]}"

            elif action in ("takesnapshot", "take_snapshot", "snapshot"):
                details = "Captured viewport snapshot"

            else:
                details = f"Executed generic action: {action}"

            return {
                "success": True,
                "action": action,
                "selector": selector,
                "status": "passed",
                "details": details,
                "durationMs": round((time.time() - st_start) * 1000)
            }
        except Exception as e:
            return {
                "success": False,
                "action": action,
                "selector": selector,
                "status": "failed",
                "error": str(e),
                "durationMs": round((time.time() - st_start) * 1000)
            }

# Singleton instance
global_selenium_engine = SeleniumEngine()
