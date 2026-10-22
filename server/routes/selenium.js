// server/routes/selenium.js
import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PYTHON_SELENIUM_URL = process.env.SELENIUM_BACKEND_URL || 'http://127.0.0.1:5006';
let pythonProcess = null;

// Ensure Python Selenium backend daemon is running
async function ensurePythonSeleniumRunning() {
  try {
    const res = await fetch(`${PYTHON_SELENIUM_URL}/status`, { signal: AbortSignal.timeout(1200) });
    if (res.ok) return true;
  } catch {
    // Service not responding yet, attempt spawn
  }

  if (pythonProcess && !pythonProcess.killed) {
    return false;
  }

  try {
    const scriptPath = path.join(__dirname, '..', 'selenium_service.py');
    pythonProcess = spawn('python', [scriptPath], {
      detached: true,
      stdio: 'ignore'
    });
    pythonProcess.unref();
    // Wait briefly for server startup
    await new Promise((r) => setTimeout(r, 1500));
    return true;
  } catch (err) {
    console.warn('[SeleniumProxy] Failed to auto-spawn python selenium_service:', err.message);
    return false;
  }
}

// Proxy all requests under /selenium/* to Python backend
router.all('*', async (req, res) => {
  const subPath = req.path || '/status';
  const targetUrl = `${PYTHON_SELENIUM_URL}${subPath}`;

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
    } catch (err) {
      // If failed, try to ensure running and retry once
      await ensurePythonSeleniumRunning();
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
      error: `Python Selenium Backend (port 5006) unavailable: ${err.message}`,
      hint: 'Ensure Python Selenium backend is running: python server/selenium_service.py'
    });
  }
});

export default router;

