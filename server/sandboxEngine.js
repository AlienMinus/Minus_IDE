import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync, spawn } from 'child_process';

// Cache discovered binary paths
let cachedPaths = null;

/**
 * Resolve an executable binary path directly using system environment variables:
 * - process.env.PATH
 * - process.env.PATHEXT
 * - process.env.SHELL
 * - process.execPath
 * Accesses system environment variables directly without hardcoded path guesses.
 */
export function resolveBinaryFromEnv(binaryName) {
  // 1. If resolving node, use the currently running node process path directly
  if (binaryName === 'node' && process.execPath) {
    return process.execPath;
  }

  // 2. For bash: resolve from SHELL environment variable or Git installation discovered in PATH
  if (binaryName === 'bash') {
    if (process.env.SHELL && fs.existsSync(process.env.SHELL)) {
      return process.env.SHELL;
    }
    const gitExe = resolveBinaryFromEnv('git');
    if (gitExe && gitExe !== 'git') {
      const gitDir = path.resolve(path.dirname(gitExe), '..');
      const gitBash = path.join(gitDir, 'bin', 'bash.exe');
      if (fs.existsSync(gitBash)) return gitBash;
      const gitUsrBash = path.join(gitDir, 'usr', 'bin', 'bash.exe');
      if (fs.existsSync(gitUsrBash)) return gitUsrBash;
    }
  }

  const pathEnv = process.env.PATH || '';
  const pathExts = (process.env.PATHEXT || (process.platform === 'win32' ? '.EXE;.CMD;.BAT;.COM' : '')).split(';').filter(Boolean);
  const dirs = pathEnv.split(path.delimiter).filter(Boolean);

  for (const dir of dirs) {
    // Avoid Windows system32 bash launcher which hangs if WSL is unconfigured
    if (binaryName === 'bash' && dir.toLowerCase().includes('system32')) continue;

    // Direct match with binaryName
    const directPath = path.join(dir, binaryName);
    if (fs.existsSync(directPath)) {
      try {
        if (!fs.statSync(directPath).isDirectory()) return directPath;
      } catch {}
    }

    // Executable extensions from PATHEXT
    for (const ext of pathExts) {
      const withExt = path.join(dir, binaryName + ext);
      if (fs.existsSync(withExt)) {
        try {
          if (!fs.statSync(withExt).isDirectory()) return withExt;
        } catch {}
      }
    }
  }

  // Return binaryName so the OS / shell can resolve it directly via PATH
  return binaryName;
}

export function getRuntimePaths() {
  if (cachedPaths) return cachedPaths;

  cachedPaths = {
    gcc: resolveBinaryFromEnv('gcc'),
    python: resolveBinaryFromEnv('python'),
    node: resolveBinaryFromEnv('node'),
    bash: resolveBinaryFromEnv('bash')
  };

  return cachedPaths;
}

export function getRuntimesInfo() {
  const paths = getRuntimePaths();
  const info = {
    os: `${os.type()} ${os.release()} (${os.arch()})`,
    runtimes: {}
  };

  // Check C (GCC)
  try {
    const out = execSync(`"${paths.gcc}" --version`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], timeout: 3000 });
    const line = out.split('\n')[0].trim();
    info.runtimes.c = { available: true, version: line, path: paths.gcc, compiler: 'gcc' };
  } catch (err) {
    info.runtimes.c = { available: false, error: err.message, path: paths.gcc };
  }

  // Check Python
  try {
    const out = execSync(`"${paths.python}" --version`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], timeout: 3000 });
    info.runtimes.python = { available: true, version: out.trim(), path: paths.python };
  } catch (err) {
    info.runtimes.python = { available: false, error: err.message, path: paths.python };
  }

  // Check Node / JavaScript
  try {
    info.runtimes.node = { available: true, version: `Node.js ${process.version}`, path: paths.node };
    info.runtimes.javascript = { available: true, version: `V8 / Node.js ${process.version}`, path: paths.node };
  } catch (err) {
    info.runtimes.node = { available: false, error: err.message, path: paths.node };
  }

  // Check Bash
  try {
    const out = execSync(`"${paths.bash}" --version`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], timeout: 3000 });
    const line = out.split('\n')[0].trim();
    info.runtimes.bash = { available: true, version: line, path: paths.bash };
  } catch (err) {
    info.runtimes.bash = { available: false, error: err.message, path: paths.bash };
  }

  // Check React / JSX Transpiler
  try {
    info.runtimes.react = { available: true, version: 'React 19.x (JSX/TSX Engine via esbuild + DOM Preview)', path: 'built-in' };
  } catch (err) {
    info.runtimes.react = { available: false, error: err.message };
  }

  return info;
}

// Create a unique temporary directory for execution
function createTempDir(prefix = 'hyp_sandbox_') {
  const baseDir = path.join(os.tmpdir(), 'hyperion_sandbox');
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  return fs.mkdtempSync(path.join(baseDir, prefix));
}

// Safely remove a directory recursively
function cleanupDir(dirPath) {
  try {
    if (dirPath && fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  } catch {
    // Ignore cleanup errors
  }
}

// Write virtual files to directory (from browser workspace)
function writeVirtualFiles(dirPath, files = []) {
  for (const file of files) {
    if (!file || !file.name) continue;
    const relPath = file.path || file.name;
    const fullPath = path.join(dirPath, relPath);
    const parentDir = path.dirname(fullPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(fullPath, file.content || '', 'utf8');
  }
}

/**
 * Execute Direct Code in the Sandbox
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
  const startTime = Date.now();
  const paths = getRuntimePaths();
  const tempDir = createTempDir(`${language || 'code'}_`);

  try {
    // Write any supporting workspace files first
    writeVirtualFiles(tempDir, files);

    const lang = (language || '').toLowerCase().trim();

    // 1. C EXECUTION
    if (lang === 'c' || lang === 'c++' || lang === 'cpp') {
      const srcName = filename || 'main.c';
      const srcPath = path.join(tempDir, srcName);
      const binName = 'program.exe';
      const binPath = path.join(tempDir, binName);

      fs.writeFileSync(srcPath, code, 'utf8');

      // Compile stage
      const compiler = paths.gcc;
      const compileArgs = ['-O2', srcPath, '-o', binPath];

      const compileResult = await runProcess(compiler, compileArgs, {
        cwd: tempDir,
        timeoutMs: 10000
      });

      if (compileResult.exitCode !== 0) {
        return {
          success: false,
          stage: 'compilation',
          language: 'c',
          stdout: compileResult.stdout,
          stderr: compileResult.stderr || 'Compilation failed with error(s).',
          exitCode: compileResult.exitCode,
          executionTimeMs: Date.now() - startTime
        };
      }

      // Execution stage
      const runResult = await runProcess(binPath, args, {
        cwd: tempDir,
        stdin,
        timeoutMs
      });

      return {
        success: runResult.exitCode === 0,
        stage: 'execution',
        language: 'c',
        stdout: runResult.stdout,
        stderr: runResult.stderr,
        exitCode: runResult.exitCode,
        executionTimeMs: Date.now() - startTime
      };
    }

    // 2. PYTHON EXECUTION
    if (lang === 'python' || lang === 'py') {
      const scriptName = filename || 'script.py';
      const scriptPath = path.join(tempDir, scriptName);
      fs.writeFileSync(scriptPath, code, 'utf8');

      // -u ensures unbuffered stdout and stderr
      const pyArgs = ['-u', scriptPath, ...args];
      const runResult = await runProcess(paths.python, pyArgs, {
        cwd: tempDir,
        stdin,
        timeoutMs
      });

      return {
        success: runResult.exitCode === 0,
        stage: 'execution',
        language: 'python',
        stdout: runResult.stdout,
        stderr: runResult.stderr,
        exitCode: runResult.exitCode,
        executionTimeMs: Date.now() - startTime
      };
    }

    // 3. JAVASCRIPT / NODE EXECUTION
    if (lang === 'javascript' || lang === 'js' || lang === 'node') {
      const scriptName = filename || 'index.mjs';
      const scriptPath = path.join(tempDir, scriptName);
      fs.writeFileSync(scriptPath, code, 'utf8');

      const nodeArgs = [scriptPath, ...args];
      const runResult = await runProcess(paths.node, nodeArgs, {
        cwd: tempDir,
        stdin,
        timeoutMs
      });

      return {
        success: runResult.exitCode === 0,
        stage: 'execution',
        language: 'javascript',
        stdout: runResult.stdout,
        stderr: runResult.stderr,
        exitCode: runResult.exitCode,
        executionTimeMs: Date.now() - startTime
      };
    }

    // 4. BASH EXECUTION
    if (lang === 'bash' || lang === 'sh' || lang === 'shell') {
      const scriptName = filename || 'script.sh';
      const scriptPath = path.join(tempDir, scriptName);
      // Ensure UNIX LF line endings for bash scripts
      const unixCode = code.replace(/\r\n/g, '\n');
      fs.writeFileSync(scriptPath, unixCode, 'utf8');

      const bashArgs = [scriptPath, ...args];
      const runResult = await runProcess(paths.bash, bashArgs, {
        cwd: tempDir,
        stdin,
        timeoutMs,
        env: process.env
      });

      return {
        success: runResult.exitCode === 0,
        stage: 'execution',
        language: 'bash',
        stdout: runResult.stdout,
        stderr: runResult.stderr,
        exitCode: runResult.exitCode,
        executionTimeMs: Date.now() - startTime
      };
    }

    // 5. REACT / JSX EXECUTION & TRANSPILATION
    if (lang === 'react' || lang === 'jsx' || lang === 'tsx') {
      let transpiled = '';
      try {
        const esbuild = await import('esbuild');
        const res = esbuild.transformSync(code, {
          loader: lang === 'tsx' ? 'tsx' : 'jsx',
          jsx: 'transform',
          jsxFactory: 'React.createElement',
          jsxFragment: 'React.Fragment'
        });
        transpiled = res.code;
      } catch (err) {
        return {
          success: false,
          stage: 'transpilation',
          language: 'react',
          stdout: '',
          stderr: `React JSX Compilation Error:\n${err.message}`,
          exitCode: 1,
          executionTimeMs: Date.now() - startTime
        };
      }

      // Check component name
      const componentMatch = code.match(/function\s+([A-Za-z0-9_]+)|const\s+([A-Za-z0-9_]+)\s*=/);
      const compName = componentMatch ? (componentMatch[1] || componentMatch[2]) : 'Component';

      const summary = [
        `\x1b[32m✔ [React Sandbox] Compiled successfully!\x1b[0m`,
        `  Component: <${compName} />`,
        `  Target: React 19 JSX Transform`,
        `  Status: Ready for Live Preview`,
        `----------------------------------------`,
        `Transpiled JavaScript Preview (first 10 lines):`,
        transpiled.split('\n').slice(0, 10).join('\n'),
        `----------------------------------------`,
        `\x1b[36mTip: Click 'Preview' tab or use Live Server in HyperionIDE to interact with this component.\x1b[0m`
      ].join('\n');

      return {
        success: true,
        stage: 'transpilation',
        language: 'react',
        stdout: summary,
        stderr: '',
        transpiledCode: transpiled,
        componentName: compName,
        exitCode: 0,
        executionTimeMs: Date.now() - startTime
      };
    }

    // Unsupported language
    return {
      success: false,
      stage: 'unknown',
      language: lang,
      stdout: '',
      stderr: `Unsupported language: '${lang}'. Supported: c, python, javascript, node, bash, react.`,
      exitCode: 1,
      executionTimeMs: Date.now() - startTime
    };

  } catch (err) {
    return {
      success: false,
      stage: 'system',
      language,
      stdout: '',
      stderr: `Sandbox System Error: ${err.message}`,
      exitCode: 1,
      executionTimeMs: Date.now() - startTime
    };
  } finally {
    cleanupDir(tempDir);
  }
}

/**
 * Execute Arbitrary Shell / Terminal Command
 */
export async function executeCommand({
  command,
  cwd,
  virtualFiles = [],
  timeoutMs = 30000
}) {
  const startTime = Date.now();
  const paths = getRuntimePaths();
  const trimmed = (command || '').trim();

  if (!trimmed) {
    return {
      success: true,
      stdout: '',
      stderr: '',
      exitCode: 0,
      executionTimeMs: 0
    };
  }

  // Set up execution directory
  let workDir = cwd ? normalizePath(cwd) : null;
  let isTemp = false;

  if (!workDir || !fs.existsSync(workDir)) {
    // If cwd was a folder name like "portfolio_v1", auto-resolve to host OS path
    if (cwd) {
      const resolved = resolveWorkspacePath({ folderName: cwd });
      if (resolved && fs.existsSync(resolved)) {
        workDir = resolved;
      }
    }
  }

  if (!workDir || !fs.existsSync(workDir)) {
    workDir = createTempDir('hyp_cmd_');
    isTemp = true;
    if (virtualFiles && virtualFiles.length > 0) {
      writeVirtualFiles(workDir, virtualFiles);
    }
  }

  try {
    // Run via Git Bash with access to GCC, Python, Node, and Unix utils
    const bash = paths.bash;
    const isBashAvailable = fs.existsSync(bash);

    let runner;
    let runnerArgs;

    if (isBashAvailable) {
      runner = bash;
      runnerArgs = ['-c', trimmed];
    } else {
      // Fallback to cmd.exe on Windows if bash is absent
      runner = process.env.COMSPEC || 'cmd.exe';
      runnerArgs = ['/c', trimmed];
    }

    const env = {
      ...process.env,
      TERM: 'xterm-256color',
      FORCE_COLOR: '1'
    };

    const res = await runProcess(runner, runnerArgs, {
      cwd: workDir,
      timeoutMs,
      env
    });

    return {
      success: res.exitCode === 0,
      stdout: res.stdout,
      stderr: res.stderr,
      exitCode: res.exitCode,
      executionTimeMs: Date.now() - startTime,
      cwd: workDir
    };

  } catch (err) {
    return {
      success: false,
      stdout: '',
      stderr: `Command execution error: ${err.message}`,
      exitCode: 1,
      executionTimeMs: Date.now() - startTime
    };
  } finally {
    if (isTemp) {
      cleanupDir(workDir);
    }
  }
}

/**
 * Stream command output with chunk callbacks
 */
export function streamCommand({
  command,
  cwd,
  virtualFiles = [],
  onChunk,
  onExit,
  timeoutMs = 60000
}) {
  const paths = getRuntimePaths();
  const trimmed = (command || '').trim();

  let workDir = cwd ? normalizePath(cwd) : null;
  let isTemp = false;

  if (!workDir || !fs.existsSync(workDir)) {
    if (cwd) {
      const resolved = resolveWorkspacePath({ folderName: cwd });
      if (resolved && fs.existsSync(resolved)) {
        workDir = resolved;
      }
    }
  }

  if (!workDir || !fs.existsSync(workDir)) {
    workDir = createTempDir('hyp_stream_');
    isTemp = true;
    if (virtualFiles && virtualFiles.length > 0) {
      writeVirtualFiles(workDir, virtualFiles);
    }
  }

  const bash = paths.bash;
  const runner = fs.existsSync(bash) ? bash : (process.env.COMSPEC || 'cmd.exe');
  const runnerArgs = fs.existsSync(bash) ? ['-c', trimmed] : ['/c', trimmed];

  const child = spawn(runner, runnerArgs, {
    cwd: workDir,
    windowsHide: true,
    env: {
      ...process.env,
      TERM: 'xterm-256color',
      FORCE_COLOR: '1'
    }
  });

  let timer = null;
  if (timeoutMs > 0) {
    timer = setTimeout(() => {
      try {
        child.kill();
        onChunk(`\r\n\x1b[31m[Process timed out after ${timeoutMs / 1000}s]\x1b[0m\r\n`);
      } catch {}
    }, timeoutMs);
  }

  child.stdout?.on('data', (chunk) => {
    onChunk(chunk.toString());
  });

  child.stderr?.on('data', (chunk) => {
    onChunk(chunk.toString());
  });

  child.on('close', (code) => {
    if (timer) clearTimeout(timer);
    if (isTemp) cleanupDir(workDir);
    onExit(code ?? 0);
  });

  child.on('error', (err) => {
    if (timer) clearTimeout(timer);
    if (isTemp) cleanupDir(workDir);
    onChunk(`\r\n\x1b[31mError: ${err.message}\x1b[0m\r\n`);
    onExit(1);
  });

  return {
    kill: () => {
      if (timer) clearTimeout(timer);
      try {
        child.kill();
      } catch {}
      if (isTemp) cleanupDir(workDir);
    }
  };
}

// Helper: Run process and return promise
function runProcess(cmd, args, { cwd, stdin = '', timeoutMs = 15000, env = process.env } = {}) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const child = spawn(cmd, args, {
      cwd,
      windowsHide: true,
      env
    });

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill('SIGKILL');
      } catch {}
    }, timeoutMs);

    if (stdin && child.stdin) {
      child.stdin.write(stdin);
      child.stdin.end();
    }

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) {
        stderr += `\n[Process timed out after ${timeoutMs / 1000} seconds]`;
        resolve({ stdout, stderr, exitCode: 124 });
      } else {
        resolve({ stdout, stderr, exitCode: code ?? 0 });
      }
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      stderr += `\n[Spawn error: ${err.message}]`;
      resolve({ stdout, stderr, exitCode: 1 });
    });
  });
}

/**
 * Normalize Windows / Git Bash / relative paths into a clean absolute filesystem path
 */
export function normalizePath(inputPath) {
  if (!inputPath || typeof inputPath !== 'string') return '';
  let p = inputPath.trim().replace(/^["']|["']$/g, '');
  // Git Bash style: /e/Portfolio/... -> E:\Portfolio\...
  const gitBashDriveMatch = p.match(/^\/([a-zA-Z])\/(.*)$/);
  if (gitBashDriveMatch) {
    p = `${gitBashDriveMatch[1].toUpperCase()}:\\${gitBashDriveMatch[2].replace(/\//g, '\\')}`;
  }
  if (p.startsWith('~')) {
    p = path.join(os.homedir(), p.slice(1));
  }
  return path.resolve(p);
}

/**
 * Get available drive roots on Windows
 */
export function getAvailableDrives() {
  if (process.platform !== 'win32') return ['/'];
  const drives = [];
  for (let i = 65; i <= 90; i++) {
    const letter = String.fromCharCode(i);
    const drivePath = letter + ':\\';
    try {
      if (fs.existsSync(drivePath)) drives.push(drivePath);
    } catch {}
  }
  return drives;
}

/**
 * Auto-resolve opened folder name and sample files to the actual OS path on the host
 */
export function resolveWorkspacePath({ folderName, sampleFiles = [] }) {
  if (!folderName) return null;

  // 1. Check if folderName itself is already an absolute path
  const directPath = normalizePath(folderName);
  if (fs.existsSync(directPath) && fs.statSync(directPath).isDirectory()) {
    return directPath;
  }

  const cleanName = path.basename(folderName).toLowerCase();
  const username = os.userInfo().username;

  // 2. High-probability developer roots
  const prioritizedRoots = [
    'E:\\Portfolio',
    'E:\\',
    'D:\\Rough',
    'D:\\',
    path.join('C:\\Users', username, 'Desktop'),
    path.join('C:\\Users', username, 'Documents'),
    path.join('C:\\Users', username, 'Projects'),
    path.join('C:\\Users', username, 'source\\repos'),
    path.join('C:\\Users', username),
    'C:\\'
  ];

  for (const root of prioritizedRoots) {
    try {
      const candidate = path.join(root, path.basename(folderName));
      if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
        if (sampleFiles.length === 0 || sampleFiles.some((f) => fs.existsSync(path.join(candidate, f)))) {
          return candidate;
        }
      }
    } catch {}
  }

  // 3. Fast scan across discovered drives (1-2 levels)
  const drives = getAvailableDrives();
  for (const drive of drives) {
    try {
      const entries = fs.readdirSync(drive, { withFileTypes: true });
      for (const ent of entries) {
        if (ent.isDirectory() && !ent.name.startsWith('$') && !ent.name.startsWith('.')) {
          const direct = path.join(drive, ent.name);
          if (ent.name.toLowerCase() === cleanName) {
            return direct;
          }
          try {
            const subEntries = fs.readdirSync(direct, { withFileTypes: true });
            for (const sub of subEntries) {
              if (sub.isDirectory() && sub.name.toLowerCase() === cleanName) {
                const subPath = path.join(direct, sub.name);
                if (sampleFiles.length === 0 || sampleFiles.some((f) => fs.existsSync(path.join(subPath, f)))) {
                  return subPath;
                }
              }
            }
          } catch {}
        }
      }
    } catch {}
  }

  return null;
}

/**
 * Validate if a given path exists on disk
 */
export function validatePath(targetPath) {
  if (!targetPath) return { exists: false };
  const resolved = normalizePath(targetPath);
  try {
    if (fs.existsSync(resolved)) {
      const stat = fs.statSync(resolved);
      return {
        exists: true,
        isDirectory: stat.isDirectory(),
        isFile: stat.isFile(),
        path: resolved,
        name: path.basename(resolved)
      };
    }
  } catch {}
  return { exists: false, path: resolved };
}

/**
 * Read local disk directory tree for workspace loading
 */
export function readWorkspaceTree(dirPath, maxDepth = 4, currentDepth = 0) {
  const resolved = normalizePath(dirPath);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    return [];
  }

  const entries = fs.readdirSync(resolved, { withFileTypes: true });
  const nodes = [];

  for (const entry of entries) {
    const relPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const children =
        currentDepth < maxDepth && entry.name !== 'node_modules' && entry.name !== '.git'
          ? readWorkspaceTree(relPath, maxDepth, currentDepth + 1)
          : [];
      nodes.push({
        id: relPath,
        name: entry.name,
        type: 'folder',
        path: relPath,
        children
      });
    } else {
      nodes.push({
        id: relPath,
        name: entry.name,
        type: 'file',
        path: relPath
      });
    }
  }

  return nodes;
}

/**
 * Launch native Windows folder browser dialog
 */
export async function pickNativeFolder() {
  if (process.platform === 'win32') {
    const psCmd = `Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.Description = 'Select Hyperion IDE Workspace'; if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $f.SelectedPath }`;
    try {
      const out = execSync(`powershell -NoProfile -Command "${psCmd}"`, {
        encoding: 'utf8',
        timeout: 60000
      }).trim();
      return out || null;
    } catch (e) {
      console.warn('Native folder dialog canceled or failed:', e.message);
      return null;
    }
  }
  return null;
}
