"""
Configuration settings for Hyperion IDE Python Backend.
"""
import os

HOST = os.environ.get("BACKEND_HOST", "127.0.0.1")
PORT = int(os.environ.get("BACKEND_PORT", 8000))
FASTAPI_ENV = os.environ.get("FASTAPI_ENV", "production")

# Local AI Configuration
QWEN_MODEL_ID = os.environ.get("QWEN_MODEL_ID", "Qwen/Qwen2.5-Coder-0.5B-Instruct")

# Selenium Configuration Defaults
DEFAULT_BROWSER = os.environ.get("SELENIUM_BROWSER", "chrome")
DEFAULT_HEADLESS = os.environ.get("SELENIUM_HEADLESS", "true").lower() in ("true", "1", "yes")
DEFAULT_WIDTH = int(os.environ.get("SELENIUM_WIDTH", 1280))
DEFAULT_HEIGHT = int(os.environ.get("SELENIUM_HEIGHT", 800))
DEFAULT_TIMEOUT = int(os.environ.get("SELENIUM_TIMEOUT", 10))
