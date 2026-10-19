import React, { useState } from "react";
import { VscPlay, VscGear, VscDebugRestart, VscStopCircle } from "react-icons/vsc";
import { FaPlay, FaTools, FaCheckCircle, FaSpinner, FaRobot, FaExternalLinkAlt } from "react-icons/fa";
import useTerminal from "../../hooks/useTerminal";
import useEditor from "../../hooks/useEditor";
import SeleniumRunner from "./SeleniumRunner";
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
  const [activeSection, setActiveSection] = useState("selenium"); // "debug" | "selenium"

  return (
    <div className="rundebug-container">
      {/* Top Header Mode Tabs */}
      <div className="rundebug-header-tabs">
        <button
          className={`rundebug-tab-btn ${activeSection === "debug" ? "active" : ""}`}
          onClick={() => setActiveSection("debug")}
        >
          <FaPlay className="tab-icon" /> RUN & DEBUG
        </button>
        <button
          className={`rundebug-tab-btn ${activeSection === "selenium" ? "active" : ""}`}
          onClick={() => setActiveSection("selenium")}
        >
          <FaRobot className="tab-icon" /> SELENIUM QA
        </button>
        <button
          className="rundebug-popout-btn"
          onClick={() => openSeleniumStudioTab?.()}
          title="Open Selenium QA Studio in Full Editor Tab"
        >
          <FaExternalLinkAlt />
        </button>
      </div>

      {activeSection === "selenium" ? (
        <SeleniumRunner />
      ) : (
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

            <button
              className="rundebug-selenium-jump-btn"
              onClick={() => setActiveSection("selenium")}
              title="Switch to Selenium Automation and Testing"
            >
              <FaRobot /> Open Selenium Previewer Automation
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
              <div className="runtime-item">
                <FaCheckCircle className="runtime-ok" />
                <span>Selenium WebDriver (Previewer E2E)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
