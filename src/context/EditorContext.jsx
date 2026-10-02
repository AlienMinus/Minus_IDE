import { createContext, useState, useRef, useContext, useEffect } from "react";
import fileTree from "../data/fileTree";
import { traverseDirectory, flattenFiles } from "../services/fileService";
import { loadEditorFile, saveEditorFile, refreshEditorContent } from "../services/editorService";
import { FileContext } from "./FileContext";
import { saveWorkspaceState, getStoredWorkspaceState } from "../services/workspacePersistence";

const initialFiles = flattenFiles(fileTree);

function extractTitleFromHtml(htmlContent) {
  if (!htmlContent) return null;
  const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i);
  return titleMatch ? titleMatch[1].trim() : null;
}

export const EditorContext = createContext(null);

export function EditorProvider({ children }) {
  const fileContext = useContext(FileContext);
  const initialCached = getStoredWorkspaceState();

  const [workspaceTree, setWorkspaceTree] = useState(() => {
    return initialCached?.workspaceTree && initialCached.workspaceTree.length > 0
      ? initialCached.workspaceTree
      : fileTree;
  });
  const [workspaceHandle, setWorkspaceHandle] = useState(null);

  const [files, setFiles] = useState(() => {
    if (initialCached?.workspaceTree && initialCached.workspaceTree.length > 0) {
      return flattenFiles(initialCached.workspaceTree);
    }
    return initialFiles;
  });

  const [openFiles, setOpenFiles] = useState(() => {
    if (initialCached?.openFiles && initialCached.openFiles.length > 0) {
      return initialCached.openFiles;
    }
    return initialFiles.slice(0, 1);
  });

  const [activeFile, setActiveFile] = useState(() => {
    if (initialCached?.openFiles && initialCached.openFiles.length > 0) {
      if (initialCached.activeFileId) {
        const found = initialCached.openFiles.find((f) => f.id === initialCached.activeFileId);
        if (found) return found;
      }
      return initialCached.openFiles[0];
    }
    return initialFiles[0] ?? null;
  });

  const editorRef = useRef(null);
  const [sidebarActive, setSidebarActive] = useState(() => {
    return initialCached?.sidebarActive || "explorer";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [isReplaceOpen, setIsReplaceOpen] = useState(false);
  const [problems, setProblems] = useState([]);

  // View & Layout states
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(true);
  const [bottomPanelTab, setBottomPanelTab] = useState("Terminal");
  const [isStatusBarVisible, setIsStatusBarVisible] = useState(true);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [commandPaletteMode, setCommandPaletteMode] = useState("commands"); // "commands" | "views"
  const [isWordWrapOn, setIsWordWrapOn] = useState(true);

  function toggleWordWrap() {
    setIsWordWrapOn((prev) => {
      const next = !prev;
      if (editorRef.current) {
        editorRef.current.updateOptions({ wordWrap: next ? "on" : "off" });
      }
      return next;
    });
  }

  function toggleSidebar() {
    setIsSidebarVisible((prev) => !prev);
  }

  function toggleBottomPanel() {
    setIsBottomPanelOpen((prev) => !prev);
  }

  function toggleStatusBar() {
    setIsStatusBarVisible((prev) => !prev);
  }

  function toggleZenMode() {
    setIsZenMode((prev) => !prev);
  }

  function toggleFullScreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  function openView(viewId) {
    switch (viewId) {
      case "explorer":
        setSidebarActive("explorer");
        setIsSidebarVisible(true);
        break;
      case "search":
        setSidebarActive("search");
        setIsSidebarVisible(true);
        break;
      case "git":
      case "sourceControl":
        setSidebarActive("git");
        setIsSidebarVisible(true);
        break;
      case "run":
        setSidebarActive("run");
        setIsSidebarVisible(true);
        break;
      case "extensions":
        setSidebarActive("extensions");
        setIsSidebarVisible(true);
        break;
      case "problems":
        setBottomPanelTab("Problems");
        setIsBottomPanelOpen(true);
        break;
      case "output":
        setBottomPanelTab("Output");
        setIsBottomPanelOpen(true);
        break;
      case "debugConsole":
        setBottomPanelTab("Debug Console");
        setIsBottomPanelOpen(true);
        break;
      case "terminal":
        setBottomPanelTab("Terminal");
        setIsBottomPanelOpen(true);
        break;
      case "ports":
        setBottomPanelTab("Ports");
        setIsBottomPanelOpen(true);
        break;
      case "repl":
        setBottomPanelTab("REPL");
        setIsBottomPanelOpen(true);
        break;
      case "browser":
        openLiveBrowserTab("http://localhost:5173", "Live Browser Preview");
        break;
      default:
        break;
    }
  }

  function jumpToProblem(problem) {
    if (!problem) return;
    if (problem.fileId || problem.filename) {
      const target = openFiles.find(
        (f) => f.id === problem.fileId || f.name === problem.filename || f.path === problem.filename
      ) || files.find((f) => f.name === problem.filename || f.path === problem.filename);
      if (target && target.id !== activeFile?.id) {
        openFile(target);
      }
    }
    setTimeout(() => {
      if (editorRef.current) {
        const line = problem.startLineNumber || problem.lineNumber || 1;
        const col = problem.startColumn || problem.column || 1;
        editorRef.current.revealPositionInCenter({ lineNumber: line, column: col });
        editorRef.current.setPosition({ lineNumber: line, column: col });
        editorRef.current.focus();
      }
    }, 60);
  }

  // Sync files and handles from FileContext
  useEffect(() => {
    if (fileContext?.files && fileContext.files.length > 0) {
      setFiles((prevFiles) => {
        return fileContext.files.map((fcFile) => {
          const inMemoryOpen = openFiles.find((of) => of.id === fcFile.id || of.path === fcFile.path);
          if (inMemoryOpen && inMemoryOpen.content != null) {
            return { ...fcFile, content: inMemoryOpen.content };
          }
          return fcFile;
        });
      });

      // Attach live handles to openFiles
      setOpenFiles((prevOpen) => {
        return prevOpen.map((tab) => {
          const match = fileContext.files.find((f) => f.id === tab.id || f.path === tab.path);
          if (match?.handle) {
            return { ...tab, handle: match.handle };
          }
          return tab;
        });
      });

      // Attach live handle to activeFile
      setActiveFile((prevActive) => {
        if (!prevActive) return prevActive;
        const match = fileContext.files.find((f) => f.id === prevActive.id || f.path === prevActive.path);
        if (match?.handle) {
          return { ...prevActive, handle: match.handle };
        }
        return prevActive;
      });
    }
  }, [fileContext?.files]);

  // Persist openFiles, activeFile, and sidebar tab in LocalStorage
  useEffect(() => {
    saveWorkspaceState({
      openFiles,
      activeFileId: activeFile?.id || null,
      sidebarActive
    });
  }, [openFiles, activeFile, sidebarActive]);

  async function openFolder() {
    if (fileContext?.openFolder) {
      await fileContext.openFolder();
      setOpenFiles([]);
      setActiveFile(null);
      return;
    }

    if (!window.showDirectoryPicker) {
      alert("Your browser does not support the File System Access API.");
      return;
    }

    try {
      const dirHandle = await window.showDirectoryPicker();
      const tree = [
        {
          id: dirHandle.name,
          name: dirHandle.name,
          type: "folder",
          path: dirHandle.name,
          handle: dirHandle,
          children: await traverseDirectory(dirHandle, dirHandle.name)
        }
      ];

      const flatFiles = flattenFiles(tree);
      setWorkspaceHandle(dirHandle);
      setWorkspaceTree(tree);
      setFiles(flatFiles);
      setOpenFiles([]);
      setActiveFile(null);
    } catch (error) {
      console.error("Failed to open folder:", error);
    }
  }

  async function openFile(file) {
    const existingFile =
      files.find((f) => f.id === file.id || f.path === file.path) ||
      fileContext?.files?.find((f) => f.id === file.id || f.path === file.path) ||
      file;

    let loadedFile = { ...existingFile, ...file };

    if (loadedFile.handle && loadedFile.content == null && !loadedFile.isBinary) {
      loadedFile = await loadEditorFile(loadedFile);
      setFiles((prev) => prev.map((f) => (f.id === loadedFile.id ? loadedFile : f)));
    }

    setOpenFiles((prev) => {
      const alreadyOpenIndex = prev.findIndex((f) => f.id === loadedFile.id);
      if (alreadyOpenIndex >= 0) {
        return prev.map((f, i) => (i === alreadyOpenIndex ? { ...f, ...loadedFile } : f));
      }
      return [...prev, loadedFile];
    });

    setActiveFile(loadedFile);
  }

  async function saveActiveFile() {
    if (!activeFile) return;

    let targetHandle = activeFile.handle;
    if (!targetHandle && fileContext?.files) {
      const match = fileContext.files.find((f) => f.id === activeFile.id || f.path === activeFile.path);
      if (match?.handle) {
        targetHandle = match.handle;
        activeFile.handle = match.handle;
      }
    }

    if (!targetHandle) {
      alert("Unable to save this file. Open a folder first.");
      return;
    }

    try {
      await saveEditorFile({ ...activeFile, handle: targetHandle });
      alert(`Saved ${activeFile.name}`);
    } catch (error) {
      console.error("Save failed:", error);
      alert("Failed to save file.");
    }
  }

  function closeFile(id) {
    const updated = openFiles.filter((file) => file.id !== id);

    setOpenFiles(updated);

    if (activeFile && activeFile.id === id) {
      setActiveFile(updated[0] ?? null);
    }
  }

  function updateContent(value) {
    if (!activeFile) return;

    const { updatedFiles, updatedOpenFiles, updatedActiveFile } = refreshEditorContent(
      activeFile.id,
      files,
      openFiles,
      activeFile,
      value
    );

    setFiles(updatedFiles);
    setOpenFiles(updatedOpenFiles);
    setActiveFile(updatedActiveFile);
  }

  function openPreviewTab(file) {
    const htmlTitle = extractTitleFromHtml(file.content);
    const tabName = htmlTitle || file.name;

    const previewTab = {
      id: `preview-${file.id}`,
      name: tabName,
      type: "preview",
      sourceFile: file,
      isPreview: true,
      htmlTitle: htmlTitle
    };

    const alreadyOpen = openFiles.some((f) => f.id === previewTab.id);
    if (!alreadyOpen) {
      setOpenFiles((prev) => [...prev, previewTab]);
    }

    setActiveFile(previewTab);
  }

  function openLiveBrowserTab(targetUrl, tabTitle) {
    if (!targetUrl) return null;
    let cleanUrl = targetUrl.trim();
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = "http://" + cleanUrl;
    }
    const tabId = `browser-${cleanUrl}`;
    const name = tabTitle || `Preview: ${cleanUrl.replace(/^https?:\/\//, '')}`;

    setOpenFiles((prev) => {
      const existing = prev.find((f) => f.id === tabId || f.url === cleanUrl);
      if (existing) {
        setActiveFile(existing);
        return prev;
      }
      const newTab = {
        id: tabId,
        name,
        type: "browser",
        isPreview: true,
        isLiveUrl: true,
        url: cleanUrl
      };
      setActiveFile(newTab);
      return [...prev, newTab];
    });
  }

  function setEditorInstance(editor) {
    editorRef.current = editor;
  }

  function getSelectedText() {
    if (!editorRef.current) return "";
    const model = editorRef.current.getModel();
    const selection = editorRef.current.getSelection();
    return model && selection ? model.getValueInRange(selection) : "";
  }

  function createOrOpenFile(filename, content = "") {
    const existing = files.find((f) => f.name === filename || f.path === filename);
    if (existing) {
      openFile(existing);
      return existing;
    }
    const newFile = {
      id: filename,
      name: filename.split("/").pop(),
      path: filename,
      language: filename.endsWith(".json") ? "json" : "javascript",
      content
    };
    setFiles((prev) => [...prev, newFile]);
    setOpenFiles((prev) => [...prev, newFile]);
    setActiveFile(newFile);
    return newFile;
  }

  // --- Edit Operations ---
  function undo() {
    if (editorRef.current) {
      editorRef.current.focus();
      editorRef.current.trigger("hyperion", "undo", null);
    }
  }

  function redo() {
    if (editorRef.current) {
      editorRef.current.focus();
      editorRef.current.trigger("hyperion", "redo", null);
    }
  }

  function cut() {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const selection = editorRef.current.getSelection();
    const model = editorRef.current.getModel();
    if (model && selection && !selection.isEmpty()) {
      const text = model.getValueInRange(selection);
      navigator.clipboard.writeText(text);
      editorRef.current.executeEdits("cut", [
        { range: selection, text: "", forceMoveMarkers: true }
      ]);
    }
  }

  function copy() {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const selection = editorRef.current.getSelection();
    const model = editorRef.current.getModel();
    if (model && selection && !selection.isEmpty()) {
      const text = model.getValueInRange(selection);
      navigator.clipboard.writeText(text);
    }
  }

  function paste() {
    if (!editorRef.current) return;
    editorRef.current.focus();
    navigator.clipboard
      .readText()
      .then((text) => {
        if (text && editorRef.current) {
          const selection = editorRef.current.getSelection();
          editorRef.current.executeEdits("paste", [
            { range: selection, text, forceMoveMarkers: true }
          ]);
        }
      })
      .catch(() => {
        editorRef.current?.trigger("hyperion", "editor.action.clipboardPasteAction", null);
      });
  }

  function find() {
    if (editorRef.current) {
      editorRef.current.focus();
      editorRef.current.trigger("hyperion", "actions.find", null);
    }
  }

  function replace() {
    if (editorRef.current) {
      editorRef.current.focus();
      editorRef.current.trigger("hyperion", "editor.action.startFindReplaceAction", null);
    }
  }

  function findInFiles(initialQuery = "") {
    setSidebarActive("search");
    setIsReplaceOpen(false);
    if (initialQuery) {
      setSearchQuery(initialQuery);
    } else {
      const sel = getSelectedText();
      if (sel) setSearchQuery(sel);
    }
  }

  function replaceInFiles(initialQuery = "") {
    setSidebarActive("search");
    setIsReplaceOpen(true);
    if (initialQuery) {
      setSearchQuery(initialQuery);
    } else {
      const sel = getSelectedText();
      if (sel) setSearchQuery(sel);
    }
  }

  function toggleLineComment() {
    if (editorRef.current) {
      editorRef.current.focus();
      editorRef.current.trigger("hyperion", "editor.action.commentLine", null);
    }
  }

  function toggleBlockComment() {
    if (editorRef.current) {
      editorRef.current.focus();
      editorRef.current.trigger("hyperion", "editor.action.blockComment", null);
    }
  }

  function expandEmmet() {
    if (editorRef.current) {
      editorRef.current.focus();
      import("../utils/emmetHelper").then(({ executeMonacoEmmet }) => {
        executeMonacoEmmet(editorRef.current);
      });
    }
  }

  return (
    <EditorContext.Provider
      value={{
        workspaceTree: fileContext?.workspaceTree || workspaceTree,
        workspaceHandle: fileContext?.workspaceHandle || workspaceHandle,
        files,
        openFiles,
        activeFile,
        openFolder,
        openFile,
        openPreviewTab,
        closeFile,
        updateContent,
        saveActiveFile,
        setActiveFile,
        editorRef,
        setEditorInstance,
        getSelectedText,
        createOrOpenFile,
        sidebarActive,
        setSidebarActive,
        searchQuery,
        setSearchQuery,
        replaceQuery,
        setReplaceQuery,
        isReplaceOpen,
        setIsReplaceOpen,
        undo,
        redo,
        cut,
        copy,
        paste,
        find,
        replace,
        findInFiles,
        replaceInFiles,
        openLiveBrowserTab,
        toggleLineComment,
        toggleBlockComment,
        expandEmmet,
        problems,
        setProblems,
        jumpToProblem,
        isSidebarVisible,
        setIsSidebarVisible,
        isBottomPanelOpen,
        setIsBottomPanelOpen,
        bottomPanelTab,
        setBottomPanelTab,
        isStatusBarVisible,
        setIsStatusBarVisible,
        isZenMode,
        setIsZenMode,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        commandPaletteMode,
        setCommandPaletteMode,
        isWordWrapOn,
        toggleWordWrap,
        toggleSidebar,
        toggleBottomPanel,
        toggleStatusBar,
        toggleZenMode,
        toggleFullScreen,
        openView
      }}
    >
      {children}
    </EditorContext.Provider>
  );
}
