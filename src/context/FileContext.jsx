import { createContext, useMemo, useState } from "react";
import { flattenFiles, traverseDirectory, readFileContent, writeFileContent } from "../services/fileService";
import fileTree from "../data/fileTree";

export const FileContext = createContext(null);

export function FileProvider({ children }) {
  const [workspaceTree, setWorkspaceTree] = useState(fileTree);
  const [workspaceHandle, setWorkspaceHandle] = useState(null);
  const [files, setFiles] = useState(flattenFiles(fileTree));

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
      loadFileContent,
      saveFile
    }),
    [workspaceTree, workspaceHandle, files]
  );

  return <FileContext.Provider value={value}>{children}</FileContext.Provider>;
}
