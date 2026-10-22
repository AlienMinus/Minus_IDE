import React from "react";
import { VscPlay, VscGear, VscDebugRestart, VscStopCircle } from "react-icons/vsc";
import { FaPlay, FaTools, FaCheckCircle, FaSpinner, FaRobot, FaExternalLinkAlt } from "react-icons/fa";
import { SiPython } from "react-icons/si";
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

  const { activeFile, openSeleniumStudioTab } = useEditor();

  return (
    <div className="rundebug-container">
      {/* Header */}
      <div className="rundebug-header">
        <span className="rundebug-title">RUN & DEBUG</span>
      </div>

      <div className="rundebug-body">
        {/* Main Run Buttons */}
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

        {/* Configured Runtimes List */}
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
            <div className="runtime-item">
              <FaCheckCircle className="runtime-ok" />
              <span>Selenium WebDriver (Previewer E2E)</span>
            </div>
          </div>
        </div>

        {/* Selenium QA Studio Launcher Card (Located directly below Configured Runtimes) */}
        <div className="rundebug-section selenium-qa-launch-section">
          <div className="rundebug-section-header">AUTOMATION & QA</div>
          <div
            className="selenium-launch-card"
            onClick={() => openSeleniumStudioTab?.()}
            title="Click to launch full-page Selenium QA Studio workspace tab"
          >
            <div className="selenium-launch-top">
              <div className="selenium-launch-icon-wrap">
                <FaRobot className="selenium-launch-robot-icon" />
              </div>
              <div className="selenium-launch-header-text">
                <div className="selenium-launch-title-row">
                  <span className="selenium-launch-title">Selenium QA Studio</span>
                  <span className="selenium-launch-badge">
                    <SiPython className="py-icon" /> Python 4
                  </span>
                </div>
                <span className="selenium-launch-subtext">Modular E2E Browser Testing</span>
              </div>
            </div>

            <p className="selenium-launch-desc">
              Execute test suites, inspect DOM elements, and run autonomous agentic exploration in real Chromium.
            </p>

            <button
              className="selenium-launch-btn"
              onClick={(e) => {
                e.stopPropagation();
                openSeleniumStudioTab?.();
              }}
            >
              <span>Open Full Editor Tab</span>
              <FaExternalLinkAlt className="popout-icon" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
