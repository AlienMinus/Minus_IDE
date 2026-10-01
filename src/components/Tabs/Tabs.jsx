import "./Tabs.css";

import { FaReact, FaCss3Alt, FaJsSquare, FaTimes, FaFilePdf, FaFileWord, FaFileExcel, FaFilePowerpoint, FaFileAlt, FaGlobe, FaPython, FaTerminal, FaCode } from "react-icons/fa";
import useEditor from "../../hooks/useEditor";

function Tabs() {
  const { openFiles, activeFile, closeFile, setActiveFile } = useEditor();

  function getFileType(tab) {
    if (tab.language) {
      return tab.language.toLowerCase();
    }

    const extension = tab.name?.split(".").pop()?.toLowerCase();
    return extension || "file";
  }

  function getIcon(type) {
    switch (type) {
      case "jsx":
      case "tsx":
      case "react":
        return <FaReact className="tab-react" />;
      case "css":
        return <FaCss3Alt className="tab-css" />;
      case "js":
      case "javascript":
      case "ts":
      case "json":
        return <FaJsSquare className="tab-js" />;
      case "py":
      case "python":
        return <FaPython style={{ color: "#387eb8" }} />;
      case "c":
      case "cpp":
        return <FaCode style={{ color: "#a8b9cc" }} />;
      case "sh":
      case "bash":
        return <FaTerminal style={{ color: "#4eaa25" }} />;
      case "md":
      case "txt":
        return <FaFileAlt className="tab-file" />;
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