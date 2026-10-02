import { useState, useEffect } from "react";
import "./ContextMenu.css";
import useFile from "../../hooks/useFile";
import useEditor from "../../hooks/useEditor";
import useTerminal from "../../hooks/useTerminal";
import { revealInExplorer } from "../../services/sandboxService";
import { getFileHistory } from "../../services/gitService";

function ContextMenu({ isOpen, position, onClose, onOpenLiveServer, onRunCode, file }) {
  const { deleteFile, renameFile, persistedFolderInfo } = useFile();
  const {
    openFile,
    openPreviewTab,
    openDiffTab,
    comparedFile,
    setComparedFile,
    renameOpenFile,
    closeFile,
    openView,
    setBottomPanelTab,
    setIsBottomPanelOpen
  } = useEditor();
  const { runActiveFile } = useTerminal();

  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const [historyModal, setHistoryModal] = useState({ isOpen: false, commits: [], title: "" });
  const [csvHeadModal, setCsvHeadModal] = useState({ isOpen: false, rows: [], headers: [], title: "" });
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 2500);
    return () => clearTimeout(t);
  }, [toastMessage]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
        setHistoryModal((prev) => ({ ...prev, isOpen: false }));
        setCsvHeadModal((prev) => ({ ...prev, isOpen: false }));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!isOpen || !position || !file) {
    if (historyModal.isOpen || csvHeadModal.isOpen || toastMessage) {
      // Render modal or toast if active even if menu is closed
      return renderOverlays();
    }
    return null;
  }

  const showToast = (msg) => {
    setToastMessage(msg);
  };

  const fullPath = persistedFolderInfo?.path && !file.path?.includes(":")
    ? `${persistedFolderInfo.path}/${file.path || file.name}`
    : (file.path || file.name);

  const relativePath = file.path || file.name;

  // 1. Run Code
  const handleRunCode = () => {
    onClose();
    if (onRunCode) {
      onRunCode();
    } else {
      openFile(file);
      runActiveFile(file);
    }
  };

  // 2. Open to the Side
  const handleOpenToSide = () => {
    onClose();
    openFile(file);
    showToast(`Opened ${file.name} to the side`);
  };

  // 3. Open With actions
  const handleOpenWith = (mode) => {
    onClose();
    if (mode === "editor") {
      openFile(file);
    } else if (mode === "preview") {
      openPreviewTab(file);
    } else if (mode === "live") {
      if (onOpenLiveServer) {
        onOpenLiveServer();
      } else {
        openPreviewTab(file);
      }
    }
  };

  // 4. Reveal in File Explorer
  const handleReveal = async () => {
    onClose();
    try {
      await revealInExplorer(fullPath);
      await navigator.clipboard.writeText(fullPath);
      showToast(`Revealed in Explorer: ${file.name}`);
    } catch {
      await navigator.clipboard.writeText(fullPath);
      showToast(`Copied path: ${file.name}`);
    }
  };

  // 5. Open in Integrated Terminal
  const handleOpenInTerminal = () => {
    onClose();
    if (setBottomPanelTab) setBottomPanelTab("Terminal");
    if (setIsBottomPanelOpen) setIsBottomPanelOpen(true);
    if (openView) openView("terminal");
    showToast(`Opened integrated terminal for ${file.name}`);
  };

  // 6. Select for Compare
  const handleSelectForCompare = () => {
    onClose();
    if (!comparedFile) {
      if (setComparedFile) setComparedFile(file);
      showToast(`Selected '${file.name}' for compare. Select next file.`);
    } else if (comparedFile.id === file.id || comparedFile.name === file.name) {
      showToast(`'${file.name}' already selected for compare.`);
    } else {
      if (openDiffTab) openDiffTab(comparedFile, file);
      if (setComparedFile) setComparedFile(null);
      showToast(`Comparing ${comparedFile.name} ↔ ${file.name}`);
    }
  };

  // 7. Open Timeline / Git History
  const handleOpenTimeline = async () => {
    onClose();
    const commits = await getFileHistory(persistedFolderInfo?.path, file.path || file.name);
    setHistoryModal({
      isOpen: true,
      commits,
      title: `Timeline: ${file.name}`
    });
  };

  // 8. Add File to Chat
  const handleAddToChat = () => {
    onClose();
    window.dispatchEvent(new CustomEvent("hyperion:open-chat"));
    window.dispatchEvent(new CustomEvent("hyperion:add-to-chat", { detail: { file } }));
    showToast(`Added ${file.name} to Chat`);
  };

  // 9. Cut
  const handleCut = async () => {
    onClose();
    try {
      await navigator.clipboard.writeText(fullPath);
    } catch {}
    sessionStorage.setItem("hyperion_clipboard", JSON.stringify({ action: "cut", file }));
    showToast(`Cut ${file.name}`);
  };

  // 10. Copy
  const handleCopy = async () => {
    onClose();
    try {
      if (file.content) {
        await navigator.clipboard.writeText(file.content);
      } else {
        await navigator.clipboard.writeText(fullPath);
      }
    } catch {}
    sessionStorage.setItem("hyperion_clipboard", JSON.stringify({ action: "copy", file }));
    showToast(`Copied ${file.name}`);
  };

  // 11. Copy Path
  const handleCopyPath = async () => {
    onClose();
    try {
      await navigator.clipboard.writeText(fullPath);
      showToast(`Copied path: ${fullPath}`);
    } catch {
      showToast("Failed to copy path to clipboard");
    }
  };

  // 12. Copy Relative Path
  const handleCopyRelativePath = async () => {
    onClose();
    try {
      await navigator.clipboard.writeText(relativePath);
      showToast(`Copied relative path: ${relativePath}`);
    } catch {
      showToast("Failed to copy relative path to clipboard");
    }
  };

  // 13. Rename...
  const handleRename = async () => {
    onClose();
    const newName = window.prompt("Rename file:", file.name);
    if (newName && newName.trim() && newName.trim() !== file.name) {
      const trimmed = newName.trim();
      const updated = await renameFile(file, trimmed);
      if (updated && renameOpenFile) {
        const newPath = relativePath.includes("/")
          ? relativePath.substring(0, relativePath.lastIndexOf("/") + 1) + trimmed
          : trimmed;
        renameOpenFile(file.id || file.name, trimmed, newPath);
      }
      showToast(`Renamed to ${trimmed}`);
    }
  };

  // 14. Delete
  const handleDelete = async () => {
    onClose();
    const confirmed = window.confirm(`Are you sure you want to delete '${file.name}'?`);
    if (confirmed) {
      await deleteFile(file);
      if (closeFile) closeFile(file.id || file.name);
      showToast(`Deleted ${file.name}`);
    }
  };

  // 15. Git: View File History
  const handleViewGitHistory = async () => {
    onClose();
    const commits = await getFileHistory(persistedFolderInfo?.path, file.path || file.name);
    setHistoryModal({
      isOpen: true,
      commits,
      title: `Git History: ${file.name}`
    });
  };

  // 16. Preview big CSV: head
  const handlePreviewCsvHead = () => {
    onClose();
    const raw = file.content || "";
    const lines = raw.split("\n").filter((l) => l.trim().length > 0);
    if (lines.length > 0) {
      const headerLine = lines[0];
      const headers = headerLine.split(",").map((h) => h.replace(/^["']|["']$/g, "").trim());
      const dataRows = lines.slice(1, 51).map((line) =>
        line.split(",").map((c) => c.replace(/^["']|["']$/g, "").trim())
      );
      setCsvHeadModal({
        isOpen: true,
        headers,
        rows: dataRows,
        title: `Preview CSV Head (First 50 Rows): ${file.name}`
      });
    } else {
      openPreviewTab(file);
      showToast(`Opened CSV preview for ${file.name}`);
    }
  };

  // Viewport clamping
  const menuWidth = 280;
  const menuHeight = 520;
  const topPos = Math.max(10, Math.min(position.y, window.innerHeight - menuHeight));
  const leftPos = Math.max(10, Math.min(position.x, window.innerWidth - menuWidth));

  function renderOverlays() {
    return (
      <>
        {/* Toast */}
        {toastMessage && (
          <div className="context-toast">
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Git History Modal */}
        {historyModal.isOpen && (
          <div className="context-modal-overlay" onClick={() => setHistoryModal({ ...historyModal, isOpen: false })}>
            <div className="context-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="context-modal-header">
                <span>{historyModal.title}</span>
                <button
                  className="context-modal-close"
                  onClick={() => setHistoryModal({ ...historyModal, isOpen: false })}
                >
                  ✕
                </button>
              </div>
              <div className="context-modal-body">
                {historyModal.commits && historyModal.commits.length > 0 ? (
                  <div className="history-commit-list">
                    {historyModal.commits.map((c, i) => (
                      <div key={i} className="history-commit-card">
                        <div className="history-commit-top">
                          <code className="commit-hash">{c.hash}</code>
                          <span className="commit-subject">{c.subject}</span>
                        </div>
                        <div className="history-commit-bottom">
                          <span className="commit-author">👤 {c.author}</span>
                          <span className="commit-date">🕒 {c.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="history-empty">
                    <p>No Git commits found for this file.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CSV Head Preview Modal */}
        {csvHeadModal.isOpen && (
          <div className="context-modal-overlay" onClick={() => setCsvHeadModal({ ...csvHeadModal, isOpen: false })}>
            <div className="context-modal-content csv-head-modal" onClick={(e) => e.stopPropagation()}>
              <div className="context-modal-header">
                <span>{csvHeadModal.title}</span>
                <button
                  className="context-modal-close"
                  onClick={() => setCsvHeadModal({ ...csvHeadModal, isOpen: false })}
                >
                  ✕
                </button>
              </div>
              <div className="context-modal-body csv-modal-body">
                <table className="csv-head-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      {csvHeadModal.headers.map((h, i) => (
                        <th key={i}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvHeadModal.rows.map((row, rIdx) => (
                      <tr key={rIdx}>
                        <td className="row-index">{rIdx + 1}</td>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="context-menu-overlay" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }}>
        <div
          className="context-menu"
          style={{
            top: `${topPos}px`,
            left: `${leftPos}px`
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 1. Run Code */}
          <button className="context-menu-item" onClick={handleRunCode}>
            <span className="context-menu-label">Run Code</span>
            <span className="context-menu-shortcut">Ctrl+Alt+N</span>
          </button>

          {/* 2. Open to the Side */}
          <button className="context-menu-item" onClick={handleOpenToSide}>
            <span className="context-menu-label">Open to the Side</span>
            <span className="context-menu-shortcut">Ctrl+Enter</span>
          </button>

          {/* 3. Open With... */}
          <div
            className="context-menu-item has-submenu"
            onMouseEnter={() => setActiveSubmenu("openWith")}
            onMouseLeave={() => setActiveSubmenu(null)}
          >
            <span className="context-menu-label">Open With...</span>
            {activeSubmenu === "openWith" && (
              <div className="context-submenu">
                <button className="context-menu-item" onClick={() => handleOpenWith("editor")}>
                  <span className="context-menu-label">Text Editor</span>
                </button>
                <button className="context-menu-item" onClick={() => handleOpenWith("preview")}>
                  <span className="context-menu-label">Interactive Preview</span>
                </button>
                <button className="context-menu-item" onClick={() => handleOpenWith("live")}>
                  <span className="context-menu-label">Live Server</span>
                </button>
              </div>
            )}
          </div>

          {/* 4. Reveal in File Explorer */}
          <button className="context-menu-item" onClick={handleReveal}>
            <span className="context-menu-label">Reveal in File Explorer</span>
            <span className="context-menu-shortcut">Shift+Alt+R</span>
          </button>

          {/* 5. Open in Integrated Terminal */}
          <button className="context-menu-item" onClick={handleOpenInTerminal}>
            <span className="context-menu-label">Open in Integrated Terminal</span>
          </button>

          <div className="context-menu-separator" />

          {/* 6. Select for Compare */}
          <button className="context-menu-item" onClick={handleSelectForCompare}>
            <span className="context-menu-label">
              {comparedFile && comparedFile.id !== file.id
                ? `Compare with '${comparedFile.name}'`
                : "Select for Compare"}
            </span>
          </button>

          {/* 7. Open Timeline */}
          <button className="context-menu-item" onClick={handleOpenTimeline}>
            <span className="context-menu-label">Open Timeline</span>
          </button>

          <div className="context-menu-separator" />

          {/* 8. Add File to Chat */}
          <button className="context-menu-item" onClick={handleAddToChat}>
            <span className="context-menu-label">Add File to Chat</span>
          </button>

          <div className="context-menu-separator" />

          {/* 9. Cut */}
          <button className="context-menu-item" onClick={handleCut}>
            <span className="context-menu-label">Cut</span>
            <span className="context-menu-shortcut">Ctrl+X</span>
          </button>

          {/* 10. Copy */}
          <button className="context-menu-item" onClick={handleCopy}>
            <span className="context-menu-label">Copy</span>
            <span className="context-menu-shortcut">Ctrl+C</span>
          </button>

          <div className="context-menu-separator" />

          {/* 11. Copy Path */}
          <button className="context-menu-item" onClick={handleCopyPath}>
            <span className="context-menu-label">Copy Path</span>
            <span className="context-menu-shortcut">Shift+Alt+C</span>
          </button>

          {/* 12. Copy Relative Path */}
          <button className="context-menu-item" onClick={handleCopyRelativePath}>
            <span className="context-menu-label">Copy Relative Path</span>
            <span className="context-menu-shortcut">Ctrl+K Ctrl+Shift+C</span>
          </button>

          <div className="context-menu-separator" />

          {/* 13. Rename... */}
          <button className="context-menu-item" onClick={handleRename}>
            <span className="context-menu-label">Rename...</span>
            <span className="context-menu-shortcut">F2</span>
          </button>

          {/* 14. Delete */}
          <button className="context-menu-item" onClick={handleDelete}>
            <span className="context-menu-label">Delete</span>
            <span className="context-menu-shortcut">Del</span>
          </button>

          <div className="context-menu-separator" />

          {/* 15. Git: View File History */}
          <button className="context-menu-item" onClick={handleViewGitHistory}>
            <span className="context-menu-label">Git: View File History</span>
          </button>

          <div className="context-menu-separator" />

          {/* 16. Preview big CSV: head */}
          <button className="context-menu-item" onClick={handlePreviewCsvHead}>
            <span className="context-menu-label">Preview big CSV: head</span>
          </button>
        </div>
      </div>

      {renderOverlays()}
    </>
  );
}

export default ContextMenu;
