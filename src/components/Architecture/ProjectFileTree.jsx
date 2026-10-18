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

  // Filter out node_modules, .git, and cache directories from Windows CLI tree output
  const filterSandboxTree = (rawStdout) => {
    if (!rawStdout) return "";
    const rawText = rawStdout.replace(/\r/g, "");
    const lines = rawText.split("\n");

    const filteredLines = [];
    let skippingAtIndent = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const indentMatch = line.match(/^([|\s]*)/);
      const indent = indentMatch ? indentMatch[1].length : 0;

      if (skippingAtIndent !== -1) {
        if (indent > skippingAtIndent) {
          continue; // skip child lines inside node_modules or .git
        } else {
          skippingAtIndent = -1; // back to parent level
        }
      }

      const ignoredBranch = line.match(/^([|\s]*)(?:\+---|\\---)(node_modules|\.git|\.cache)$/i);
      if (ignoredBranch) {
        const branchIndent = ignoredBranch[1].length;
        skippingAtIndent = branchIndent;
        filteredLines.push(`${ignoredBranch[1]}+---${ignoredBranch[2]} (collapsed)`);
        continue;
      }

      filteredLines.push(line);
    }

    return filteredLines.join("\n");
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
          const filtered = filterSandboxTree(stdout);
          setTreeOutput(filtered);
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
  const handleLineClick = (fileName) => {
    const fileFn = onOpenFile || openFile;
    if (!fileFn || !fileName) return;

    const cleaned = fileName.trim();
    if (!cleaned) return;

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
    const cleanOutput = treeOutput.replace(/\r/g, "");
    const rawLines = cleanOutput.split("\n");
    const q = search.toLowerCase().trim();

    return rawLines.map((line, idx) => {
      const isHeader =
        line.startsWith("Folder PATH") ||
        line.startsWith("Volume serial") ||
        line.startsWith("No subfolders");

      const isDriveRoot = idx <= 4 && (/^[a-zA-Z]:(\\|\.|$)/i.test(line.trim()) || line.trim() === "C:." || line.trim() === "E:.");

      const branchMatch = line.match(/^([|\s]*)(\+---|\\---)(.*)$/);
      let isFolder = false;
      let isFile = false;
      let isSpacer = false;
      let prefix = "";
      let branchJoint = "";
      let name = "";

      if (isHeader || isDriveRoot) {
        name = line;
      } else if (branchMatch) {
        isFolder = true;
        prefix = branchMatch[1];
        branchJoint = branchMatch[2];
        name = branchMatch[3].trim();
      } else if (/^[|\s]*$/.test(line)) {
        isSpacer = true;
        prefix = line;
      } else {
        const fileMatch = line.match(/^([|\s]+)(.+)$/);
        if (fileMatch) {
          isFile = true;
          prefix = fileMatch[1];
          name = fileMatch[2].trim();
        } else {
          name = line.trim();
          if (name) isFile = true;
        }
      }

      const isMatch = q && name ? name.toLowerCase().includes(q) : false;

      return {
        id: idx,
        raw: line,
        isHeader,
        isDriveRoot,
        isFolder,
        isFile,
        isSpacer,
        prefix,
        branchJoint,
        name,
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
            <FaTerminal size={13} color="#00ff88" />
            <span className="project-filetree-title">File Tree</span>
            <span className="project-filetree-cmd-badge" title="Windows CLI tree command with files and ASCII branches">tree /F /A</span>
          </div>

          <div className="project-filetree-sources">
            <button
              className={`project-filetree-pill-btn ${source === "sandbox" ? "active" : ""}`}
              onClick={() => runTreeCommand(false)}
              title="Execute live 'tree /F /A' command in Sandbox OS terminal"
            >
              <FaTerminal size={10} /> Sandbox OS
            </button>
            <button
              className={`project-filetree-pill-btn ${source === "virtual" ? "active" : ""}`}
              onClick={() => runTreeCommand(true)}
              title="Generate tree hierarchy from workspace AST files"
            >
              <FaFolder size={10} /> Workspace AST
            </button>
          </div>
        </div>

        <div className="project-filetree-right">
          <div className="project-filetree-search-wrap">
            <FaSearch size={11} color="#71717a" />
            <input
              type="text"
              placeholder="Search file..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="project-filetree-search-input"
            />
          </div>

          <button
            className="project-filetree-btn"
            onClick={() => runTreeCommand(false)}
            disabled={loading}
            title="Re-run 'tree /F /A' command in sandbox"
          >
            <FaSyncAlt className={loading ? "spinning" : ""} size={11} />
            {loading ? "Running..." : "Refresh"}
          </button>

          <button
            className="project-filetree-btn"
            onClick={handleCopy}
            title="Copy ASCII tree output to clipboard"
          >
            {copied ? <FaCheck color="#00ff88" size={11} /> : <FaCopy size={11} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      {/* Info Bar */}
      <div className="project-filetree-infobar">
        <span><b>Root:</b> {activeWorkspacePath || "Current Project Directory"}</span>
        <span><b>Folders:</b> {totalFoldersCount}</span>
        <span><b>Files:</b> {totalFilesCount}</span>
        <span style={{ color: "#71717a", fontSize: "11px", marginLeft: "auto" }}>
          💡 Click any file in the tree to open it in the editor
        </span>
      </div>

      {/* Terminal Viewport */}
      <div className="project-filetree-viewport">
        <pre className="project-filetree-pre">
          {parsedLines.map((lineObj) => {
            const { id, isHeader, isDriveRoot, isFolder, isFile, isSpacer, prefix, branchJoint, name, isMatch } = lineObj;

            if (isHeader) {
              return (
                <div key={id} className="project-filetree-line header-line">
                  <span className="project-filetree-lineno">{id + 1}</span>
                  <span className="project-filetree-content header-text">{lineObj.raw}</span>
                </div>
              );
            }

            if (isDriveRoot) {
              return (
                <div key={id} className="project-filetree-line root-line">
                  <span className="project-filetree-lineno">{id + 1}</span>
                  <span className="project-filetree-content root-text">
                    <FaFolderOpen size={11} color="#00ff88" style={{ marginRight: "6px" }} />
                    {activeWorkspacePath || lineObj.raw}
                  </span>
                </div>
              );
            }

            if (isSpacer) {
              return (
                <div key={id} className="project-filetree-line spacer-line">
                  <span className="project-filetree-lineno">{id + 1}</span>
                  <span className="project-filetree-content">
                    <span className="tree-branch-stem">{prefix}</span>
                  </span>
                </div>
              );
            }

            return (
              <div
                key={id}
                className={`project-filetree-line ${isFile ? "clickable-file" : ""} ${isMatch ? "highlight-match" : ""}`}
                onClick={() => isFile && handleLineClick(name)}
                title={isFile ? `Open ${name} in editor` : undefined}
              >
                <span className="project-filetree-lineno">{id + 1}</span>
                <span className="project-filetree-content">
                  {prefix && <span className="tree-branch-stem">{prefix}</span>}
                  {branchJoint && <span className="tree-branch-joint">{branchJoint}</span>}
                  {isFolder && (
                    <span className="tree-folder-node">
                      <FaFolder size={11} className="tree-node-icon folder" />
                      <span className="tree-folder-name">{name}</span>
                    </span>
                  )}
                  {isFile && (
                    <span className="tree-file-node">
                      <FaFileCode size={11} className="tree-node-icon file" />
                      <span className="tree-file-name">{name}</span>
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
}
