"""
Configuration settings for Hyperion IDE Python Production Backend.
Supports full migration of Node.js Express server to Python FastAPI.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Attempt to load .env from backend/.env or root .env
for env_file in [
    PROJECT_ROOT / "backend" / ".env",
    PROJECT_ROOT / ".env"
]:
    if env_file.exists():
        load_dotenv(dotenv_path=env_file)

HOST = os.environ.get("BACKEND_HOST", "127.0.0.1")
PORT = int(os.environ.get("PORT", os.environ.get("BACKEND_PORT", 8000)))
FASTAPI_ENV = os.environ.get("FASTAPI_ENV", "production")

# Ensure loopback and local development addresses bypass any environment HTTP proxies
_existing_no_proxy = os.environ.get("NO_PROXY", os.environ.get("no_proxy", ""))
_loopback_entries = ["localhost", "127.0.0.1", "::1", "0.0.0.0"]
_merged_no_proxy = list(set([p.strip() for p in _existing_no_proxy.split(",") if p.strip()] + _loopback_entries))
os.environ["NO_PROXY"] = ",".join(_merged_no_proxy)
os.environ["no_proxy"] = os.environ["NO_PROXY"]

# Hugging Face API Configuration
HF_TOKEN = os.environ.get("HF_TOKEN", "").strip().strip('"').strip("'")

# Local AI Configuration
QWEN_MODEL_ID = os.environ.get("QWEN_MODEL_ID", "Qwen/Qwen2.5-Coder-0.5B-Instruct")

# Selenium Configuration Defaults
DEFAULT_BROWSER = os.environ.get("SELENIUM_BROWSER", "chrome")
DEFAULT_HEADLESS = os.environ.get("SELENIUM_HEADLESS", "true").lower() in ("true", "1", "yes")
DEFAULT_WIDTH = int(os.environ.get("SELENIUM_WIDTH", 1280))
DEFAULT_HEIGHT = int(os.environ.get("SELENIUM_HEIGHT", 800))
DEFAULT_TIMEOUT = int(os.environ.get("SELENIUM_TIMEOUT", 10))
