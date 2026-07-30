import "./Tabs.css";

import { FaReact, FaCss3Alt, FaJsSquare, FaTimes } from "react-icons/fa";
import useEditor from "../../hooks/useEditor";

function Tabs() {
  const { openFiles, activeFile, closeFile, setActiveFile } = useEditor();

  function getIcon(type) {
    switch (type) {
      case "jsx":
      case "javascript":
        return <FaReact className="tab-react" />;
      case "css":
        return <FaCss3Alt className="tab-css" />;
      case "js":
        return <FaJsSquare className="tab-js" />;
      default:
        return <FaJsSquare />;
    }
  }

  return (
    <div className="tabs">
      {openFiles.map((tab) => (
        <div
          key={tab.id}
          className={`tab ${activeFile?.id === tab.id ? "active-tab" : ""}`}
          onClick={() => setActiveFile(tab)}
        >
          {getIcon(tab.language || "jsx")}
          <span>{tab.name}</span>
          <button
            className="close-btn"
            onClick={(e) => {
              e.stopPropagation();
              closeFile(tab.id);
            }}
          >
            <FaTimes />
          </button>
        </div>
      ))}
    </div>
  );
}

export default Tabs;