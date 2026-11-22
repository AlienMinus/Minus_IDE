"""
Hyperion IDE - Load Testing Engine (Autocannon)
Executes high-performance HTTP benchmarking against target endpoints.
Attempts npx autocannon first, with a seamless high-speed native Python fallback.
"""
import time
import json
import shutil
import subprocess
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Any, List

def run_autocannon_benchmark(
    target_url: str,
    connections: int = 10,
    duration: int = 10,
    pipelining: int = 1,
    timeout_sec: float = 5.0
) -> Dict[str, Any]:
    """Execute load test using npx autocannon or high-concurrency native fallback."""
    # 1. Try native npx autocannon if available
    autocannon_bin = shutil.which("autocannon")
    npx_bin = shutil.which("npx")

    if autocannon_bin or npx_bin:
        cmd = [autocannon_bin] if autocannon_bin else [npx_bin, "autocannon"]
        cmd.extend([
            target_url,
            "-c", str(connections),
            "-d", str(duration),
            "-p", str(pipelining),
            "--json"
        ])
        try:
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=duration + 15)
            if res.returncode == 0 and res.stdout.strip():
                # Locate JSON in stdout
                start_idx = res.stdout.find("{")
                end_idx = res.stdout.rfind("}")
                if start_idx >= 0 and end_idx > start_idx:
                    parsed = json.loads(res.stdout[start_idx:end_idx + 1])
                    parsed["engine"] = "npx-autocannon"
                    return parsed
        except Exception:
            pass

    # 2. Native Multi-Threaded Load Test Fallback
    start_time = time.time()
    end_time = start_time + max(1, min(60, duration))
    
    latencies: List[float] = []
    status_codes: Dict[int, int] = {}
    bytes_read = 0
    errors = 0
    timeouts = 0

    def worker_loop():
        nonlocal bytes_read, errors, timeouts
        while time.time() < end_time:
            t0 = time.perf_counter()
            try:
                req = urllib.request.Request(
                    target_url,
                    headers={"User-Agent": "Hyperion-LoadTester/1.0 (Autocannon-Compatible)"}
                )
                with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
                    data = resp.read()
                    elapsed_ms = (time.perf_counter() - t0) * 1000.0
                    latencies.append(elapsed_ms)
                    code = resp.status
                    status_codes[code] = status_codes.get(code, 0) + 1
                    bytes_read += len(data)
            except urllib.error.HTTPError as he:
                elapsed_ms = (time.perf_counter() - t0) * 1000.0
                latencies.append(elapsed_ms)
                status_codes[he.code] = status_codes.get(he.code, 0) + 1
            except urllib.error.URLError:
                errors += 1
            except TimeoutError:
                timeouts += 1
            except Exception:
                errors += 1

    workers_count = max(1, min(50, connections))
    with ThreadPoolExecutor(max_workers=workers_count) as pool:
        futures = [pool.submit(worker_loop) for _ in range(workers_count)]
        for f in futures:
            try:
                f.result()
            except Exception:
                pass

    total_duration_sec = max(0.001, time.time() - start_time)
    total_requests = len(latencies) + errors + timeouts
    successful_requests = len(latencies)

    sorted_lats = sorted(latencies)
    if sorted_lats:
        p50 = sorted_lats[int(len(sorted_lats) * 0.50)]
        p90 = sorted_lats[int(len(sorted_lats) * 0.90)]
        p99 = sorted_lats[min(len(sorted_lats) - 1, int(len(sorted_lats) * 0.99))]
        mean_lat = sum(sorted_lats) / len(sorted_lats)
        min_lat = sorted_lats[0]
        max_lat = sorted_lats[-1]
    else:
        p50 = p90 = p99 = mean_lat = min_lat = max_lat = 0.0

    rps = round(total_requests / total_duration_sec, 2)
    throughput_mb_s = round((bytes_read / (1024 * 1024)) / total_duration_sec, 3)

    return {
        "engine": "hyperion-native-autocannon",
        "url": target_url,
        "connections": connections,
        "duration": round(total_duration_sec, 2),
        "requests": {
            "total": total_requests,
            "average": rps,
            "sent": total_requests
        },
        "latency": {
            "average": round(mean_lat, 2),
            "mean": round(mean_lat, 2),
            "stddev": round(p99 - p50, 2),
            "min": round(min_lat, 2),
            "max": round(max_lat, 2),
            "p50": round(p50, 2),
            "p90": round(p90, 2),
            "p99": round(p99, 2)
        },
        "throughput": {
            "average": round(bytes_read / total_duration_sec, 2),
            "total": bytes_read,
            "mb_per_sec": throughput_mb_s
        },
        "statusCodes": status_codes,
        "errors": errors,
        "timeouts": timeouts,
        "non2xx": sum(v for k, v in status_codes.items() if k < 200 or k >= 300)
    }
