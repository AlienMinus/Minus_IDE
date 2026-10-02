/**
 * Hyperion Sandbox Service
 * Communicates with Hyperion Sandbox backend for executing direct codes and shell commands.
 */

const API_BASE = '/api/sandbox';

/**
 * Detect language from filename or extension
 */
export function detectLanguage(filename = '') {
  const ext = filename.split('.').pop().toLowerCase();
  switch (ext) {
    case 'c':
    case 'h':
      return 'c';
    case 'cpp':
    case 'cc':
    case 'cxx':
    case 'hpp':
      return 'cpp';
    case 'py':
    case 'pyw':
      return 'python';
    case 'js':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    case 'jsx':
    case 'tsx':
      return 'react';
    case 'ts':
      return 'typescript';
    case 'sh':
    case 'bash':
    case 'zsh':
      return 'bash';
    case 'html':
    case 'htm':
      return 'html';
    case 'css':
      return 'css';
    case 'json':
      return 'json';
    default:
      return 'plaintext';
  }
}

/**
 * Get status and available compilers/runtimes from sandbox
 */
export async function getSandboxStatus() {
  try {
    const res = await fetch(`${API_BASE}/status`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) {
      throw new Error(`Sandbox status error: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.warn('Sandbox status check failed:', err);
    return {
      status: 'offline',
      message: 'Sandbox backend unavailable',
      data: {
        runtimes: {
          javascript: { available: true, version: 'Browser In-Memory Engine', path: 'browser' }
        }
      }
    };
  }
}

/**
 * Execute Direct Code in the Sandbox
 * @param {Object} options
 * @param {string} options.language - 'c', 'python', 'javascript', 'node', 'bash', 'react'
 * @param {string} options.code - Source code string
 * @param {string} [options.filename] - Source filename (e.g. main.c)
 * @param {Array} [options.args] - CLI arguments
 * @param {string} [options.stdin] - Standard input
 * @param {number} [options.timeoutMs] - Timeout in ms
 * @param {Array} [options.files] - Supporting workspace files
 */
export async function executeCode({
  language,
  code,
  filename,
  args = [],
  stdin = '',
  timeoutMs = 15000,
  files = []
}) {
  try {
    const res = await fetch(`${API_BASE}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language,
        code,
        filename,
        args,
        stdin,
        timeoutMs,
        files: files.map(f => ({ path: f.path || f.name, name: f.name, content: f.content || '' }))
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        success: false,
        stage: 'network',
        stdout: '',
        stderr: `Sandbox Error (${res.status}): ${errText}`,
        exitCode: 1,
        executionTimeMs: 0
      };
    }

    return await res.json();
  } catch (err) {
    // If backend is completely offline and it's JS, fallback to browser execution
    if (['javascript', 'js', 'node'].includes((language || '').toLowerCase())) {
      return executeBrowserJs(code);
    }

    return {
      success: false,
      stage: 'network',
      stdout: '',
      stderr: `Failed to connect to Hyperion Sandbox backend: ${err.message}.\nPlease ensure backend server is running.`,
      exitCode: 1,
      executionTimeMs: 0
    };
  }
}

/**
 * Execute Direct Shell Command in the Sandbox
 * @param {string} command - Shell command string
 * @param {Object} options
 * @param {string} [options.cwd] - Working directory
 * @param {Array} [options.virtualFiles] - Workspace files to provide to the sandbox
 * @param {number} [options.timeoutMs] - Timeout in ms
 */
export async function executeCommand(command, { cwd, virtualFiles = [], timeoutMs = 30000 } = {}) {
  try {
    const res = await fetch(`${API_BASE}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command,
        cwd,
        virtualFiles: virtualFiles.map(f => ({ path: f.path || f.name, name: f.name, content: f.content || '' })),
        timeoutMs
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        success: false,
        stdout: '',
        stderr: `Sandbox Error (${res.status}): ${errText}`,
        exitCode: 1,
        executionTimeMs: 0
      };
    }

    return await res.json();
  } catch (err) {
    return {
      success: false,
      stdout: '',
      stderr: `Failed to connect to Hyperion Sandbox backend: ${err.message}`,
      exitCode: 1,
      executionTimeMs: 0
    };
  }
}

/**
 * Stream Direct Shell Command with chunk-by-chunk callbacks and abort support
 */
export async function streamShellCommand({
  command,
  cwd,
  virtualFiles = [],
  timeoutMs = 0,
  onChunk,
  onExit,
  signal
}) {
  try {
    const res = await fetch(`${API_BASE}/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command,
        cwd,
        virtualFiles: virtualFiles.map(f => ({ path: f.path || f.name, name: f.name, content: f.content || '' })),
        timeoutMs
      }),
      signal
    });

    if (!res.ok) {
      const errText = await res.text();
      onChunk?.(`\r\n\x1b[31m[Sandbox Error ${res.status}: ${errText}]\x1b[0m\r\n`);
      onExit?.(1);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        try {
          const payload = JSON.parse(trimmed.slice(6));
          if (payload.type === 'output' && payload.data) {
            onChunk?.(payload.data);
          } else if (payload.type === 'exit') {
            onExit?.(payload.code);
          }
        } catch {}
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      onChunk?.('\r\n\x1b[33m[Process terminated by user]\x1b[0m\r\n');
    } else {
      onChunk?.(`\r\n\x1b[31m[Connection error: ${err.message}]\x1b[0m\r\n`);
    }
    onExit?.(1);
  }
}

/**
 * Fallback browser execution for JavaScript
 */
function executeBrowserJs(code) {
  const startTime = Date.now();
  let stdout = '';
  let stderr = '';
  let exitCode = 0;

  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  const logs = [];
  console.log = (...args) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
  console.error = (...args) => logs.push('[ERROR] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));
  console.warn = (...args) => logs.push('[WARN] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '));

  try {
    const fn = new Function(code);
    const result = fn();
    if (result !== undefined) {
      logs.push(String(result));
    }
    stdout = logs.join('\n');
  } catch (err) {
    stderr = err.stack || err.message;
    exitCode = 1;
  } finally {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
  }

  return {
    success: exitCode === 0,
    stage: 'browser_fallback',
    language: 'javascript',
    stdout,
    stderr,
    exitCode,
    executionTimeMs: Date.now() - startTime
  };
}

/**
 * Ask backend to resolve the real host OS path for an opened folder
 */
export async function resolveWorkspacePath({ folderName, sampleFiles = [] }) {
  try {
    const res = await fetch(`${API_BASE}/workspace/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderName, sampleFiles })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.path : null;
  } catch (err) {
    console.warn('Workspace path resolution failed:', err);
    return null;
  }
}

/**
 * Validate whether a path exists on host OS
 */
export async function validateWorkspacePath(targetPath) {
  try {
    const res = await fetch(`${API_BASE}/workspace/validate?path=${encodeURIComponent(targetPath)}`);
    if (!res.ok) return { exists: false };
    return await res.json();
  } catch (err) {
    return { exists: false };
  }
}

/**
 * Trigger native folder dialog from host OS
 */
export async function pickNativeFolder() {
  try {
    const res = await fetch(`${API_BASE}/workspace/pick`, {
      method: 'POST'
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.path : null;
  } catch (err) {
    console.warn('Native folder picker failed:', err);
    return null;
  }
}

/**
 * Load directory tree from host OS path
 */
export async function fetchWorkspaceTree(dirPath) {
  try {
    const res = await fetch(`${API_BASE}/workspace/tree`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: dirPath })
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.tree || [];
  } catch (err) {
    console.warn('Failed to load workspace tree from backend:', err);
    return [];
  }
}

/**
 * Start Interactive REPL Session (Python, Node)
 */
export async function startReplSession({ sessionId, runtime = 'python', cwd }) {
  try {
    const res = await fetch(`${API_BASE}/repl/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, runtime, cwd })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.data;
  } catch (err) {
    throw new Error(`Failed to start ${runtime} REPL: ${err.message}`);
  }
}

/**
 * Evaluate code line/block in active REPL session
 */
export async function evalReplCode({ sessionId, code }) {
  try {
    const res = await fetch(`${API_BASE}/repl/eval`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, code })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.data;
  } catch (err) {
    throw new Error(`REPL eval error: ${err.message}`);
  }
}

/**
 * Exit active REPL session
 */
export async function exitReplSession(sessionId) {
  try {
    const res = await fetch(`${API_BASE}/repl/exit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });
    if (!res.ok) return { success: false };
    return await res.json();
  } catch {
    return { success: false };
  }
}

/**
 * Fetch all active listening TCP ports from host
 */
export async function getActivePorts() {
  try {
    const res = await fetch(`${API_BASE}/ports`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.ports || [];
  } catch (err) {
    console.warn('Failed to fetch active ports:', err);
    return [
      { port: 5173, protocol: 'HTTP', process: 'node.exe', origin: 'Vite Dev Server (Frontend)', address: 'http://localhost:5173', status: 'LISTENING', isLocal: true },
      { port: 3000, protocol: 'HTTP', process: 'node.exe', origin: 'Hyperion Sandbox API (Backend)', address: 'http://localhost:3000', status: 'LISTENING', isLocal: true }
    ];
  }
}

/**
 * Run compiler/interpreter syntax diagnostic on code
 */
export async function lintCode({ language, code, filename }) {
  try {
    const res = await fetch(`${API_BASE}/lint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language, code, filename })
    });
    if (!res.ok) return { success: false, markers: [] };
    const data = await res.json();
    return data;
  } catch (err) {
    return { success: false, markers: [] };
  }
}

