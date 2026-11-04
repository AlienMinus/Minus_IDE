import { useState, useMemo } from "react";
import "./Output.css";
import useTerminal from "../../hooks/useTerminal";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaCode,
  FaCopy,
  FaPlay,
  FaSearch,
  FaTimes,
  FaListOl,
  FaTerminal
} from "react-icons/fa";
import { VscWordWrap, VscClearAll } from "react-icons/vsc";

/**
 * Classify a console line for syntax and diagnostic highlighting
 */
function classifyLine(line) {
  if (!line || !line.trim()) return "empty";
  const trimmed = line.trim();

  // Divider or ASCII box header
  if (/^[-=~#*_]{4,}$/.test(trimmed) || trimmed.startsWith("===") || trimmed.startsWith("---")) {
    return "divider";
  }

  // Error indicators
  if (
    /(?:error:|exception:|syntaxerror|typeerror|referenceerror|fatal:|failed|err:|panic:|traceback)/i.test(line)
  ) {
    return "error";
  }

  // Warning indicators
  if (/(?:warning:|warn:|deprecated|caution:)/i.test(line)) {
    return "warning";
  }

  // Info / Success indicators
  if (/(?:info:|success|passed|ok|compiled successfully|ready in|listening on)/i.test(line)) {
    return "info";
  }

  return "normal";
}

function ConsoleLineList({ lines = [], showLineNumbers = true, wrapLines = false, filter = "" }) {
  const filtered = useMemo(() => {
    if (!filter.trim()) {
      return lines.map((text, idx) => ({ text, originalIdx: idx }));
    }
    const q = filter.toLowerCase();
    return lines
      .map((text, idx) => ({ text, originalIdx: idx }))
      .filter((item) => item.text.toLowerCase().includes(q));
  }, [lines, filter]);

  if (lines.length === 0) {
    return (
      <div className="console-empty-stream">
        <span className="muted-text">(No console output generated)</span>
      </div>
    );
  }

  if (filtered.length === 0 && filter) {
    return (
      <div className="console-empty-stream">
        <span className="muted-text">No output lines match filter "{filter}"</span>
      </div>
    );
  }

  return (
    <div className={`console-lines-container ${wrapLines ? "wrap-enabled" : "wrap-disabled"}`}>
      {filtered.map(({ text, originalIdx }) => {
        const lineType = classifyLine(text);
        return (
          <div key={originalIdx} className={`console-line console-line-${lineType}`}>
            {showLineNumbers && (
              <span className="console-line-number">
                {originalIdx + 1}
              </span>
            )}
            <span className="console-line-text">{text || " "}</span>
          </div>
        );
      })}
    </div>
  );
}

function Output() {
  const { latestExecution, clearLatestExecution, runActiveFile, isRunning } = useTerminal();
  const [copied, setCopied] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [wrapLines, setWrapLines] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [activeStreamTab, setActiveStreamTab] = useState("all"); // 'all' | 'stdout' | 'stderr'

  if (!latestExecution) {
    return (
      <div className="output-empty-state">
        <div className="output-empty-icon-wrap">
          <FaTerminal className="empty-icon" />
        </div>
        <h3>No Execution Console Output</h3>
        <p>Run any script or compile C, C++, Python, or Node.js to inspect execution output, diagnostics, and return codes.</p>
        <button
          className="output-run-now-btn"
          onClick={() => runActiveFile()}
          disabled={isRunning}
        >
          <FaPlay /> Run Active File Now
        </button>
      </div>
    );
  }

  const { filename, language, timestamp, duration, exitCode, success, stdout = "", stderr = "" } = latestExecution;

  const stdoutLines = useMemo(() => {
    if (!stdout) return [];
    return stdout.split("\n");
  }, [stdout]);

  const stderrLines = useMemo(() => {
    if (!stderr) return [];
    return stderr.split("\n");
  }, [stderr]);

  const totalLines = stdoutLines.length + stderrLines.length;

  const handleCopy = () => {
    const text = [
      `=== Hyperion Execution: ${filename} (${language}) ===`,
      `Time: ${timestamp} | Duration: ${duration}ms | Exit Code: ${exitCode}`,
      stdout ? `\n--- STDOUT ---\n${stdout}` : "",
      stderr ? `\n--- STDERR ---\n${stderr}` : ""
    ]
      .filter(Boolean)
      .join("\n");

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    if (clearLatestExecution) {
      clearLatestExecution();
    }
  };

  return (
    <div className="output-panel-container">
      {/* Top Header Toolbar */}
      <div className="output-meta-header">
        <div className="output-meta-left">
          <span className={`output-badge ${success ? "badge-success" : "badge-error"}`}>
            {success ? <FaCheckCircle /> : <FaTimesCircle />}
            {success ? "SUCCESS" : "FAILED"} (Exit {exitCode ?? 0})
          </span>

          <span className="output-meta-item">
            <strong>Target:</strong> {filename}
          </span>

          <span className="output-meta-item lang-tag">
            {language?.toUpperCase()}
          </span>

          <span className="output-meta-item">
            <FaClock /> {duration}ms
          </span>

          <span className="output-meta-item line-count-tag">
            {totalLines} line{totalLines === 1 ? "" : "s"}
          </span>

          <span className="output-timestamp">{timestamp}</span>
        </div>

        {/* Action Buttons */}
        <div className="output-meta-right">
          {/* Filter Search Input */}
          <div className="output-filter-box">
            <FaSearch className="output-filter-icon" />
            <input
              type="text"
              placeholder="Filter output..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              title="Filter console lines"
            />
            {filterText && (
              <button className="output-filter-clear" onClick={() => setFilterText("")}>
                <FaTimes />
              </button>
            )}
          </div>

          {/* Toggle Line Numbers */}
          <button
            className={`output-action-btn ${showLineNumbers ? "active" : ""}`}
            onClick={() => setShowLineNumbers((prev) => !prev)}
            title="Toggle Line Numbers"
          >
            <FaListOl /> Lines
          </button>

          {/* Toggle Word Wrap */}
          <button
            className={`output-action-btn ${wrapLines ? "active" : ""}`}
            onClick={() => setWrapLines((prev) => !prev)}
            title="Toggle Word Wrap"
          >
            <VscWordWrap /> Wrap
          </button>

          {/* Copy Logs */}
          <button className="output-action-btn" onClick={handleCopy} title="Copy Execution Logs">
            <FaCopy /> {copied ? "Copied!" : "Copy"}
          </button>

          {/* Clear Console */}
          <button className="output-action-btn" onClick={handleClear} title="Clear Console Output">
            <VscClearAll /> Clear
          </button>

          {/* Re-run Active File */}
          <button
            className="output-action-btn run-btn-output"
            onClick={() => runActiveFile()}
            disabled={isRunning}
            title="Re-run active file"
          >
            <FaPlay /> {isRunning ? "Running..." : "Run Again"}
          </button>
        </div>
      </div>

      {/* Stream Tabs (All, STDOUT, STDERR) */}
      {Boolean(stdout && stderr) && (
        <div className="output-stream-tabs">
          <button
            className={`stream-tab-btn ${activeStreamTab === "all" ? "active" : ""}`}
            onClick={() => setActiveStreamTab("all")}
          >
            All Output ({totalLines})
          </button>
          <button
            className={`stream-tab-btn ${activeStreamTab === "stdout" ? "active" : ""}`}
            onClick={() => setActiveStreamTab("stdout")}
          >
            Standard Output ({stdoutLines.length})
          </button>
          <button
            className={`stream-tab-btn stderr-tab ${activeStreamTab === "stderr" ? "active" : ""}`}
            onClick={() => setActiveStreamTab("stderr")}
          >
            Standard Error ({stderrLines.length})
          </button>
        </div>
      )}

      {/* Output Console Body */}
      <div className="output-body">
        {/* Render STDOUT Block */}
        {(activeStreamTab === "all" || activeStreamTab === "stdout") && stdoutLines.length > 0 && (
          <div className="output-block stdout-block">
            <div className="output-block-title">
              <span className="stream-name">STANDARD OUTPUT:</span>
              <span className="stream-count">({stdoutLines.length} lines)</span>
            </div>
            <ConsoleLineList
              lines={stdoutLines}
              showLineNumbers={showLineNumbers}
              wrapLines={wrapLines}
              filter={filterText}
            />
          </div>
        )}

        {/* Render STDERR Block */}
        {(activeStreamTab === "all" || activeStreamTab === "stderr") && stderrLines.length > 0 && (
          <div className="output-block stderr-block">
            <div className="output-block-title stderr-title">
              <span className="stream-name">STANDARD ERROR:</span>
              <span className="stream-count">({stderrLines.length} lines)</span>
            </div>
            <ConsoleLineList
              lines={stderrLines}
              showLineNumbers={showLineNumbers}
              wrapLines={wrapLines}
              filter={filterText}
            />
          </div>
        )}

        {!stdout && !stderr && (
          <div className="output-block">
            <div className="console-empty-stream">
              <span className="muted-text">(Process exited with code {exitCode ?? 0} with no console output generated)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Output;
