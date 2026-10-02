import "./BottomPanel.css";
import { useState, useEffect, useCallback } from "react";
import Terminal from "../Terminal";
import Output from "../Output/Output";
import Repl from "../Repl/Repl";
import useTerminal from "../../hooks/useTerminal";
import useEditor from "../../hooks/useEditor";
import { getActivePorts } from "../../services/sandboxService";
import {
  FaPlay,
  FaStop,
  FaColumns,
  FaTrashAlt,
  FaTrash,
  FaPlus,
  FaTimes,
  FaCheckCircle,
  FaSpinner,
  FaGlobe,
  FaRedo,
  FaExternalLinkAlt,
  FaSearch,
  FaTimesCircle,
  FaExclamationTriangle
} from "react-icons/fa";

/**
 * Intelligent Problems & Diagnostics View
 */
function ProblemsView({ problems = [], jumpToProblem }) {
  const [filter, setFilter] = useState("");

  const filtered = problems.filter(
    (p) =>
      (p.message && p.message.toLowerCase().includes(filter.toLowerCase())) ||
      (p.filename && p.filename.toLowerCase().includes(filter.toLowerCase()))
  );

  const grouped = filtered.reduce((acc, p) => {
    const key = p.filename || "Workspace";
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  return (
    <div className="problems-panel-container">
      <div className="problems-panel-toolbar">
        <div className="problems-search-box">
          <FaSearch className="problems-search-icon" />
          <input
            type="text"
            placeholder="Filter problems (e.g. semicolon, main.c)..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          {filter && (
            <button className="problems-clear-btn" onClick={() => setFilter("")}>
              <FaTimes />
            </button>
          )}
        </div>
        <span className="problems-summary-badge">
          {problems.length} problem{problems.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="problems-list-container">
        {problems.length === 0 ? (
          <div className="problems-empty-state">
            <FaCheckCircle className="problems-ok-icon" />
            <p>No problems have been detected in the workspace.</p>
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="problems-empty-state">
            <p>No problems match filter "{filter}"</p>
          </div>
        ) : (
          Object.entries(grouped).map(([filename, fileProblems]) => (
            <div key={filename} className="problems-group">
              <div className="problems-group-header">
                <span className="problems-group-title">📄 {filename}</span>
                <span className="problems-group-count">{fileProblems.length}</span>
              </div>
              {fileProblems.map((prob, idx) => (
                <div
                  key={prob.id || idx}
                  className={`problem-row ${prob.severity === 8 ? "error" : "warning"}`}
                  onClick={() => jumpToProblem && jumpToProblem(prob)}
                  title="Click to jump to line in editor"
                >
                  <span className="problem-severity-icon">
                    {prob.severity === 8 ? (
                      <FaTimesCircle className="icon-error" />
                    ) : (
                      <FaExclamationTriangle className="icon-warning" />
                    )}
                  </span>
                  <span className="problem-text">{prob.message}</span>
                  <span className="problem-source-tag">[{prob.source || "syntax"}]</span>
                  <span className="problem-coords">
                    Ln {prob.startLineNumber || prob.lineNumber || 1}, Col {prob.startColumn || prob.column || 1}
                  </span>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Real-time Active Ports Scanner & Manager
 */
function PortsView({ openLiveBrowserTab }) {
  const [ports, setPorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [forwardPortInput, setForwardPortInput] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const fetchPorts = useCallback(async () => {
    try {
      const list = await getActivePorts();
      setPorts(list);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPorts();
    const timer = setInterval(fetchPorts, 4000);
    return () => clearInterval(timer);
  }, [fetchPorts]);

  const handleAddForward = (e) => {
    e.preventDefault();
    const portNum = parseInt(forwardPortInput, 10);
    if (portNum && portNum > 0 && portNum <= 65535) {
      setPorts((prev) => {
        if (prev.some((p) => p.port === portNum)) return prev;
        return [
          ...prev,
          {
            port: portNum,
            protocol: "HTTP",
            process: "User Forwarded",
            origin: `Port ${portNum} (Manual)`,
            address: `http://localhost:${portNum}`,
            status: "LISTENING",
            isLocal: true
          }
        ];
      });
      setForwardPortInput("");
      setIsAdding(false);
    }
  };

  const filteredPorts = ports.filter(
    (p) =>
      String(p.port).includes(filter) ||
      (p.origin && p.origin.toLowerCase().includes(filter.toLowerCase())) ||
      (p.process && p.process.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div className="ports-panel-container">
      <div className="ports-toolbar">
        <div className="ports-search-box">
          <FaSearch className="ports-search-icon" />
          <input
            type="text"
            placeholder="Filter ports or origin..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        <button
          className="ports-action-btn"
          onClick={() => setIsAdding((prev) => !prev)}
          title="Forward a local port"
        >
          <FaPlus /> Forward a Port
        </button>

        <button
          className="ports-action-btn"
          onClick={() => {
            setLoading(true);
            fetchPorts();
          }}
          title="Refresh active listening ports"
        >
          <FaRedo className={loading ? "spin-icon" : ""} /> Refresh
        </button>
      </div>

      {isAdding && (
        <form className="ports-add-form" onSubmit={handleAddForward}>
          <span>Port Number:</span>
          <input
            type="number"
            min="1"
            max="65535"
            placeholder="e.g. 8080"
            value={forwardPortInput}
            onChange={(e) => setForwardPortInput(e.target.value)}
            autoFocus
          />
          <button type="submit" className="ports-confirm-btn">Add</button>
          <button type="button" className="ports-cancel-btn" onClick={() => setIsAdding(false)}>Cancel</button>
        </form>
      )}

      <div className="ports-table-wrapper">
        <table className="ports-table">
          <thead>
            <tr>
              <th>Port</th>
              <th>Protocol</th>
              <th>Process / Service</th>
              <th>Local Address</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPorts.length === 0 ? (
              <tr>
                <td colSpan="6" className="ports-empty-row">
                  {loading ? "Scanning active ports..." : "No active listening ports match filter."}
                </td>
              </tr>
            ) : (
              filteredPorts.map((p) => (
                <tr key={p.port}>
                  <td className="port-number-cell">
                    <span className="port-dot">●</span>
                    <strong>{p.port}</strong>
                  </td>
                  <td>{p.protocol || "HTTP"}</td>
                  <td className="port-origin-cell">
                    <span className="port-origin-badge">{p.origin || p.process}</span>
                  </td>
                  <td>
                    <span
                      className="port-address-link"
                      onClick={() => openLiveBrowserTab && openLiveBrowserTab(p.address, `Preview: Port ${p.port}`)}
                      title="Open in VS Code Live Browser"
                    >
                      {p.address}
                    </span>
                  </td>
                  <td>
                    <span className="port-status-badge">
                      {p.status || "LISTENING"}
                    </span>
                  </td>
                  <td className="port-actions-cell">
                    <button
                      className="port-inline-btn"
                      onClick={() => openLiveBrowserTab && openLiveBrowserTab(p.address, `Preview: Port ${p.port}`)}
                      title="Open in Live Preview Editor"
                    >
                      <FaGlobe /> Preview
                    </button>
                    <button
                      className="port-inline-btn"
                      onClick={() => window.open(p.address, "_blank", "noopener,noreferrer")}
                      title="Open in External Browser"
                    >
                      <FaExternalLinkAlt />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BottomPanel() {
  const tabs = [
    "Terminal",
    "Output",
    "Problems",
    "Debug Console",
    "Ports",
    "REPL"
  ];

  const [activeTab, setActiveTab] = useState("Terminal");

  const {
    activeTerminal,
    terminals,
    createTerminal,
    executeCommand,
    runActiveFile,
    killTerminal,
    terminateTask,
    splitTerminal,
    isRunning,
    setActiveTerminal
  } = useTerminal();

  const { openLiveBrowserTab, problems = [], jumpToProblem } = useEditor();

  const handleOpenBrowserPreview = () => {
    const outputText = (activeTerminal?.output || []).join("\n");
    const match = outputText.match(/https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(?:\/[^\s\x1b"'\)\]>]*)*/i);
    const targetUrl = match ? match[0] : "http://localhost:5173";
    if (openLiveBrowserTab) {
      openLiveBrowserTab(targetUrl, `Preview: ${targetUrl}`);
    }
  };

  function renderContent() {
    switch (activeTab) {
      case "Terminal":
        return <Terminal hideToolbar={true} />;

      case "Output":
        return <Output />;

      case "Problems":
        return <ProblemsView problems={problems} jumpToProblem={jumpToProblem} />;

      case "Debug Console":
        return (
          <div className="panel-content">
            Debug console ready. MinGW GCC, Node.js, and Python debuggers configured.
          </div>
        );

      case "Ports":
        return <PortsView openLiveBrowserTab={openLiveBrowserTab} />;

      case "REPL":
        return <Repl />;

      default:
        return null;
    }
  }

  return (
    <div className="bottom-panel">
      {/* Unified VS Code Panel Header */}
      <div className="bottom-header">
        <div className="bottom-tabs">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`bottom-tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
              {tab === "Problems" && (
                <span className={`tab-badge ${problems.length > 0 ? "error-badge" : ""}`}>
                  {problems.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Right-aligned Contextual Action Bar for Active Tab */}
        <div className="bottom-header-actions">
          {activeTab === "Terminal" && (
            <>
              {/* Terminal tabs */}
              <div className="term-header-switcher">
                {terminals.map((t) => (
                  <div
                    key={t.id}
                    className={`term-header-tab ${activeTerminal?.id === t.id ? "active" : ""}`}
                    onClick={() => setActiveTerminal(t)}
                    title={`Switch to ${t.title}`}
                  >
                    <span>{t.title}</span>
                    {terminals.length > 1 && (
                      <span
                        className="term-header-tab-kill"
                        onClick={(e) => {
                          e.stopPropagation();
                          killTerminal(t.id);
                        }}
                        title="Kill Terminal"
                      >
                        <FaTimes />
                      </span>
                    )}
                  </div>
                ))}
                <button
                  className="term-header-btn icon-btn"
                  onClick={createTerminal}
                  title="New Terminal (Ctrl+Shift+`)"
                  aria-label="New Terminal"
                >
                  <FaPlus />
                </button>
              </div>

              {/* CWD Badge */}
              {activeTerminal?.cwd && (
                <span
                  className="terminal-cwd-badge"
                  title={`Working Directory: ${activeTerminal.cwd}`}
                >
                  📁 {activeTerminal.cwd}
                </span>
              )}

              {/* Status Badge */}
              {activeTerminal?.replState?.active ? (
                <span
                  className="sandbox-status-badge repl-active"
                  title={`Active ${activeTerminal.replState.runtime.toUpperCase()} REPL`}
                >
                  <FaCheckCircle /> {activeTerminal.replState.runtime.toUpperCase()} REPL
                </span>
              ) : isRunning ? (
                <span className="sandbox-status-badge running" title="Process actively running">
                  <FaSpinner className="spin-icon" /> RUNNING
                </span>
              ) : (
                <span className="sandbox-status-badge active" title="Sandbox Ready">
                  <FaCheckCircle /> READY
                </span>
              )}

              {/* Action Buttons */}
              <button
                className="term-header-btn run-btn"
                onClick={() => runActiveFile()}
                disabled={isRunning}
                title="Run Active File (F5)"
                aria-label="Run Active File"
              >
                <FaPlay className="action-icon" />
              </button>

              {isRunning && (
                <button
                  className="term-header-btn stop-btn"
                  onClick={terminateTask}
                  title="Terminate Running Process (Ctrl+C)"
                  aria-label="Terminate Process"
                >
                  <FaStop className="action-icon" />
                </button>
              )}

              <button
                className="term-header-btn preview-btn"
                onClick={handleOpenBrowserPreview}
                title="Open Live Preview in Editor (VS Code Simple Browser)"
                aria-label="Open Live Preview"
              >
                <FaGlobe className="action-icon" />
              </button>

              <button
                className="term-header-btn icon-btn"
                onClick={splitTerminal}
                title="Split Terminal Side by Side (Ctrl+Shift+5)"
                aria-label="Split Terminal"
              >
                <FaColumns className="action-icon" />
              </button>

              <button
                className="term-header-btn kill-btn"
                onClick={() => killTerminal(activeTerminal?.id)}
                title="Kill Terminal Session"
                aria-label="Kill Terminal"
              >
                <FaTrashAlt className="action-icon" />
              </button>

              <button
                className="term-header-btn icon-btn"
                onClick={() => executeCommand("clear")}
                title="Clear Terminal Screen (Ctrl+L)"
                aria-label="Clear Terminal"
              >
                <FaTrash className="action-icon" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bottom-body">
        {renderContent()}
      </div>
    </div>
  );
}

export default BottomPanel;