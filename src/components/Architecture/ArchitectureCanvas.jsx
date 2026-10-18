// src/components/Architecture/ArchitectureCanvas.jsx
import { useState, useMemo, useEffect, useRef } from "react";
import "./ArchitectureCanvas.css";
import {
  FaProjectDiagram,
  FaBolt,
  FaBook,
  FaSearch,
  FaSearchPlus,
  FaSearchMinus,
  FaExpandArrowsAlt,
  FaDownload,
  FaDatabase,
  FaServer,
  FaSyncAlt,
  FaLayerGroup,
  FaCube,
  FaCode,
  FaFileCode,
  FaShieldAlt,
  FaNetworkWired,
  FaFolderOpen
} from "react-icons/fa";
import useEditor from "../../hooks/useEditor";
import { scanCodebaseArchitecture, isIgnoredPath } from "../../services/architectureScanner";
import { traceExecutionSequences } from "../../services/lifecycleTracer";
import {
  generateArchitectureFlowchart,
  generateSequenceMermaid,
  generateEntityRelationshipDiagram
} from "../../services/mermaidGenerator";
import SequenceVisualizer from "./SequenceVisualizer";
import MermaidRenderer from "./MermaidRenderer";
import MongoSchemaERD from "./MongoSchemaERD";
import ProjectFileTree from "./ProjectFileTree";

export default function ArchitectureCanvas() {
  const { files = [], openFile, scanWorkspaceFiles, isScanningWorkspace, scanProgress, openBackendRoutesTab } = useEditor();
  const [activeTab, setActiveTab] = useState("graph"); // "graph" | "filetree" | "mongoschema" | "mermaid" | "sequence" | "dictionary"
  const [mermaidDiagramType, setMermaidDiagramType] = useState("flowchart"); // "flowchart" | "sequence" | "erd"
  const [catalogFilter, setCatalogFilter] = useState("ALL");
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const viewportRef = useRef(null);

  const handleCanvasMouseDown = (e) => {
    if (e.button !== 0) return;
    if (
      e.target.closest("button") ||
      e.target.closest("input") ||
      e.target.closest("a") ||
      e.target.closest(".arch-card-btn")
    ) {
      return;
    }
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - pan.x,
      y: e.clientY - pan.y
    };
  };

  const handleCanvasMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  const handleCanvasWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -10 : 10;
      setZoom(z => Math.max(30, Math.min(z + delta, 300)));
    }
  };

  const handleResetZoomPan = () => {
    setZoom(100);
    setPan({ x: 0, y: 0 });
  };
  const [search, setSearch] = useState("");
  const [activeLayers, setActiveLayers] = useState({
    model: true,
    backend: true,
    service: true,
    context: true,
    hook: true,
    page: true,
    component: true,
    util: true,
    config: true
  });

  // Automatically scan workspace files on mount if any code files have null/empty content
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

  // Scan codebase excluding node_modules, dist, and caches
  const architecture = useMemo(() => {
    return scanCodebaseArchitecture(files);
  }, [files]);

  // Trace execution flow
  const executionSteps = useMemo(() => {
    return traceExecutionSequences(architecture);
  }, [architecture]);

  // Generate Mermaid diagram codes dynamically for whatever project is active
  const mermaidFlowchart = useMemo(() => {
    return generateArchitectureFlowchart(architecture);
  }, [architecture]);

  const mermaidSequence = useMemo(() => {
    return generateSequenceMermaid(executionSteps);
  }, [executionSteps]);

  const mermaidErd = useMemo(() => {
    return generateEntityRelationshipDiagram(architecture.nodes);
  }, [architecture.nodes]);

  const toggleLayer = (layer) => {
    setActiveLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  const filteredNodes = useMemo(() => {
    const q = search.toLowerCase().trim();
    return architecture.nodes.filter(n => {
      if (!activeLayers[n.layer]) return false;
      if (!q) return true;
      const matchName = n.name.toLowerCase().includes(q);
      const matchFile = n.fileName.toLowerCase().includes(q);
      const matchVars = (n.details.stateVars || []).some(v => v.state?.toLowerCase().includes(q));
      const matchConstants = (n.details.constants || []).some(c => c.name?.toLowerCase().includes(q) || c.value?.toLowerCase().includes(q));
      const matchFuncs = (n.details.functions || []).some(f => f.toLowerCase().includes(q));
      const matchFields = (n.details.fields || []).some(f => f.name?.toLowerCase().includes(q));
      const matchEndpoints = (n.details.endpoints || []).some(e => e.path?.toLowerCase().includes(q));
      return matchName || matchFile || matchVars || matchConstants || matchFuncs || matchFields || matchEndpoints;
    });
  }, [architecture.nodes, activeLayers, search]);

  const handleOpenFile = (node) => {
    if (!openFile) return;
    // Match by exact fileId or exact filePath excluding node_modules/ignored files
    let target = files.find(f => !isIgnoredPath(f.path, f.name) && (f.id === node.fileId || f.path === node.filePath));
    if (!target) {
      target = files.find(f => !isIgnoredPath(f.path, f.name) && f.name === node.fileName);
    }
    if (target) {
      openFile(target);
    }
  };

  const handleDownloadJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(architecture, null, 2));
    const dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", "architecture-spec.json");
    dlAnchor.click();
  };

  const layerSections = [
    { key: "model", title: "Database Models & Schemas", icon: <FaDatabase color="#3fb950" /> },
    { key: "backend", title: "Backend Server & API Routing", icon: <FaServer color="#f85149" /> },
    { key: "service", title: "Services & Network Fetchers", icon: <FaSyncAlt color="#d29922" /> },
    { key: "context", title: "Context Providers & State Stores", icon: <FaLayerGroup color="#bc8cff" /> },
    { key: "hook", title: "Custom React Hooks", icon: <FaCode color="#f0883e" /> },
    { key: "page", title: "Views & Page Hierarchies", icon: <FaCube color="#58a6ff" /> },
    { key: "component", title: "UI Components & Widgets", icon: <FaCube color="#79c0ff" /> },
    { key: "util", title: "Utilities, Helpers & Modules", icon: <FaCode color="#e5c07b" /> },
    { key: "config", title: "Configuration & Environment", icon: <FaShieldAlt color="#f472b6" /> }
  ];

  return (
    <div className="arch-canvas-container">
      {/* Top Toolbar */}
      <div className="arch-canvas-toolbar">
        <div className="arch-toolbar-left">
          <button
            className={`arch-view-tab ${activeTab === "graph" ? "active" : ""}`}
            onClick={() => setActiveTab("graph")}
            title="Multi-Layer Workspace Component Cards"
          >
            <FaProjectDiagram /> Visual Architecture
          </button>
          <button
            className={`arch-view-tab ${activeTab === "filetree" ? "active" : ""}`}
            onClick={() => setActiveTab("filetree")}
            style={{ color: activeTab === "filetree" ? "#00ff88" : undefined }}
            title="Project File Tree using 'tree /F' on Sandbox Environment"
          >
            <FaFolderOpen color="#00ff88" /> Project File Tree (tree /F)
          </button>
          <button
            className={`arch-view-tab ${activeTab === "mongoschema" ? "active" : ""}`}
            onClick={() => setActiveTab("mongoschema")}
            style={{ color: activeTab === "mongoschema" ? "#00ff88" : undefined }}
          >
            <FaDatabase color="#00ff88" /> MongoSchema ERD
          </button>
          <button
            className="arch-view-tab"
            onClick={() => openBackendRoutesTab && openBackendRoutesTab()}
            style={{ color: "#38bdf8" }}
            title="Open Dedicated Backend API Routes Tab"
          >
            <FaNetworkWired color="#38bdf8" /> API Routes
          </button>
          <button
            className={`arch-view-tab ${activeTab === "mermaid" ? "active" : ""}`}
            onClick={() => setActiveTab("mermaid")}
          >
            <FaCode /> Mermaid Diagrams
          </button>
          <button
            className={`arch-view-tab ${activeTab === "sequence" ? "active" : ""}`}
            onClick={() => setActiveTab("sequence")}
          >
            <FaBolt color="#e3b341" /> Execution Flow ({executionSteps.length} steps)
          </button>
          <button
            className={`arch-view-tab ${activeTab === "dictionary" ? "active" : ""}`}
            onClick={() => setActiveTab("dictionary")}
          >
            <FaBook /> Symbol Catalog
          </button>
        </div>

        <div className="arch-toolbar-right">
          <button
            className={`arch-tool-btn arch-scan-btn ${isScanningWorkspace ? "scanning" : ""}`}
            onClick={() => scanWorkspaceFiles && scanWorkspaceFiles(true)}
            disabled={isScanningWorkspace}
            title={isScanningWorkspace ? "Scanning files in workspace..." : "Scan workspace files to index models, routes & architecture without opening each file"}
            style={{
              background: isScanningWorkspace ? "rgba(227, 179, 65, 0.2)" : "rgba(0, 255, 136, 0.15)",
              color: isScanningWorkspace ? "#e3b341" : "#00ff88",
              borderColor: isScanningWorkspace ? "rgba(227, 179, 65, 0.4)" : "rgba(0, 255, 136, 0.4)",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <FaSyncAlt className={isScanningWorkspace ? "spinning" : ""} size={11} />
            {isScanningWorkspace
              ? (scanProgress ? `Scanning (${scanProgress.current}/${scanProgress.total})...` : "Scanning...")
              : "⚡ Scan Codebase"}
          </button>

          {activeTab === "graph" && (
            <>
              <button
                className="arch-tool-btn"
                onClick={() => setZoom(z => Math.max(z - 15, 30))}
                title="Zoom Out"
              >
                <FaSearchMinus />
              </button>
              <span style={{ fontSize: "11px", color: "#888", minWidth: "35px", textAlign: "center" }}>{zoom}%</span>
              <button
                className="arch-tool-btn"
                onClick={() => setZoom(z => Math.min(z + 15, 300))}
                title="Zoom In"
              >
                <FaSearchPlus />
              </button>
              <button
                className="arch-tool-btn"
                onClick={handleResetZoomPan}
                title="Reset Pan & Zoom"
              >
                <FaExpandArrowsAlt /> Reset
              </button>
            </>
          )}

          <button className="arch-tool-btn" onClick={handleDownloadJson} title="Export Architecture JSON Spec">
            <FaDownload /> Export Spec
          </button>
        </div>
      </div>

      {/* Layer Filter Bar */}
      {activeTab === "graph" && (
        <div className="arch-filter-bar">
          <span style={{ fontSize: "11px", color: "#888", marginRight: "4px" }}>Filter Layers:</span>
          {layerSections.map(s => (
            <span
              key={s.key}
              className={`arch-filter-pill ${activeLayers[s.key] ? "active" : ""}`}
              onClick={() => toggleLayer(s.key)}
            >
              {s.icon} {s.title.split(" ")[0]}
            </span>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px" }}>
            <FaSearch color="#666" />
            <input
              type="text"
              placeholder="Search symbols or constants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: "#222",
                border: "1px solid #333",
                color: "#ccc",
                borderRadius: "3px",
                fontSize: "11px",
                padding: "2px 6px"
              }}
            />
          </div>
        </div>
      )}

      {/* Mode 1: Interactive Node Graph */}
      {activeTab === "graph" && (
        <div
          ref={viewportRef}
          className={`arch-viewport ${isDragging ? "dragging" : ""}`}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          onWheel={handleCanvasWheel}
          onDoubleClick={handleResetZoomPan}
        >
          <div
            className="arch-graph-grid"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`,
              transformOrigin: "top left"
            }}
          >
            {layerSections.map(sec => {
              const nodesInLayer = filteredNodes.filter(n => n.layer === sec.key);
              if (nodesInLayer.length === 0) return null;

              return (
                <div key={sec.key} className="arch-layer-section">
                  <div className="arch-layer-title">
                    {sec.icon} {sec.title} ({nodesInLayer.length})
                  </div>

                  <div className="arch-cards-row">
                    {nodesInLayer.map(node => (
                      <div
                        key={node.id}
                        className="arch-node-card"
                        onClick={() => handleOpenFile(node)}
                        title={`Click to open ${node.fileName} in editor`}
                      >
                        <div className={`arch-card-top ${node.layer}`}>
                          <span className="arch-card-name">{node.name}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            {node.layer === "model" && (
                              <button
                                style={{
                                  background: "rgba(0, 255, 136, 0.15)",
                                  color: "#00ff88",
                                  border: "1px solid rgba(0, 255, 136, 0.4)",
                                  fontSize: "9px",
                                  padding: "1px 6px",
                                  borderRadius: "3px",
                                  cursor: "pointer",
                                  fontWeight: "600"
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveTab("mongoschema");
                                }}
                                title="Open MongoSchema ERD"
                              >
                                ERD ➔
                              </button>
                            )}
                            <span className="arch-card-badge">{node.layer}</span>
                          </div>
                        </div>

                        <div className="arch-card-body">
                          {/* File path link */}
                          <div style={{ fontSize: "10px", color: "#6e7681", display: "flex", alignItems: "center", gap: "4px" }}>
                            <FaFileCode /> {node.filePath} ({node.lineCount} lines)
                          </div>

                          {/* Backend Server: Port & Middleware */}
                          {node.layer === "backend" && (
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#9cdcfe" }}>
                                <FaNetworkWired /> Port: {node.details.port || "5000"}
                              </div>
                              {node.details.middleware?.length > 0 && (
                                <div style={{ marginTop: "4px", display: "flex", flexWrap: "wrap", gap: "4px" }}>
                                  {node.details.middleware.map((m, i) => (
                                    <span key={i} className="arch-var-chip" style={{ color: "#fca5a5" }}>
                                      {m}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Backend Server: HTTP Endpoints & Routes */}
                          {node.details.endpoints?.length > 0 && (
                            <div>
                              <div className="arch-section-title">
                                {node.layer === "backend" ? "Express HTTP Routes" : "API Endpoints"}
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                {node.details.endpoints.slice(0, 8).map((ep, i) => (
                                  <div
                                    key={i}
                                    style={{
                                      fontSize: "11px",
                                      fontFamily: "monospace",
                                      background: "#141414",
                                      padding: "3px 6px",
                                      borderRadius: "3px",
                                      border: "1px solid #282828",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between"
                                    }}
                                  >
                                    <span style={{ color: ep.method === "GET" ? "#3fb950" : "#d29922", fontWeight: "700" }}>
                                      {ep.method} {ep.path}
                                    </span>
                                    {ep.isProtected && (
                                      <span title="Protected Route" style={{ color: "#f85149" }}>
                                        <FaShieldAlt size={10} />
                                      </span>
                                    )}
                                  </div>
                                ))}
                                {node.details.endpoints.length > 8 && (
                                  <span style={{ fontSize: "10px", color: "#888" }}>
                                    +{node.details.endpoints.length - 8} more routes...
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Backend Server: Database Models Queried */}
                          {node.details.queriedModels?.length > 0 && (
                            <div>
                              <div className="arch-section-title">Database Models Accessed</div>
                              <div className="arch-chip-list">
                                {node.details.queriedModels.map((m, i) => (
                                  <span key={i} className="arch-field-chip">
                                    {m}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 1. Arrow Functions & Handlers (Explicitly Differentiated) */}
                          {node.details.arrowFunctions?.length > 0 && (
                            <div>
                              <div className="arch-section-title" style={{ color: "#38bdf8" }}>
                                <FaBolt size={9} color="#38bdf8" /> Arrow Functions ({node.details.arrowFunctions.length})
                              </div>
                              <div className="arch-chip-list">
                                {node.details.arrowFunctions.slice(0, 8).map((fn, i) => (
                                  <span
                                    key={i}
                                    className="arch-var-chip"
                                    style={{ color: "#38bdf8", borderColor: "rgba(56, 189, 248, 0.3)" }}
                                    title={`${fn.name}() => ${fn.value}`}
                                  >
                                    <span style={{ fontSize: "8px", padding: "1px 4px", borderRadius: "2px", background: "rgba(56, 189, 248, 0.15)", marginRight: "4px", fontWeight: "700" }}>
                                      () =&gt;
                                    </span>
                                    {fn.name}
                                  </span>
                                ))}
                                {node.details.arrowFunctions.length > 8 && (
                                  <span style={{ fontSize: "10px", color: "#888" }}>
                                    +{node.details.arrowFunctions.length - 8} more...
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* 2. Constants & Configuration Values */}
                          {node.details.constants?.length > 0 && (
                            <div>
                              <div className="arch-section-title" style={{ color: "#e3b341" }}>
                                <FaShieldAlt size={9} color="#e3b341" /> Constants &amp; Values ({node.details.constants.length})
                              </div>
                              <div className="arch-chip-list">
                                {node.details.constants.slice(0, 8).map((c, i) => (
                                  <span
                                    key={i}
                                    className="arch-var-chip"
                                    style={{ color: "#e3b341", borderColor: "rgba(227, 179, 65, 0.3)" }}
                                    title={`${c.name} (${c.type}): ${c.value}`}
                                  >
                                    <span style={{ fontSize: "8px", padding: "1px 4px", borderRadius: "2px", background: "rgba(227, 179, 65, 0.15)", marginRight: "4px", fontWeight: "700" }}>
                                      CONST
                                    </span>
                                    {c.name}: {c.value}
                                  </span>
                                ))}
                                {node.details.constants.length > 8 && (
                                  <span style={{ fontSize: "10px", color: "#888" }}>
                                    +{node.details.constants.length - 8} more...
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* 3. Instances, Schemas & Refs */}
                          {(node.details.instances?.length > 0 || node.details.schemas?.length > 0) && (
                            <div>
                              <div className="arch-section-title" style={{ color: "#f472b6" }}>
                                Instances &amp; Schemas
                              </div>
                              <div className="arch-chip-list">
                                {(node.details.instances || []).map((ins, i) => (
                                  <span
                                    key={`ins-${i}`}
                                    className="arch-var-chip"
                                    style={{ color: "#f472b6", borderColor: "rgba(244, 114, 182, 0.3)" }}
                                    title={`${ins.name} (${ins.type}): ${ins.value}`}
                                  >
                                    <span style={{ fontSize: "8px", padding: "1px 4px", borderRadius: "2px", background: "rgba(244, 114, 182, 0.15)", marginRight: "4px", fontWeight: "700" }}>
                                      INSTANCE
                                    </span>
                                    {ins.name}
                                  </span>
                                ))}
                                {(node.details.schemas || []).map((sc, i) => (
                                  <span
                                    key={`sc-${i}`}
                                    className="arch-var-chip"
                                    style={{ color: "#3fb950", borderColor: "rgba(63, 185, 80, 0.3)" }}
                                    title={`${sc.name} (${sc.type})`}
                                  >
                                    <span style={{ fontSize: "8px", padding: "1px 4px", borderRadius: "2px", background: "rgba(63, 185, 80, 0.15)", marginRight: "4px", fontWeight: "700" }}>
                                      SCHEMA
                                    </span>
                                    {sc.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Schema Fields (for Models) */}
                          {node.details.fields?.length > 0 && (
                            <div>
                              <div className="arch-section-title">Schema Fields</div>
                              <div className="arch-chip-list">
                                {node.details.fields.slice(0, 6).map((f, i) => (
                                  <span key={i} className="arch-field-chip">
                                    {f.name}: {f.type}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* State Variables */}
                          {node.details.stateVars?.length > 0 && (
                            <div>
                              <div className="arch-section-title">State Hooks</div>
                              <div className="arch-chip-list">
                                {node.details.stateVars.map((v, i) => (
                                  <span key={i} className="arch-var-chip">
                                    {v.state}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Functions & Handlers */}
                          {node.details.functions?.length > 0 && (
                            <div>
                              <div className="arch-section-title">Functions & Handlers</div>
                              <div className="arch-chip-list">
                                {node.details.functions.slice(0, 6).map((fn, i) => (
                                  <span key={i} className="arch-func-chip">
                                    {fn}()
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mode 0: Project File Tree (tree /F) */}
      {activeTab === "filetree" && (
        <ProjectFileTree onOpenFile={handleOpenFile} />
      )}

      {/* Mode 1: Dedicated MongoSchema ERD */}
      {activeTab === "mongoschema" && (
        <MongoSchemaERD />
      )}

      {/* Mode 2: Execution Sequence Visualizer */}
      {activeTab === "sequence" && (
        <SequenceVisualizer steps={executionSteps} />
      )}

      {/* Mode 3: Visual Rendered Mermaid Diagrams */}
      {activeTab === "mermaid" && (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", overflow: "hidden" }}>
          {/* Sub-toolbar to pick diagram type */}
          <div style={{ display: "flex", gap: "8px", padding: "8px 16px", background: "#1c1c1c", borderBottom: "1px solid #2d2d30" }}>
            <button
              className={`mermaid-btn ${mermaidDiagramType === "flowchart" ? "active" : ""}`}
              onClick={() => setMermaidDiagramType("flowchart")}
              style={{ background: mermaidDiagramType === "flowchart" ? "#0e639c" : "#2d2d30" }}
            >
              🏗️ Architecture Flowchart
            </button>
            <button
              className={`mermaid-btn ${mermaidDiagramType === "sequence" ? "active" : ""}`}
              onClick={() => setMermaidDiagramType("sequence")}
              style={{ background: mermaidDiagramType === "sequence" ? "#0e639c" : "#2d2d30" }}
            >
              ⚡ Call Sequence Diagram
            </button>
            <button
              className={`mermaid-btn ${mermaidDiagramType === "erd" ? "active" : ""}`}
              onClick={() => setMermaidDiagramType("erd")}
              style={{ background: mermaidDiagramType === "erd" ? "#0e639c" : "#2d2d30" }}
            >
              🗄️ Database ERD Diagram
            </button>
          </div>

          <div style={{ flex: 1, minHeight: 0 }}>
            {mermaidDiagramType === "flowchart" && (
              <MermaidRenderer code={mermaidFlowchart} title="Architecture & Component Flowchart" />
            )}
            {mermaidDiagramType === "sequence" && (
              <MermaidRenderer code={mermaidSequence} title="Runtime Execution Call Sequence Diagram" />
            )}
            {mermaidDiagramType === "erd" && (
              <MermaidRenderer code={mermaidErd} title="Database Entity Relationship Diagram" />
            )}
          </div>
        </div>
      )}

      {/* Mode 4: Symbol Catalog */}
      {activeTab === "dictionary" && (
        <div className="arch-dict-view">
          <div style={{ display: "flex", gap: "8px", padding: "10px 16px", background: "#18181b", borderBottom: "1px solid #27272a", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: "11px", color: "#888", marginRight: "4px" }}>Filter Concept:</span>
            {[
              { id: "ALL", label: "All Symbols" },
              { id: "ARROW_FN", label: "⚡ Arrow Functions", color: "#38bdf8" },
              { id: "CONST", label: "🔒 Constants & Config", color: "#e3b341" },
              { id: "STATE", label: "🔄 React State", color: "#79c0ff" },
              { id: "SCHEMA", label: "🗄️ Schemas & Fields", color: "#3fb950" },
              { id: "ROUTES", label: "🚀 HTTP Routes", color: "#f87171" }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setCatalogFilter(f.id)}
                style={{
                  background: catalogFilter === f.id ? (f.color || "#00ff88") : "#27272a",
                  color: catalogFilter === f.id ? "#000000" : "#d4d4d8",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: catalogFilter === f.id ? "700" : "500",
                  padding: "4px 10px",
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <table className="arch-dict-table">
            <thead>
              <tr>
                <th>Symbol / Concept</th>
                <th>Type</th>
                <th>Defined In File</th>
                <th>Layer</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {architecture.nodes.flatMap(n => {
                const rows = [];
                // Endpoints
                (n.details.endpoints || []).forEach(ep => {
                  rows.push({
                    name: `${ep.method} ${ep.path}`,
                    type: "HTTP Route",
                    kind: "route",
                    file: n.fileName,
                    layer: n.layer,
                    details: ep.models?.length ? `Queries: ${ep.models.join(", ")}` : "Express route"
                  });
                });
                // Arrow Functions (Explicitly Differentiated)
                (n.details.arrowFunctions || []).forEach(fn => {
                  rows.push({
                    name: `${fn.name}()`,
                    type: "Arrow Function",
                    kind: "arrow-function",
                    file: n.fileName,
                    layer: n.layer,
                    details: `() => ${fn.value || 'handler'}`
                  });
                });
                // Constants & Values
                (n.details.constants || []).forEach(c => {
                  rows.push({
                    name: c.name,
                    type: c.type || "Constant Value",
                    kind: "constant",
                    file: n.fileName,
                    layer: n.layer,
                    details: `CONST: ${c.value || 'undefined'}`
                  });
                });
                // Instances
                (n.details.instances || []).forEach(ins => {
                  rows.push({
                    name: ins.name,
                    type: ins.type || "Instance",
                    kind: "instance",
                    file: n.fileName,
                    layer: n.layer,
                    details: ins.value || "class instance"
                  });
                });
                // Model fields
                (n.details.fields || []).forEach(f => {
                  rows.push({
                    name: f.name,
                    type: "Schema Field",
                    kind: "field",
                    file: n.fileName,
                    layer: n.layer,
                    details: `Type: ${f.type}${f.ref ? ` (ref: ${f.ref})` : ""}`
                  });
                });
                // State variables
                (n.details.stateVars || []).forEach(v => {
                  rows.push({
                    name: v.state,
                    type: "React useState",
                    kind: "state",
                    file: n.fileName,
                    layer: n.layer,
                    details: `Setter: ${v.setter}, Initial: ${v.initial}`
                  });
                });
                // Functions
                (n.details.functions || []).forEach(fn => {
                  rows.push({
                    name: `${fn}()`,
                    type: "Function",
                    kind: "function",
                    file: n.fileName,
                    layer: n.layer,
                    details: "Callable method"
                  });
                });
                // API functions
                (n.details.apiFunctions || []).forEach(af => {
                  rows.push({
                    name: `${af}()`,
                    type: "API Service",
                    kind: "service",
                    file: n.fileName,
                    layer: n.layer,
                    details: "Network fetcher"
                  });
                });
                return rows;
              }).filter(r => {
                if (catalogFilter === "ARROW_FN") return r.kind === "arrow-function";
                if (catalogFilter === "CONST") return r.kind === "constant";
                if (catalogFilter === "STATE") return r.kind === "state";
                if (catalogFilter === "SCHEMA") return r.kind === "field" || r.kind === "schema";
                if (catalogFilter === "ROUTES") return r.type === "HTTP Route";
                return true;
              }).map((r, i) => {
                let badgeColor = "#cccccc";
                let badgeBg = "#252528";
                if (r.kind === "arrow-function") {
                  badgeColor = "#38bdf8";
                  badgeBg = "rgba(56, 189, 248, 0.15)";
                } else if (r.kind === "constant") {
                  badgeColor = "#e3b341";
                  badgeBg = "rgba(227, 179, 65, 0.15)";
                } else if (r.kind === "instance") {
                  badgeColor = "#f472b6";
                  badgeBg = "rgba(244, 114, 182, 0.15)";
                } else if (r.kind === "schema") {
                  badgeColor = "#3fb950";
                  badgeBg = "rgba(63, 185, 80, 0.15)";
                } else if (r.kind === "ref") {
                  badgeColor = "#38bdf8";
                  badgeBg = "rgba(56, 189, 248, 0.15)";
                } else if (r.kind === "state") {
                  badgeColor = "#79c0ff";
                  badgeBg = "rgba(121, 192, 255, 0.15)";
                }

                return (
                  <tr key={i}>
                    <td style={{ fontFamily: "monospace", color: badgeColor, fontWeight: "600" }}>{r.name}</td>
                    <td>
                      <span style={{
                        fontSize: "10px",
                        padding: "2px 6px",
                        borderRadius: "3px",
                        background: badgeBg,
                        color: badgeColor,
                        fontWeight: "600"
                      }}>
                        {r.type}
                      </span>
                    </td>
                    <td style={{ color: "#e6edf3" }}>{r.file}</td>
                    <td>
                      <span className={`arch-card-badge ${r.layer}`}>{r.layer}</span>
                    </td>
                    <td style={{ color: "#8b949e" }}>{r.details}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
