#!/usr/bin/env python3
"""
Hyperion IDE - Local Qwen Coder AI Service
Runs Qwen2.5-Coder locally on CPU using Hugging Face Transformers & PyTorch.
Provides HTTP API on port 5005 for Code Generation, Code Explanation, and Vulnerability/Bug Fixes.
"""

import sys
import os
import json
import time
import threading
import glob
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn

# Model identifier
MODEL_ID = os.environ.get("QWEN_MODEL_ID", "Qwen/Qwen2.5-Coder-0.5B-Instruct")
PORT = int(os.environ.get("LOCAL_AI_PORT", 5005))

# Global model state
_state_lock = threading.Lock()
_model = None
_tokenizer = None
_is_loading = False
_load_error = None

def get_cache_info():
    """Check whether model weights are already downloaded in HuggingFace cache"""
    cache_base = os.path.expanduser("~/.cache/huggingface/hub")
    repo_folder = f"models--{MODEL_ID.replace('/', '--')}"
    target_dir = os.path.join(cache_base, repo_folder)
    
    if not os.path.exists(target_dir):
        return {"downloaded": False, "size_mb": 0, "status": "not_downloaded"}

    # Check for completed model.safetensors or blobs
    blobs_dir = os.path.join(target_dir, "blobs")
    total_size = 0
    incomplete = False
    
    if os.path.exists(blobs_dir):
        for f in os.listdir(blobs_dir):
            full = os.path.join(blobs_dir, f)
            if os.path.isfile(full):
                total_size += os.path.getsize(full)
                if f.endswith(".incomplete"):
                    incomplete = True

    size_mb = round(total_size / (1024 * 1024), 2)
    # 0.5B model is ~950MB total
    is_complete = not incomplete and size_mb >= 900
    
    return {
        "downloaded": is_complete,
        "size_mb": size_mb,
        "status": "ready" if is_complete else ("downloading" if incomplete or size_mb > 0 else "not_downloaded")
    }

def load_model_if_needed():
    """Load model into CPU RAM if weights are present and not already loaded"""
    global _model, _tokenizer, _is_loading, _load_error

    with _state_lock:
        if _model is not None:
            return True, "Model already loaded"
        if _is_loading:
            return False, "Model is currently loading into memory..."

    cache = get_cache_info()
    if not cache["downloaded"]:
        return False, f"Model weights not fully downloaded yet ({cache['size_mb']} MB / ~950 MB)"

    def _do_load():
        global _model, _tokenizer, _is_loading, _load_error
        try:
            with _state_lock:
                _is_loading = True
                _load_error = None
            print(f"[LocalAI] Loading {MODEL_ID} into CPU memory...", flush=True)
            import torch
            from transformers import AutoModelForCausalLM, AutoTokenizer

            torch.set_num_threads(min(os.cpu_count() or 4, 8))
            tok = AutoTokenizer.from_pretrained(MODEL_ID)
            mod = AutoModelForCausalLM.from_pretrained(
                MODEL_ID,
                dtype=torch.float32,
                device_map="cpu",
                low_cpu_mem_usage=True
            )
            mod.eval()

            with _state_lock:
                _tokenizer = tok
                _model = mod
                _is_loading = False
            print(f"[LocalAI] Successfully loaded {MODEL_ID} into memory on CPU!", flush=True)
        except Exception as e:
            with _state_lock:
                _is_loading = False
                _load_error = str(e)
            print(f"[LocalAI] Failed to load model: {e}", flush=True)

    thread = threading.Thread(target=_do_load, daemon=True)
    thread.start()
    return False, "Model load initiated in background"

def run_inference(messages, max_new_tokens=512, temperature=0.2):
    """Run CPU generation with Qwen ChatML template"""
    global _model, _tokenizer
    if _model is None or _tokenizer is None:
        raise RuntimeError("Model is not loaded yet")

    import torch

    prompt = _tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True
    )

    inputs = _tokenizer([prompt], return_tensors="pt").to("cpu")
    input_length = inputs["input_ids"].shape[1]

    t0 = time.time()
    with torch.no_grad():
        generated_ids = _model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=(temperature > 0),
            temperature=temperature if temperature > 0 else 1.0,
            top_p=0.9 if temperature > 0 else 1.0,
            pad_token_id=_tokenizer.eos_token_id
        )

    duration = time.time() - t0
    generated_tokens = [
        output_ids[len(input_ids):] for input_ids, output_ids in zip(inputs.input_ids, generated_ids)
    ]
    response_text = _tokenizer.batch_decode(generated_tokens, skip_special_tokens=True)[0]
    tokens_count = len(generated_tokens[0])
    speed = round(tokens_count / duration, 2) if duration > 0 else 0

    return {
        "text": response_text.strip(),
        "tokens": tokens_count,
        "duration_sec": round(duration, 2),
        "tokens_per_sec": speed
    }

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True

class LocalAIRequestHandler(BaseHTTPRequestHandler):
    def _send_cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors()
        self.end_headers()

    def _json(self, status_code, data):
        self.send_response(status_code)
        self._send_cors()
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

    def do_GET(self):
        if self.path in ["/status", "/health", "/api/status"]:
            cache = get_cache_info()
            self._json(200, {
                "success": True,
                "model_id": MODEL_ID,
                "downloaded": cache["downloaded"],
                "download_size_mb": cache["size_mb"],
                "status": "ready" if _model is not None else ("loading" if _is_loading else cache["status"]),
                "is_loaded": _model is not None,
                "is_loading": _is_loading,
                "load_error": _load_error,
                "device": "cpu",
                "recommended_for": "Intel i5 / 8GB RAM CPU Inference"
            })
            return

        self._json(404, {"error": "Endpoint not found"})

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body_bytes = self.rfile.read(content_length)
        try:
            body = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}
        except Exception:
            body = {}

        # 1. Load model endpoint
        if self.path in ["/load", "/api/load"]:
            ok, msg = load_model_if_needed()
            self._json(200, {"success": ok, "message": msg, "is_loaded": _model is not None})
            return

        # 2. Chat / Code Gen / Explain / Fix endpoints
        if self.path in ["/chat", "/generate", "/explain", "/fix", "/api/chat"]:
            mode = body.get("mode") or ("explain" if "explain" in self.path else ("fix" if "fix" in self.path else "generate"))
            code = body.get("code") or ""
            filename = body.get("filename") or "active_file"
            user_prompt = body.get("prompt") or ""
            raw_messages = body.get("messages") or []
            max_tokens = min(int(body.get("max_tokens") or 512), 1024)
            temp = float(body.get("temperature", 0.2))

            # System prompt specialized per mode
            if mode == "explain":
                sys_prompt = (
                    "You are Qwen Coder, an expert code analysis assistant running locally in Hyperion IDE.\n"
                    "Explain the code clearly and systematically:\n"
                    "1. High-level summary of what the code does.\n"
                    "2. Line-by-line / logic breakdown.\n"
                    "3. Key functions, parameters, and return values.\n"
                    "4. Time and Space complexity (Big-O).\n"
                    "5. Edge cases or potential gotchas.\n"
                    "Use clean Markdown formatting with clear bullet points."
                )
            elif mode == "fix":
                sys_prompt = (
                    "You are Qwen Coder, an expert code debugger and security hardening assistant in Hyperion IDE.\n"
                    "When given code and a user request:\n"
                    "1. Identify any bugs, logic errors, performance issues, or security vulnerabilities (OWASP, injection, unhandled errors).\n"
                    "2. Provide the COMPLETE corrected and hardened code in a single markdown code block (e.g. ```python ... ```).\n"
                    "3. Explain specifically what was fixed and why.\n"
                    "Make sure the code is directly runnable and ready to replace the broken code."
                )
            else:
                sys_prompt = (
                    "You are Qwen Coder, an expert programming assistant running locally in Hyperion IDE.\n"
                    "Generate complete, robust, and well-structured code based on the user's specification.\n"
                    "Always enclose code in appropriate markdown code blocks."
                )

            # Build messages array
            chat_messages = [{"role": "system", "content": sys_prompt}]
            
            if raw_messages:
                for m in raw_messages:
                    r = m.get("role") or ("assistant" if m.get("sender") == "assistant" else "user")
                    c = m.get("content") or m.get("text") or ""
                    if c:
                        chat_messages.append({"role": r, "content": c})
            else:
                content = user_prompt
                if code:
                    content += f"\n\n[File: `{filename}`]\n```\n{code}\n```"
                chat_messages.append({"role": "user", "content": content})

            # Check if model is loaded
            if _model is None:
                # Try auto-loading if weights are ready
                cache = get_cache_info()
                if cache["downloaded"]:
                    load_model_if_needed()
                    self._json(503, {
                        "success": False,
                        "error": "Model is loading into CPU memory. Please wait a few seconds and retry.",
                        "is_loading": True
                    })
                    return
                else:
                    self._json(400, {
                        "success": False,
                        "error": f"Model weights not downloaded yet ({cache['size_mb']} MB / ~950 MB). Please wait for download to finish.",
                        "download_status": cache
                    })
                    return

            try:
                result = run_inference(chat_messages, max_new_tokens=max_tokens, temperature=temp)
                self._json(200, {
                    "success": True,
                    "message": result["text"],
                    "model": MODEL_ID,
                    "provider": "qwen-local-cpu",
                    "metrics": {
                        "tokens": result["tokens"],
                        "duration_sec": result["duration_sec"],
                        "tokens_per_sec": result["tokens_per_sec"]
                    }
                })
            except Exception as e:
                self._json(500, {"success": False, "error": f"Inference failed: {str(e)}"})
            return

        self._json(404, {"error": "Endpoint not found"})

def run_server():
    server = ThreadedHTTPServer(("127.0.0.1", PORT), LocalAIRequestHandler)
    print(f"[LocalAI] Hyperion Local Qwen Service running on http://127.0.0.1:{PORT}", flush=True)
    print(f"[LocalAI] Target Model: {MODEL_ID} on CPU", flush=True)
    
    # Check cache status on startup
    cache = get_cache_info()
    print(f"[LocalAI] Cache status: {cache}", flush=True)
    if cache["downloaded"]:
        print("[LocalAI] Model weights present. Starting preload...", flush=True)
        load_model_if_needed()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
        print("[LocalAI] Server stopped.", flush=True)

if __name__ == "__main__":
    run_server()
