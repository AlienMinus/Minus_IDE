// server/routes/selenium.js
import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FASTAPI_URL = process.env.FASTAPI_BACKEND_URL || 'http://127.0.0.1:8000';
let pythonProcess = null;

// Determine best python executable (prefer backend/venv)
function getPythonExecutable() {
  const venvPythonWin = path.join(__dirname, '..', '..', 'backend', 'venv', 'Scripts', 'python.exe');
  const venvPythonNix = path.join(__dirname, '..', '..', 'backend', 'venv', 'bin', 'python');
  if (fs.existsSync(venvPythonWin)) return venvPythonWin;
  if (fs.existsSync(venvPythonNix)) return venvPythonNix;
  return 'python';
}

// Ensure FastAPI production server is running
async function ensureFastAPIRunning() {
  try {
    const res = await fetch(`${FASTAPI_URL}/health`, { signal: AbortSignal.timeout(1200) });
    if (res.ok) return true;
  } catch {
    // Service not responding yet
  }

  if (pythonProcess && !pythonProcess.killed) {
    return false;
  }

  try {
    const pyExe = getPythonExecutable();
    const mainScript = path.join(__dirname, '..', '..', 'backend', 'main.py');
    const projectRoot = path.join(__dirname, '..', '..');

    pythonProcess = spawn(pyExe, [mainScript], {
      cwd: projectRoot,
      detached: true,
      stdio: 'ignore'
    });
    pythonProcess.unref();
    await new Promise((r) => setTimeout(r, 2000));
    return true;
  } catch (err) {
    console.warn('[SeleniumProxy] Failed to auto-spawn FastAPI backend:', err.message);
    return false;
  }
}

// Proxy all requests under /selenium/* to FastAPI backend
router.use(async (req, res) => {
  const subPath = req.path || '/status';
  // FastAPI router exposes both /status and /api/selenium/status
  const targetUrl = `${FASTAPI_URL}/api/selenium${subPath.startsWith('/') ? subPath : '/' + subPath}`;

  try {
    const fetchOptions = {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(90000)
    };

    if (['POST', 'PUT', 'PATCH'].includes(req.method.toUpperCase()) && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    let response;
    try {
      response = await fetch(targetUrl, fetchOptions);
    } catch {
      // If failed, try to ensure running and retry once
      await ensureFastAPIRunning();
      response = await fetch(targetUrl, fetchOptions);
    }

    const contentType = response.headers.get('content-type') || 'application/json';
    const data = await response.text();

    res.status(response.status);
    res.setHeader('Content-Type', contentType);
    return res.send(data);
  } catch (err) {
    return res.status(502).json({
      success: false,
      error: `FastAPI Python Selenium Backend (${FASTAPI_URL}) unavailable: ${err.message}`,
      hint: 'Ensure Python FastAPI backend is running: backend/venv/Scripts/python backend/main.py'
    });
  }
});

export default router;
