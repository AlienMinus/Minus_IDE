import "./Tabs.css";

import { FaTimes } from "react-icons/fa";
import useEditor from "../../hooks/useEditor";
import { getFileIcon } from "../../utils/fileIcons";

function Tabs() {
  const { openFiles, activeFile, closeFile, setActiveFile } = useEditor();

  const formatTabName = (name) => {
    if (!name || typeof name !== "string") return "";
    return name.length > 15 ? `${name.slice(0, 15)}...` : name;
  };

  return (
    <div className="tabs">
      {openFiles.map((tab) => {
        const isPreview = tab.type === "preview" || tab.isPreview;
        const icon = isPreview ? getFileIcon("preview") : getFileIcon(tab.name);
        return (
          <div
            key={tab.id}
            className={`tab ${activeFile?.id === tab.id ? "active-tab" : ""}`}
            onClick={() => setActiveFile(tab)}
            title={tab.name}
          >
            {icon}
            <span title={tab.name}>{formatTabName(tab.name)}</span>
            <button
              className="close-btn"
              onClick={(e) => {
                e.stopPropagation();
                closeFile(tab.id);
              }}
              title="Close tab"
              aria-label="Close tab"
            >
              <FaTimes />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default Tabs;