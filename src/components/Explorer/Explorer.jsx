import "./Explorer.css";

import { useState } from "react";
import useEditor from "../../hooks/useEditor";

import {
  FaChevronRight,
  FaChevronDown,
  FaFolder,
  FaFolderOpen,
  FaReact,
  FaJsSquare,
  FaCss3Alt,
  FaHtml5,
  FaFileAlt
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
  const { files, openFile } = useEditor();
  const [openFolders, setOpenFolders] = useState({ src: true, components: true, pages: true });
  const [selectedFile, setSelectedFile] = useState("");

  function toggleFolder(folderName) {
    setOpenFolders({ ...openFolders, [folderName]: !openFolders[folderName] });
  }

  function getIcon(type) {
    switch (type) {
      case "jsx":
        return <FaReact className="react-file" />;
      case "js":
        return <FaJsSquare className="js-file" />;
      case "css":
        return <FaCss3Alt className="css-file" />;
      case "html":
        return <FaHtml5 className="html-file" />;
      default:
        return <FaFileAlt />;
    }
  }

  function renderTree(items, level = 0) {
    return items.map((item) => {
      if (item.type === "folder") {
        return (
          <div key={item.name}>
            <div className="folder" style={{ paddingLeft: `${level * 18}px` }} onClick={() => toggleFolder(item.name)}>
              {openFolders[item.name] ? <FaChevronDown /> : <FaChevronRight />}
              {openFolders[item.name] ? <FaFolderOpen className="folder-icon" /> : <FaFolder className="folder-icon" />}
              <span>{item.name}</span>
            </div>
            {openFolders[item.name] && renderTree(item.children, level + 1)}
          </div>
        );
      }

      const editorFile = files.find((file) => file.name === item.name);

      return (
        <div
          key={item.name}
          className={`file ${selectedFile === item.name ? "selected" : ""}`}
          style={{ paddingLeft: `${(level + 1) * 18}px` }}
          onClick={() => {
            setSelectedFile(item.name);
            if (editorFile) {
              openFile(editorFile);
            }
          }}
        >
          {getIcon(item.type)}
          <span>{item.name}</span>
        </div>
      );
    });
  }

  return (
    <aside className="explorer">
      <div className="explorer-header">EXPLORER</div>
      <div className="explorer-body">{renderTree(projectTree)}</div>
    </aside>
  );
}

export default Explorer;