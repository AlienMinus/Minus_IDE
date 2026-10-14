import React, { useState, useRef, useEffect } from "react";
import "./TerminalDropdownMenu.css";
import useTerminal from "../../hooks/useTerminal";
import useEditor from "../../hooks/useEditor";
import {
  FaPlus,
  FaWindowMaximize,
  FaColumns,
  FaShieldAlt,
  FaTerminal,
  FaCode,
  FaCog,
  FaTasks,
  FaChevronRight,
  FaCheck,
  FaRobot,
  FaPython,
  FaNodeJs
} from "react-icons/fa";

export default function TerminalDropdownMenu({ isOpen, onClose, anchorRef }) {
  const {
    createTerminal,
    splitTerminal,
    defaultProfile = "powershell",
    setDefaultProfile,
    configureTasks,
    openTaskPicker,
    runTask
  } = useTerminal();

  const { createOrOpenFile } = useEditor();

  const [hoverSubmenu, setHoverSubmenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const menuRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        (!anchorRef || !anchorRef.current || !anchorRef.current.contains(e.target))
      ) {
        onClose();
      }
    }

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  const handleAction = (callback) => {
    onClose();
    if (callback) callback();
  };

  const handleOpenSettings = () => {
    onClose();
    if (createOrOpenFile) {
      createOrOpenFile(
        ".vscode/settings.json",
        JSON.stringify(
          {
            "terminal.integrated.defaultProfile.windows": defaultProfile,
            "terminal.integrated.fontSize": 14,
            "terminal.integrated.fontFamily": "'Cascadia Code', Consolas, 'Fira Code', monospace",
            "terminal.integrated.cursorBlinking": true,
            "terminal.integrated.cursorStyle": "block"
          },
          null,
          2
        )
      );
    } else {
      setShowSettingsModal(true);
    }
  };

  return (
    <>
      <div className="terminal-dropdown-menu" ref={menuRef}>
        {/* Top actions */}
        <div
          className="term-dropdown-item"
          onClick={() => handleAction(() => createTerminal())}
        >
          <span className="term-item-icon"><FaPlus /></span>
          <span className="term-item-label">New Terminal</span>
          <span className="term-item-shortcut">Ctrl+Shift+`</span>
        </div>

        <div
          className="term-dropdown-item"
          onClick={() => handleAction(() => createTerminal())}
        >
          <span className="term-item-icon"><FaWindowMaximize /></span>
          <span className="term-item-label">New Terminal Window</span>
          <span className="term-item-shortcut">Ctrl+Shift+Alt+`</span>
        </div>

        <div
          className="term-dropdown-item"
          onClick={() => handleAction(() => splitTerminal())}
        >
          <span className="term-item-icon"><FaColumns /></span>
          <span className="term-item-label">Split Terminal</span>
          <span className="term-item-shortcut">Ctrl+Shift+5</span>
        </div>

        <div className="term-dropdown-divider" />

        {/* AI & Security Terminal */}
        <div
          className="term-dropdown-item term-item-cypher"
          onClick={() => handleAction(() => createTerminal("cypher"))}
        >
          <span className="term-item-icon cypher-icon"><FaShieldAlt /></span>
          <span className="term-item-label">Cypher Security Terminal</span>
          <span className="term-item-badge">AI</span>
        </div>

        <div className="term-dropdown-divider" />

        {/* Profiles */}
        <div
          className={`term-dropdown-item ${defaultProfile === "powershell" ? "default-profile" : ""}`}
          onClick={() => handleAction(() => createTerminal("powershell"))}
        >
          <span className="term-item-icon"><FaTerminal /></span>
          <span className="term-item-label">PowerShell</span>
          {defaultProfile === "powershell" && <FaCheck className="term-active-check" />}
        </div>

        <div
          className={`term-dropdown-item ${defaultProfile === "bash" ? "default-profile" : ""}`}
          onClick={() => handleAction(() => createTerminal("bash"))}
        >
          <span className="term-item-icon"><FaTerminal /></span>
          <span className="term-item-label">Git Bash</span>
          {defaultProfile === "bash" && <FaCheck className="term-active-check" />}
        </div>

        <div
          className={`term-dropdown-item ${defaultProfile === "cmd" ? "default-profile" : ""}`}
          onClick={() => handleAction(() => createTerminal("cmd"))}
        >
          <span className="term-item-icon"><FaTerminal /></span>
          <span className="term-item-label">Command Prompt</span>
          {defaultProfile === "cmd" && <FaCheck className="term-active-check" />}
        </div>

        <div
          className="term-dropdown-item"
          onClick={() => handleAction(() => createTerminal("node"))}
        >
          <span className="term-item-icon"><FaNodeJs /></span>
          <span className="term-item-label">JavaScript Debug Terminal</span>
        </div>

        <div
          className="term-dropdown-item"
          onClick={() => handleAction(() => createTerminal("python"))}
        >
          <span className="term-item-icon"><FaPython /></span>
          <span className="term-item-label">Python Interactive Terminal</span>
        </div>

        <div
          className="term-dropdown-item"
          onClick={() => handleAction(() => createTerminal("agent"))}
        >
          <span className="term-item-icon"><FaRobot /></span>
          <span className="term-item-label">Agent Host (Local)</span>
        </div>

        {/* Submenu for Split Terminal with Profile */}
        <div
          className="term-dropdown-item has-submenu"
          onMouseEnter={() => setHoverSubmenu(true)}
          onMouseLeave={() => setHoverSubmenu(false)}
        >
          <span className="term-item-icon"><FaColumns /></span>
          <span className="term-item-label">Split Terminal with Profile</span>
          <FaChevronRight className="term-submenu-arrow" />

          {hoverSubmenu && (
            <div className="term-sub-dropdown-menu">
              <div
                className="term-dropdown-item"
                onClick={() => handleAction(() => splitTerminal("powershell"))}
              >
                <span className="term-item-icon"><FaTerminal /></span>
                <span className="term-item-label">PowerShell</span>
              </div>
              <div
                className="term-dropdown-item"
                onClick={() => handleAction(() => splitTerminal("bash"))}
              >
                <span className="term-item-icon"><FaTerminal /></span>
                <span className="term-item-label">Git Bash</span>
              </div>
              <div
                className="term-dropdown-item"
                onClick={() => handleAction(() => splitTerminal("cmd"))}
              >
                <span className="term-item-icon"><FaTerminal /></span>
                <span className="term-item-label">Command Prompt</span>
              </div>
              <div
                className="term-dropdown-item"
                onClick={() => handleAction(() => splitTerminal("node"))}
              >
                <span className="term-item-icon"><FaNodeJs /></span>
                <span className="term-item-label">JavaScript Debug Terminal</span>
              </div>
              <div
                className="term-dropdown-item"
                onClick={() => handleAction(() => splitTerminal("python"))}
              >
                <span className="term-item-icon"><FaPython /></span>
                <span className="term-item-label">Python Interactive Terminal</span>
              </div>
              <div
                className="term-dropdown-item"
                onClick={() => handleAction(() => splitTerminal("cypher"))}
              >
                <span className="term-item-icon cypher-icon"><FaShieldAlt /></span>
                <span className="term-item-label">Cypher Security Terminal</span>
              </div>
            </div>
          )}
        </div>

        <div className="term-dropdown-divider" />

        {/* Configuration */}
        <div
          className="term-dropdown-item"
          onClick={handleOpenSettings}
        >
          <span className="term-item-icon"><FaCog /></span>
          <span className="term-item-label">Configure Terminal Settings</span>
        </div>

        <div
          className="term-dropdown-item"
          onClick={() => {
            setShowProfileModal(true);
            onClose();
          }}
        >
          <span className="term-item-icon"><FaTerminal /></span>
          <span className="term-item-label">Select Default Profile</span>
        </div>

        <div className="term-dropdown-divider" />

        {/* Tasks */}
        <div
          className="term-dropdown-item"
          onClick={() => handleAction(() => {
            if (openTaskPicker) openTaskPicker();
            else if (runTask) runTask("npm test");
          })}
        >
          <span className="term-item-icon"><FaTasks /></span>
          <span className="term-item-label">Run Task...</span>
        </div>

        <div
          className="term-dropdown-item"
          onClick={() => handleAction(() => configureTasks && configureTasks())}
        >
          <span className="term-item-icon"><FaCode /></span>
          <span className="term-item-label">Configure Tasks...</span>
        </div>
      </div>

      {/* Select Default Profile Modal */}
      {showProfileModal && (
        <div className="term-modal-backdrop" onClick={() => setShowProfileModal(false)}>
          <div className="term-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="term-modal-header">
              <h3>Select Default Terminal Profile</h3>
              <p>Choose the default shell profile used when opening new terminals:</p>
            </div>
            <div className="term-profile-options">
              {[
                { id: "powershell", name: "PowerShell", desc: "Windows PowerShell / pwsh shell" },
                { id: "bash", name: "Git Bash", desc: "GNU Bash MINGW64 environment" },
                { id: "cmd", name: "Command Prompt", desc: "Windows cmd.exe environment" },
                { id: "cypher", name: "Cypher Security Terminal", desc: "AI security intelligence & audit CLI" }
              ].map((opt) => (
                <div
                  key={opt.id}
                  className={`term-profile-opt-item ${defaultProfile === opt.id ? "active" : ""}`}
                  onClick={() => {
                    if (setDefaultProfile) setDefaultProfile(opt.id);
                    setShowProfileModal(false);
                  }}
                >
                  <div className="term-profile-opt-info">
                    <span className="term-profile-opt-title">{opt.name}</span>
                    <span className="term-profile-opt-desc">{opt.desc}</span>
                  </div>
                  {defaultProfile === opt.id && <FaCheck className="term-check-icon" />}
                </div>
              ))}
            </div>
            <div className="term-modal-footer">
              <button className="term-modal-btn" onClick={() => setShowProfileModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

