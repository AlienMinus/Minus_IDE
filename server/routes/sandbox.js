import express from 'express';
import seleniumRouter from './selenium.js';
import fs from 'fs';
import {
  getRuntimesInfo,
  executeCode,
  executeCommand,
  streamCommand,
  killProcessTree,
  resolveWorkspacePath,
  validatePath,
  readWorkspaceTree,
  pickNativeFolder,
  getActivePorts,
  lintCode,
  normalizePath
} from '../sandboxEngine.js';

const router = express.Router();
const activeStreams = new Map();

// Mount Python Selenium Testing Engine router under /selenium
router.use('/selenium', seleniumRouter);

// GET /preview-proxy - In-memory transparent HTML proxy with automation bridge
router.get('/preview-proxy', async (req, res) => {
  const targetUrl = req.query.url || 'http://localhost:5174';
  try {
    let cleanUrl = targetUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'http://' + cleanUrl;
    }
    const parsedTarget = new URL(cleanUrl);
    const targetOrigin = parsedTarget.origin;

    const fetchRes = await fetch(cleanUrl, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': req.headers['user-agent'] || 'HyperionIDE-Preview'
      }
    });

    if (!fetchRes.ok) {
      res.status(fetchRes.status);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(`<h3>Preview Proxy Error: Target returned status ${fetchRes.status}</h3>`);
    }

    // 1. Inject <base href="..."> and synchronous route normalizer in memory
    const targetRoute = (parsedTarget.pathname || '/') + (parsedTarget.search || '') + (parsedTarget.hash || '');
    const headInjections = `
  <base href="${targetOrigin}/">
  <!-- Hyperion IDE Client-Side Route Normalizer (Prevents 404 in BrowserRouter on load/refresh) -->
  <script>
    (function() {
      try {
        var expectedPath = ${JSON.stringify(targetRoute || '/')};
        if (window.location.pathname.startsWith('/api/sandbox/preview-proxy')) {
          window.history.replaceState(null, '', expectedPath);
        }
      } catch (err) {}
    })();
  </script>`;

    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head>\n${headInjections}`);
    } else if (html.includes('<html>')) {
      html = html.replace('<html>', `<html>\n<head>${headInjections}</head>`);
    } else {
      html = `${headInjections}\n${html}`;
    }

    const bridgeScript = `
    <!-- Hyperion IDE In-Memory Automation Bridge (Zero files modified on disk) -->
    <script>
      (function() {
        if (window.__hyperion_bridge_active__) return;
        window.__hyperion_bridge_active__ = true;

        function resolveEl(sel) {
          if (!sel || typeof sel !== 'string') return null;
          try {
            if (sel.startsWith('text:') || sel.startsWith('text=')) {
              const textVal = sel.replace(/^text[:=]\\s*/, '').toLowerCase();
              const all = Array.from(document.querySelectorAll('a, button, span, h1, h2, h3, p, label, li, [role="button"]'));
              for (const el of all) {
                if ((el.innerText || el.textContent || '').trim().toLowerCase() === textVal) return el;
              }
              for (const el of all) {
                if ((el.innerText || el.textContent || '').toLowerCase().includes(textVal)) return el;
              }
              return null;
            }
            if (sel.startsWith('//') || sel.startsWith('(//')) {
              return document.evaluate(sel, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            }
            return document.querySelector(sel);
          } catch (e) { return null; }
        }

        window.addEventListener('message', function(e) {
          if (!e.data || e.data.source !== 'hyperion-selenium') return;
          const { action, selector, value, reqId } = e.data;

          try {
            if (action === 'PING') {
              window.parent.postMessage({ source: 'hyperion-preview', type: 'PONG', url: window.location.href, title: document.title, ready: true }, '*');
              return;
            }

            if (action === 'DUMP_DOM') {
              const items = Array.from(document.querySelectorAll('a, button, input, textarea, select, h1, h2, h3, img, [role="button"]')).map(el => {
                const r = el.getBoundingClientRect();
                return {
                  tagName: el.tagName.toLowerCase(),
                  id: el.id || '',
                  className: el.className || '',
                  text: (el.innerText || el.textContent || '').trim().slice(0, 60),
                  rect: { left: r.left, top: r.top, width: r.width, height: r.height }
                };
              });
              window.parent.postMessage({ source: 'hyperion-preview', reqId, success: true, elements: items }, '*');
              return;
            }

            if (action === 'GET_RECT') {
              const el = resolveEl(selector);
              if (!el) {
                window.parent.postMessage({ source: 'hyperion-preview', reqId, success: false, error: 'Element not found' }, '*');
                return;
              }
              const r = el.getBoundingClientRect();
              window.parent.postMessage({
                source: 'hyperion-preview',
                reqId,
                success: true,
                tagName: el.tagName.toLowerCase(),
                innerText: (el.innerText || el.textContent || '').trim().slice(0, 50),
                rect: { left: r.left, top: r.top, width: r.width, height: r.height }
              }, '*');
              return;
            }

            if (action === 'CLICK') {
              const el = resolveEl(selector);
              if (!el) {
                window.parent.postMessage({ source: 'hyperion-preview', reqId, success: false, error: 'Element not found' }, '*');
                return;
              }
              try { el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }); } catch {}
              const r = el.getBoundingClientRect();
              el.focus?.();
              el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
              el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
              el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, buttons: 1 }));
              el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, buttons: 1 }));
              el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
              el.click?.();
              window.parent.postMessage({
                source: 'hyperion-preview',
                reqId,
                success: true,
                tagName: el.tagName.toLowerCase(),
                rect: { left: r.left, top: r.top, width: r.width, height: r.height }
              }, '*');
              return;
            }

            if (action === 'TYPE') {
              const el = resolveEl(selector);
              if (!el) {
                window.parent.postMessage({ source: 'hyperion-preview', reqId, success: false, error: 'Element not found' }, '*');
                return;
              }
              try { el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }); } catch {}
              const r = el.getBoundingClientRect();
              el.focus?.();
              el.value = value;
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
              window.parent.postMessage({
                source: 'hyperion-preview',
                reqId,
                success: true,
                rect: { left: r.left, top: r.top, width: r.width, height: r.height }
              }, '*');
              return;
            }
          } catch (err) {
            window.parent.postMessage({ source: 'hyperion-preview', reqId, success: false, error: err.message }, '*');
          }
        });

        window.parent.postMessage({ source: 'hyperion-preview', type: 'BRIDGE_READY', url: window.location.href, title: document.title }, '*');
      })();
    </script>
`;

    if (html.includes('</body>')) {
      html = html.replace('</body>', `${bridgeScript}\n</body>`);
    } else {
      html += bridgeScript;
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.send(html);
  } catch (err) {
    res.status(500);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(`<h3>Proxy Error: ${err.message}</h3>`);
  }
});

// GET /workspace/file - Serve local file directly for media preview
router.get('/workspace/file', (req, res) => {
  try {
    const filePath = req.query.path;
    if (!filePath) {
      return res.status(400).json({ error: 'path is required' });
    }
    const resolved = normalizePath(filePath);
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.sendFile(resolved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /workspace/reveal - Reveal file in host OS Explorer / Finder
router.post('/workspace/reveal', (req, res) => {
  try {
    const { path: targetPath } = req.body;
    if (!targetPath) return res.status(400).json({ error: 'path is required' });
    const resolved = normalizePath(targetPath);
    if (process.platform === 'win32') {
      import('child_process').then(({ exec }) => {
        exec(`explorer /select,"${resolved.replace(/\//g, '\\')}"`);
      });
    } else if (process.platform === 'darwin') {
      import('child_process').then(({ exec }) => {
        exec(`open -R "${resolved}"`);
      });
    } else {
      import('child_process').then(({ exec }) => {
        exec(`xdg-open "${resolved}"`);
      });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /workspace/delete - Delete file or folder from disk
router.post('/workspace/delete', (req, res) => {
  try {
    const { path: targetPath } = req.body;
    if (!targetPath) return res.status(400).json({ error: 'path is required' });
    const resolved = normalizePath(targetPath);
    if (fs.existsSync(resolved)) {
      const stat = fs.statSync(resolved);
      if (stat.isDirectory()) {
        fs.rmSync(resolved, { recursive: true, force: true });
      } else {
        fs.unlinkSync(resolved);
      }
      return res.json({ success: true });
    }
    res.json({ success: true, message: 'File did not exist on disk' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /workspace/rename - Rename file or folder on disk
router.post('/workspace/rename', (req, res) => {
  try {
    const { oldPath, newPath } = req.body;
    if (!oldPath || !newPath) return res.status(400).json({ error: 'oldPath and newPath are required' });
    const resolvedOld = normalizePath(oldPath);
    const resolvedNew = normalizePath(newPath);
    if (fs.existsSync(resolvedOld)) {
      fs.renameSync(resolvedOld, resolvedNew);
      return res.json({ success: true });
    }
    res.json({ success: false, error: 'Source file does not exist' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /ports - Query active listening TCP ports
router.get('/ports', (req, res) => {
  try {
    const ports = getActivePorts();
    res.json({ success: true, ports });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, ports: [] });
  }
});

// POST /lint - Run intelligent compiler/interpreter syntax diagnostic
router.post('/lint', (req, res) => {
  try {
    const { language, code, filename } = req.body;
    const result = lintCode({ language, code, filename });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, markers: [] });
  }
});

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
    const { command, cwd, virtualFiles, timeoutMs, profile } = req.body;

    if (typeof command !== 'string') {
      return res.status(400).json({ error: 'Command string is required.' });
    }

    const result = await executeCommand({
      command,
      cwd,
      virtualFiles,
      timeoutMs: timeoutMs || 30000,
      profile
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
  const { streamId: incomingStreamId, command, cwd, virtualFiles, timeoutMs, profile } = req.body;
  console.log('[API] /stream invoked with command:', command);

  if (typeof command !== 'string') {
    return res.status(400).json({ error: 'Command string is required.' });
  }

  const streamId = incomingStreamId || `stream_${Date.now()}`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  let finished = false;

  const runner = streamCommand({
    command,
    cwd,
    virtualFiles,
    timeoutMs: timeoutMs !== undefined ? timeoutMs : 0,
    profile,
    onChunk: (chunk) => {
      if (finished) return;
      res.write(`data: ${JSON.stringify({ type: 'output', data: chunk })}\n\n`);
      if (typeof res.flush === 'function') res.flush();
    },
    onExit: (exitCode) => {
      if (finished) return;
      finished = true;
      activeStreams.delete(streamId);
      res.write(`data: ${JSON.stringify({ type: 'exit', code: exitCode })}\n\n`);
      res.end();
    }
  });

  activeStreams.set(streamId, runner);

  req.on('close', () => {
    if (!finished) {
      finished = true;
      activeStreams.delete(streamId);
      runner.kill();
    }
  });
});

// POST /stdin - Route real-time stdin input to running command
router.post('/stdin', (req, res) => {
  try {
    const { streamId, data } = req.body;
    if (!streamId) {
      return res.status(400).json({ success: false, error: 'streamId is required' });
    }
    const runner = activeStreams.get(streamId);
    if (!runner || typeof runner.writeStdin !== 'function') {
      return res.status(404).json({ success: false, error: 'Active process not found or exited' });
    }
    const ok = runner.writeStdin(data);
    res.json({ success: ok });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /kill - Terminate process by PID
router.post('/kill', (req, res) => {
  try {
    const { pid } = req.body;
    if (pid) {
      killProcessTree(pid);
      return res.json({ success: true, message: `Process ${pid} killed.` });
    }
    res.json({ success: false, error: 'No PID provided' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
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


// POST /curl-proxy - Proxy localhost HTTP requests without CORS restrictions for API testing
router.post('/curl-proxy', async (req, res) => {
  const startTime = Date.now();
  try {
    const { method = 'GET', url, headers = {}, body, timeoutMs = 30000 } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }

    const cleanHeaders = { ...headers };
    delete cleanHeaders['host'];
    delete cleanHeaders['connection'];
    delete cleanHeaders['content-length'];

    // Provide browser-like User-Agent for production APIs that block generic node fetch
    if (!cleanHeaders['user-agent'] && !cleanHeaders['User-Agent']) {
      cleanHeaders['User-Agent'] = 'Hyperion-API-Client/1.0 (Windows NT 10.0; Win64; x64)';
    }

    const fetchOptions = {
      method: method.toUpperCase(),
      headers: cleanHeaders,
      redirect: 'follow',
      signal: AbortSignal.timeout(Math.min(Math.max(Number(timeoutMs) || 30000, 1000), 120000))
    };

    if (body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
      fetchOptions.body = typeof body === 'object' ? JSON.stringify(body) : String(body);
    }

    const response = await fetch(url, fetchOptions);
    const durationMs = Date.now() - startTime;
    const responseHeaders = {};
    response.headers.forEach((val, key) => {
      responseHeaders[key] = val;
    });

    const contentType = response.headers.get('content-type') || '';
    let responseData;
    let rawText = '';

    try {
      rawText = await response.text();
      if (contentType.includes('application/json')) {
        responseData = JSON.parse(rawText);
      } else {
        responseData = rawText;
      }
    } catch {
      responseData = rawText;
    }

    const sizeBytes = Buffer.byteLength(rawText || '', 'utf8');

    res.json({
      success: true,
      status: response.status,
      statusText: response.statusText,
      durationMs,
      sizeBytes,
      headers: responseHeaders,
      data: responseData,
      rawText
    });
  } catch (err) {
    const durationMs = Date.now() - startTime;
    res.json({
      success: false,
      status: 0,
      statusText: 'Connection Failed',
      durationMs,
      error: err.message,
      data: null
    });
  }
});

export default router;
