import "./Tabs.css";

import { FaTimes, FaProjectDiagram, FaDatabase, FaNetworkWired } from "react-icons/fa";
import { GiCurledTentacle } from "react-icons/gi";
import useEditor from "../../hooks/useEditor";
import { getFileIcon } from "../../utils/fileIcons";

function Tabs() {
  const { openFiles, activeFile, closeFile, setActiveFile } = useEditor();

  const formatTabName = (name) => {
    if (!name || typeof name !== "string") return "";
    return name.length > 20 ? `${name.slice(0, 20)}...` : name;
  };

  return (
    <div className="tabs">
      {openFiles.map((tab) => {
        const isArch = tab.type === "architecture" || tab.isArchitecture;
        const isApiClient = tab.type === "api-client" || tab.isApiClient;
        const isMongo = tab.type === "mongoschema" || tab.isMongoSchema;
        const isRoutes = tab.type === "backend-routes" || tab.isBackendRoutes;
        const isPreview = tab.type === "preview" || tab.isPreview;
        const icon = isArch ? (
          <FaProjectDiagram style={{ color: "#58a6ff" }} />
        ) : isApiClient ? (
          <GiCurledTentacle style={{ color: "#38bdf8" }} />
        ) : isMongo ? (
          <FaDatabase style={{ color: "#00ff88" }} />
        ) : isRoutes ? (
          <FaNetworkWired style={{ color: "#00ff88" }} />
        ) : isPreview ? (
          getFileIcon("preview")
        ) : (
          getFileIcon(tab.name)
        );
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
