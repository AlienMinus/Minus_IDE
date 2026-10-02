import React from "react";
import { VscPlay, VscGear, VscDebugRestart, VscStopCircle } from "react-icons/vsc";
import { FaPlay, FaTools, FaCheckCircle, FaSpinner } from "react-icons/fa";
import useTerminal from "../../hooks/useTerminal";
import useEditor from "../../hooks/useEditor";
import "./RunDebug.css";

export default function RunDebug() {
  const {
    runActiveFile,
    runBuildTask,
    isRunning,
    terminateTask,
    latestExecution
  } = useTerminal();

  const { activeFile } = useEditor();

  return (
    <div className="rundebug-container">
      <div className="rundebug-header">
        <span className="rundebug-title">RUN AND DEBUG</span>
      </div>

      <div className="rundebug-body">
        {/* Main Run Button */}
        <div className="rundebug-action-box">
          <button
            className={`rundebug-primary-btn ${isRunning ? "running" : ""}`}
            onClick={() => runActiveFile()}
            disabled={isRunning}
            title={activeFile ? `Run ${activeFile.name} (F5)` : "Run Active File (F5)"}
          >
            {isRunning ? (
              <>
                <FaSpinner className="spin-icon" /> Running Process...
              </>
            ) : (
              <>
                <FaPlay /> Run Active File (F5)
              </>
            )}
          </button>

          {isRunning && (
            <button
              className="rundebug-stop-btn"
              onClick={terminateTask}
              title="Stop running process (Ctrl+C)"
            >
              <VscStopCircle /> Stop
            </button>
          )}

          <button
            className="rundebug-secondary-btn"
            onClick={runBuildTask}
            title="Execute configured build task (Ctrl+Shift+B)"
          >
            <FaTools /> Run Build Task (Ctrl+Shift+B)
          </button>
        </div>

        {/* Active Target Info */}
        <div className="rundebug-section">
          <div className="rundebug-section-header">TARGET</div>
          <div className="rundebug-target-card">
            <span className="target-label">Active File:</span>
            <span className="target-value">
              {activeFile ? activeFile.name : "None (Select a file)"}
            </span>
            {activeFile?.language && (
              <span className="target-runtime-tag">
                Runtime: {activeFile.language.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Available Runtimes */}
        <div className="rundebug-section">
          <div className="rundebug-section-header">CONFIGURED RUNTIMES</div>
          <div className="runtimes-list">
            <div className="runtime-item">
              <FaCheckCircle className="runtime-ok" />
              <span>C / C++ (MinGW GCC)</span>
            </div>
            <div className="runtime-item">
              <FaCheckCircle className="runtime-ok" />
              <span>Python 3.12 (Direct Engine)</span>
            </div>
            <div className="runtime-item">
              <FaCheckCircle className="runtime-ok" />
              <span>Node.js / JavaScript (V8)</span>
            </div>
            <div className="runtime-item">
              <FaCheckCircle className="runtime-ok" />
              <span>GNU Bash (Native Shell)</span>
            </div>
            <div className="runtime-item">
              <FaCheckCircle className="runtime-ok" />
              <span>React 19 (Component Preview)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
