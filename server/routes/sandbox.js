import express from 'express';
import {
  getRuntimesInfo,
  executeCode,
  executeCommand,
  streamCommand,
  resolveWorkspacePath,
  validatePath,
  readWorkspaceTree,
  pickNativeFolder
} from '../sandboxEngine.js';

const router = express.Router();

// GET /status - Sandbox health & available runtimes
router.get('/status', (req, res) => {
  try {
    const info = getRuntimesInfo();
    res.json({
      status: 'online',
      message: 'Hyperion Sandbox Service Active',
      data: info
    });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// POST /workspace/resolve - Auto-resolve host OS path for an opened workspace
router.post('/workspace/resolve', (req, res) => {
  try {
    const { folderName, sampleFiles } = req.body;
    const resolvedPath = resolveWorkspacePath({ folderName, sampleFiles });
    res.json({
      success: !!resolvedPath,
      path: resolvedPath
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /workspace/validate - Check if path exists
router.get('/workspace/validate', (req, res) => {
  try {
    const targetPath = req.query.path;
    const result = validatePath(targetPath);
    res.json(result);
  } catch (err) {
    res.status(500).json({ exists: false, error: err.message });
  }
});

// POST /workspace/pick - Trigger native OS folder browser dialog
router.post('/workspace/pick', async (req, res) => {
  try {
    const selectedPath = await pickNativeFolder();
    res.json({
      success: !!selectedPath,
      path: selectedPath
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /workspace/tree - Load directory tree from host path
router.post('/workspace/tree', (req, res) => {
  try {
    const { path: dirPath, maxDepth } = req.body;
    const tree = readWorkspaceTree(dirPath, maxDepth || 3);
    res.json({
      success: true,
      tree
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /run - Direct code execution (C, Python, JS, Node, Bash, React)
router.post('/run', async (req, res) => {
  try {
    const { language, code, filename, args, stdin, timeoutMs, files } = req.body;

    if (!code && code !== '') {
      return res.status(400).json({ error: 'Code content is required.' });
    }

    const result = await executeCode({
      language,
      code,
      filename,
      args,
      stdin,
      timeoutMs: timeoutMs || 15000,
      files
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      stage: 'server',
      stdout: '',
      stderr: err.message,
      exitCode: 1
    });
  }
});

// POST /command - Direct shell command execution
router.post('/command', async (req, res) => {
  try {
    const { command, cwd, virtualFiles, timeoutMs } = req.body;

    if (typeof command !== 'string') {
      return res.status(400).json({ error: 'Command string is required.' });
    }

    const result = await executeCommand({
      command,
      cwd,
      virtualFiles,
      timeoutMs: timeoutMs || 30000
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      stdout: '',
      stderr: err.message,
      exitCode: 1
    });
  }
});

// POST /stream - Real-time streaming command execution
router.post('/stream', (req, res) => {
  const { command, cwd, virtualFiles, timeoutMs } = req.body;

  if (typeof command !== 'string') {
    return res.status(400).json({ error: 'Command string is required.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const runner = streamCommand({
    command,
    cwd,
    virtualFiles,
    timeoutMs: timeoutMs || 60000,
    onChunk: (chunk) => {
      res.write(`data: ${JSON.stringify({ type: 'output', data: chunk })}\n\n`);
    },
    onExit: (exitCode) => {
      res.write(`data: ${JSON.stringify({ type: 'exit', code: exitCode })}\n\n`);
      res.end();
    }
  });

  req.on('close', () => {
    runner.kill();
  });
});

import { replManager } from '../replEngine.js';

// POST /repl/start - Start interactive REPL session (Python / Node)
router.post('/repl/start', async (req, res) => {
  try {
    const { sessionId, runtime = 'python', cwd } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required.' });
    }
    const session = await replManager.startSession({ sessionId, runtime, cwd });
    res.json({
      success: true,
      data: session
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// POST /repl/eval - Evaluate statement in active REPL session
router.post('/repl/eval', async (req, res) => {
  try {
    const { sessionId, code } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required.' });
    }
    const result = await replManager.evalCode({ sessionId, code });
    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// POST /repl/exit - Terminate active REPL session
router.post('/repl/exit', (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required.' });
    }
    const result = replManager.exitSession(sessionId);
    res.json(result);
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

export default router;
