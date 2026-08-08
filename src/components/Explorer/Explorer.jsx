import "./Explorer.css";

import { useEffect, useState } from "react";
import useFile from "../../hooks/useFile";
import useEditor from "../../hooks/useEditor";
import ContextMenu from "../ContextMenu";
import { Button } from "../Button";
import Modal from "../Modal/Modal";

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
import { FiFilePlus, FiFolderPlus, FiRefreshCw } from "react-icons/fi";
import { VscCollapseAll } from "react-icons/vsc";

function Explorer() {
  const { workspaceTree, openFolder, refreshWorkspace, createFile, createFolder } = useFile();
  const { openFile, openPreviewTab } = useEditor();
  const [openFolders, setOpenFolders] = useState({});
  const [selectedFile, setSelectedFile] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [contextMenu, setContextMenu] = useState({ isOpen: false, position: null, file: null });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null); // 'file' or 'folder'
  const [inputValue, setInputValue] = useState('');

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

  function openModal(type) {
    setModalType(type);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setModalType(null);
    setInputValue('');
  }

  function handleInputChange(e) {
    setInputValue(e.target.value);
  }

  function handleSubmit() {
    if (inputValue) {
      if (modalType === 'file') {
        createFile(inputValue);
      } else if (modalType === 'folder') {
        createFolder(inputValue);
      }
      closeModal();
    }
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
      <div className="explorer-header">
        <span className="explorer-title">EXPLORER</span>
        <div className="explorer-actions">
          <button className="action-btn" onClick={() => openModal('file')}><FiFilePlus /></button>
          <button className="action-btn" onClick={() => openModal('folder')}><FiFolderPlus /></button>
          <button className="action-btn" onClick={refreshWorkspace}><FiRefreshCw /></button>
          <button className="action-btn" onClick={() => {
            const newState = !isCollapsed;
            setIsCollapsed(newState);
            if (newState) {
              // Collapse all folders
              const allClosed = {};
              workspaceTree.forEach(item => {
                if (item.type === 'folder') {
                  allClosed[item.id] = false;
                }
              });
              setOpenFolders(allClosed);
            } else {
              // Expand all root folders
              const rootOpen = {};
              workspaceTree.forEach(item => {
                if (item.type === 'folder') {
                  rootOpen[item.id] = true;
                }
              });
              setOpenFolders(rootOpen);
            }
          }}>
            <VscCollapseAll style={{ transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
          </button>
        </div>
      </div>
      <div className="explorer-body">
        {workspaceTree && workspaceTree.length > 0
          ? renderTree(workspaceTree)
          : <div className="empty-state">
              <button className="open-folder-btn" onClick={openFolder}>
                <FaFolder />
                <span>Open Folder</span>
              </button>
            </div>
          }
      </div>

      <ContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        onClose={() => setContextMenu({ isOpen: false, position: null, file: null })}
        onOpenLiveServer={handleOpenLiveServer}
        onRunCode={handleRunCode}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={modalType === 'file' ? 'Create New File' : 'Create New Folder'}
      >
        <div className="modal-content">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder={modalType === 'file' ? 'Enter file name...' : 'Enter folder name...'}
            autoFocus
          />
          <Button onClick={handleSubmit} text={modalType === 'file' ? 'Create File' : 'Create Folder'} />
        </div>
      </Modal>
    </aside>
  );
}

export default Explorer;