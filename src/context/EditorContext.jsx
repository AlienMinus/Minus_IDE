import { createContext, useState, useRef } from "react";
import fileTree from "../data/fileTree";
import { traverseDirectory, flattenFiles } from "../services/fileService";
import { loadEditorFile, saveEditorFile, refreshEditorContent } from "../services/editorService";

const initialFiles = flattenFiles(fileTree);

function extractTitleFromHtml(htmlContent) {
  if (!htmlContent) return null;
  const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i);
  return titleMatch ? titleMatch[1].trim() : null;
}

export const EditorContext = createContext(null);

export function EditorProvider({ children }) {
  const [workspaceTree, setWorkspaceTree] = useState(fileTree);
  const [workspaceHandle, setWorkspaceHandle] = useState(null);
  const [files, setFiles] = useState(initialFiles);
  const [openFiles, setOpenFiles] = useState(initialFiles.slice(0, 1));
  const [activeFile, setActiveFile] = useState(initialFiles[0] ?? null);

  async function openFolder() {
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
    const existingFile = files.find((f) => f.id === file.id) ?? file;
    let loadedFile = existingFile;

    if (loadedFile.handle && loadedFile.content == null) {
      loadedFile = await loadEditorFile(loadedFile);
      setFiles((prev) => prev.map((f) => (f.id === loadedFile.id ? loadedFile : f)));
      setOpenFiles((prev) => prev.map((f) => (f.id === loadedFile.id ? loadedFile : f)));
    }

    const alreadyOpen = openFiles.some((f) => f.id === loadedFile.id);
    if (!alreadyOpen) {
      setOpenFiles((prev) => [...prev, loadedFile]);
    }

    setActiveFile(loadedFile);
  }

  async function saveActiveFile() {
    if (!activeFile) return;
    if (!activeFile.handle) {
      alert("Unable to save this file. Open a folder first.");
      return;
    }

    try {
      await saveEditorFile(activeFile);
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

  const editorRef = useRef(null);
  const [sidebarActive, setSidebarActive] = useState("explorer");
  const [searchQuery, setSearchQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [isReplaceOpen, setIsReplaceOpen] = useState(false);

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
        workspaceTree,
        workspaceHandle,
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
        toggleLineComment,
        toggleBlockComment,
        expandEmmet
      }}
    >
      {children}
    </EditorContext.Provider>
  );
}
