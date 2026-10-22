"""
Hyperion IDE - Local Qwen Coder AI Engine
Runs Qwen2.5-Coder locally on CPU using Hugging Face Transformers & PyTorch.
Provides code generation, line-by-line explanation, and bug/security vulnerability fixes.
"""
import os
import time
import threading
from typing import Dict, Any, List, Tuple
from backend.config import QWEN_MODEL_ID

class LocalAIEngine:
    def __init__(self, model_id: str = QWEN_MODEL_ID):
        self.model_id = model_id
        self._lock = threading.Lock()
        self.model = None
        self.tokenizer = None
        self.is_loading = False
        self.load_error = None

    def get_cache_info(self) -> Dict[str, Any]:
        """Check whether model weights are downloaded in HuggingFace cache."""
        cache_base = os.path.expanduser("~/.cache/huggingface/hub")
        repo_folder = f"models--{self.model_id.replace('/', '--')}"
        target_dir = os.path.join(cache_base, repo_folder)

        if not os.path.exists(target_dir):
            return {"downloaded": False, "size_mb": 0, "status": "not_downloaded"}

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
        is_complete = not incomplete and size_mb >= 900

        return {
            "downloaded": is_complete,
            "size_mb": size_mb,
            "status": "ready" if is_complete else ("downloading" if incomplete or size_mb > 0 else "not_downloaded")
        }

    def load_model(self) -> Tuple[bool, str]:
        """Load model into CPU RAM if weights are present."""
        with self._lock:
            if self.model is not None:
                return True, "Model already loaded"
            if self.is_loading:
                return False, "Model is currently loading into memory..."

        cache = self.get_cache_info()
        if not cache["downloaded"]:
            return False, f"Model weights not downloaded yet ({cache['size_mb']} MB / ~950 MB)"

        def _do_load():
            try:
                with self._lock:
                    self.is_loading = True
                    self.load_error = None

                print(f"[LocalAI] Loading {self.model_id} into CPU memory...", flush=True)
                import torch
                from transformers import AutoModelForCausalLM, AutoTokenizer

                torch.set_num_threads(min(os.cpu_count() or 4, 8))
                tok = AutoTokenizer.from_pretrained(self.model_id)
                mod = AutoModelForCausalLM.from_pretrained(
                    self.model_id,
                    dtype=torch.float32,
                    device_map="cpu",
                    low_cpu_mem_usage=True
                )
                mod.eval()

                with self._lock:
                    self.tokenizer = tok
                    self.model = mod
                    self.is_loading = False
                print(f"[LocalAI] Successfully loaded {self.model_id} into CPU memory!", flush=True)
            except Exception as e:
                with self._lock:
                    self.is_loading = False
                    self.load_error = str(e)
                print(f"[LocalAI] Model load error: {e}", flush=True)

        threading.Thread(target=_do_load, daemon=True).start()
        return True, "Model load initiated in background"

    def run_inference(self, messages: List[Dict[str, str]], max_new_tokens: int = 512, temperature: float = 0.2) -> Dict[str, Any]:
        """Run text generation on the loaded model."""
        if self.model is None or self.tokenizer is None:
            raise RuntimeError("Model is not loaded in memory")

        import torch
        prompt_text = self.tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = self.tokenizer([prompt_text], return_tensors="pt")

        start = time.time()
        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,
                temperature=temperature if temperature > 0 else 0.01,
                do_sample=(temperature > 0),
                pad_token_id=self.tokenizer.eos_token_id
            )

        duration = time.time() - start
        new_tokens = outputs[0][len(inputs.input_ids[0]):]
        output_text = self.tokenizer.decode(new_tokens, skip_special_tokens=True).strip()
        tok_count = len(new_tokens)
        tok_per_sec = round(tok_count / duration, 2) if duration > 0 else 0

        return {
            "text": output_text,
            "tokens": tok_count,
            "duration_sec": round(duration, 2),
            "tokens_per_sec": tok_per_sec
        }

# Singleton instance
global_local_ai = LocalAIEngine()
