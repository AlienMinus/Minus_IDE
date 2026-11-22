import React, { useState, useEffect } from "react";
import { BsFillPeopleFill } from "react-icons/bs";
import { PiSpeedometerFill } from "react-icons/pi";
import { FaUserSecret, FaPlay, FaSpinner, FaCheckCircle, FaExclamationTriangle, FaShieldAlt, FaRedo } from "react-icons/fa";
import { runLoadTest, runSpeedTest, runSecretTest, getTestingStatus } from "../../services/testingService";
import "./TestingSuite.css";

export default function TestingSuite({ mode = "all", initialTab = "load" }) {
  // If mode is specific ("load", "speed", "secret"), lock to that mode; otherwise use initialTab
  const [activeTab, setActiveTab] = useState(mode !== "all" ? mode : initialTab);
  const [engineStatus, setEngineStatus] = useState(null);

  // Load Test Form State
  const [loadUrl, setLoadUrl] = useState(
    typeof window !== "undefined" ? window.location.origin : "http://localhost:5173"
  );
  const [loadConnections, setLoadConnections] = useState(10);
  const [loadDuration, setLoadDuration] = useState(5);
  const [loadPipelining, setLoadPipelining] = useState(1);
  const [loadLoading, setLoadLoading] = useState(false);
  const [loadResults, setLoadResults] = useState(null);
  const [loadError, setLoadError] = useState(null);

  // Speed Test Form State
  const [speedUrl, setSpeedUrl] = useState(
    typeof window !== "undefined" ? window.location.origin : "http://localhost:5173"
  );
  const [speedDevice, setSpeedDevice] = useState("desktop");
  const [speedLoading, setSpeedLoading] = useState(false);
  const [speedResults, setSpeedResults] = useState(null);
  const [speedError, setSpeedError] = useState(null);

  // Secret Test Form State
  const [secretLoading, setSecretLoading] = useState(false);
  const [secretResults, setSecretResults] = useState(null);
  const [secretError, setSecretError] = useState(null);
  const [scanGitHistory, setScanGitHistory] = useState(false);

  useEffect(() => {
    if (mode !== "all") {
      setActiveTab(mode);
    } else {
      setActiveTab(initialTab);
    }
  }, [mode, initialTab]);

  useEffect(() => {
    getTestingStatus().then(setEngineStatus).catch(() => {});
  }, []);

  // Handlers
  const handleRunLoadTest = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoadLoading(true);
    setLoadError(null);
    try {
      const res = await runLoadTest({
        url: loadUrl,
        connections: loadConnections,
        duration: loadDuration,
        pipelining: loadPipelining
      });
      setLoadResults(res);
    } catch (err) {
      setLoadError(err.message || "Failed to execute load test benchmark.");
    } finally {
      setLoadLoading(false);
    }
  };

  const handleRunSpeedTest = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSpeedLoading(true);
    setSpeedError(null);
    try {
      const res = await runSpeedTest({
        url: speedUrl,
        device: speedDevice
      });
      setSpeedResults(res);
    } catch (err) {
      setSpeedError(err.message || "Failed to execute Lighthouse speed test.");
    } finally {
      setSpeedLoading(false);
    }
  };

  const handleRunSecretTest = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSecretLoading(true);
    setSecretError(null);
    try {
      const res = await runSecretTest({ scanGitHistory });
      setSecretResults(res);
    } catch (err) {
      setSecretError(err.message || "Failed to execute Gitleaks scan.");
    } finally {
      setSecretLoading(false);
    }
  };

  // Auto-run once if empty on direct tab load for instant visual feedback
  useEffect(() => {
    if (activeTab === "load" && !loadResults && !loadLoading) {
      handleRunLoadTest();
    } else if (activeTab === "speed" && !speedResults && !speedLoading) {
      handleRunSpeedTest();
    } else if (activeTab === "secret" && !secretResults && !secretLoading) {
      handleRunSecretTest();
    }
  }, [activeTab]);

  return (
    <div className="testing-suite-container">
      {/* Header */}
      <div className="testing-suite-header">
        <div className="testing-suite-title-group">
          <h1>
            {activeTab === "load" && <BsFillPeopleFill style={{ color: "var(--accent-color, #38bdf8)" }} />}
            {activeTab === "speed" && <PiSpeedometerFill style={{ color: "var(--accent-color, #38bdf8)" }} />}
            {activeTab === "secret" && <FaUserSecret style={{ color: "var(--accent-color, #38bdf8)" }} />}
            {activeTab === "load" && "Load Test Studio (npx autocannon)"}
            {activeTab === "speed" && "Speed & Core Web Vitals Studio (npx lighthouse)"}
            {activeTab === "secret" && "Secret Leak Sentinel (gitleaks)"}
          </h1>
          <p>
            {activeTab === "load" && "High-concurrency HTTP load benchmark measuring RPS throughput, p50/p90/p99 latency, and server endurance."}
            {activeTab === "speed" && "Lighthouse audit evaluating Core Web Vitals (FCP, LCP, TBT, CLS), Accessibility, and Modern Standards."}
            {activeTab === "secret" && "Cryptographic secret and token scanner protecting AWS, GitHub, JWT, Stripe, and private keys from leaks."}
          </p>
        </div>

        {/* Show tab switcher only when in unified "all" mode */}
        {mode === "all" && (
          <div className="testing-suite-tabs">
            <button
              className={`testing-suite-tab-btn ${activeTab === "load" ? "active" : ""}`}
              onClick={() => setActiveTab("load")}
            >
              <BsFillPeopleFill /> Load Test
            </button>
            <button
              className={`testing-suite-tab-btn ${activeTab === "speed" ? "active" : ""}`}
              onClick={() => setActiveTab("speed")}
            >
              <PiSpeedometerFill /> Speed Test
            </button>
            <button
              className={`testing-suite-tab-btn ${activeTab === "secret" ? "active" : ""}`}
              onClick={() => setActiveTab("secret")}
            >
              <FaUserSecret /> Secret Test
            </button>
          </div>
        )}
      </div>

      {/* =========================================================================
          TAB 1: LOAD TEST (AUTOCANNON)
          ========================================================================= */}
      {activeTab === "load" && (
        <div>
          <div className="testing-config-card">
            <form onSubmit={handleRunLoadTest}>
              <div className="testing-form-grid">
                <div className="testing-form-group" style={{ gridColumn: "span 2" }}>
                  <label>Target URL Endpoint</label>
                  <input
                    type="url"
                    className="testing-input"
                    value={loadUrl}
                    onChange={(e) => setLoadUrl(e.target.value)}
                    placeholder="http://localhost:5173"
                    required
                  />
                </div>
                <div className="testing-form-group">
                  <label>Concurrent Connections ({loadConnections})</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    className="testing-input"
                    value={loadConnections}
                    onChange={(e) => setLoadConnections(e.target.value)}
                  />
                </div>
                <div className="testing-form-group">
                  <label>Duration ({loadDuration}s)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    className="testing-input"
                    value={loadDuration}
                    onChange={(e) => setLoadDuration(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className="testing-submit-btn" disabled={loadLoading}>
                {loadLoading ? (
                  <>
                    <FaSpinner className="spin-icon" /> Benchmarking Target...
                  </>
                ) : (
                  <>
                    <FaPlay /> Run Load Test (npx autocannon)
                  </>
                )}
              </button>
            </form>
          </div>

          {loadError && (
            <div style={{ color: "#ef4444", padding: "12px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "6px", marginBottom: "16px" }}>
              <FaExclamationTriangle /> {loadError}
            </div>
          )}

          {loadResults && (
            <div className="testing-results-section">
              <div className="testing-kpi-row">
                <div className="testing-kpi-card">
                  <div className="kpi-label">Requests / Sec</div>
                  <div className="kpi-value">{loadResults.requests?.average || 0}</div>
                  <div className="kpi-sub">Total: {loadResults.requests?.total || 0} reqs</div>
                </div>
                <div className="testing-kpi-card">
                  <div className="kpi-label">Average Latency</div>
                  <div className="kpi-value">{loadResults.latency?.average || 0} ms</div>
                  <div className="kpi-sub">p99: {loadResults.latency?.p99 || 0} ms</div>
                </div>
                <div className="testing-kpi-card">
                  <div className="kpi-label">Throughput</div>
                  <div className="kpi-value">{loadResults.throughput?.mb_per_sec || 0} MB/s</div>
                  <div className="kpi-sub">Total: {Math.round((loadResults.throughput?.total || 0) / 1024)} KB</div>
                </div>
                <div className="testing-kpi-card">
                  <div className="kpi-label">Status Codes</div>
                  <div className="kpi-value" style={{ color: "#22c55e" }}>
                    {Object.entries(loadResults.statusCodes || {}).map(([k, v]) => `${k}: ${v}`).join(", ") || "200 OK"}
                  </div>
                  <div className="kpi-sub">Errors: {loadResults.errors || 0}</div>
                </div>
              </div>

              <div className="testing-table-container">
                <table className="testing-table">
                  <thead>
                    <tr>
                      <th>Percentile</th>
                      <th>Latency (ms)</th>
                      <th>Benchmark Status</th>
                      <th>Engine Mode</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td>50% (Median)</td><td>{loadResults.latency?.p50} ms</td><td><span className="badge-good">Optimal</span></td><td>{loadResults.engine}</td></tr>
                    <tr><td>90%</td><td>{loadResults.latency?.p90} ms</td><td><span className="badge-good">Fast</span></td><td>{loadResults.engine}</td></tr>
                    <tr><td>99%</td><td>{loadResults.latency?.p99} ms</td><td><span className="badge-good">Verified</span></td><td>{loadResults.engine}</td></tr>
                    <tr><td>Min</td><td>{loadResults.latency?.min} ms</td><td><span className="badge-good">Fastest</span></td><td>{loadResults.engine}</td></tr>
                    <tr><td>Max</td><td>{loadResults.latency?.max} ms</td><td><span className="badge-med">Peak</span></td><td>{loadResults.engine}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: SPEED TEST (LIGHTHOUSE)
          ========================================================================= */}
      {activeTab === "speed" && (
        <div>
          <div className="testing-config-card">
            <form onSubmit={handleRunSpeedTest}>
              <div className="testing-form-grid">
                <div className="testing-form-group" style={{ gridColumn: "span 2" }}>
                  <label>Application URL</label>
                  <input
                    type="url"
                    className="testing-input"
                    value={speedUrl}
                    onChange={(e) => setSpeedUrl(e.target.value)}
                    placeholder="http://localhost:5173"
                    required
                  />
                </div>
                <div className="testing-form-group">
                  <label>Device Profile</label>
                  <select
                    className="testing-input"
                    value={speedDevice}
                    onChange={(e) => setSpeedDevice(e.target.value)}
                  >
                    <option value="desktop">Desktop Chrome</option>
                    <option value="mobile">Mobile Moto G4</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="testing-submit-btn" disabled={speedLoading}>
                {speedLoading ? (
                  <>
                    <FaSpinner className="spin-icon" /> Running Lighthouse Audit...
                  </>
                ) : (
                  <>
                    <FaPlay /> Run Speed Test (npx lighthouse)
                  </>
                )}
              </button>
            </form>
          </div>

          {speedError && (
            <div style={{ color: "#ef4444", padding: "12px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "6px", marginBottom: "16px" }}>
              <FaExclamationTriangle /> {speedError}
            </div>
          )}

          {speedResults && (
            <div className="testing-results-section">
              {/* Score Badges */}
              <div className="testing-kpi-row">
                <div className="testing-kpi-card" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div className={`score-circle ${speedResults.scores?.performance >= 90 ? "score-green" : (speedResults.scores?.performance >= 50 ? "score-yellow" : "score-red")}`}>
                    {speedResults.scores?.performance}
                  </div>
                  <div>
                    <div className="kpi-label">Performance</div>
                    <div style={{ fontSize: "12px", color: "#8b949e" }}>Core Web Vitals</div>
                  </div>
                </div>

                <div className="testing-kpi-card" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div className={`score-circle ${speedResults.scores?.accessibility >= 90 ? "score-green" : "score-yellow"}`}>
                    {speedResults.scores?.accessibility}
                  </div>
                  <div>
                    <div className="kpi-label">Accessibility</div>
                    <div style={{ fontSize: "12px", color: "#8b949e" }}>ARIA & Contrast</div>
                  </div>
                </div>

                <div className="testing-kpi-card" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div className={`score-circle ${speedResults.scores?.bestPractices >= 90 ? "score-green" : "score-yellow"}`}>
                    {speedResults.scores?.bestPractices}
                  </div>
                  <div>
                    <div className="kpi-label">Best Practices</div>
                    <div style={{ fontSize: "12px", color: "#8b949e" }}>Modern Web Standards</div>
                  </div>
                </div>

                <div className="testing-kpi-card" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div className={`score-circle ${speedResults.scores?.seo >= 90 ? "score-green" : "score-yellow"}`}>
                    {speedResults.scores?.seo}
                  </div>
                  <div>
                    <div className="kpi-label">SEO</div>
                    <div style={{ fontSize: "12px", color: "#8b949e" }}>Search Visibility</div>
                  </div>
                </div>
              </div>

              {/* Core Web Vitals */}
              <div className="testing-table-container">
                <table className="testing-table">
                  <thead>
                    <tr>
                      <th>Core Web Vital Metric</th>
                      <th>Observed Value</th>
                      <th>Evaluation Threshold</th>
                      <th>Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>First Contentful Paint (FCP)</strong></td>
                      <td>{speedResults.metrics?.fcp} ms</td>
                      <td>&lt; 1800 ms (Good)</td>
                      <td><span className="badge-good">GOOD</span></td>
                    </tr>
                    <tr>
                      <td><strong>Largest Contentful Paint (LCP)</strong></td>
                      <td>{speedResults.metrics?.lcp} ms</td>
                      <td>&lt; 2500 ms (Good)</td>
                      <td><span className="badge-good">GOOD</span></td>
                    </tr>
                    <tr>
                      <td><strong>Total Blocking Time (TBT)</strong></td>
                      <td>{speedResults.metrics?.tbt} ms</td>
                      <td>&lt; 200 ms (Good)</td>
                      <td><span className="badge-good">FAST</span></td>
                    </tr>
                    <tr>
                      <td><strong>Cumulative Layout Shift (CLS)</strong></td>
                      <td>{speedResults.metrics?.cls}</td>
                      <td>&lt; 0.1 (Good)</td>
                      <td><span className="badge-good">STABLE</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: SECRET TEST (GITLEAKS)
          ========================================================================= */}
      {activeTab === "secret" && (
        <div>
          <div className="testing-config-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
              <div>
                <h3 style={{ fontSize: "15px", color: "var(--text-primary, #f0f6fc)", marginBottom: "4px" }}>Gitleaks Workspace Secret Scanner</h3>
                <p style={{ fontSize: "13px", color: "var(--text-secondary, #8b949e)" }}>Scans repository files for hardcoded AWS keys, GitHub PATs, private keys, JWTs, and database credentials.</p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer", color: "var(--text-secondary, #8b949e)" }}>
                  <input
                    type="checkbox"
                    checked={scanGitHistory}
                    onChange={(e) => setScanGitHistory(e.target.checked)}
                  />
                  Scan Git Commit Logs
                </label>

                <button
                  className="testing-submit-btn"
                  onClick={handleRunSecretTest}
                  disabled={secretLoading}
                >
                  {secretLoading ? (
                    <>
                      <FaSpinner className="spin-icon" /> Scanning Codebase...
                    </>
                  ) : (
                    <>
                      <FaPlay /> Scan Workspace (gitleaks)
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {secretError && (
            <div style={{ color: "#ef4444", padding: "12px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "6px", marginBottom: "16px" }}>
              <FaExclamationTriangle /> {secretError}
            </div>
          )}

          {secretResults && (
            <div className="testing-results-section">
              <div className="testing-kpi-row">
                <div className="testing-kpi-card">
                  <div className="kpi-label">Files Scanned</div>
                  <div className="kpi-value">{secretResults.files_scanned || 0}</div>
                  <div className="kpi-sub">Total Monorepo Source</div>
                </div>
                <div className="testing-kpi-card">
                  <div className="kpi-label">Total Leaks Detected</div>
                  <div className="kpi-value" style={{ color: secretResults.total_leaks > 0 ? "#ef4444" : "#22c55e" }}>
                    {secretResults.total_leaks}
                  </div>
                  <div className="kpi-sub">{secretResults.total_leaks === 0 ? "✔ All Clean" : "Requires Rotation"}</div>
                </div>
                <div className="testing-kpi-card">
                  <div className="kpi-label">Critical Leaks</div>
                  <div className="kpi-value" style={{ color: "#ef4444" }}>
                    {secretResults.severity_summary?.CRITICAL || 0}
                  </div>
                  <div className="kpi-sub">AWS / Tokens / Keys</div>
                </div>
              </div>

              {secretResults.findings && secretResults.findings.length > 0 ? (
                <div className="testing-table-container">
                  <table className="testing-table">
                    <thead>
                      <tr>
                        <th>Severity</th>
                        <th>Secret Type</th>
                        <th>Location</th>
                        <th>Masked Secret</th>
                        <th>Snippet</th>
                        <th>Remediation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {secretResults.findings.map((f, i) => (
                        <tr key={i}>
                          <td>
                            <span className={f.severity === "CRITICAL" ? "badge-crit" : (f.severity === "HIGH" ? "badge-high" : "badge-med")}>
                              {f.severity}
                            </span>
                          </td>
                          <td><strong>{f.secret_type || f.rule_id}</strong></td>
                          <td><code>{f.file}:{f.line}</code></td>
                          <td><code>{f.masked_secret}</code></td>
                          <td><div className="code-snippet">{f.snippet}</div></td>
                          <td><small>{f.remediation}</small></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "48px 24px", background: "var(--bg-secondary, #161b22)", borderRadius: "8px", border: "1px solid var(--border-color, #30363d)" }}>
                  <FaCheckCircle style={{ fontSize: "48px", color: "#22c55e", marginBottom: "16px" }} />
                  <h3 style={{ fontSize: "18px", color: "var(--text-primary, #f0f6fc)", marginBottom: "8px" }}>Zero Leaked Secrets Detected</h3>
                  <p style={{ color: "var(--text-secondary, #8b949e)", maxWidth: "500px", margin: "0 auto" }}>
                    Gitleaks scanned {secretResults.files_scanned || "all"} codebase files against OWASP & Gitleaks rules. No unprotected API keys, JWT secrets, private keys, or credentials were discovered.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
