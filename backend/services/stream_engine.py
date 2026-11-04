"""
Hyperion IDE - Real-Time Command Streaming Engine
Manages streaming terminal execution with chunk-by-chunk SSE streaming and stdin routing.
"""
import os
import sys
import time
import queue
import threading
import subprocess
import platform
import json
from typing import Dict, Any, Optional, AsyncGenerator

from backend.services.sandbox_engine import (
    get_runtime_paths,
    normalize_path,
    resolve_workspace_path,
    create_temp_dir,
    cleanup_dir,
    write_virtual_files,
    kill_process_tree
)


class ActiveStream:
    def __init__(self, stream_id: str, proc: subprocess.Popen, work_dir: str, is_temp: bool):
        self.stream_id = stream_id
        self.proc = proc
        self.work_dir = work_dir
        self.is_temp = is_temp
        self.queue: queue.Queue = queue.Queue()
        self.finished = False

    def write_stdin(self, data: str) -> bool:
        if self.proc and self.proc.stdin and not self.proc.stdin.closed:
            try:
                self.proc.stdin.write(data)
                self.proc.stdin.flush()
                return True
            except Exception:
                return False
        return False

    def kill(self) -> None:
        self.finished = True
        if self.proc:
            kill_process_tree(self.proc.pid)
        if self.is_temp:
            cleanup_dir(self.work_dir)


class StreamEngine:
    def __init__(self):
        self._streams: Dict[str, ActiveStream] = {}
        self._lock = threading.Lock()

    def get_stream(self, stream_id: str) -> Optional[ActiveStream]:
        with self._lock:
            return self._streams.get(stream_id)

    def remove_stream(self, stream_id: str) -> None:
        with self._lock:
            if stream_id in self._streams:
                del self._streams[stream_id]

    def create_stream(
        self,
        stream_id: str,
        command: str,
        cwd: Optional[str] = None,
        virtual_files: Optional[list] = None,
        timeout_ms: int = 0,
        profile: str = "powershell"
    ) -> ActiveStream:
        paths = get_runtime_paths()
        trimmed = (command or "").strip()

        work_dir = normalize_path(cwd) if (cwd and cwd != "~/HyperionIDE") else None
        is_temp = False

        if not work_dir or not os.path.isdir(work_dir):
            if cwd and cwd != "~/HyperionIDE":
                resolved = resolve_workspace_path(cwd)
                if resolved and os.path.isdir(resolved):
                    work_dir = resolved

        if not work_dir or not os.path.isdir(work_dir):
            work_dir = create_temp_dir("hyp_stream_")
            is_temp = True
            if virtual_files:
                write_virtual_files(work_dir, virtual_files)
        elif virtual_files:
            try:
                write_virtual_files(work_dir, virtual_files)
            except Exception:
                pass

        is_windows = platform.system() == "Windows"
        is_bash = trimmed.startswith("bash ") or trimmed.startswith("./")

        if not is_windows and os.path.exists(paths["bash"]):
            runner = paths["bash"]
            runner_args = ["-c", trimmed]
        elif is_windows and is_bash and os.path.exists(paths["bash"]):
            runner = paths["bash"]
            runner_args = ["-c", trimmed]
        elif is_windows and (profile == "powershell" or not profile or profile == "default"):
            runner = "powershell.exe"
            runner_args = ["-NoLogo", "-ExecutionPolicy", "Bypass", "-Command", trimmed]
        elif is_windows:
            runner = os.environ.get("COMSPEC", "cmd.exe")
            runner_args = ["/d", "/s", "/c", trimmed]
        else:
            runner = "/bin/sh"
            runner_args = ["-c", trimmed]

        env = {
            **os.environ,
            "PYTHONUNBUFFERED": "1",
            "TERM": "xterm-256color",
            "FORCE_COLOR": "1"
        }

        proc = subprocess.Popen(
            [runner, *runner_args],
            cwd=work_dir,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            env=env
        )

        stream = ActiveStream(stream_id, proc, work_dir, is_temp)
        with self._lock:
            self._streams[stream_id] = stream

        # Reader threads
        def _read_stdout():
            try:
                for line in iter(proc.stdout.readline, ''):
                    if not line:
                        break
                    stream.queue.put(("chunk", line))
            except Exception:
                pass

        def _read_stderr():
            try:
                for line in iter(proc.stderr.readline, ''):
                    if not line:
                        break
                    stream.queue.put(("chunk", line))
            except Exception:
                pass

        def _wait_exit():
            code = proc.wait()
            stream.queue.put(("exit", code))
            self.remove_stream(stream_id)
            if is_temp:
                cleanup_dir(work_dir)

        threading.Thread(target=_read_stdout, daemon=True).start()
        threading.Thread(target=_read_stderr, daemon=True).start()
        threading.Thread(target=_wait_exit, daemon=True).start()

        if timeout_ms > 0:
            def _timeout_watcher():
                time.sleep(timeout_ms / 1000.0)
                if not stream.finished and proc.poll() is None:
                    stream.queue.put(("chunk", f"\r\n\033[31m[Process timed out after {timeout_ms / 1000}s]\033[0m\r\n"))
                    stream.kill()
            threading.Thread(target=_timeout_watcher, daemon=True).start()

        return stream


global_stream_engine = StreamEngine()

