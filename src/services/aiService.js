const API_BASE = typeof window !== 'undefined' ? '/api/ai' : 'http://localhost:3000/api/ai';

export async function sendChatMessage(messages, model = 'meta-llama/Llama-3.1-8B-Instruct', mode = 'security', file = null) {
  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, model, mode, file })
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    return {
      success: false,
      error: err.message,
      message: `**Cypher Security Warning:** Failed to connect to AI service (${err.message}). Please verify the backend server on port 3000.`
    };
  }
}

export async function runSecurityScan(code, filename, language) {
  try {
    const res = await fetch(`${API_BASE}/security-scan`, {
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
    const res = await fetch(`${API_BASE}/status`);
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
