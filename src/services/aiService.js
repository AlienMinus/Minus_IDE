/**
 * Hyperion IDE - AI & Code Intelligence Service
 * Connects frontend UI to Node Express (port 3000) and FastAPI Python Backend (port 8000).
 * Supports real local Qwen 2.5 Coder offline execution, code explanation, bug fixing, and security scanning.
 */

const API_BASE = typeof window !== 'undefined' ? '/api/ai' : 'http://localhost:3000/api/ai';
const PYTHON_FASTAPI_BASE = 'http://127.0.0.1:8000/api/ai';

/**
 * Resilient multi-tier request helper:
 * 1. Tries primary endpoint (Express server proxy or Vite proxy)
 * 2. Falls back to direct FastAPI Python backend on port 8000 if primary is unreachable
 */
async function resilientFetch(endpoint, options = {}, preferPython = false) {
  const primaryUrl = preferPython ? `${PYTHON_FASTAPI_BASE}${endpoint}` : `${API_BASE}${endpoint}`;
  const fallbackUrl = preferPython ? `${API_BASE}${endpoint}` : `${PYTHON_FASTAPI_BASE}${endpoint}`;

  try {
    const res = await fetch(primaryUrl, options);
    if (res.ok) return res;
    // If primary returned a gateway/server error, attempt fallback
    if ([404, 502, 503, 504].includes(res.status)) {
      try {
        const fbRes = await fetch(fallbackUrl, options);
        if (fbRes.ok) return fbRes;
      } catch {}
    }
    return res;
  } catch (primaryErr) {
    // Network unreachable or connection refused: try direct fallback
    try {
      const fbRes = await fetch(fallbackUrl, options);
      return fbRes;
    } catch {
      throw primaryErr;
    }
  }
}

export async function sendChatMessage(messages, model = 'meta-llama/Llama-3.1-8B-Instruct', mode = 'security', file = null) {
  const isLocalQwen = model === 'qwen-local' || (typeof model === 'string' && model.toLowerCase().includes('qwen-local'));

  try {
    const res = await resilientFetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, model, mode, file })
    }, isLocalQwen);

    if (!res.ok) {
      const errText = await res.text();
      let parsedErr = errText;
      try {
        const json = JSON.parse(errText);
        parsedErr = json.detail || json.error || errText;
      } catch {}
      throw new Error(parsedErr || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    return {
      success: false,
      error: err.message,
      message: `**Cypher Security Warning:** Failed to connect to AI service (${err.message}). Please verify the backend servers (Port 3000 / FastAPI Port 8000).`
    };
  }
}

export async function runSecurityScan(code, filename, language) {
  try {
    const res = await resilientFetch('/security-scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, filename, language })
    });
    return await res.json();
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
}

export async function getAiStatus() {
  try {
    const res = await resilientFetch('/status');
    return await res.json();
  } catch {
    return { success: false, hfConfigured: false, models: [] };
  }
}

export async function getCodebaseFiles(workspacePath = null) {
  try {
    const url = workspacePath
      ? `${API_BASE}/codebase-files?workspacePath=${encodeURIComponent(workspacePath)}`
      : `${API_BASE}/codebase-files`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message, files: [] };
  }
}

export async function scanCodebaseFile(filePath, workspacePath = null, code = null, filename = null) {
  try {
    const res = await fetch(`${API_BASE}/scan-codebase-file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath, workspacePath, code, filename })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return {
      success: false,
      error: err.message,
      findings: [],
      riskLevel: 'LOW',
      counts: { critical: 0, high: 0, medium: 0, low: 0, total: 0 }
    };
  }
}

/**
 * Explain Code using Local Qwen Coder
 */
export async function explainCode(code, filename = 'active_file', prompt = '') {
  try {
    const res = await resilientFetch('/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, filename, prompt, mode: 'explain' })
    }, true);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Fix and Harden Code using Local Qwen Coder
 */
export async function fixCode(code, filename = 'active_file', prompt = '') {
  try {
    const res = await resilientFetch('/fix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, filename, prompt, mode: 'fix' })
    }, true);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Generate Code using Local Qwen Coder
 */
export async function generateCode(prompt, language = 'javascript') {
  try {
    const res = await resilientFetch('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, language, mode: 'generate' })
    }, true);
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}
