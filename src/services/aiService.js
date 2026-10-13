const API_BASE = typeof window !== 'undefined' ? '/api/ai' : 'http://localhost:3000/api/ai';

export async function sendChatMessage(messages, model = 'meta-llama/Llama-3.1-8B-Instruct', mode = 'security') {
  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, model, mode })
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
