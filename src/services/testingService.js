/**
 * Hyperion IDE - Advanced Testing Services Client
 * Interfaces with backend endpoints for Autocannon, Lighthouse, and Gitleaks.
 */

const API_BASE = "/api/testing";

export async function runLoadTest({ url, connections = 10, duration = 5, pipelining = 1 }) {
  const res = await fetch(`${API_BASE}/load-test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, connections: Number(connections), duration: Number(duration), pipelining: Number(pipelining) }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Load test failed with status ${res.status}`);
  }
  const json = await res.json();
  return json.data;
}

export async function runSpeedTest({ url, device = "desktop" }) {
  const res = await fetch(`${API_BASE}/speed-test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, device }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Speed test failed with status ${res.status}`);
  }
  const json = await res.json();
  return json.data;
}

export async function runSecretTest({ workspacePath = null, scanGitHistory = false } = {}) {
  const res = await fetch(`${API_BASE}/secret-test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workspacePath, scanGitHistory }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Secret test failed with status ${res.status}`);
  }
  const json = await res.json();
  return json.data;
}

export async function getTestingStatus() {
  const res = await fetch(`${API_BASE}/status`);
  if (!res.ok) throw new Error("Failed to fetch testing engine status");
  return res.json();
}
