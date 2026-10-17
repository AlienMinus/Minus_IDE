// src/components/Architecture/ArchitecturePanel.jsx
import { useState, useMemo, useEffect } from "react";
import "./ArchitecturePanel.css";
import {
  FaProjectDiagram,
  FaDatabase,
  FaCube,
  FaServer,
  FaSyncAlt,
  FaSearch,
  FaExternalLinkAlt,
  FaChevronDown,
  FaChevronRight,
  FaCode,
  FaLayerGroup,
  FaShieldAlt
} from "react-icons/fa";
import useEditor from "../../hooks/useEditor";
import { scanCodebaseArchitecture, isIgnoredPath } from "../../services/architectureScanner";

export default function ArchitecturePanel({ onOpenFullView }) {
  const { files = [], openFile, openMongoSchemaTab, openBackendRoutesTab, scanWorkspaceFiles, isScanningWorkspace, scanProgress } = useEditor();
  const [search, setSearch] = useState("");
  const [collapsedLayers, setCollapsedLayers] = useState({});

  // Auto-scan on mount if any files lack content
  useEffect(() => {
    if (!scanWorkspaceFiles || isScanningWorkspace) return;
    const hasUnscannedFiles = files.some(f =>
      !isIgnoredPath(f.path, f.name) &&
      (f.content == null || f.content === "") &&
      ["js", "jsx", "ts", "tsx", "json"].some(ext => (f.name || "").toLowerCase().endsWith("." + ext))
    );
    if (hasUnscannedFiles) {
      scanWorkspaceFiles(false);
    }
  }, [files.length]);

  const architecture = useMemo(() => {
    return scanCodebaseArchitecture(files);
  }, [files]);

  const toggleLayer = (layerKey) => {
    setCollapsedLayers(prev => ({
      ...prev,
      [layerKey]: !prev[layerKey]
    }));
  };

  const filteredNodes = useMemo(() => {
    if (!search.trim()) return architecture.nodes;
    const q = search.toLowerCase();
    return architecture.nodes.filter(n => {
      const matchName = n.name.toLowerCase().includes(q);
      const matchFile = n.fileName.toLowerCase().includes(q);
      const matchVars = (n.details.stateVars || []).some(v => v.state?.toLowerCase().includes(q));
      const matchConstants = (n.details.constants || []).some(c => c.name?.toLowerCase().includes(q) || c.value?.toLowerCase().includes(q));
      const matchFuncs = (n.details.functions || []).some(f => f.toLowerCase().includes(q));
      const matchFields = (n.details.fields || []).some(f => f.name?.toLowerCase().includes(q));
      return matchName || matchFile || matchVars || matchConstants || matchFuncs || matchFields;
    });
  }, [architecture.nodes, search]);

  const layerDefinitions = [
    { key: "model", label: "Database Models", icon: <FaDatabase color="#3fb950" /> },
    { key: "backend", label: "Backend & Routes", icon: <FaServer color="#f85149" /> },
    { key: "service", label: "Services & APIs", icon: <FaSyncAlt color="#d29922" /> },
    { key: "context", label: "Context & State", icon: <FaLayerGroup color="#bc8cff" /> },
    { key: "hook", label: "Custom Hooks", icon: <FaCode color="#f0883e" /> },
    { key: "page", label: "Pages & Views", icon: <FaCube color="#58a6ff" /> },
    { key: "component", label: "UI Components", icon: <FaCube color="#79c0ff" /> },
    { key: "util", label: "Utilities & Modules", icon: <FaCode color="#e5c07b" /> },
    { key: "config", label: "Config & Setup", icon: <FaShieldAlt color="#f472b6" /> }
  ];

  const handleNodeClick = (node) => {
    if (!openFile) return;
    // 1. Match by fileId or exact filePath excluding node_modules/ignored files
    let targetFile = files.find(f => !isIgnoredPath(f.path, f.name) && (f.id === node.fileId || f.path === node.filePath));
    // 2. Fallback to exact filename among valid workspace files
    if (!targetFile) {
      targetFile = files.find(f => !isIgnoredPath(f.path, f.name) && f.name === node.fileName);
    }
    if (targetFile) {
      openFile(targetFile);
    }
  };

  return (
    <div className="arch-panel-container">
      {/* Panel Header */}
      <div className="arch-panel-header">
        <div className="arch-header-top">
          <span className="arch-title">
            <FaProjectDiagram /> Architecture
          </span>
          <button
            className="arch-badge-btn"
            onClick={onOpenFullView}
            title="Open Full Visual Canvas"
          >
            <FaExternalLinkAlt />
          </button>
        </div>

        <div style={{ display: "flex", gap: "6px", width: "100%" }}>
          <button className="arch-open-canvas-btn" style={{ flex: 1 }} onClick={onOpenFullView} title="Open Architecture Blueprint Canvas">
            <FaProjectDiagram /> Blueprint
          </button>
          <button
            className="arch-open-canvas-btn"
            style={{
              flex: 1,
              background: "rgba(0, 255, 136, 0.12)",
              color: "#00ff88",
              borderColor: "rgba(0, 255, 136, 0.3)"
            }}
            onClick={() => openMongoSchemaTab && openMongoSchemaTab()}
            title="Open Dedicated MongoSchema ERD"
          >
            <FaDatabase /> Mongo ERD
          </button>
        </div>

        <div style={{ display: "flex", gap: "6px", width: "100%", marginTop: "6px" }}>
          <button
            className="arch-open-canvas-btn"
            style={{
              width: "100%",
              background: isScanningWorkspace ? "rgba(227, 179, 65, 0.15)" : "rgba(56, 189, 248, 0.12)",
              color: isScanningWorkspace ? "#e3b341" : "#38bdf8",
              borderColor: isScanningWorkspace ? "rgba(227, 179, 65, 0.3)" : "rgba(56, 189, 248, 0.3)",
              justifyContent: "center"
            }}
            onClick={() => scanWorkspaceFiles && scanWorkspaceFiles(true)}
            disabled={isScanningWorkspace}
            title="Scan all workspace files across all directories without opening them"
          >
            <FaSyncAlt className={isScanningWorkspace ? "spinning" : ""} />
            {isScanningWorkspace
              ? (scanProgress ? `Scanning ${scanProgress.current}/${scanProgress.total}` : "Scanning...")
              : "⚡ Scan All Folders"}
          </button>
        </div>
      </div>

      {/* Stats Summary Chips */}
      <div className="arch-stats-row">
        <span
          className="arch-stat-chip model"
          title="Click to open MongoSchema ERD"
          style={{ cursor: "pointer" }}
          onClick={() => openMongoSchemaTab && openMongoSchemaTab()}
        >
          <FaDatabase /> {architecture.stats.models} Models
        </span>
        <span className="arch-stat-chip component" title="Components & Pages">
          <FaCube /> {architecture.stats.components + architecture.stats.pages} UI
        </span>
        <span className="arch-stat-chip context" title="Context Providers">
          <FaLayerGroup /> {architecture.stats.contexts} Contexts
        </span>
        <span
          className="arch-stat-chip service"
          title="Click to open Backend API Routes"
          style={{ cursor: "pointer" }}
          onClick={() => openBackendRoutesTab && openBackendRoutesTab()}
        >
          <FaSyncAlt /> {architecture.stats.services} Services
        </span>
        <span className="arch-stat-chip util" title="Utilities, Helpers & Modules" style={{ color: "#e5c07b" }}>
          <FaCode /> {architecture.stats.utils || 0} Utils
        </span>
        <span className="arch-stat-chip config" title="Configuration & Environment" style={{ color: "#f472b6" }}>
          <FaShieldAlt /> {architecture.stats.configs || 0} Config
        </span>
      </div>

      {/* Search Filter */}
      <div className="arch-search-box">
        <FaSearch color="#666" />
        <input
          type="text"
          className="arch-search-input"
          placeholder="Filter models, components, functions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Architecture Layers Tree */}
      <div className="arch-tree-container">
        {layerDefinitions.map(def => {
          const layerNodes = filteredNodes.filter(n => n.layer === def.key);
          if (layerNodes.length === 0) return null;
          const isCollapsed = collapsedLayers[def.key];

          return (
            <div key={def.key} className="arch-layer-group">
              <div className="arch-layer-header" onClick={() => toggleLayer(def.key)}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {isCollapsed ? <FaChevronRight size={10} /> : <FaChevronDown size={10} />}
                  {def.icon}
                  {def.label}
                </span>
                <span className="arch-node-symbol-count">{layerNodes.length}</span>
              </div>

              {!isCollapsed && (
                <div className="arch-layer-items">
                  {layerNodes.map(node => {
                    const symbolCount =
                      (node.details.fields?.length || 0) +
                      (node.details.stateVars?.length || 0) +
                      (node.details.constants?.length || 0) +
                      (node.details.functions?.length || 0) +
                      (node.details.endpoints?.length || 0);

                    return (
                      <div
                        key={node.id}
                        className="arch-node-item"
                        onClick={() => handleNodeClick(node)}
                        title={`Open ${node.fileName} (${node.filePath})`}
                      >
                        <span>{node.name}</span>
                        {symbolCount > 0 && (
                          <span className="arch-node-symbol-count">{symbolCount} sym</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

