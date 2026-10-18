// src/components/Architecture/ProjectFileTree.jsx
import { useState, useEffect, useMemo } from "react";
import "./ProjectFileTree.css";
import {
  FaFolder,
  FaFileCode,
  FaSyncAlt,
  FaCopy,
  FaCheck,
  FaTerminal,
  FaSearch,
  FaFolderOpen
} from "react-icons/fa";
import useEditor from "../../hooks/useEditor";
import { isIgnoredPath } from "../../services/architectureScanner";

export default function ProjectFileTree({ onOpenFile }) {
  const { files = [], openFile, persistedFolderInfo, workspaceTree } = useEditor();
  const [treeOutput, setTreeOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("sandbox"); // "sandbox" | "virtual"
  const [errorMsg, setErrorMsg] = useState("");

  // Determine current active workspace path from persisted folder info, storage, or loaded files
  const activeWorkspacePath = useMemo(() => {
    if (persistedFolderInfo?.path) {
      return persistedFolderInfo.path.replace(/\//g, "\\");
    }
    try {
      const stored = localStorage.getItem("hyperion_workspace_state");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.folderPath) return parsed.folderPath.replace(/\//g, "\\");
      }
    } catch (e) {}

    const firstWithFullPath = files.find(f => f.path && !isIgnoredPath(f.path, f.name) && (/^[a-zA-Z]:[\\/]/.test(f.path) || f.path.startsWith("/")));
    if (firstWithFullPath) {
      const parts = firstWithFullPath.path.replace(/\\/g, "/").split("/");
      parts.pop(); // remove filename
      return parts.join("\\");
    }

    const folderName = persistedFolderInfo?.name || "portfolio_v1";
    return `E:\\Portfolio\\${folderName}`;
  }, [files, persistedFolderInfo]);

  // Generate authentic Windows "tree /F /A" ASCII tree from workspace files
  const generateVirtualTree = (fileList = []) => {
    const valid = fileList.filter(f => f && f.name && !isIgnoredPath(f.path, f.name));
    const folderName = persistedFolderInfo?.name || "portfolio_v1";
    const rootDir = activeWorkspacePath || `E:\\Portfolio\\${folderName}`;
    const lines = [
      "Folder PATH listing for volume OS",
      "Volume serial number is 16D0-E25B",
      rootDir
    ];

    if (!valid.length) {
      lines.push("No files found in workspace.");
      return lines.join("\n");
    }

    // Build hierarchical tree structure: { files: [], dirs: {} }
    const root = { files: [], dirs: {} };
    valid.forEach(f => {
      let p = (f.path || f.name).replace(/\\/g, "/");
      // Strip drive letter or root path prefix if present
      if (/^[a-zA-Z]:\//i.test(p)) {
        const rootNorm = rootDir.replace(/\\/g, "/");
        if (p.toLowerCase().startsWith(rootNorm.toLowerCase())) {
          p = p.slice(rootNorm.length).replace(/^\//, "");
        }
      }
      const parts = p.split("/").filter(Boolean);
      // If root folder name is duplicated at start, strip it
      if (parts.length > 1 && parts[0].toLowerCase() === folderName.toLowerCase()) {
        parts.shift();
      }

      let curr = root;
      for (let i = 0; i < parts.length - 1; i++) {
        const dir = parts[i];
        if (!curr.dirs[dir]) {
          curr.dirs[dir] = { files: [], dirs: {} };
        }
        curr = curr.dirs[dir];
      }
      const fileName = parts[parts.length - 1];
      if (fileName && !curr.files.includes(fileName)) {
        curr.files.push(fileName);
      }
    });

    // Recursively render directory in Windows "tree /F /A" style
    const printDir = (node, prefix = "") => {
      const dirNames = Object.keys(node.dirs || {}).sort((a, b) => a.localeCompare(b));
      const fileNames = (node.files || []).slice().sort((a, b) => a.localeCompare(b));

      // 1. Files in current folder
      fileNames.forEach((file) => {
        lines.push(`${prefix}|   ${file}`);
      });

      if (fileNames.length > 0 && dirNames.length > 0) {
        lines.push(`${prefix}|`);
      }

      // 2. Subdirectories
      dirNames.forEach((dir, idx) => {
        const isLastDir = idx === dirNames.length - 1;
        const branch = isLastDir ? "\\---" : "+---";
        lines.push(`${prefix}${branch}${dir}`);
        const nextPrefix = prefix + (isLastDir ? "    " : "|   ");
        printDir(node.dirs[dir], nextPrefix);
      });
    };

    printDir(root, "");
    return lines.join("\n");
  };

  // Fetch file tree using "tree /F /A" command on sandbox environment
  const runTreeCommand = async (forceVirtual = false) => {
    setLoading(true);
    setErrorMsg("");

    if (forceVirtual) {
      const virtual = generateVirtualTree(files);
      setTreeOutput(virtual);
      setSource("virtual");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/sandbox/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: "tree /F /A",
          cwd: activeWorkspacePath || undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        const stdout = data.stdout ? data.stdout.trim() : "";
        const hasTreeBranches = stdout.includes("+---") || stdout.includes("\\---");
        const isNoSubfolders = stdout.includes("No subfolders exist");

        // Validate that sandbox returned an actual populated tree
        if (stdout && hasTreeBranches && !isNoSubfolders) {
          setTreeOutput(stdout);
          setSource("sandbox");
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn("Sandbox command failed, falling back to workspace files:", err);
    }

    // High-fidelity fallback: Generate authentic ASCII tree from loaded workspace files
    const virtual = generateVirtualTree(files);
    setTreeOutput(virtual);
    setSource("virtual");
    setLoading(false);
  };

  useEffect(() => {
    runTreeCommand(false);
  }, [files.length, activeWorkspacePath]);

  const handleCopy = () => {
    if (!treeOutput) return;
    navigator.clipboard.writeText(treeOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Click on a line to open corresponding file in editor
  const handleLineClick = (rawLine) => {
    const fileFn = onOpenFile || openFile;
    if (!fileFn) return;

    const cleaned = rawLine.replace(/^[|\\+\-\s]+/, "").trim();
    if (!cleaned || /^[a-zA-Z]:/i.test(cleaned) || cleaned.endsWith(".") || !/\.[a-zA-Z0-9]{1,8}$/.test(cleaned)) return;

    const matchedFile = files.find(f => {
      if (isIgnoredPath(f.path, f.name)) return false;
      const n = (f.name || "").toLowerCase();
      const p = (f.path || "").toLowerCase().replace(/\\/g, "/");
      return n === cleaned.toLowerCase() || p.endsWith("/" + cleaned.toLowerCase());
    });

    if (matchedFile) {
      fileFn(matchedFile);
    }
  };

  // Parse lines for rich rendering
  const parsedLines = useMemo(() => {
    if (!treeOutput) return [];
    const rawLines = treeOutput.split("\n");
    const q = search.toLowerCase().trim();

    return rawLines.map((line, idx) => {
      const isBranch = line.includes("+---") || line.includes("\\---") || line.includes("|");
      const cleanName = line.replace(/^[|\\+\-\s]+/, "").trim();
      const isHeader = line.startsWith("Folder PATH") || line.startsWith("Volume serial") || line.startsWith("No subfolders");
      const isDriveRoot = /^[a-zA-Z]:/i.test(cleanName) || cleanName === "C:." || cleanName === "E:.";
      const isFile = !isHeader && !isDriveRoot && !cleanName.endsWith(".") && /\.[a-zA-Z0-9]{1,8}$/.test(cleanName);
      const isFolder = isBranch && !isFile && cleanName.length > 0 && !isDriveRoot;
      const isMatch = q ? line.toLowerCase().includes(q) : false;

      return {
        id: idx,
        raw: line,
        cleanName,
        isBranch,
        isFile,
        isFolder,
        isMatch
      };
    });
  }, [treeOutput, search]);

  const totalFilesCount = useMemo(() => {
    return parsedLines.filter(l => l.isFile).length;
  }, [parsedLines]);

  const totalFoldersCount = useMemo(() => {
    return parsedLines.filter(l => l.isFolder).length;
  }, [parsedLines]);

  return (
    <div className="project-filetree-container">
      {/* Top Toolbar */}
      <div className="project-filetree-toolbar">
        <div className="project-filetree-left">
          <div className="project-filetree-brand">
            <FaTerminal size={14} color="#00ff88" />
            <span className="project-filetree-title">PROJECT FILE TREE</span>
            <span className="project-filetree-cmd-badge">tree /F /A</span>
          </div>

          <div className="project-filetree-sources">
            <button
              className={`project-filetree-pill-btn ${source === "sandbox" ? "active" : ""}`}
              onClick={() => runTreeCommand(false)}
              title="Execute live 'tree /F /A' via sandbox command"
            >
              ⚡ Sandbox OS
            </button>
            <button
              className={`project-filetree-pill-btn ${source === "virtual" ? "active" : ""}`}
              onClick={() => runTreeCommand(true)}
              title="Render from loaded project files"
            >
              📁 Workspace AST
            </button>
          </div>
        </div>

        <div className="project-filetree-right">
          <div className="project-filetree-search-wrap">
            <FaSearch size={11} color="#71717a" />
            <input
              type="text"
              placeholder="Search file in tree..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="project-filetree-search-input"
            />
          </div>

          <button
            className="project-filetree-btn"
            onClick={() => runTreeCommand(false)}
            disabled={loading}
            title="Execute 'tree /F /A' on Sandbox Environment"
          >
            <FaSyncAlt className={loading ? "spinning" : ""} size={11} />
            {loading ? "Running..." : "⚡ Refresh tree /F"}
          </button>

          <button
            className="project-filetree-btn"
            onClick={handleCopy}
            title="Copy Tree Output to Clipboard"
          >
            {copied ? <FaCheck color="#00ff88" size={11} /> : <FaCopy size={11} />}
            {copied ? "Copied" : "Copy Tree"}
          </button>
        </div>
      </div>

      {/* Info Bar */}
      <div className="project-filetree-infobar">
        <span><b>Root:</b> {activeWorkspacePath || "Current Project Directory"}</span>
        <span><b>Folders:</b> {totalFoldersCount}</span>
        <span><b>Files:</b> {totalFilesCount}</span>
        <span style={{ color: "#71717a", fontSize: "11px", marginLeft: "auto" }}>
          💡 Click any file name in the tree to open it directly in the editor
        </span>
      </div>

      {/* Terminal Viewport */}
      <div className="project-filetree-viewport">
        <pre className="project-filetree-pre">
          {parsedLines.map((lineObj) => {
            const { id, raw, cleanName, isFile, isFolder, isMatch } = lineObj;

            return (
              <div
                key={id}
                className={`project-filetree-line ${isFile ? "clickable-file" : ""} ${isMatch ? "highlight-match" : ""}`}
                onClick={() => isFile && handleLineClick(raw)}
                title={isFile ? `Click to open ${cleanName} in editor` : undefined}
              >
                <span className="project-filetree-lineno">{id + 1}</span>

                {/* Render colored branch and filename */}
                <span className="project-filetree-content">
                  {raw.split(/(\+---|\\---|\|)/).map((part, pIdx) => {
                    if (part === "+---" || part === "\\---") {
                      return <span key={pIdx} className="tree-branch-joint">{part}</span>;
                    }
                    if (part === "|") {
                      return <span key={pIdx} className="tree-branch-stem">{part}</span>;
                    }
                    if (isFile && part.trim() === cleanName) {
                      return (
                        <span key={pIdx} className="tree-file-node">
                          <FaFileCode size={11} className="tree-node-icon file" />
                          <span className="tree-file-name">{part}</span>
                        </span>
                      );
                    }
                    if (isFolder && part.trim() === cleanName) {
                      return (
                        <span key={pIdx} className="tree-folder-node">
                          <FaFolder size={11} className="tree-node-icon folder" />
                          <span className="tree-folder-name">{part}</span>
                        </span>
                      );
                    }
                    return <span key={pIdx}>{part}</span>;
                  })}
                </span>
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
}
