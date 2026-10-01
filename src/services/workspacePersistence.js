/**
 * Workspace Persistence Service using IndexedDB and LocalStorage
 * Automatically saves and restores the last opened directory handle,
 * workspace tree snapshot, open tabs, and active file on page refresh.
 */

const DB_NAME = "HyperionWorkspaceDB";
const DB_VERSION = 1;
const STORE_NAME = "workspace_handles";
const HANDLE_KEY = "last_opened_directory";
const STATE_KEY = "hyperion_saved_workspace_state";

/**
 * Open IndexedDB database
 */
function openWorkspaceDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      resolve(null);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      console.warn("IndexedDB open error:", request.error);
      resolve(null);
    };
  });
}

/**
 * Save native FileSystemDirectoryHandle into IndexedDB
 */
export async function saveDirectoryHandle(handle) {
  if (!handle) return;
  try {
    const db = await openWorkspaceDB();
    if (!db) return;

    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(handle, HANDLE_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Failed to persist directory handle:", err);
  }
}

/**
 * Retrieve saved FileSystemDirectoryHandle from IndexedDB
 */
export async function getStoredDirectoryHandle() {
  try {
    const db = await openWorkspaceDB();
    if (!db) return null;

    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(HANDLE_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn("Failed to retrieve stored directory handle:", err);
    return null;
  }
}

/**
 * Verify or query permission for directory handle
 */
export async function verifyHandlePermission(handle, requestIfPrompt = false) {
  if (!handle) return false;
  try {
    const options = { mode: "readwrite" };
    // Check if permission already granted
    let status = await handle.queryPermission(options);
    if (status === "granted") {
      return true;
    }

    if (requestIfPrompt && status === "prompt") {
      status = await handle.requestPermission(options);
      return status === "granted";
    }

    return false;
  } catch (err) {
    console.warn("Handle permission check failed:", err);
    return false;
  }
}

/**
 * Clear stored directory handle from IndexedDB
 */
export async function clearStoredDirectoryHandle() {
  try {
    const db = await openWorkspaceDB();
    if (!db) return;

    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(HANDLE_KEY);
  } catch (err) {
    console.warn("Failed to delete stored handle:", err);
  }
}

/**
 * Save lightweight serializable workspace snapshot in LocalStorage
 */
export function saveWorkspaceState({
  folderName,
  folderPath,
  workspaceTree,
  openFiles,
  activeFileId,
  sidebarActive
}) {
  try {
    // Strip handles before serializing
    const sanitizeTree = (nodes) => {
      if (!Array.isArray(nodes)) return [];
      return nodes.map((node) => {
        const { handle, ...rest } = node;
        if (rest.children) {
          rest.children = sanitizeTree(rest.children);
        }
        return rest;
      });
    };

    const sanitizedOpenFiles = (openFiles || []).map((file) => {
      const { handle, rawFile, ...rest } = file;
      return rest;
    });

    const state = {
      folderName,
      folderPath,
      workspaceTree: sanitizeTree(workspaceTree),
      openFiles: sanitizedOpenFiles,
      activeFileId,
      sidebarActive: sidebarActive || "explorer",
      timestamp: Date.now()
    };

    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("Failed to save workspace state to localStorage:", err);
  }
}

/**
 * Retrieve cached workspace state from LocalStorage
 */
export function getStoredWorkspaceState() {
  try {
    const item = localStorage.getItem(STATE_KEY);
    if (!item) return null;
    return JSON.parse(item);
  } catch (err) {
    console.warn("Failed to load workspace state from localStorage:", err);
    return null;
  }
}

/**
 * Clear cached workspace state
 */
export function clearWorkspaceState() {
  try {
    localStorage.removeItem(STATE_KEY);
    clearStoredDirectoryHandle();
  } catch (err) {
    console.warn("Failed to clear workspace state:", err);
  }
}
