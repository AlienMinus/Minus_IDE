import { createContext, useMemo, useState, useEffect, useCallback } from "react";
import { flattenFiles, traverseDirectory, readFileContent, writeFileContent } from "../services/fileService";
import {
  saveDirectoryHandle,
  getStoredDirectoryHandle,
  verifyHandlePermission,
  saveWorkspaceState,
  getStoredWorkspaceState,
  clearWorkspaceState,
  recordRecentWorkspace
} from "../services/workspacePersistence";
import {
  resolveWorkspacePath,
  fetchWorkspaceTree,
  validateWorkspacePath
} from "../services/sandboxService";

export const FileContext = createContext(null);

export function FileProvider({ children }) {
  const [workspaceTree, setWorkspaceTree] = useState([]);
  const [workspaceHandle, setWorkspaceHandle] = useState(null);
  const [files, setFiles] = useState([]);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [persistedFolderInfo, setPersistedFolderInfo] = useState(null);

  // Auto-restore last loaded folder on page refresh
  useEffect(() => {
    let isCancelled = false;

    async function autoRestoreWorkspace() {
      // 1. Immediately restore cached workspace snapshot so UI doesn't lose tree/files
      const cached = getStoredWorkspaceState();
      if (cached && cached.workspaceTree && cached.workspaceTree.length > 0) {
        setWorkspaceTree(cached.workspaceTree);
        setFiles(flattenFiles(cached.workspaceTree));
        const hasRealDiskPath =
          cached.folderPath &&
          cached.folderPath !== cached.folderName &&
          (cached.folderPath.includes(":") || cached.folderPath.includes("/"));

        setPersistedFolderInfo({
          name: cached.folderName || cached.workspaceTree[0]?.name || "Workspace",
          path: hasRealDiskPath ? cached.folderPath : (cached.folderPath || "")
        });

        // If path was only a folder name without drive/root, resolve host path
        if (!hasRealDiskPath && (cached.folderName || cached.workspaceTree[0]?.name)) {
          const topSamples = (cached.workspaceTree[0]?.children || []).map((c) => c.name);
          resolveWorkspacePath({
            folderName: cached.folderName || cached.workspaceTree[0]?.name,
            sampleFiles: topSamples
          }).then((resolved) => {
            if (resolved && !isCancelled) {
              setPersistedFolderInfo((prev) => ({ ...prev, path: resolved }));
              saveWorkspaceState({ folderPath: resolved });
            }
          });
        }
      }

      // 2. Query stored handle from IndexedDB
      const handle = await getStoredDirectoryHandle();
      if (!handle || isCancelled) return;

      setWorkspaceHandle(handle);

      // 3. Check if permission is already active
      const hasPermission = await verifyHandlePermission(handle, false);
      if (hasPermission) {
        try {
          const children = await traverseDirectory(handle, handle.name);
          const tree = [
            {
              id: handle.name,
              name: handle.name,
              type: "folder",
              path: handle.name,
              handle,
              children
            }
          ];

          // Resolve actual OS disk path
          const topLevelFiles = children.map((c) => c.name);
          const resolvedDiskPath =
            (await resolveWorkspacePath({ folderName: handle.name, sampleFiles: topLevelFiles })) ||
            cached?.folderPath ||
            handle.name;

          if (!isCancelled) {
            setWorkspaceTree(tree);
            const flat = flattenFiles(tree);
            setFiles(flat);
            setNeedsPermission(false);
            setPersistedFolderInfo({
              name: handle.name,
              path: resolvedDiskPath
            });
            // Update cached snapshot
            saveWorkspaceState({
              folderName: handle.name,
              folderPath: resolvedDiskPath,
              workspaceTree: tree
            });
          }
        } catch (err) {
          console.warn("Auto-restore directory traverse failed:", err);
        }
      } else {
        if (!isCancelled) {
          setNeedsPermission(true);
        }
      }
    }

    autoRestoreWorkspace();

    return () => {
      isCancelled = true;
    };
  }, []);

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

      // Resolve host OS path (e.g. E:\Portfolio\portfolio_v1)
      const topLevelFiles = children.map((c) => c.name);
      const resolvedDiskPath =
        (await resolveWorkspacePath({ folderName: dirHandle.name, sampleFiles: topLevelFiles })) ||
        dirHandle.name;

      setWorkspaceHandle(dirHandle);
      setWorkspaceTree(tree);
      const flat = flattenFiles(tree);
      setFiles(flat);
      setNeedsPermission(false);
      setPersistedFolderInfo({
        name: dirHandle.name,
        path: resolvedDiskPath
      });

      // Persist handle in IndexedDB & snapshot in LocalStorage
      await saveDirectoryHandle(dirHandle);
      saveWorkspaceState({
        folderName: dirHandle.name,
        folderPath: resolvedDiskPath,
        workspaceTree: tree
      });
      recordRecentWorkspace(resolvedDiskPath || dirHandle.name);
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Failed to open folder:", error);
      }
    }
  }

  async function openFolderByPath(targetPath) {
    if (!targetPath) return;
    try {
      const valid = await validateWorkspacePath(targetPath);
      if (!valid.exists) {
        alert(`Directory not found: ${targetPath}`);
        return false;
      }

      const folderName = valid.name || targetPath.split(/[\\/]/).pop() || "Workspace";
      const treeNodes = await fetchWorkspaceTree(valid.path);
      const tree = [
        {
          id: valid.path,
          name: folderName,
          type: "folder",
          path: valid.path,
          children: treeNodes
        }
      ];

      setWorkspaceHandle(null);
      setWorkspaceTree(tree);
      const flat = flattenFiles(tree);
      setFiles(flat);
      setNeedsPermission(false);
      setPersistedFolderInfo({
        name: folderName,
        path: valid.path
      });

      saveWorkspaceState({
        folderName,
        folderPath: valid.path,
        workspaceTree: tree
      });
      recordRecentWorkspace(valid.path);
      return true;
    } catch (err) {
      console.error("Failed to open folder by path:", err);
      return false;
    }
  }

  function closeFolder() {
    setWorkspaceHandle(null);
    setWorkspaceTree([]);
    setFiles([]);
    setPersistedFolderInfo(null);
    clearWorkspaceState();
  }

  async function addDirectoryToWorkspace() {
    if (window.showDirectoryPicker) {
      try {
        const dirHandle = await window.showDirectoryPicker();
        const children = await traverseDirectory(dirHandle, dirHandle.name);
        const newNode = {
          id: dirHandle.name + "_" + Date.now(),
          name: dirHandle.name,
          type: "folder",
          path: dirHandle.name,
          handle: dirHandle,
          children
        };
        setWorkspaceTree((prev) => {
          const updated = [...prev, newNode];
          setFiles(flattenFiles(updated));
          return updated;
        });
        recordRecentWorkspace(dirHandle.name);
        return true;
      } catch (err) {
        if (err.name === "AbortError") return false;
      }
    }
    const targetPath = window.prompt("Enter local directory path to add to workspace:");
    if (!targetPath || !targetPath.trim()) return false;
    try {
      const valid = await validateWorkspacePath(targetPath.trim());
      if (!valid.exists) {
        alert(`Directory not found: ${targetPath}`);
        return false;
      }
      const folderName = valid.name || targetPath.trim().split(/[\\/]/).pop() || "Workspace";
      const treeNodes = await fetchWorkspaceTree(valid.path);
      const newNode = {
        id: valid.path,
        name: folderName,
        type: "folder",
        path: valid.path,
        children: treeNodes
      };
      setWorkspaceTree((prev) => {
        const updated = [...prev, newNode];
        setFiles(flattenFiles(updated));
        return updated;
      });
      recordRecentWorkspace(valid.path);
      return true;
    } catch (err) {
      console.error("Failed to add directory to workspace:", err);
      return false;
    }
  }

  function setWorkspacePath(newPath) {
    if (!newPath) return;
    setPersistedFolderInfo((prev) => ({
      name: prev?.name || newPath.split(/[\\/]/).pop(),
      path: newPath
    }));
    saveWorkspaceState({ folderPath: newPath });
  }

  async function reconnectFolder() {
    if (!workspaceHandle) {
      // Re-trigger directory picker if handle was lost
      await openFolder();
      return;
    }

    try {
      const granted = await verifyHandlePermission(workspaceHandle, true);
      if (granted) {
        await refreshWorkspace();
        setNeedsPermission(false);
      }
    } catch (err) {
      console.warn("Failed to reconnect folder permission:", err);
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
      const flat = flattenFiles(tree);
      setFiles(flat);
      saveWorkspaceState({
        folderName: workspaceHandle.name,
        folderPath: workspaceHandle.name,
        workspaceTree: tree
      });
    } catch (error) {
      console.error("Failed to refresh workspace:", error);
    }
  }

  async function createFile(name, targetFolder = null) {
    if (workspaceHandle) {
      try {
        const parentHandle = targetFolder?.handle || workspaceHandle;
        const newFileHandle = await parentHandle.getFileHandle(name, { create: true });
        await refreshWorkspace();
        return {
          id: name,
          name,
          type: "file",
          path: targetFolder ? `${targetFolder.path}/${name}` : name,
          handle: newFileHandle,
          content: ""
        };
      } catch (error) {
        console.error("Failed to create file:", error);
        return null;
      }
    } else {
      const newFile = {
        id: `file_${Date.now()}`,
        name,
        type: "file",
        path: targetFolder ? `${targetFolder.path}/${name}` : name,
        content: ""
      };
      setWorkspaceTree((prev) => {
        const addNode = (nodes) => {
          if (!targetFolder) return [...nodes, newFile];
          return nodes.map((n) => {
            if (n.id === targetFolder.id && n.type === "folder") {
              return { ...n, children: [...(n.children || []), newFile] };
            }
            if (n.children) {
              return { ...n, children: addNode(n.children) };
            }
            return n;
          });
        };
        const updated = addNode(prev);
        setFiles(flattenFiles(updated));
        saveWorkspaceState({
          folderName: persistedFolderInfo?.name || "Workspace",
          folderPath: persistedFolderInfo?.path || "",
          workspaceTree: updated
        });
        return updated;
      });
      return newFile;
    }
  }

  async function createFolder(name, targetFolder = null) {
    if (workspaceHandle) {
      try {
        const parentHandle = targetFolder?.handle || workspaceHandle;
        await parentHandle.getDirectoryHandle(name, { create: true });
        await refreshWorkspace();
      } catch (error) {
        console.error("Failed to create folder:", error);
      }
    } else {
      const newFolder = {
        id: `folder_${Date.now()}`,
        name,
        type: "folder",
        path: targetFolder ? `${targetFolder.path}/${name}` : name,
        isOpen: true,
        children: []
      };
      setWorkspaceTree((prev) => {
        const addNode = (nodes) => {
          if (!targetFolder) return [...nodes, newFolder];
          return nodes.map((n) => {
            if (n.id === targetFolder.id && n.type === "folder") {
              return { ...n, children: [...(n.children || []), newFolder] };
            }
            if (n.children) {
              return { ...n, children: addNode(n.children) };
            }
            return n;
          });
        };
        const updated = addNode(prev);
        setFiles(flattenFiles(updated));
        saveWorkspaceState({
          folderName: persistedFolderInfo?.name || "Workspace",
          folderPath: persistedFolderInfo?.path || "",
          workspaceTree: updated
        });
        return updated;
      });
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

  async function deleteFile(file) {
    if (!file) return false;
    const fileId = typeof file === "string" ? file : file.id;
    const fileName = file.name || fileId;
    const fullPath = file.path
      ? (persistedFolderInfo?.path && !file.path.includes(":") ? `${persistedFolderInfo.path}/${file.path}` : file.path)
      : null;

    if (fullPath) {
      try {
        await fetch("/api/sandbox/workspace/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: fullPath })
        });
      } catch {}
    }

    if (workspaceHandle && file.handle) {
      try {
        const findParentHandle = (items) => {
          for (const item of items) {
            if (item.children) {
              if (item.children.some((c) => c.id === fileId || c.name === fileName)) {
                return item.handle || workspaceHandle;
              }
              const found = findParentHandle(item.children);
              if (found) return found;
            }
          }
          return workspaceHandle;
        };
        const parentHandle = findParentHandle(workspaceTree);
        if (parentHandle?.removeEntry) {
          await parentHandle.removeEntry(fileName, { recursive: false });
        }
      } catch (err) {
        console.warn("removeEntry failed:", err);
      }
    }

    const removeNode = (nodes) => {
      return nodes
        .filter((n) => n.id !== fileId && n.name !== fileName && n.path !== file.path)
        .map((n) => {
          if (n.children) {
            return { ...n, children: removeNode(n.children) };
          }
          return n;
        });
    };

    setWorkspaceTree((prev) => {
      const updated = removeNode(prev);
      setFiles(flattenFiles(updated));
      saveWorkspaceState({
        folderName: persistedFolderInfo?.name || "Workspace",
        folderPath: persistedFolderInfo?.path || "",
        workspaceTree: updated
      });
      return updated;
    });

    return true;
  }

  async function renameFile(file, newName) {
    if (!file || !newName || !newName.trim()) return false;
    const trimmed = newName.trim();
    if (file.name === trimmed) return true;

    const fileId = file.id;
    const oldPath = file.path || file.name;
    const newPath = oldPath.includes("/")
      ? oldPath.substring(0, oldPath.lastIndexOf("/") + 1) + trimmed
      : (oldPath.includes("\\") ? oldPath.substring(0, oldPath.lastIndexOf("\\") + 1) + trimmed : trimmed);

    const fullOldPath = persistedFolderInfo?.path && !oldPath.includes(":") ? `${persistedFolderInfo.path}/${oldPath}` : oldPath;
    const fullNewPath = persistedFolderInfo?.path && !newPath.includes(":") ? `${persistedFolderInfo.path}/${newPath}` : newPath;

    if (fullOldPath && fullNewPath) {
      try {
        await fetch("/api/sandbox/workspace/rename", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ oldPath: fullOldPath, newPath: fullNewPath })
        });
      } catch {}
    }

    const updateNode = (nodes) => {
      return nodes.map((n) => {
        if (n.id === fileId || n.name === file.name || n.path === oldPath) {
          return {
            ...n,
            name: trimmed,
            path: newPath
          };
        }
        if (n.children) {
          return { ...n, children: updateNode(n.children) };
        }
        return n;
      });
    };

    setWorkspaceTree((prev) => {
      const updated = updateNode(prev);
      setFiles(flattenFiles(updated));
      saveWorkspaceState({
        folderName: persistedFolderInfo?.name || "Workspace",
        folderPath: persistedFolderInfo?.path || "",
        workspaceTree: updated
      });
      return updated;
    });

    return true;
  }

  const value = useMemo(
    () => ({
      workspaceTree,
      workspaceHandle,
      files,
      openFolder,
      openFolderByPath,
      setWorkspacePath,
      reconnectFolder,
      refreshWorkspace,
      createFile,
      createFolder,
      deleteFile,
      renameFile,
      loadFileContent,
      saveFile,
      needsPermission,
      persistedFolderInfo,
      closeFolder,
      addDirectoryToWorkspace
    }),
    [workspaceTree, workspaceHandle, files, needsPermission, persistedFolderInfo]
  );

  return <FileContext.Provider value={value}>{children}</FileContext.Provider>;
}
