import "./Explorer.css";
import { useEffect, useState, useRef } from "react";
import useFile from "../../hooks/useFile";
import useEditor from "../../hooks/useEditor";
import useTerminal from "../../hooks/useTerminal";
import ContextMenu from "../ContextMenu";
import { detectLanguage } from "../../services/sandboxService";

import {
  FaChevronRight,
  FaChevronDown,
  FaFolder,
  FaFolderOpen
} from "react-icons/fa";
import { FiFilePlus, FiFolderPlus, FiRefreshCw } from "react-icons/fi";
import { VscCollapseAll } from "react-icons/vsc";
import { getFileIcon } from "../../utils/fileIcons";

function Explorer() {
  const {
    workspaceTree,
    openFolder,
    reconnectFolder,
    refreshWorkspace,
    createFile,
    createFolder,
    needsPermission,
    persistedFolderInfo
  } = useFile();
  const { openFile, openPreviewTab } = useEditor();
  const { runActiveFile } = useTerminal();
  const [openFolders, setOpenFolders] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [contextMenu, setContextMenu] = useState({ isOpen: false, position: null, file: null });

  // VS Code-style inline file/folder creation
  const [inlineCreation, setInlineCreation] = useState(null); // { type: 'file' | 'folder', parentFolderId: string | null, targetFolder: object | null }
  const [inlineName, setInlineName] = useState("");
  const inlineInputRef = useRef(null);

  useEffect(() => {
    const defaultOpen = {};
    workspaceTree.forEach((item) => {
      if (item.type === "folder") {
        defaultOpen[item.id] = true;
      }
    });
    setOpenFolders(defaultOpen);
  }, [workspaceTree]);

  useEffect(() => {
    if (inlineCreation && inlineInputRef.current) {
      inlineInputRef.current.focus();
      inlineInputRef.current.select();
    }
  }, [inlineCreation]);

  function toggleFolder(folderName) {
    setOpenFolders({ ...openFolders, [folderName]: !openFolders[folderName] });
  }

  function getTargetFolder() {
    if (!selectedItem) {
      // Default to root workspace folder if available
      return workspaceTree.length > 0 && workspaceTree[0].type === "folder" ? workspaceTree[0] : null;
    }
    if (selectedItem.type === "folder") {
      return selectedItem;
    }
    // If a file is selected, find its containing folder
    const findParent = (items, targetId) => {
      for (const item of items) {
        if (item.children) {
          if (item.children.some((c) => c.id === targetId)) {
            return item;
          }
          const found = findParent(item.children, targetId);
          if (found) return found;
        }
      }
      return null;
    };
    return findParent(workspaceTree, selectedItem.id) || (workspaceTree[0]?.type === "folder" ? workspaceTree[0] : null);
  }

  function startInlineCreate(type) {
    const targetFolder = getTargetFolder();
    if (targetFolder) {
      setOpenFolders((prev) => ({ ...prev, [targetFolder.id]: true }));
    }
    setInlineCreation({
      type,
      parentFolderId: targetFolder ? targetFolder.id : null,
      targetFolder
    });
    setInlineName("");
  }

  async function commitInlineCreation() {
    const trimmed = inlineName.trim();
    if (!trimmed || !inlineCreation) {
      cancelInlineCreation();
      return;
    }

    const { type, targetFolder } = inlineCreation;
    setInlineCreation(null);
    setInlineName("");

    if (type === "file") {
      const created = await createFile(trimmed, targetFolder);
      if (created) {
        openFile(created);
      }
    } else {
      await createFolder(trimmed, targetFolder);
    }
  }

  function cancelInlineCreation() {
    setInlineCreation(null);
    setInlineName("");
  }

  function handleInlineKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitInlineCreation();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelInlineCreation();
    }
  }

  function handleFileContextMenu(e, file) {
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      file: file
    });
  }

  function handleOpenLiveServer() {
    if (contextMenu.file) {
      openPreviewTab(contextMenu.file);
    }
  }

  function handleRunCode() {
    if (contextMenu.file) {
      openFile(contextMenu.file);
      runActiveFile(contextMenu.file);
    }
  }

  function renderInlineInput(level) {
    return (
      <div key="inline-create-input-row" className="inline-create-row" style={{ paddingLeft: `${(level + 1) * 18}px` }}>
        {inlineCreation.type === "folder" ? (
          <FaFolder className="folder-icon" />
        ) : (
          getFileIcon(inlineName || "file")
        )}
        <input
          ref={inlineInputRef}
          type="text"
          className="inline-create-input"
          value={inlineName}
          onChange={(e) => setInlineName(e.target.value)}
          onKeyDown={handleInlineKeyDown}
          onBlur={commitInlineCreation}
          placeholder={inlineCreation.type === "file" ? "file.ext" : "folder"}
        />
      </div>
    );
  }

  function renderTree(items, level = 0, parentId = null) {
    const isTargetContainer = inlineCreation && inlineCreation.parentFolderId === parentId;

    const renderedItems = items.map((item) => {
      if (item.type === "folder") {
        const isOpen = openFolders[item.id] ?? level === 0;
        const isInlineInsideThisFolder = inlineCreation && inlineCreation.parentFolderId === item.id;

        return (
          <div key={item.id}>
            <div
              className={`folder ${selectedItem?.id === item.id ? "selected" : ""}`}
              style={{ paddingLeft: `${level * 18}px` }}
              onClick={() => {
                setSelectedItem(item);
                toggleFolder(item.id);
              }}
            >
              {isOpen ? <FaChevronDown /> : <FaChevronRight />}
              {isOpen ? <FaFolderOpen className="folder-icon" /> : <FaFolder className="folder-icon" />}
              <span>{item.name}</span>
            </div>
            {isOpen && (
              <div>
                {isInlineInsideThisFolder && renderInlineInput(level)}
                {item.children && renderTree(item.children, level + 1, item.id)}
              </div>
            )}
          </div>
        );
      }

      return (
        <div
          key={item.id}
          className={`file ${selectedItem?.id === item.id ? "selected" : ""}`}
          style={{ paddingLeft: `${(level + 1) * 18}px` }}
          onClick={() => {
            setSelectedItem(item);
            openFile(item);
          }}
          onContextMenu={(e) => handleFileContextMenu(e, item)}
        >
          {getFileIcon(item.name)}
          <span>{item.name}</span>
        </div>
      );
    });

    if (isTargetContainer && parentId === null) {
      renderedItems.unshift(renderInlineInput(level - 1));
    }

    return renderedItems;
  }

  return (
    <aside className="explorer">
      <div className="explorer-header">
        <span className="explorer-title">EXPLORER</span>
        <div className="explorer-actions">
          <button className="action-btn" onClick={() => startInlineCreate('file')} title="New File">
            <FiFilePlus />
          </button>
          <button className="action-btn" onClick={() => startInlineCreate('folder')} title="New Folder">
            <FiFolderPlus />
          </button>
          <button className="action-btn" onClick={refreshWorkspace} title="Refresh Explorer">
            <FiRefreshCw />
          </button>
          <button
            className="action-btn"
            title="Collapse All Folders"
            onClick={() => {
              const newState = !isCollapsed;
              setIsCollapsed(newState);
              if (newState) {
                const allClosed = {};
                workspaceTree.forEach((item) => {
                  if (item.type === "folder") {
                    allClosed[item.id] = false;
                  }
                });
                setOpenFolders(allClosed);
              } else {
                const rootOpen = {};
                workspaceTree.forEach((item) => {
                  if (item.type === "folder") {
                    rootOpen[item.id] = true;
                  }
                });
                setOpenFolders(rootOpen);
              }
            }}
          >
            <VscCollapseAll style={{ transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
          </button>
        </div>
      </div>
      <div className="explorer-body">
        {needsPermission && (
          <div className="explorer-permission-banner" onClick={reconnectFolder} title="Click to grant folder access">
            <span>⚡ Reconnect <strong>{persistedFolderInfo?.name || "Folder"}</strong></span>
          </div>
        )}
        {workspaceTree && workspaceTree.length > 0 ? (
          <div>
            {inlineCreation && inlineCreation.parentFolderId === null && renderInlineInput(-1)}
            {renderTree(workspaceTree)}
          </div>
        ) : (
          <div className="empty-state">
            <button className="open-folder-btn" onClick={openFolder}>
              <FaFolder />
              <span>Open Folder</span>
            </button>
          </div>
        )}
      </div>

      <ContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        file={contextMenu.file}
        onClose={() => setContextMenu({ isOpen: false, position: null, file: null })}
        onOpenLiveServer={handleOpenLiveServer}
        onRunCode={handleRunCode}
      />
    </aside>
  );
}

export default Explorer;