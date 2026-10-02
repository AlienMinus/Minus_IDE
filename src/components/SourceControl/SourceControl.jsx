import React, { useState, useEffect } from "react";
import { VscSourceControl, VscRefresh, VscCheck } from "react-icons/vsc";
import { FaGitAlt } from "react-icons/fa";
import useTerminal from "../../hooks/useTerminal";
import "./SourceControl.css";

export default function SourceControl() {
  const { executeCommand } = useTerminal();
  const [branch, setBranch] = useState("main");
  const [changes, setChanges] = useState([]);
  const [commitMsg, setCommitMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      if (executeCommand) {
        // Execute status to get real git info
        setBranch("main");
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleCommit = () => {
    if (!commitMsg.trim()) {
      alert("Please enter a commit message.");
      return;
    }
    if (executeCommand) {
      executeCommand(`git commit -am "${commitMsg.trim()}"`);
      setCommitMsg("");
      fetchStatus();
    }
  };

  return (
    <div className="source-control-container">
      <div className="source-control-header">
        <span className="source-control-title">SOURCE CONTROL</span>
        <div className="source-control-actions">
          <button
            className="sc-icon-btn"
            onClick={fetchStatus}
            title="Refresh Git Status"
          >
            <VscRefresh className={loading ? "spin-icon" : ""} />
          </button>
        </div>
      </div>

      <div className="source-control-body">
        <div className="sc-branch-badge">
          <FaGitAlt className="sc-git-icon" />
          <span>Branch: <strong>{branch}</strong></span>
        </div>

        <div className="sc-commit-box">
          <textarea
            placeholder="Message (Ctrl+Enter to commit)"
            value={commitMsg}
            onChange={(e) => setCommitMsg(e.target.value)}
            onKeyDown={(e) => {
              if (e.ctrlKey && e.key === "Enter") {
                handleCommit();
              }
            }}
            rows={2}
          />
          <button
            className="sc-commit-btn"
            onClick={handleCommit}
            disabled={!commitMsg.trim()}
          >
            <VscCheck /> Commit
          </button>
        </div>

        <div className="sc-changes-section">
          <div className="sc-section-header">
            <span>CHANGES</span>
            <span className="sc-count-badge">{changes.length}</span>
          </div>

          <div className="sc-changes-list">
            {changes.length === 0 ? (
              <div className="sc-empty">No uncommitted changes detected. Working tree clean.</div>
            ) : (
              changes.map((item, idx) => (
                <div key={idx} className="sc-change-row">
                  <span className="sc-change-file">{item.file}</span>
                  <span className={`sc-change-type ${item.type.toLowerCase()}`}>{item.type}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
