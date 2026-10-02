import "./BottomPanel.css";
import { useState } from "react";
import Terminal from "../Terminal";
import Output from "../Output/Output";
import Repl from "../Repl/Repl";
import useTerminal from "../../hooks/useTerminal";
import useEditor from "../../hooks/useEditor";
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
  FaGlobe
} from "react-icons/fa";

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

  const { openLiveBrowserTab } = useEditor();

  const handleOpenBrowserPreview = () => {
    // If dev server URL exists in output or default to 5173
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
        return (
          <div className="panel-content">
            No problems detected in the current workspace.
          </div>
        );

      case "Debug Console":
        return (
          <div className="panel-content">
            Debug console ready. Start a debugging session to inspect runtime stack.
          </div>
        );

      case "Ports":
        return (
          <div className="panel-content">
            <div className="ports-table-placeholder">
              <div className="ports-row-header">
                <span>Port</span>
                <span>Protocol</span>
                <span>Origin</span>
                <span>Address</span>
              </div>
              <div className="ports-row">
                <span>5173</span>
                <span>HTTP</span>
                <span>Vite Dev Server</span>
                <span className="port-link" onClick={() => openLiveBrowserTab("http://localhost:5173")}>http://localhost:5173</span>
              </div>
              <div className="ports-row">
                <span>3000</span>
                <span>HTTP</span>
                <span>Express Sandbox API</span>
                <span className="port-link" onClick={() => openLiveBrowserTab("http://localhost:3000/health")}>http://localhost:3000</span>
              </div>
            </div>
          </div>
        );

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
              {tab === "Problems" && <span className="tab-badge">0</span>}
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