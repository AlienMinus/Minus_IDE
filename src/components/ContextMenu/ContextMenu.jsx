import { FaServer, FaPlay } from "react-icons/fa";
import "./ContextMenu.css";

function ContextMenu({ isOpen, position, onClose, onOpenLiveServer, onRunCode }) {
  if (!isOpen || !position) return null;

  return (
    <div className="context-menu-overlay" onClick={onClose}>
      <div
        className="context-menu"
        style={{
          position: "fixed",
          top: `${position.y}px`,
          left: `${position.x}px`
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="context-menu-item" onClick={() => { onOpenLiveServer(); onClose(); }}>
          <FaServer className="context-menu-icon" />
          Open with Live Server
        </button>
        <button className="context-menu-item" onClick={() => { onRunCode(); onClose(); }}>
          <FaPlay className="context-menu-icon" />
          Run Code
        </button>
      </div>
    </div>
  );
}

export default ContextMenu;
