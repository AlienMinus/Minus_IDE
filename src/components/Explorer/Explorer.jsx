import "./Explorer.css";

import { useEffect, useState } from "react";
import useFile from "../../hooks/useFile";
import useEditor from "../../hooks/useEditor";
import ContextMenu from "../ContextMenu";

import {
  FaChevronRight,
  FaChevronDown,
  FaFolder,
  FaFolderOpen,
  FaReact,
  FaJsSquare,
  FaCss3Alt,
  FaHtml5,
  FaFileAlt,
  FaFilePdf,
  FaFileWord,
  FaFileExcel,
  FaFilePowerpoint,
  FaFileCode
} from "react-icons/fa";

const projectTree = [
  {
    name: "src",
    type: "folder",
    children: [
      {
        name: "components",
        type: "folder",
        children: [
          { name: "Navbar.jsx", type: "jsx" },
          { name: "Sidebar.jsx", type: "jsx" },
          { name: "Editor.jsx", type: "jsx" }
        ]
      },
      {
        name: "pages",
        type: "folder",
        children: [
          { name: "HomePage.jsx", type: "jsx" },
          { name: "SettingsPage.jsx", type: "jsx" }
        ]
      },
      { name: "App.jsx", type: "jsx" },
      { name: "App.css", type: "css" },
      { name: "main.jsx", type: "jsx" },
      { name: "index.css", type: "css" }
    ]
  },
  { name: "package.json", type: "json" },
  { name: "vite.config.js", type: "js" }
];

function Explorer() {
  const { workspaceTree } = useFile();
  const { openFile, openPreviewTab } = useEditor();
  const [openFolders, setOpenFolders] = useState({});
  const [selectedFile, setSelectedFile] = useState("");
  const [contextMenu, setContextMenu] = useState({ isOpen: false, position: null, file: null });

  useEffect(() => {
    const defaultOpen = {};
    workspaceTree.forEach((item) => {
      if (item.type === "folder") {
        defaultOpen[item.id] = true;
      }
    });
    setOpenFolders(defaultOpen);
  }, [workspaceTree]);

  function toggleFolder(folderName) {
    setOpenFolders({ ...openFolders, [folderName]: !openFolders[folderName] });
  }

  function handleFileContextMenu(e, file) {
    const fileType = file.language || file.name.split('.').pop().toLowerCase();
    if (fileType === "html") {
      e.preventDefault();
      setContextMenu({
        isOpen: true,
        position: { x: e.clientX, y: e.clientY },
        file: file
      });
    }
  }

  function handleOpenLiveServer() {
    if (contextMenu.file) {
      openPreviewTab(contextMenu.file);
    }
  }

  function handleRunCode() {
    if (contextMenu.file) {
      openFile(contextMenu.file);
    }
  }

  function getIcon(fileType) {
    switch (fileType) {
      case "jsx":
        return <FaReact className="react-file" />;
      case "js":
      case "ts":
      case "tsx":
      case "py":
      case "json":
      case "md":
      case "txt":
        return <FaFileCode className="code-file" />;
      case "css":
        return <FaCss3Alt className="css-file" />;
      case "html":
        return <FaHtml5 className="html-file" />;
      case "pdf":
        return <FaFilePdf className="pdf-file" />;
      case "doc":
      case "docx":
        return <FaFileWord className="word-file" />;
      case "xls":
      case "xlsx":
        return <FaFileExcel className="excel-file" />;
      case "ppt":
      case "pptx":
        return <FaFilePowerpoint className="ppt-file" />;
      default:
        return <FaFileAlt />;
    }
  }

  function renderTree(items, level = 0) {
    return items.map((item) => {
      if (item.type === "folder") {
        const isOpen = openFolders[item.id] ?? level === 0;

        return (
          <div key={item.id}>
            <div className="folder" style={{ paddingLeft: `${level * 18}px` }} onClick={() => toggleFolder(item.id)}>
              {isOpen ? <FaChevronDown /> : <FaChevronRight />}
              {isOpen ? <FaFolderOpen className="folder-icon" /> : <FaFolder className="folder-icon" />}
              <span>{item.name}</span>
            </div>
            {isOpen && item.children && renderTree(item.children, level + 1)}
          </div>
        );
      }

      const fileType = item.language || item.name.split('.').pop().toLowerCase();
      return (
        <div
          key={item.id}
          className={`file ${selectedFile === item.id ? "selected" : ""}`}
          style={{ paddingLeft: `${(level + 1) * 18}px` }}
          onClick={() => {
            setSelectedFile(item.id);
            openFile(item);
          }}
          onContextMenu={(e) => handleFileContextMenu(e, item)}
        >
          {getIcon(fileType)}
          <span>{item.name}</span>
        </div>
      );
    });
  }

  return (
    <aside className="explorer">
      <div className="explorer-header">EXPLORER</div>
      <div className="explorer-body">
        {workspaceTree && workspaceTree.length > 0
          ? renderTree(workspaceTree)
          : <div className="empty-state">Open a folder from File &gt; Open Folder to begin.</div>
        }
      </div>

      <ContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        onClose={() => setContextMenu({ isOpen: false, position: null, file: null })}
        onOpenLiveServer={handleOpenLiveServer}
        onRunCode={handleRunCode}
      />
    </aside>
  );
}

export default Explorer;