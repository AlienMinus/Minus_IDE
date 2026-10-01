import express from 'express';
import { getRuntimesInfo, executeCode, executeCommand, streamCommand } from '../sandboxEngine.js';

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

export default router;
