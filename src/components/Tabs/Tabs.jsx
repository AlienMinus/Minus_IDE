import "./Tabs.css";

import { FaReact, FaCss3Alt, FaJsSquare, FaTimes, FaFilePdf, FaFileWord, FaFileExcel, FaFilePowerpoint, FaFileAlt, FaGlobe } from "react-icons/fa";
import useEditor from "../../hooks/useEditor";

function Tabs() {
  const { openFiles, activeFile, closeFile, setActiveFile } = useEditor();

  function getFileType(tab) {
    if (tab.language) {
      return tab.language;
    }

    const extension = tab.name?.split(".").pop()?.toLowerCase();
    return extension || "file";
  }

  function getIcon(type) {
    switch (type) {
      case "jsx":
      case "javascript":
        return <FaReact className="tab-react" />;
      case "css":
        return <FaCss3Alt className="tab-css" />;
      case "js":
      case "ts":
      case "tsx":
      case "py":
      case "json":
      case "md":
      case "txt":
        return <FaJsSquare className="tab-js" />;
      case "pdf":
        return <FaFilePdf className="tab-pdf" />;
      case "doc":
      case "docx":
        return <FaFileWord className="tab-word" />;
      case "xls":
      case "xlsx":
        return <FaFileExcel className="tab-excel" />;
      case "ppt":
      case "pptx":
        return <FaFilePowerpoint className="tab-ppt" />;
      case "preview":
        return <FaGlobe className="tab-preview" />;
      default:
        return <FaFileAlt className="tab-file" />;
    }
  }

  return (
    <div className="tabs">
      {openFiles.map((tab) => {
        const type = getFileType(tab);
        return (
          <div
            key={tab.id}
            className={`tab ${activeFile?.id === tab.id ? "active-tab" : ""}`}
            onClick={() => setActiveFile(tab)}
          >
            {getIcon(type)}
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
        );
      })}
    </div>
  );
}

export default Tabs;