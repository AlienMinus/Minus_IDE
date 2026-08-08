import { createContext, useMemo, useState } from "react";
import { flattenFiles, traverseDirectory, readFileContent, writeFileContent } from "../services/fileService";

export const FileContext = createContext(null);

export function FileProvider({ children }) {
  const [workspaceTree, setWorkspaceTree] = useState([]);
  const [workspaceHandle, setWorkspaceHandle] = useState(null);
  const [files, setFiles] = useState([]);

  async function openFolder() {
    if (!window.showDirectoryPicker) {
      alert("Your browser does not support the File System Access API.");
      return;
    }

    try {
      const dirHandle = await window.showDirectoryPicker();
      const children = await traverseDirectory(dirHandle, dirHandle.name);
      const tree = [
        {
          id: dirHandle.name,
          name: dirHandle.name,
          type: "folder",
          path: dirHandle.name,
          handle: dirHandle,
          children
        }
      ];

      setWorkspaceHandle(dirHandle);
      setWorkspaceTree(tree);
      setFiles(flattenFiles(tree));
    } catch (error) {
      console.error("Failed to open folder:", error);
    }
  }

  async function refreshWorkspace() {
    if (!workspaceHandle) return;
    try {
      const children = await traverseDirectory(workspaceHandle, workspaceHandle.name);
      const tree = [
        {
          id: workspaceHandle.name,
          name: workspaceHandle.name,
          type: "folder",
          path: workspaceHandle.name,
          handle: workspaceHandle,
          children
        }
      ];
      setWorkspaceTree(tree);
      setFiles(flattenFiles(tree));
    } catch (error) {
      console.error("Failed to refresh workspace:", error);
    }
  }

  async function createFile(name) {
    if (!workspaceHandle) return;
    try {
      await workspaceHandle.getFileHandle(name, { create: true });
      await refreshWorkspace();
    } catch (error) {
      console.error("Failed to create file:", error);
    }
  }

  async function createFolder(name) {
    if (!workspaceHandle) return;
    try {
      await workspaceHandle.getDirectoryHandle(name, { create: true });
      await refreshWorkspace();
    } catch (error) {
      console.error("Failed to create folder:", error);
    }
  }

  async function loadFileContent(file) {
    if (!file?.handle) return null;
    return await readFileContent(file.handle);
  }

  async function saveFile(file, content) {
    if (!file?.handle) {
      alert("Unable to save this file. Open a folder first.");
      return;
    }

    try {
      await writeFileContent(file.handle, content || "");
      return true;
    } catch (error) {
      console.error("Save failed:", error);
      alert("Failed to save file.");
      return false;
    }
  }

  const value = useMemo(
    () => ({
      workspaceTree,
      workspaceHandle,
      files,
      openFolder,
      refreshWorkspace,
      createFile,
      createFolder,
      loadFileContent,
      saveFile
    }),
    [workspaceTree, workspaceHandle, files]
  );

  return <FileContext.Provider value={value}>{children}</FileContext.Provider>;
}
