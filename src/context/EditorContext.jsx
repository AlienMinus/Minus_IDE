import { createContext, useState } from "react";
import fileTree from "../data/fileTree";
import { traverseDirectory, flattenFiles } from "../services/fileService";
import { loadEditorFile, saveEditorFile, refreshEditorContent } from "../services/editorService";

const initialFiles = flattenFiles(fileTree);

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
        closeFile,
        updateContent,
        saveActiveFile,
        setActiveFile,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
}
