"""
Hyperion IDE - Interactive REPL Session Manager
Manages stateful, interactive command loops for Python and Node.js with multi-line support.
"""
import os
import sys
import time
import subprocess
import threading
import platform
from typing import Dict, Any, Optional

from backend.services.sandbox_engine import (
    get_runtime_paths,
    normalize_path,
    resolve_workspace_path,
    kill_process_tree
)


class ReplSession:
    def __init__(self, session_id: str, runtime: str = "python", cwd: Optional[str] = None):
        self.session_id = session_id
        self.runtime = (runtime or "python").lower()
        self.cwd = cwd
        self.proc: Optional[subprocess.Popen] = None
        self.is_ready = False
        self.banner = ""
        self.last_active = time.time()
        self.output_buffer = ""
        self.error_buffer = ""
        self._lock = threading.Lock()
        self._eval_event = threading.Event()
        self._eval_result: Dict[str, Any] = {}

    def start(self) -> Dict[str, Any]:
        paths = get_runtime_paths()
        work_dir = normalize_path(self.cwd) if self.cwd else None
        if not work_dir or not os.path.isdir(work_dir):
            if self.cwd:
                resolved = resolve_workspace_path(self.cwd)
                if resolved and os.path.isdir(resolved):
                    work_dir = resolved
        if not work_dir or not os.path.isdir(work_dir):
            work_dir = os.getcwd()
        self.cwd = work_dir

        if self.runtime in ("python", "py", "python3"):
            return self._start_python(paths["python"], work_dir)
        elif self.runtime in ("node", "nodejs", "javascript", "js"):
            return self._start_node(paths["node"], work_dir)
        else:
            raise ValueError(f"Unsupported REPL runtime: {self.runtime}")

    def _start_python(self, py_path: str, work_dir: str) -> Dict[str, Any]:
        py_script = (
            "import sys, code, platform\n"
            "banner = f'Python {platform.python_version()} on {sys.platform}\\nType \"help\", \"copyright\", \"credits\" or \"license\" for more information.'\n"
            "print(banner)\n"
            "sys.stdout.flush()\n"
            "console = code.InteractiveConsole()\n"
            "while True:\n"
            "    try:\n"
            "        line = sys.stdin.readline()\n"
            "        if not line:\n"
            "            print('__HYPERION_EXIT__')\n"
            "            sys.stdout.flush()\n"
            "            break\n"
            "        clean = line.rstrip('\\r\\n')\n"
            "        trimmed = clean.strip()\n"
            "        if trimmed in ('exit()', 'quit()', 'exit', 'quit'):\n"
            "            print('__HYPERION_EXIT__')\n"
            "            sys.stdout.flush()\n"
            "            break\n"
            "        more = console.push(clean)\n"
            "        sys.stdout.flush()\n"
            "        sys.stderr.flush()\n"
            "        print(f'__HYPERION_STATUS__{more}')\n"
            "        sys.stdout.flush()\n"
            "    except (KeyboardInterrupt, SystemExit):\n"
            "        print('__HYPERION_EXIT__')\n"
            "        sys.stdout.flush()\n"
            "        break\n"
            "    except Exception as e:\n"
            "        print(f'Error: {e}', file=sys.stderr)\n"
            "        sys.stdout.flush()\n"
            "        sys.stderr.flush()\n"
            "        print('__HYPERION_STATUS__False')\n"
            "        sys.stdout.flush()\n"
        )

        py_bin = py_path if os.path.exists(py_path) else sys.executable
        env = {
            **os.environ,
            "PYTHONUNBUFFERED": "1",
            "PYTHONIOENCODING": "utf-8"
        }

        self.proc = subprocess.Popen(
            [py_bin, "-u", "-c", py_script],
            cwd=work_dir,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            env=env
        )

        # Read banner
        startup_output = ""
        deadline = time.time() + 2.5
        while time.time() < deadline:
            line = self.proc.stdout.readline()
            if line:
                startup_output += line
                if "Type \"help\"" in startup_output or "Python " in startup_output:
                    break
            else:
                time.sleep(0.05)

        self.is_ready = True
        self.banner = startup_output.strip() or f"Python {platform.python_version()} (Interactive REPL)"

        # Start continuous listener thread
        threading.Thread(target=self._listen_process, daemon=True).start()

        return {
            "sessionId": self.session_id,
            "runtime": "python",
            "banner": self.banner,
            "prompt": ">>> "
        }

    def _start_node(self, node_path: str, work_dir: str) -> Dict[str, Any]:
        node_script = """
import vm from 'vm';
import util from 'util';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const context = vm.createContext({
  console: console,
  process: process,
  Buffer: Buffer,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  require: require
});
context.global = context;
context.globalThis = context;

console.log('Welcome to Node.js ' + process.version + '.');
console.log('Type ".help" or ".exit" for more information.');

let buffer = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
  const lines = chunk.split('\\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed && !buffer) {
      console.log('__HYPERION_STATUS__False');
      continue;
    }
    if (trimmed === '.exit' || trimmed === 'exit()' || trimmed === 'exit') {
      console.log('__HYPERION_EXIT__');
      process.exit(0);
    }
    if (trimmed === '.help') {
      console.log('.exit     Exit the REPL\\n.help     Print this help message\\n.clear    Reset evaluation context');
      console.log('__HYPERION_STATUS__False');
      continue;
    }
    if (trimmed === '.clear') {
      buffer = '';
      console.log('Clearing context...');
      console.log('__HYPERION_STATUS__False');
      continue;
    }
    
    buffer = buffer ? buffer + '\\n' + line : line;
    try {
      const result = vm.runInContext(buffer, context, {
        displayErrors: true,
        timeout: 10000
      });
      buffer = '';
      if (result !== undefined) {
        console.log(util.inspect(result, { colors: false, depth: 3 }));
      }
      console.log('__HYPERION_STATUS__False');
    } catch (err) {
      if (err.name === 'SyntaxError' && (err.message.includes('Unexpected end of input') || err.message.includes('missing') || (err.message.includes('token') && err.message.includes('}')))) {
        console.log('__HYPERION_STATUS__True');
      } else {
        buffer = '';
        console.error(err.name + ': ' + err.message);
        console.log('__HYPERION_STATUS__False');
      }
    }
  }
});
"""
        node_bin = node_path if os.path.exists(node_path) else "node"
        env = {
            **os.environ,
            "NODE_NO_WARNINGS": "1"
        }

        self.proc = subprocess.Popen(
            [node_bin, "--input-type=module", "-e", node_script],
            cwd=work_dir,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            env=env
        )

        startup_output = ""
        deadline = time.time() + 2.5
        while time.time() < deadline:
            line = self.proc.stdout.readline()
            if line:
                startup_output += line
                if "Type \".help\"" in startup_output or "Node.js" in startup_output:
                    break
            else:
                time.sleep(0.05)

        self.is_ready = True
        self.banner = startup_output.strip() or "Node.js (Interactive REPL)"
        threading.Thread(target=self._listen_process, daemon=True).start()

        return {
            "sessionId": self.session_id,
            "runtime": "node",
            "banner": self.banner,
            "prompt": "> "
        }

    def _listen_process(self) -> None:
        if not self.proc:
            return

        def _read_stdout():
            for line in iter(self.proc.stdout.readline, ''):
                if not line:
                    break
                self._handle_output(line, False)

        def _read_stderr():
            for line in iter(self.proc.stderr.readline, ''):
                if not line:
                    break
                self._handle_output(line, True)

        t1 = threading.Thread(target=_read_stdout, daemon=True)
        t2 = threading.Thread(target=_read_stderr, daemon=True)
        t1.start()
        t2.start()

        self.proc.wait()
        self.is_ready = False
        with self._lock:
            self._eval_result = {"output": (self.output_buffer + self.error_buffer).strip(), "exited": True, "prompt": "$ "}
            self._eval_event.set()

    def _handle_output(self, text: str, is_error: bool) -> None:
        with self._lock:
            if is_error:
                self.error_buffer += text
            else:
                self.output_buffer += text

            if "__HYPERION_EXIT__" in self.output_buffer or "__HYPERION_EXIT__" in self.error_buffer:
                clean_out = (self.output_buffer + self.error_buffer).replace("__HYPERION_EXIT__", "").strip()
                self._eval_result = {"output": clean_out, "exited": True, "prompt": "$ "}
                self._eval_event.set()
                self.kill()
                return

            if "__HYPERION_STATUS__" in self.output_buffer:
                lines = self.output_buffer.split("\n")
                status_val = None
                remaining_lines = []
                for l in lines:
                    if "__HYPERION_STATUS__" in l:
                        status_val = "True" in l
                    else:
                        remaining_lines.append(l)

                is_multiline = bool(status_val)
                clean_out = "\n".join(remaining_lines).stripEnd() if hasattr(str, "stripEnd") else "\n".join(remaining_lines).rstrip()
                combined = clean_out
                if self.error_buffer:
                    combined = f"{combined}\n{self.error_buffer.rstrip()}" if combined else self.error_buffer.rstrip()

                default_prompt = "> " if self.runtime == "node" else ">>> "
                active_prompt = "... " if is_multiline else default_prompt

                self.output_buffer = ""
                self.error_buffer = ""
                self._eval_result = {
                    "output": combined,
                    "isMultiLine": is_multiline,
                    "prompt": active_prompt,
                    "exited": False
                }
                self._eval_event.set()

    def eval_code(self, code: str) -> Dict[str, Any]:
        self.last_active = time.time()
        if not self.proc or not self.is_ready:
            return {"output": "REPL session is not active.", "exited": True, "prompt": "$ "}

        trimmed = (code or "").strip()
        if trimmed in ("exit()", "quit()", ".exit") or (trimmed == "exit" and self.runtime == "python"):
            self.kill()
            return {"output": "", "exited": True, "prompt": "$ "}

        with self._lock:
            self.output_buffer = ""
            self.error_buffer = ""
            self._eval_event.clear()
            self._eval_result = {}

        try:
            self.proc.stdin.write(code + "\n")
            self.proc.stdin.flush()
        except Exception as e:
            return {"output": f"REPL communication error: {str(e)}", "exited": True, "prompt": "$ "}

        # Wait for eval event
        signaled = self._eval_event.wait(timeout=10.0)
        if not signaled:
            return {
                "output": "\033[33m[Execution taking long...]\033[0m",
                "isMultiLine": False,
                "prompt": "> " if self.runtime == "node" else ">>> ",
                "exited": False
            }

        return self._eval_result

    def kill(self) -> None:
        self.is_ready = False
        if self.proc:
            try:
                if self.proc.stdin:
                    self.proc.stdin.close()
            except Exception:
                pass
            kill_process_tree(self.proc.pid)
            self.proc = None


class ReplManager:
    def __init__(self):
        self.sessions: Dict[str, ReplSession] = {}
        self._lock = threading.Lock()

        # Idle cleanup background timer
        def _cleanup_loop():
            while True:
                time.sleep(300)
                now = time.time()
                with self._lock:
                    to_remove = []
                    for sid, s in self.sessions.items():
                        if now - s.last_active > 1800:
                            s.kill()
                            to_remove.append(sid)
                    for sid in to_remove:
                        del self.sessions[sid]

        threading.Thread(target=_cleanup_loop, daemon=True).start()

    def start_session(self, session_id: str, runtime: str = "python", cwd: Optional[str] = None) -> Dict[str, Any]:
        with self._lock:
            existing = self.sessions.get(session_id)
            if existing and existing.runtime == runtime.lower() and existing.is_ready:
                return {
                    "sessionId": session_id,
                    "runtime": existing.runtime,
                    "banner": existing.banner,
                    "prompt": "> " if existing.runtime == "node" else ">>> "
                }
            if existing:
                existing.kill()
                del self.sessions[session_id]

            session = ReplSession(session_id, runtime, cwd)
            self.sessions[session_id] = session

        return session.start()

    def eval_code(self, session_id: str, code: str) -> Dict[str, Any]:
        with self._lock:
            session = self.sessions.get(session_id)
        if not session:
            return {"output": "REPL session not found. Please start a new session.", "exited": True, "prompt": "$ "}
        return session.eval_code(code)

    def exit_session(self, session_id: str) -> Dict[str, Any]:
        with self._lock:
            session = self.sessions.pop(session_id, None)
        if session:
            session.kill()
            return {"success": True}
        return {"success": False, "message": "Session not found"}


global_repl_manager = ReplManager()

