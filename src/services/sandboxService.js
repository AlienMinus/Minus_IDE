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
