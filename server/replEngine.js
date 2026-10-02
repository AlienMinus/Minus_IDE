import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { getRuntimePaths, resolveWorkspacePath, normalizePath } from './sandboxEngine.js';

class ReplSession {
  constructor({ sessionId, runtime = 'python', cwd }) {
    this.sessionId = sessionId;
    this.runtime = (runtime || 'python').toLowerCase();
    this.cwd = cwd;
    this.process = null;
    this.isReady = false;
    this.banner = '';
    this.lastActive = Date.now();
    this.currentResolver = null;
    this.outputBuffer = '';
    this.errorBuffer = '';
  }

  async start() {
    const paths = getRuntimePaths();
    let workDir = this.cwd ? normalizePath(this.cwd) : null;
    if (!workDir || !fs.existsSync(workDir)) {
      if (this.cwd) {
        const resolved = resolveWorkspacePath({ folderName: this.cwd });
        if (resolved && fs.existsSync(resolved)) {
          workDir = resolved;
        }
      }
    }
    if (!workDir || !fs.existsSync(workDir)) {
      workDir = process.cwd();
    }
    this.cwd = workDir;

    if (this.runtime === 'python' || this.runtime === 'py' || this.runtime === 'python3') {
      return this._startPython(paths.python, workDir);
    } else if (this.runtime === 'node' || this.runtime === 'nodejs') {
      return this._startNode(paths.node, workDir);
    } else {
      throw new Error(`Unsupported REPL runtime: ${this.runtime}`);
    }
  }

  _startPython(pythonPath, workDir) {
    return new Promise((resolve, reject) => {
      const pyScript = `
import sys, code, platform

banner = f"Python {platform.python_version()} on {sys.platform}\\nType \\"help\\", \\"copyright\\", \\"credits\\" or \\"license\\" for more information."
print(banner)
sys.stdout.flush()

console = code.InteractiveConsole()

while True:
    try:
        line = sys.stdin.readline()
        if not line:
            print("__HYPERION_EXIT__")
            sys.stdout.flush()
            break
        clean = line.rstrip("\\r\\n")
        trimmed = clean.strip()
        if trimmed in ("exit()", "quit()", "exit", "quit"):
            print("__HYPERION_EXIT__")
            sys.stdout.flush()
            break
        more = console.push(clean)
        sys.stdout.flush()
        sys.stderr.flush()
        print(f"__HYPERION_STATUS__{more}")
        sys.stdout.flush()
    except (KeyboardInterrupt, SystemExit):
        print("__HYPERION_EXIT__")
        sys.stdout.flush()
        break
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.stdout.flush()
        sys.stderr.flush()
        print("__HYPERION_STATUS__False")
        sys.stdout.flush()
`;

      const pyBin = pythonPath && fs.existsSync(pythonPath) ? pythonPath : 'python';
      this.process = spawn(pyBin, ['-u', '-c', pyScript], {
        cwd: workDir,
        windowsHide: true,
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1',
          PYTHONIOENCODING: 'utf-8'
        }
      });

      let startupOutput = '';
      let startupResolved = false;

      const onData = (data) => {
        const text = data.toString();
        if (!this.isReady) {
          startupOutput += text;
          if (startupOutput.includes('Type "help"') || startupOutput.includes('Python ')) {
            this.isReady = true;
            this.banner = startupOutput.trim();
            startupResolved = true;
            resolve({
              sessionId: this.sessionId,
              runtime: 'python',
              banner: this.banner,
              prompt: '>>> '
            });
          }
        } else {
          this._handleProcessOutput(text, false);
        }
      };

      this.process.stdout.on('data', onData);
      this.process.stderr.on('data', (data) => {
        const text = data.toString();
        if (!this.isReady) {
          startupOutput += text;
        } else {
          this._handleProcessOutput(text, true);
        }
      });

      this.process.on('close', (code) => {
        this.isReady = false;
        if (!startupResolved) {
          reject(new Error(`Python process exited with code ${code}`));
        } else if (this.currentResolver) {
          this.currentResolver({
            output: this.outputBuffer,
            exited: true,
            prompt: '$ '
          });
          this.currentResolver = null;
        }
      });

      this.process.on('error', (err) => {
        this.isReady = false;
        if (!startupResolved) {
          reject(err);
        }
      });

      // Fallback timeout for banner
      setTimeout(() => {
        if (!startupResolved) {
          this.isReady = true;
          this.banner = startupOutput.trim() || 'Python 3.12 (Interactive REPL)';
          startupResolved = true;
          resolve({
            sessionId: this.sessionId,
            runtime: 'python',
            banner: this.banner,
            prompt: '>>> '
          });
        }
      }, 1500);
    });
  }

  _startNode(nodePath, workDir) {
    return new Promise((resolve, reject) => {
      const nodeScript = `
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
      if (err.name === 'SyntaxError' && (err.message.includes('Unexpected end of input') || err.message.includes('missing') || err.message.includes('token') && err.message.includes('}'))) {
        console.log('__HYPERION_STATUS__True');
      } else {
        buffer = '';
        console.error(err.name + ': ' + err.message);
        console.log('__HYPERION_STATUS__False');
      }
    }
  }
});
`;

      const nodeBin = nodePath && fs.existsSync(nodePath) ? nodePath : 'node';
      this.process = spawn(nodeBin, ['--input-type=module', '-e', nodeScript], {
        cwd: workDir,
        windowsHide: true,
        env: {
          ...process.env,
          NODE_NO_WARNINGS: '1'
        }
      });

      let startupOutput = '';
      let startupResolved = false;

      const onData = (data) => {
        const text = data.toString();
        if (!this.isReady) {
          startupOutput += text;
          if (startupOutput.includes('Type ".help"')) {
            this.isReady = true;
            this.banner = startupOutput.trim();
            startupResolved = true;
            resolve({
              sessionId: this.sessionId,
              runtime: 'node',
              banner: this.banner,
              prompt: '> '
            });
          }
        } else {
          this._handleProcessOutput(text, false);
        }
      };

      this.process.stdout.on('data', onData);
      this.process.stderr.on('data', (data) => {
        const text = data.toString();
        if (!this.isReady) {
          startupOutput += text;
        } else {
          this._handleProcessOutput(text, true);
        }
      });

      this.process.on('close', (code) => {
        this.isReady = false;
        if (!startupResolved) {
          reject(new Error(`Node process exited with code ${code}`));
        } else if (this.currentResolver) {
          this.currentResolver({
            output: this.outputBuffer,
            exited: true,
            prompt: '$ '
          });
          this.currentResolver = null;
        }
      });

      this.process.on('error', (err) => {
        this.isReady = false;
        if (!startupResolved) {
          reject(err);
        }
      });

      setTimeout(() => {
        if (!startupResolved) {
          this.isReady = true;
          this.banner = startupOutput.trim() || 'Node.js (Interactive REPL)';
          startupResolved = true;
          resolve({
            sessionId: this.sessionId,
            runtime: 'node',
            banner: this.banner,
            prompt: '> '
          });
        }
      }, 1500);
    });
  }

  _handleProcessOutput(text, isError) {
    if (isError) {
      this.errorBuffer += text;
    } else {
      this.outputBuffer += text;
    }

    if (this.outputBuffer.includes('__HYPERION_EXIT__') || this.errorBuffer.includes('__HYPERION_EXIT__')) {
      if (this.currentResolver) {
        const cleanOut = (this.outputBuffer + this.errorBuffer)
          .replace(/__HYPERION_EXIT__/g, '')
          .replace(/__HYPERION_STATUS__\w+/g, '')
          .trim();
        this.currentResolver({
          output: cleanOut,
          exited: true,
          prompt: '$ '
        });
        this.currentResolver = null;
      }
      this.kill();
      return;
    }

    const statusMatch = this.outputBuffer.match(/__HYPERION_STATUS__(True|False)/);
    if (statusMatch && this.currentResolver) {
      const isMultiLine = statusMatch[1] === 'True';
      const cleanOut = this.outputBuffer.replace(/__HYPERION_STATUS__(True|False)/g, '').trimEnd();
      const combined = (cleanOut ? cleanOut : '') + (this.errorBuffer ? (cleanOut ? '\n' : '') + this.errorBuffer.trimEnd() : '');

      const defaultPrompt = this.runtime === 'node' ? '> ' : '>>> ';
      const activePrompt = isMultiLine ? '... ' : defaultPrompt;

      const resolver = this.currentResolver;
      this.currentResolver = null;
      this.outputBuffer = '';
      this.errorBuffer = '';

      resolver({
        output: combined,
        isMultiLine,
        prompt: activePrompt,
        exited: false
      });
    }
  }

  evalCode(code) {
    this.lastActive = Date.now();
    return new Promise((resolve) => {
      if (!this.process || !this.isReady) {
        return resolve({
          output: 'REPL session is not active.',
          exited: true,
          prompt: '$ '
        });
      }

      const trimmed = (code || '').trim();
      if (trimmed === 'exit()' || trimmed === 'quit()' || trimmed === '.exit' || (trimmed === 'exit' && this.runtime === 'python')) {
        this.kill();
        return resolve({
          output: '',
          exited: true,
          prompt: '$ '
        });
      }

      this.outputBuffer = '';
      this.errorBuffer = '';
      this.currentResolver = resolve;

      // Set safety timeout for long-running or blocking code
      const safetyTimer = setTimeout(() => {
        if (this.currentResolver === resolve) {
          this.currentResolver = null;
          resolve({
            output: '\x1b[33m[Execution taking long... Press Ctrl+C to interrupt]\x1b[0m',
            isMultiLine: false,
            prompt: this.runtime === 'node' ? '> ' : '>>> ',
            exited: false
          });
        }
      }, 10000);

      const originalResolver = this.currentResolver;
      this.currentResolver = (val) => {
        clearTimeout(safetyTimer);
        originalResolver(val);
      };

      try {
        this.process.stdin.write(code + '\n');
      } catch (err) {
        clearTimeout(safetyTimer);
        this.currentResolver = null;
        resolve({
          output: `REPL communication error: ${err.message}`,
          exited: true,
          prompt: '$ '
        });
      }
    });
  }

  kill() {
    this.isReady = false;
    if (this.process) {
      try {
        this.process.stdin?.end();
        this.process.kill('SIGKILL');
      } catch {}
      this.process = null;
    }
  }
}

class ReplManager {
  constructor() {
    this.sessions = new Map();

    // Idle cleanup every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [id, session] of this.sessions.entries()) {
        if (now - session.lastActive > 30 * 60 * 1000) {
          session.kill();
          this.sessions.delete(id);
        }
      }
    }, 5 * 60 * 1000);
  }

  async startSession({ sessionId, runtime = 'python', cwd }) {
    if (this.sessions.has(sessionId)) {
      const existing = this.sessions.get(sessionId);
      if (existing.runtime === runtime.toLowerCase() && existing.isReady) {
        return {
          sessionId,
          runtime: existing.runtime,
          banner: existing.banner,
          prompt: existing.runtime === 'node' ? '> ' : '>>> '
        };
      }
      existing.kill();
      this.sessions.delete(sessionId);
    }

    const session = new ReplSession({ sessionId, runtime, cwd });
    this.sessions.set(sessionId, session);
    return session.start();
  }

  async evalCode({ sessionId, code }) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        output: 'REPL session not found. Please start a new session.',
        exited: true,
        prompt: '$ '
      };
    }
    return session.evalCode(code);
  }

  exitSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.kill();
      this.sessions.delete(sessionId);
      return { success: true };
    }
    return { success: false, message: 'Session not found' };
  }
}

export const replManager = new ReplManager();
