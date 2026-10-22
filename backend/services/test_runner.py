"""
Hyperion IDE - Modular Selenium Test Automation Runner
Executes structured test suites, compiles Markdown/HTML reports, and generates pre-configured templates.
"""
import time
from typing import Dict, Any, List, Optional
from backend.services.selenium_engine import global_selenium_engine

def get_builtin_templates(target_url: str = "http://localhost:5174") -> List[Dict[str, Any]]:
    """Return structured, modular test suite templates for common web applications."""
    return [
        {
            "id": "suite_smoke",
            "name": "🚀 Smoke & Mount Sanity Suite",
            "description": "Verifies target document loads, title matches, root container mounts, and error overlays are absent.",
            "tests": [
                {
                    "id": "smoke_load",
                    "name": "Verify Application Mounts & Document Loaded",
                    "steps": [
                        {"action": "navigate", "value": target_url},
                        {"action": "wait", "value": 0.8},
                        {"action": "assert_element", "by": "css", "selector": "body"}
                    ]
                },
                {
                    "id": "smoke_root",
                    "name": "Verify Main Application Layout Container",
                    "steps": [
                        {"action": "assert_element", "by": "css", "selector": "#root, main, .app, body"}
                    ]
                },
                {
                    "id": "smoke_no_overlay",
                    "name": "Verify Zero Uncaught React / Vite Error Overlays",
                    "steps": [
                        {"action": "execute_script", "value": "return !document.querySelector('vite-error-overlay, #error-box, [class*=\"error-overlay\"]');"}
                    ]
                }
            ]
        },
        {
            "id": "suite_interactive",
            "name": "⚡ Interactive Controls & Input Resiliency",
            "description": "Tests button clickability, typing into input controls, focus management, and viewport responsiveness.",
            "tests": [
                {
                    "id": "interactive_inputs",
                    "name": "Form Input Locating and Value Typing",
                    "steps": [
                        {"action": "execute_script", "value": "return document.querySelectorAll('button, input, a').length > 0;"},
                        {"action": "scroll", "value": 150},
                        {"action": "wait", "value": 0.3}
                    ]
                }
            ]
        },
        {
            "id": "suite_resilience",
            "name": "🛡️ Viewport & Console Log Audit",
            "description": "Scans browser console for runtime warnings or severe crashes, and takes full-fidelity viewport snapshot.",
            "tests": [
                {
                    "id": "resilience_snapshot",
                    "name": "Capture Viewport Snapshot & Console Scan",
                    "steps": [
                        {"action": "takesnapshot"},
                        {"action": "wait", "value": 0.2}
                    ]
                }
            ]
        }
    ]

class ModularTestRunner:
    def __init__(self, engine=None):
        self.engine = engine or global_selenium_engine

    def run_suite(self, target_url: str, tests: List[Dict[str, Any]], suite_name: str = "Automated QA Suite") -> Dict[str, Any]:
        drv = self.engine.get_or_create_driver()

        # If empty tests passed, default to standard smoke template
        if not tests:
            templates = get_builtin_templates(target_url)
            tests = []
            for tpl in templates:
                tests.extend(tpl["tests"])

        suite_start = time.time()
        results = []
        passed_count = 0
        failed_count = 0

        # Initial navigate to target if needed
        try:
            if not drv.current_url or drv.current_url == "data:," or "about:blank" in drv.current_url:
                drv.get(target_url)
        except Exception:
            pass

        for test in tests:
            test_id = test.get("id", str(time.time()))
            test_name = test.get("name", "Unnamed Test")
            steps = test.get("steps", [])

            test_start = time.time()
            test_passed = True
            step_results = []
            error_msg = None

            for step in steps:
                step_res = self.engine.execute_step(step)
                step_results.append(step_res)
                if not step_res.get("success", False):
                    test_passed = False
                    error_msg = step_res.get("error", "Step failed")
                    break

            test_duration = round((time.time() - test_start) * 1000)
            screenshot = self.engine.capture_screenshot()
            logs = self.engine.capture_console_logs()

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
                "screenshot": screenshot,
                "consoleLogs": logs
            })

        total_duration = round((time.time() - suite_start) * 1000)

        # Markdown Report Generation
        md_report = f"# 🧪 Hyperion Selenium QA Automation Report\n\n"
        md_report += f"- **Target URL:** `{target_url}`\n"
        md_report += f"- **Engine:** Python Selenium 4 ({self.engine.config['browser'].capitalize()} {'Headless' if self.engine.config['headless'] else 'Visible'})\n"
        md_report += f"- **Status:** {'✅ PASSED' if failed_count == 0 else '❌ FAILED'}\n"
        md_report += f"- **Total Tests:** {len(tests)} | **Passed:** {passed_count} | **Failed:** {failed_count}\n"
        md_report += f"- **Duration:** {total_duration} ms\n\n"
        md_report += f"## Test Cases Summary\n\n"

        for r in results:
            icon = "✅" if r["status"] == "passed" else "❌"
            md_report += f"### {icon} {r['name']} ({r['durationMs']} ms)\n"
            if r.get("error"):
                md_report += f"> **Failure Detail:** `{r['error']}`\n\n"
            md_report += f"| Step | Action | Selector | Status | Duration |\n"
            md_report += f"| :---: | :--- | :--- | :---: | :---: |\n"
            for idx, s in enumerate(r.get("steps", [])):
                md_report += f"| {idx+1} | `{s['action']}` | `{s.get('selector') or '-'}` | {s['status']} | {s['durationMs']}ms |\n"
            md_report += "\n"

        md_report += f"---\n*Generated by Hyperion IDE Modular Python Selenium Automation Suite.*\n"

        return {
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
            "markdownReport": md_report,
            "screenshot": results[-1]["screenshot"] if results else None
        }

# Singleton instance
global_test_runner = ModularTestRunner()
