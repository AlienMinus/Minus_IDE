// src/components/Architecture/ArchitectureCanvas.jsx
import { useState, useMemo } from "react";
import "./ArchitectureCanvas.css";
import {
  FaProjectDiagram,
  FaBolt,
  FaCode,
  FaBook,
  FaSearch,
  FaSearchPlus,
  FaSearchMinus,
  FaExpandArrowsAlt,
  FaDownload,
  FaCopy,
  FaDatabase,
  FaServer,
  FaSyncAlt,
  FaLayerGroup,
  FaCube,
  FaFileCode
} from "react-icons/fa";
import useEditor from "../../hooks/useEditor";
import { scanCodebaseArchitecture } from "../../services/architectureScanner";
import { traceExecutionSequences } from "../../services/lifecycleTracer";
import {
  generateArchitectureFlowchart,
  generateSequenceMermaid,
  generateEntityRelationshipDiagram
} from "../../services/mermaidGenerator";
import SequenceVisualizer from "./SequenceVisualizer";

export default function ArchitectureCanvas() {
  const { files = [], openFile } = useEditor();
  const [activeTab, setActiveTab] = useState("graph"); // "graph" | "sequence" | "mermaid" | "dictionary"
  const [zoom, setZoom] = useState(100);
  const [search, setSearch] = useState("");
  const [activeLayers, setActiveLayers] = useState({
    model: true,
    backend: true,
    service: true,
    context: true,
    hook: true,
    page: true,
    component: true
  });
  const [copied, setCopied] = useState(false);

  // Scan codebase
  const architecture = useMemo(() => {
    return scanCodebaseArchitecture(files);
  }, [files]);

  // Trace execution flow
  const executionSteps = useMemo(() => {
    return traceExecutionSequences(architecture);
  }, [architecture]);

  // Mermaid scripts
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
      const matchFuncs = (n.details.functions || []).some(f => f.toLowerCase().includes(q));
      const matchFields = (n.details.fields || []).some(f => f.name?.toLowerCase().includes(q));
      return matchName || matchFile || matchVars || matchFuncs || matchFields;
    });
  }, [architecture.nodes, activeLayers, search]);

  const handleOpenFile = (node) => {
    const target = files.find(f => f.path === node.filePath || f.name === node.fileName);
    if (target && openFile) {
      openFile(target);
    }
  };

  const handleCopyMermaid = () => {
    navigator.clipboard.writeText(mermaidFlowchart);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
    { key: "backend", title: "Backend Server & HTTP Endpoints", icon: <FaServer color="#f85149" /> },
    { key: "service", title: "API Clients & Network Services", icon: <FaSyncAlt color="#d29922" /> },
    { key: "context", title: "Context Providers & State Stores", icon: <FaLayerGroup color="#bc8cff" /> },
    { key: "hook", title: "Custom React Hooks", icon: <FaCode color="#f0883e" /> },
    { key: "page", title: "Views & Page Hierarchies", icon: <FaCube color="#58a6ff" /> },
    { key: "component", title: "UI Components & Widgets", icon: <FaCube color="#79c0ff" /> }
  ];

  return (
    <div className="arch-canvas-container">
      {/* Top Toolbar */}
      <div className="arch-canvas-toolbar">
        <div className="arch-toolbar-left">
          <button
            className={`arch-view-tab ${activeTab === "graph" ? "active" : ""}`}
            onClick={() => setActiveTab("graph")}
          >
            <FaProjectDiagram /> Visual Architecture
          </button>
          <button
            className={`arch-view-tab ${activeTab === "sequence" ? "active" : ""}`}
            onClick={() => setActiveTab("sequence")}
          >
            <FaBolt color="#e3b341" /> Execution Flow ({executionSteps.length} steps)
          </button>
          <button
            className={`arch-view-tab ${activeTab === "mermaid" ? "active" : ""}`}
            onClick={() => setActiveTab("mermaid")}
          >
            <FaCode /> Mermaid Diagrams
          </button>
          <button
            className={`arch-view-tab ${activeTab === "dictionary" ? "active" : ""}`}
            onClick={() => setActiveTab("dictionary")}
          >
            <FaBook /> Symbol Catalog
          </button>
        </div>

        <div className="arch-toolbar-right">
          {activeTab === "graph" && (
            <>
              <button
                className="arch-tool-btn"
                onClick={() => setZoom(z => Math.max(z - 10, 60))}
                title="Zoom Out"
              >
                <FaSearchMinus />
              </button>
              <span style={{ fontSize: "11px", color: "#888" }}>{zoom}%</span>
              <button
                className="arch-tool-btn"
                onClick={() => setZoom(z => Math.min(z + 10, 160))}
                title="Zoom In"
              >
                <FaSearchPlus />
              </button>
              <button
                className="arch-tool-btn"
                onClick={() => setZoom(100)}
                title="Reset Zoom to 100%"
              >
                <FaExpandArrowsAlt /> Reset
              </button>
            </>
          )}

          {activeTab === "mermaid" && (
            <button className="arch-tool-btn" onClick={handleCopyMermaid}>
              <FaCopy /> {copied ? "Copied!" : "Copy Mermaid"}
            </button>
          )}

          <button className="arch-tool-btn" onClick={handleDownloadJson} title="Export Architecture JSON">
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
              placeholder="Search symbols..."
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
        <div className="arch-viewport">
          <div
            className="arch-graph-grid"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left" }}
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
                          <span className="arch-card-badge">{node.layer}</span>
                        </div>

                        <div className="arch-card-body">
                          {/* File path link */}
                          <div style={{ fontSize: "10px", color: "#6e7681", display: "flex", alignItems: "center", gap: "4px" }}>
                            <FaFileCode /> {node.filePath} ({node.lineCount} lines)
                          </div>

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

                          {/* API Endpoints */}
                          {node.details.endpoints?.length > 0 && (
                            <div>
                              <div className="arch-section-title">Endpoints</div>
                              <div className="arch-chip-list">
                                {node.details.endpoints.slice(0, 3).map((ep, i) => (
                                  <span key={i} className="arch-var-chip" style={{ color: "#d29922" }}>
                                    {ep.method} {ep.path}
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

      {/* Mode 2: Execution Sequence Visualizer */}
      {activeTab === "sequence" && (
        <SequenceVisualizer steps={executionSteps} />
      )}

      {/* Mode 3: Mermaid Diagrams */}
      {activeTab === "mermaid" && (
        <div className="arch-mermaid-view">
          <div>
            <h3 style={{ color: "#58a6ff", marginBottom: "8px" }}>1. Architecture & Component Flowchart</h3>
            <pre className="arch-mermaid-pre">{mermaidFlowchart}</pre>
          </div>

          <div>
            <h3 style={{ color: "#bc8cff", marginBottom: "8px" }}>2. Runtime Call Sequence Diagram</h3>
            <pre className="arch-mermaid-pre">{mermaidSequence}</pre>
          </div>

          <div>
            <h3 style={{ color: "#3fb950", marginBottom: "8px" }}>3. Database Entity Relationship Diagram</h3>
            <pre className="arch-mermaid-pre">{mermaidErd}</pre>
          </div>
        </div>
      )}

      {/* Mode 4: Symbol Catalog */}
      {activeTab === "dictionary" && (
        <div className="arch-dict-view">
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
                // Model fields
                (n.details.fields || []).forEach(f => {
                  rows.push({
                    name: f.name,
                    type: "Schema Field",
                    file: n.fileName,
                    layer: n.layer,
                    details: `Type: ${f.type}${f.ref ? ` (ref: ${f.ref})` : ""}`
                  });
                });
                // State variables
                (n.details.stateVars || []).forEach(v => {
                  rows.push({
                    name: v.state,
                    type: "useState",
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
                    file: n.fileName,
                    layer: n.layer,
                    details: "Network fetcher"
                  });
                });
                return rows;
              }).map((r, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: "monospace", color: "#4fc1ff", fontWeight: "600" }}>{r.name}</td>
                  <td>{r.type}</td>
                  <td style={{ color: "#e6edf3" }}>{r.file}</td>
                  <td>
                    <span className={`arch-card-badge ${r.layer}`}>{r.layer}</span>
                  </td>
                  <td style={{ color: "#8b949e" }}>{r.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

