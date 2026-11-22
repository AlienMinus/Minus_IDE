import sys
import json
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

print("=== 1. Testing load_test_engine ===")
from backend.services.load_test_engine import run_autocannon_benchmark
try:
    load_res = run_autocannon_benchmark("http://localhost:8000/api/health", connections=2, duration=1)
    print("LOAD TEST SUCCESS:", json.dumps(load_res, indent=2)[:300])
except Exception as e:
    print("LOAD TEST EXCEPTION:", e)

print("\n=== 2. Testing speed_test_engine ===")
from backend.services.speed_test_engine import run_lighthouse_audit
try:
    speed_res = run_lighthouse_audit("http://localhost:5173", device="desktop")
    print("SPEED TEST SUCCESS:", json.dumps(speed_res, indent=2)[:300])
except Exception as e:
    print("SPEED TEST EXCEPTION:", e)

print("\n=== 3. Testing secret_test_engine ===")
from backend.services.secret_test_engine import run_gitleaks_scan
try:
    secret_res = run_gitleaks_scan()
    print("SECRET TEST SUCCESS: files_scanned =", secret_res.get("files_scanned"), "total_leaks =", secret_res.get("total_leaks"))
except Exception as e:
    print("SECRET TEST EXCEPTION:", e)
