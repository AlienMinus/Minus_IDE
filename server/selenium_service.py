# server/selenium_service.py
"""
Hyperion Python Selenium Backend Testing Engine
Provides a REST API for automated UI testing, end-to-end browser automation,
and autonomous QA exploration using real Selenium 4 WebDriver and Chrome/Edge.
"""

import os
import sys
import time
import json
import base64
import traceback
import threading

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')
from urllib.parse import urlparse
from flask import Flask, request, jsonify
from flask_cors import CORS

from selenium import webdriver
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.edge.options import Options as EdgeOptions
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    WebDriverException,
    NoSuchElementException,
    TimeoutException,
    ElementNotInteractableException,
    StaleElementReferenceException
)

app = Flask(__name__)
CORS(app)

# Global State & Driver Lock
driver_lock = threading.Lock()
active_driver = None
current_config = {
    "browser": "chrome",
    "headless": True,
    "width": 1280,
    "height": 800,
    "timeout": 10
}

def get_or_create_driver():
    """Ensure a singleton WebDriver instance is running with current configuration."""
    global active_driver
    with driver_lock:
        if active_driver is not None:
            try:
                # Check if driver is alive
                _ = active_driver.current_window_handle
                return active_driver
            except Exception:
                try:
                    active_driver.quit()
                except Exception:
                    pass
                active_driver = None

        browser_type = current_config.get("browser", "chrome").lower()
        headless = current_config.get("headless", True)
        width = current_config.get("width", 1280)
        height = current_config.get("height", 800)

        if browser_type == "edge":
            options = EdgeOptions()
            if headless:
                options.add_argument("--headless=new")
            options.add_argument(f"--window-size={width},{height}")
            options.add_argument("--no-sandbox")
            options.add_argument("--disable-dev-shm-usage")
            options.add_argument("--disable-blink-features=AutomationControlled")
            options.set_capability("goog:loggingPrefs", {"browser": "ALL"})
            driver = webdriver.Edge(options=options)
        else:
            options = ChromeOptions()
            if headless:
                options.add_argument("--headless=new")
            options.add_argument(f"--window-size={width},{height}")
            options.add_argument("--no-sandbox")
            options.add_argument("--disable-dev-shm-usage")
            options.add_argument("--disable-blink-features=AutomationControlled")
            options.set_capability("goog:loggingPrefs", {"browser": "ALL"})
            driver = webdriver.Chrome(options=options)

        driver.set_page_load_timeout(30)
        driver.implicitly_wait(2)
        active_driver = driver
        return active_driver

def close_driver():
    """Safely quit active driver."""
    global active_driver
    with driver_lock:
        if active_driver is not None:
            try:
                active_driver.quit()
            except Exception:
                pass
            active_driver = None

def get_by_locator(by_str):
    """Map string selector type to Selenium By locator."""
    by_map = {
        "css": By.CSS_SELECTOR,
        "xpath": By.XPATH,
        "id": By.ID,
        "name": By.NAME,
        "tag": By.TAG_NAME,
        "class": By.CLASS_NAME,
        "link_text": By.LINK_TEXT,
        "partial_link_text": By.PARTIAL_LINK_TEXT
    }
    return by_map.get((by_str or "css").lower(), By.CSS_SELECTOR)

def capture_screenshot_b64(driver):
    """Capture base64 screenshot."""
    try:
        return driver.get_screenshot_as_base64()
    except Exception:
        return None

def capture_browser_logs(driver):
    """Harvest console logs from driver."""
    try:
        logs = driver.get_log("browser")
        return [
            {
                "level": log.get("level"),
                "message": log.get("message"),
                "timestamp": log.get("timestamp")
            }
            for log in logs
        ]
    except Exception:
        return []

# =====================================================================
# API Routes
# =====================================================================

@app.route("/status", methods=["GET"])
@app.route("/api/selenium/status", methods=["GET"])
def get_status():
    """Check Python Selenium engine status."""
    is_alive = False
    current_url = None
    title = None
    if active_driver is not None:
        try:
            current_url = active_driver.current_url
            title = active_driver.title
            is_alive = True
        except Exception:
            is_alive = False

    return jsonify({
        "success": True,
        "engine": "Python Selenium 4 Backend",
        "python_version": sys.version.split()[0],
        "driver_active": is_alive,
        "config": current_config,
        "current_url": current_url,
        "title": title
    })

@app.route("/session/configure", methods=["POST"])
@app.route("/api/selenium/session/configure", methods=["POST"])
def configure_session():
    """Update driver configuration (headless, browser, viewport)."""
    global current_config
    data = request.json or {}
    restart_needed = False

    if "headless" in data and data["headless"] != current_config["headless"]:
        current_config["headless"] = bool(data["headless"])
        restart_needed = True

    if "browser" in data and data["browser"].lower() != current_config["browser"]:
        current_config["browser"] = data["browser"].lower()
        restart_needed = True

    if "width" in data:
        current_config["width"] = int(data["width"])
    if "height" in data:
        current_config["height"] = int(data["height"])

    if restart_needed:
        close_driver()
        get_or_create_driver()

    return jsonify({
        "success": True,
        "message": "Configuration updated",
        "config": current_config
    })

@app.route("/session/start", methods=["POST"])
@app.route("/api/selenium/session/start", methods=["POST"])
def start_session():
    """Explicitly launch browser session."""
    try:
        driver = get_or_create_driver()
        return jsonify({
            "success": True,
            "message": "Selenium session started successfully",
            "browser": current_config["browser"],
            "headless": current_config["headless"],
            "url": driver.current_url
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }), 500

@app.route("/session/stop", methods=["POST"])
@app.route("/api/selenium/session/stop", methods=["POST"])
def stop_session():
    """Quit active browser session."""
    close_driver()
    return jsonify({
        "success": True,
        "message": "Selenium session terminated"
    })

@app.route("/navigate", methods=["POST"])
@app.route("/api/selenium/navigate", methods=["POST"])
def navigate():
    """Navigate to target URL."""
    data = request.json or {}
    url = data.get("url")
    if not url:
        return jsonify({"success": False, "error": "URL parameter required"}), 400

    try:
        driver = get_or_create_driver()
        start = time.time()
        driver.get(url)
        duration_ms = round((time.time() - start) * 1000)

        screenshot = capture_screenshot_b64(driver)
        logs = capture_browser_logs(driver)

        return jsonify({
            "success": True,
            "url": driver.current_url,
            "title": driver.title,
            "durationMs": duration_ms,
            "screenshot": f"data:image/png;base64,{screenshot}" if screenshot else None,
            "consoleLogs": logs
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }), 500

@app.route("/screenshot", methods=["GET"])
@app.route("/api/selenium/screenshot", methods=["GET"])
def get_screenshot():
    """Capture instant screenshot."""
    try:
        driver = get_or_create_driver()
        screenshot = capture_screenshot_b64(driver)
        return jsonify({
            "success": True,
            "url": driver.current_url,
            "title": driver.title,
            "screenshot": f"data:image/png;base64,{screenshot}" if screenshot else None
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/execute-step", methods=["POST"])
@app.route("/api/selenium/execute-step", methods=["POST"])
def execute_step():
    """Execute a single step using Selenium WebDriver."""
    data = request.json or {}
    raw_action = data.get("action") or data.get("type", "click")
    action = str(raw_action).lower().replace("-", "_")
    by_type = data.get("by", "css")
    selector = data.get("selector", "")
    value = data.get("value") or data.get("script") or data.get("expected", "")
    timeout = data.get("timeout", 5)

    start_time = time.time()
    try:
        driver = get_or_create_driver()
        by_loc = get_by_locator(by_type)
        details = ""

        if action in ("navigate", "goto", "open"):
            driver.get(value or selector)
            details = f"Navigated to {driver.current_url}"

        elif action in ("click", "tap"):
            wait = WebDriverWait(driver, timeout)
            element = wait.until(EC.element_to_be_clickable((by_loc, selector)))
            driver.execute_script("arguments[0].scrollIntoView({block: 'center', inline: 'nearest'});", element)
            element.click()
            details = f"Clicked element matching {by_type}: {selector}"

        elif action in ("type", "send_keys", "sendkeys"):
            wait = WebDriverWait(driver, timeout)
            element = wait.until(EC.visibility_of_element_located((by_loc, selector)))
            element.clear()
            element.send_keys(str(value))
            details = f"Typed '{value}' into {by_type}: {selector}"

        elif action == "clear":
            element = driver.find_element(by_loc, selector)
            element.clear()
            details = f"Cleared input {by_type}: {selector}"

        elif action in ("hover", "moveto"):
            element = driver.find_element(by_loc, selector)
            ActionChains(driver).move_to_element(element).perform()
            details = f"Hovered over {by_type}: {selector}"

        elif action in ("scroll", "scrollby"):
            driver.execute_script("window.scrollBy(0, arguments[0]);", int(value or 400))
            details = f"Scrolled page by {value or 400}px"

        elif action in ("wait", "sleep"):
            time.sleep(float(value or 1))
            details = f"Waited {value or 1}s"

        elif action in ("assert_text", "asserttext"):
            element = driver.find_element(by_loc, selector)
            actual_text = element.text
            if str(value).lower() not in actual_text.lower():
                raise AssertionError(f"Expected text '{value}' not found in actual text '{actual_text}'")
            details = f"Asserted text '{value}' present in element"

        elif action in ("assert_value", "assertvalue"):
            element = driver.find_element(by_loc, selector)
            actual_val = element.get_attribute("value") or element.text
            if str(value).lower() not in actual_val.lower():
                raise AssertionError(f"Expected value '{value}' not found in actual value '{actual_val}'")
            details = f"Asserted value '{value}' present in element"

        elif action in ("assert_element", "assertelement", "assert_visible", "assertvisible", "waitforelement"):
            wait = WebDriverWait(driver, timeout)
            _ = wait.until(EC.visibility_of_element_located((by_loc, selector)))
            details = f"Asserted element {by_type}: {selector} is visible"

        elif action in ("assert_title", "asserttitle"):
            if str(value).lower() not in driver.title.lower():
                raise AssertionError(f"Expected title to contain '{value}', got '{driver.title}'")
            details = f"Asserted title contains '{value}'"

        elif action in ("execute_script", "executescript"):
            script_res = driver.execute_script(str(value or selector))
            details = f"Executed script. Result: {str(script_res)[:100]}"

        elif action in ("takesnapshot", "take_snapshot", "snapshot"):
            details = "Captured screenshot snapshot"

        else:
            raise ValueError(f"Unsupported action '{action}'")

        duration_ms = round((time.time() - start_time) * 1000)
        screenshot = capture_screenshot_b64(driver)
        logs = capture_browser_logs(driver)

        return jsonify({
            "success": True,
            "status": "passed",
            "action": action,
            "selector": selector,
            "details": details,
            "durationMs": duration_ms,
            "screenshot": f"data:image/png;base64,{screenshot}" if screenshot else None,
            "consoleLogs": logs
        })

    except Exception as e:
        duration_ms = round((time.time() - start_time) * 1000)
        screenshot = capture_screenshot_b64(active_driver) if active_driver else None
        return jsonify({
            "success": False,
            "status": "failed",
            "action": action,
            "selector": selector,
            "error": str(e),
            "details": f"Failed: {str(e)}",
            "durationMs": duration_ms,
            "screenshot": f"data:image/png;base64,{screenshot}" if screenshot else None
        })

@app.route("/run-suite", methods=["POST"])
@app.route("/api/selenium/run-suite", methods=["POST"])
def run_suite():
    """
    Execute a full test suite or custom tests with real Python Selenium WebDriver.
    Generates step-by-step reports, timings, screenshots, and logs.
    """
    data = request.json or {}
    target_url = data.get("url", "http://localhost:5173")
    tests = data.get("tests", [])

    suite_name = data.get("suiteName", "Automated QA Suite")
    driver = get_or_create_driver()

    suite_start = time.time()
    results = []
    passed_count = 0
    failed_count = 0

    # If no custom tests provided, generate standard Selenium E2E smoke tests
    if not tests:
        tests = [
            {
                "id": "smoke-init",
                "name": "Smoke: Initial Page Load & Title",
                "steps": [
                    {"action": "navigate", "value": target_url},
                    {"action": "wait", "value": 1},
                    {"action": "assert_element", "by": "css", "selector": "body"}
                ]
            },
            {
                "id": "dom-interactive",
                "name": "DOM: Interactive Elements Discovery",
                "steps": [
                    {"action": "execute_script", "value": "return document.querySelectorAll('button, a, input').length;"}
                ]
            },
            {
                "id": "ui-visual",
                "name": "Visual: Viewport Snapshot & Console Scan",
                "steps": [
                    {"action": "scroll", "value": 200},
                    {"action": "wait", "value": 0.5}
                ]
            }
        ]

    for test in tests:
        test_id = test.get("id", str(time.time()))
        test_name = test.get("name", "Unnamed Test")
        steps = test.get("steps", [])

        test_start = time.time()
        test_passed = True
        step_results = []
        error_msg = None

        for step in steps:
            raw_action = step.get("action") or step.get("type", "click")
            s_action = str(raw_action).lower().replace("-", "_")
            s_by = step.get("by", "css")
            s_sel = step.get("selector", "")
            s_val = step.get("value") or step.get("script") or step.get("expected", "")

            step_res = {}
            st_start = time.time()
            try:
                by_loc = get_by_locator(s_by)
                if s_action in ("navigate", "goto", "open"):
                    driver.get(s_val or s_sel or target_url)
                elif s_action in ("click", "tap"):
                    el = WebDriverWait(driver, 5).until(EC.element_to_be_clickable((by_loc, s_sel)))
                    el.click()
                elif s_action in ("type", "send_keys", "sendkeys"):
                    el = WebDriverWait(driver, 5).until(EC.visibility_of_element_located((by_loc, s_sel)))
                    if step.get("clearFirst", True):
                        el.clear()
                    el.send_keys(str(s_val))
                elif s_action == "clear":
                    el = WebDriverWait(driver, 5).until(EC.visibility_of_element_located((by_loc, s_sel)))
                    el.clear()
                elif s_action in ("scroll", "scrollby"):
                    driver.execute_script("window.scrollBy(0, arguments[0]);", int(s_val or 300))
                elif s_action in ("hover", "moveto"):
                    el = driver.find_element(by_loc, s_sel)
                    ActionChains(driver).move_to_element(el).perform()
                elif s_action in ("wait", "sleep"):
                    time.sleep(float(s_val or 0.5))
                elif s_action in ("assert_element", "assertelement", "waitforelement", "assertvisible", "assert_visible"):
                    _ = WebDriverWait(driver, 5).until(EC.presence_of_element_located((by_loc, s_sel)))
                elif s_action in ("assert_text", "asserttext"):
                    el = driver.find_element(by_loc, s_sel)
                    if str(s_val).lower() not in el.text.lower():
                        raise AssertionError(f"Text '{s_val}' not found in '{el.text}'")
                elif s_action in ("assert_value", "assertvalue"):
                    el = driver.find_element(by_loc, s_sel)
                    actual_val = el.get_attribute("value") or el.text
                    if str(s_val).lower() not in actual_val.lower():
                        raise AssertionError(f"Value '{s_val}' not found in '{actual_val}'")
                elif s_action in ("assert_title", "asserttitle"):
                    if str(s_val).lower() not in driver.title.lower():
                        raise AssertionError(f"Title '{s_val}' not found in '{driver.title}'")
                elif s_action in ("execute_script", "executescript"):
                    driver.execute_script(str(s_val or s_sel))
                elif s_action in ("takesnapshot", "take_snapshot", "snapshot"):
                    pass

                step_res = {
                    "action": s_action,
                    "selector": s_sel,
                    "status": "passed",
                    "durationMs": round((time.time() - st_start) * 1000)
                }
            except Exception as e:
                test_passed = False
                error_msg = str(e)
                step_res = {
                    "action": s_action,
                    "selector": s_sel,
                    "status": "failed",
                    "error": str(e),
                    "durationMs": round((time.time() - st_start) * 1000)
                }
                step_results.append(step_res)
                break

            step_results.append(step_res)

        test_duration = round((time.time() - test_start) * 1000)
        screenshot = capture_screenshot_b64(driver)
        logs = capture_browser_logs(driver)

        if test_passed:
            passed_count += 1
        else:
            failed_count += 1

        results.append({
            "id": test_id,
            "name": test_name,
            "status": "passed" if test_passed else "failed",
            "durationMs": test_duration,
            "error": error_msg,
            "steps": step_results,
            "screenshot": f"data:image/png;base64,{screenshot}" if screenshot else None,
            "consoleLogs": logs
        })

    total_duration = round((time.time() - suite_start) * 1000)

    # Generate Markdown Report
    md_report = f"# 🧪 Hyperion Selenium QA Report\n\n"
    md_report += f"- **Target URL:** `{target_url}`\n"
    md_report += f"- **Engine:** Python Selenium 4 ({current_config['browser'].capitalize()} {'Headless' if current_config['headless'] else 'Visible'})\n"
    md_report += f"- **Status:** {'✅ PASSED' if failed_count == 0 else '❌ FAILED'}\n"
    md_report += f"- **Total Tests:** {len(tests)} | **Passed:** {passed_count} | **Failed:** {failed_count}\n"
    md_report += f"- **Total Duration:** {total_duration} ms\n\n"
    md_report += f"## Test Cases Summary\n\n"
    for r in results:
        status_icon = "✅" if r["status"] == "passed" else "❌"
        md_report += f"### {status_icon} {r['name']} ({r['durationMs']} ms)\n"
        if r.get("error"):
            md_report += f"> **Error:** `{r['error']}`\n\n"
        md_report += f"| Step | Action | Selector | Status | Duration |\n"
        md_report += f"| --- | --- | --- | --- | --- |\n"
        for idx, s in enumerate(r.get("steps", [])):
            md_report += f"| {idx+1} | `{s['action']}` | `{s.get('selector') or '-'}` | {s['status']} | {s['durationMs']}ms |\n"
        md_report += "\n"

    return jsonify({
        "success": True,
        "suiteName": suite_name,
        "targetUrl": target_url,
        "summary": {
            "total": len(tests),
            "passed": passed_count,
            "failed": failed_count,
            "durationMs": total_duration
        },
        "results": results,
        "markdownReport": md_report
    })

@app.route("/agent/explore", methods=["POST"])
@app.route("/api/selenium/agent/explore", methods=["POST"])
def agent_explore():
    """
    Autonomous QA Agent:
    Crawls page with real Selenium, clicks buttons, validates navigation,
    inspects console logs, and calculates an Application Health Score.
    """
    data = request.json or {}
    url = data.get("url", "http://localhost:5173")
    max_steps = min(int(data.get("maxSteps", 10)), 25)

    driver = get_or_create_driver()
    driver.get(url)

    thoughts = []
    findings = []
    actions_taken = 0

    thoughts.append(f"Navigated to {url}. Page title: '{driver.title}'")

    # 1. Discover all links and buttons
    try:
        links = driver.find_elements(By.TAG_NAME, "a")
        buttons = driver.find_elements(By.TAG_NAME, "button")
        inputs = driver.find_elements(By.TAG_NAME, "input")

        thoughts.append(f"DOM Scan complete: Found {len(links)} links, {len(buttons)} buttons, {len(inputs)} input fields.")

        # Check for broken links (href=# or empty)
        empty_links = 0
        for l in links[:15]:
            href = l.get_attribute("href")
            if not href or href == "#" or href.startswith("javascript:void"):
                empty_links += 1

        if empty_links > 0:
            findings.append({
                "type": "warning",
                "title": "Placeholder / Dead Links Detected",
                "description": f"Found {empty_links} links with empty href or '#' placeholder."
            })

        # 2. Check console errors
        logs = capture_browser_logs(driver)
        severe_logs = [l for l in logs if l.get("level") in ("SEVERE", "ERROR")]
        if severe_logs:
            findings.append({
                "type": "error",
                "title": "Browser Console Errors Detected",
                "description": f"Encountered {len(severe_logs)} severe runtime console errors.",
                "details": severe_logs[:3]
            })

        # 3. Interact with visible buttons safely
        for btn in buttons[:5]:
            if actions_taken >= max_steps:
                break
            try:
                if btn.is_displayed() and btn.is_enabled():
                    btn_text = btn.text.strip() or "icon-button"
                    thoughts.append(f"Clicking visible button: '{btn_text}'")
                    btn.click()
                    actions_taken += 1
                    time.sleep(0.4)
            except Exception as e:
                thoughts.append(f"Could not click button: {str(e)[:60]}")

    except Exception as e:
        findings.append({
            "type": "error",
            "title": "Exploration Exception",
            "description": str(e)
        })

    # Calculate Application Health Score (0 - 100)
    score = 100
    for f in findings:
        if f["type"] == "error":
            score -= 20
        elif f["type"] == "warning":
            score -= 8
    score = max(min(score, 100), 20)

    screenshot = capture_screenshot_b64(driver)

    return jsonify({
        "success": True,
        "url": driver.current_url,
        "healthScore": score,
        "thoughts": thoughts,
        "findings": findings,
        "actionsTaken": actions_taken,
        "screenshot": f"data:image/png;base64,{screenshot}" if screenshot else None
    })

@app.route("/inspect", methods=["POST"])
@app.route("/api/selenium/inspect", methods=["POST"])
def inspect_element():
    """Inspect element details using real Selenium."""
    data = request.json or {}
    selector = data.get("selector", "body")
    by_type = data.get("by", "css")

    try:
        driver = get_or_create_driver()
        by_loc = get_by_locator(by_type)
        element = driver.find_element(by_loc, selector)

        tag = element.tag_name
        text = element.text
        location = element.location
        size = element.size
        is_displayed = element.is_displayed()
        is_enabled = element.is_enabled()

        attributes = {}
        for attr in ["id", "name", "class", "href", "src", "type", "value", "placeholder", "role", "aria-label"]:
            val = element.get_attribute(attr)
            if val:
                attributes[attr] = val

        return jsonify({
            "success": True,
            "selector": selector,
            "tag": tag,
            "text": text[:200],
            "rect": {**location, **size},
            "isDisplayed": is_displayed,
            "isEnabled": is_enabled,
            "attributes": attributes
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400

if __name__ == "__main__":
    port = int(os.environ.get("SELENIUM_PORT", 5006))
    print(f"=======================================================")
    print(f"🚀 Hyperion Python Selenium Backend running on http://127.0.0.1:{port}")
    print(f"   Browser: {current_config['browser'].capitalize()} (Headless: {current_config['headless']})")
    print(f"=======================================================")
    app.run(host="127.0.0.1", port=port, debug=False, threaded=True)
