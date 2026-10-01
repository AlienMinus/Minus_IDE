import { FaServer, FaPlay } from "react-icons/fa";
import "./ContextMenu.css";

function ContextMenu({ isOpen, position, onClose, onOpenLiveServer, onRunCode, file }) {
  if (!isOpen || !position) return null;

  const fileExt = file?.name?.split('.').pop()?.toLowerCase();
  const isPreviewable = ['html', 'htm', 'jsx', 'tsx'].includes(fileExt);

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
        <button className="context-menu-item" onClick={() => { onRunCode(); onClose(); }}>
          <FaPlay className="context-menu-icon run-icon-color" />
          Run Code in Sandbox
        </button>
        {isPreviewable && (
          <button className="context-menu-item" onClick={() => { onOpenLiveServer(); onClose(); }}>
            <FaServer className="context-menu-icon preview-icon-color" />
            Open with Live Server
          </button>
        )}
      </div>
    </div>
  );
}

export default ContextMenu;
