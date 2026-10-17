// src/components/Architecture/MongoSchemaERD.jsx
import { useState, useMemo, useEffect } from "react";
import "./MongoSchemaERD.css";
import {
  FaDatabase,
  FaCheck,
  FaCopy,
  FaSyncAlt,
  FaDownload,
  FaChevronRight,
  FaChevronDown,
  FaCode,
  FaNetworkWired,
  FaShieldAlt
} from "react-icons/fa";
import useEditor from "../../hooks/useEditor";
import { extractMongoSchemas } from "../../services/mongoSchemaParser";
import { scanCodebaseArchitecture, isIgnoredPath } from "../../services/architectureScanner";

export default function MongoSchemaERD({ initialModel = null, onSelectModel = null }) {
  const { files = [], openFile, openBackendRoutesTab, scanWorkspaceFiles, isScanningWorkspace, scanProgress } = useEditor();

  const [searchModel, setSearchModel] = useState("");
  const [searchField, setSearchField] = useState("");
  const [selectedModelId, setSelectedModelId] = useState(initialModel);
  const [viewMode, setViewMode] = useState("cards"); // "cards" | "chen" | "routes" | "flow"
  const [chenLod, setChenLod] = useState("keys"); // "keys" | "all" | "none"
  const [zoom, setZoom] = useState(100);
  const [showRelationships, setShowRelationships] = useState(true);
  const [showIndexes, setShowIndexes] = useState(true);
  const [showEmbeddedDocs, setShowEmbeddedDocs] = useState(true);
  const [expandedRows, setExpandedRows] = useState({});
  const [copied, setCopied] = useState(false);

  // Extract schemas from current workspace
  const schemaData = useMemo(() => {
    return extractMongoSchemas(files);
  }, [files]);

  const { models = [], stats = { totalModels: 0, totalFields: 0, totalRelations: 0, totalIndexes: 0 } } = schemaData;

  // Auto-scan on mount if any code files have null/empty content or no models are indexed yet
  useEffect(() => {
    if (!scanWorkspaceFiles || isScanningWorkspace) return;
    const hasUnscannedFiles = files.some(f =>
      !isIgnoredPath(f.path, f.name) &&
      (f.content == null || f.content === "") &&
      ["js", "jsx", "ts", "tsx", "json"].some(ext => (f.name || "").toLowerCase().endsWith("." + ext))
    );
    if (hasUnscannedFiles || models.length === 0) {
      scanWorkspaceFiles(false);
    }
  }, [files.length]);

  // Extract backend API routes from architecture scanner for "API Routes" & "Route Flow" views
  const architecture = useMemo(() => {
    return scanCodebaseArchitecture(files);
  }, [files]);

  const backendEndpoints = useMemo(() => {
    const backendNode = architecture.nodes.find(n => n.layer === "backend");
    return backendNode?.details?.endpoints || [];
  }, [architecture.nodes]);

  // Set default selected model if none selected
  const activeModel = useMemo(() => {
    if (!models.length) return null;
    if (selectedModelId) {
      const found = models.find(m => m.id === selectedModelId || m.name.toLowerCase() === selectedModelId.toLowerCase());
      if (found) return found;
    }
    return models[0];
  }, [models, selectedModelId]);

  // Filtered models for sidebar and canvas
  const filteredModels = useMemo(() => {
    const q = searchModel.toLowerCase().trim();
    if (!q) return models;
    return models.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.collection.toLowerCase().includes(q) ||
      m.fields.some(f => f.name.toLowerCase().includes(q))
    );
  }, [models, searchModel]);

  // Filtered fields for right detail table
  const filteredFields = useMemo(() => {
    if (!activeModel) return [];
    let list = activeModel.fields;
    if (!showEmbeddedDocs) {
      list = list.filter(f => !f.isEmbedded || !f.name.includes("."));
    }
    const q = searchField.toLowerCase().trim();
    if (q) {
      list = list.filter(f => f.name.toLowerCase().includes(q) || f.type.toLowerCase().includes(q));
    }
    return list;
  }, [activeModel, showEmbeddedDocs, searchField]);

  const handleOpenSource = (model) => {
    if (!model || !openFile) return;
    let target = files.find(f => !isIgnoredPath(f.path, f.name) && (f.id === model.fileId || f.path === model.filePath));
    if (!target) {
      target = files.find(f => !isIgnoredPath(f.path, f.name) && f.name === model.fileName);
    }
    if (target) {
      openFile(target);
    }
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(schemaData, null, 2));
    const dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", "mongoschema-erd.json");
    dlAnchor.click();
  };

  const handleCopyJson = () => {
    if (!activeModel) return;
    const jsonStr = JSON.stringify(activeModel, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleRowExpand = (fieldName) => {
    setExpandedRows(prev => ({ ...prev, [fieldName]: !prev[fieldName] }));
  };

  const getTypeBadgeClass = (type = "") => {
    const t = type.toLowerCase();
    if (t.includes("string")) return "string";
    if (t.includes("number")) return "number";
    if (t.includes("boolean")) return "boolean";
    if (t.includes("object[]") || t.includes("array")) return "object-array";
    if (t.includes("map")) return "map";
    if (t.includes("objectid")) return "objectid";
    return "default";
  };

  // Coordinates for Chen diagram layout (3 columns layout matching the uploaded screenshot)
  const getChenCoordinates = (modelName, idx) => {
    const norm = (modelName || "").toLowerCase();
    const positions = {
      about: { cx: 290, cy: 190 },
      contactinfo: { cx: 700, cy: 190 },
      experience: { cx: 1110, cy: 190 },
      hero: { cx: 290, cy: 530 },
      message: { cx: 700, cy: 530 },
      project: { cx: 1110, cy: 530 },
      skill: { cx: 290, cy: 860 }
    };
    if (positions[norm]) return positions[norm];
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    return { cx: 290 + col * 410, cy: 190 + row * 340 };
  };

  // Attributes for each entity in Chen diagram
  const getChenAttributesForModel = (model, lod) => {
    if (lod === "none") return [];

    const list = model.fields.map(f => {
      const label = f.name.includes(".") ? f.name.split(".").pop() : f.name;
      return {
        rawName: f.name,
        label,
        type: f.type,
        required: f.required,
        unique: f.unique,
        index: f.index
      };
    });

    // Deduplicate by simple label
    const seen = new Set();
    const deduped = [];
    list.forEach(item => {
      if (!seen.has(item.label)) {
        seen.add(item.label);
        deduped.push(item);
      }
    });

    if (lod === "keys") {
      // Prioritize required / unique / primary attributes up to 9
      return deduped.slice(0, 9);
    }

    return deduped;
  };

  // Pre-configured relationships between entities for Chen diagram
  const chenRelationships = [
    { from: "about", to: "contactinfo" },
    { from: "contactinfo", to: "experience" },
    { from: "hero", to: "message" },
    { from: "message", to: "project" },
    { from: "hero", to: "skill" },
    { from: "about", to: "hero" }
  ];

  return (
    <div className="mongoschema-container">
      {/* 1. LEFT SIDEBAR */}
      <div className="mongoschema-sidebar">
        {/* Brand */}
        <div className="mongoschema-brand">
          <div className="mongoschema-brand-title">
            <FaDatabase size={15} /> MongoSchema
          </div>
          <div className="mongoschema-version">v0.1.0</div>
        </div>

        {/* Search */}
        <div>
          <div className="mongoschema-section-label">SEARCH MODELS</div>
          <input
            type="text"
            className="mongoschema-search-input"
            placeholder="Filter models..."
            value={searchModel}
            onChange={(e) => setSearchModel(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div>
          <div className="mongoschema-section-label">FILTERS</div>
          <div className="mongoschema-filters-list">
            <label className="mongoschema-checkbox-label">
              <input
                type="checkbox"
                checked={showRelationships}
                onChange={(e) => setShowRelationships(e.target.checked)}
              />
              Show Relationships
            </label>
            <label className="mongoschema-checkbox-label">
              <input
                type="checkbox"
                checked={showIndexes}
                onChange={(e) => setShowIndexes(e.target.checked)}
              />
              Show Indexes
            </label>
            <label className="mongoschema-checkbox-label">
              <input
                type="checkbox"
                checked={showEmbeddedDocs}
                onChange={(e) => setShowEmbeddedDocs(e.target.checked)}
              />
              Show Embedded Docs
            </label>
          </div>
        </div>

        {/* Chen Attributes LOD Control */}
        <div>
          <div className="mongoschema-section-label">CHEN ATTRIBUTES LOD</div>
          <div className="mongoschema-lod-control">
            <button
              className={`mongoschema-lod-btn ${chenLod === "keys" ? "active" : ""}`}
              onClick={() => {
                setChenLod("keys");
                setViewMode("chen");
              }}
            >
              Keys
            </button>
            <button
              className={`mongoschema-lod-btn ${chenLod === "all" ? "active" : ""}`}
              onClick={() => {
                setChenLod("all");
                setViewMode("chen");
              }}
            >
              All
            </button>
            <button
              className={`mongoschema-lod-btn ${chenLod === "none" ? "active" : ""}`}
              onClick={() => {
                setChenLod("none");
                setViewMode("chen");
              }}
            >
              None
            </button>
          </div>
        </div>

        {/* Statistics 2x2 Grid */}
        <div>
          <div className="mongoschema-section-label">STATISTICS</div>
          <div className="mongoschema-stats-grid">
            <div className="mongoschema-stat-card">
              <div className="mongoschema-stat-num">{stats.totalModels}</div>
              <div className="mongoschema-stat-title">Models</div>
            </div>
            <div className="mongoschema-stat-card">
              <div className="mongoschema-stat-num">{stats.totalFields}</div>
              <div className="mongoschema-stat-title">Fields</div>
            </div>
            <div className="mongoschema-stat-card">
              <div className="mongoschema-stat-num">{stats.totalRelations}</div>
              <div className="mongoschema-stat-title">Relations</div>
            </div>
            <div className="mongoschema-stat-card">
              <div className="mongoschema-stat-num">{stats.totalIndexes}</div>
              <div className="mongoschema-stat-title">Indexes</div>
            </div>
          </div>
        </div>

        {/* Models List */}
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <div className="mongoschema-section-label">MODELS ({filteredModels.length})</div>
          <div className="mongoschema-models-list">
            {filteredModels.map(m => (
              <div
                key={m.id}
                className={`mongoschema-model-item ${activeModel?.id === m.id ? "active" : ""}`}
                onClick={() => {
                  setSelectedModelId(m.id);
                  if (onSelectModel) onSelectModel(m);
                }}
              >
                <span className="mongoschema-model-name">{m.name}</span>
                <span className="mongoschema-model-count">{m.fields.length} fields</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. CENTER CANVAS VIEWPORT */}
      <div className="mongoschema-canvas-area">
        {/* Canvas Toolbar */}
        <div className="mongoschema-toolbar">
          <div className="mongoschema-toolbar-left">
            <button
              className={`mongoschema-view-pill ${viewMode === "cards" ? "active" : ""}`}
              onClick={() => setViewMode("cards")}
            >
              Schema Cards
            </button>
            <button
              className={`mongoschema-view-pill ${viewMode === "chen" ? "active" : ""}`}
              onClick={() => setViewMode("chen")}
            >
              Chen ERD
            </button>

            {/* Sub-pills when Chen ERD is active */}
            {viewMode === "chen" && (
              <>
                <button
                  className={`mongoschema-sub-pill ${chenLod === "keys" ? "active" : ""}`}
                  onClick={() => setChenLod("keys")}
                >
                  Key Fields
                </button>
                <button
                  className={`mongoschema-sub-pill ${chenLod === "all" ? "active" : ""}`}
                  onClick={() => setChenLod("all")}
                >
                  All Fields
                </button>
                <button
                  className={`mongoschema-sub-pill ${chenLod === "none" ? "active" : ""}`}
                  onClick={() => setChenLod("none")}
                >
                  Entities Only
                </button>
              </>
            )}

            <button
              className="mongoschema-view-pill"
              onClick={() => setZoom(100)}
            >
              Fit
            </button>
            <span style={{ fontSize: "11px", color: "#888", marginLeft: "2px" }}>{zoom}%</span>
            <button
              className="mongoschema-zoom-btn"
              onClick={() => setZoom(z => Math.min(z + 10, 160))}
              title="Zoom In"
            >
              +
            </button>
            <button
              className="mongoschema-zoom-btn"
              onClick={() => setZoom(z => Math.max(z - 10, 60))}
              title="Zoom Out"
            >
              -
            </button>
            <button
              className={`mongoschema-view-pill ${viewMode === "routes" ? "active" : ""}`}
              onClick={() => {
                if (openBackendRoutesTab) openBackendRoutesTab("table");
                else setViewMode("routes");
              }}
              style={{ marginLeft: "4px" }}
            >
              API Routes
            </button>
            <button
              className={`mongoschema-view-pill ${viewMode === "flow" ? "active" : ""}`}
              onClick={() => {
                if (openBackendRoutesTab) openBackendRoutesTab("flow");
                else setViewMode("flow");
              }}
            >
              Route Flow
            </button>
          </div>

          <div className="mongoschema-toolbar-right">
            <button
              className="mongoschema-view-pill"
              onClick={handleExportJson}
              title="Export complete schema as JSON"
            >
              <FaDownload size={11} /> Export JSON
            </button>
            <button
              className={`mongoschema-btn-green ${isScanningWorkspace ? "scanning" : ""}`}
              onClick={() => scanWorkspaceFiles && scanWorkspaceFiles(true)}
              disabled={isScanningWorkspace}
              title="Scan all workspace files to parse Mongoose models without opening each file"
            >
              <FaSyncAlt className={isScanningWorkspace ? "spinning" : ""} size={10} />
              {isScanningWorkspace
                ? (scanProgress ? `Scanning (${scanProgress.current}/${scanProgress.total})...` : "Scanning...")
                : "⚡ Scan / Refresh"}
            </button>
          </div>
        </div>

        {/* Canvas Body with Dot Grid */}
        <div className="mongoschema-canvas-body">
          {/* VIEW MODE 1: CHEN ERD DIAGRAM */}
          {viewMode === "chen" && (
            <div
              className="chen-viewport"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left" }}
            >
              <svg className="chen-svg-canvas">
                <defs>
                  {/* Subtle neon green glow filter */}
                  <filter id="chen-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#00ff88" floodOpacity="0.4" />
                  </filter>
                </defs>

                {/* 1. Connecting lines between related entities */}
                {showRelationships && chenRelationships.map((rel, idx) => {
                  const m1 = filteredModels.find(m => m.name.toLowerCase() === rel.from);
                  const m2 = filteredModels.find(m => m.name.toLowerCase() === rel.to);
                  if (!m1 || !m2) return null;

                  const p1 = getChenCoordinates(m1.name, 0);
                  const p2 = getChenCoordinates(m2.name, 1);
                  const midX = (p1.cx + p2.cx) / 2;
                  const midY = (p1.cy + p2.cy) / 2;

                  return (
                    <g key={idx}>
                      <line
                        x1={p1.cx}
                        y1={p1.cy}
                        x2={p2.cx}
                        y2={p2.cy}
                        className="chen-inter-entity-line"
                      />
                      {/* Chen Relationship Diamond */}
                      <polygon
                        points={`${midX},${midY - 8} ${midX + 10},${midY} ${midX},${midY + 8} ${midX - 10},${midY}`}
                        fill="#0b130e"
                        stroke="#22c55e"
                        strokeWidth="1"
                      />
                    </g>
                  );
                })}

                {/* 2. Entities & Radiating Attribute Ovals */}
                {filteredModels.map((model, idx) => {
                  const { cx, cy } = getChenCoordinates(model.name, idx);
                  const attrs = getChenAttributesForModel(model, chenLod);
                  const N = attrs.length;
                  const isSelected = activeModel?.id === model.id;

                  return (
                    <g key={model.id}>
                      {/* Connecting lines from entity center to each attribute oval */}
                      {attrs.map((attr, aIdx) => {
                        const angle = -Math.PI / 2 + (2 * Math.PI * aIdx) / N;
                        const isWide = attr.label.length > 7;
                        const Rx = 125 + (isWide ? 20 : 0);
                        const Ry = 85;
                        const ax = cx + Rx * Math.cos(angle);
                        const ay = cy + Ry * Math.sin(angle);

                        return (
                          <line
                            key={aIdx}
                            x1={cx}
                            y1={cy}
                            x2={ax}
                            y2={ay}
                            className="chen-rel-line"
                          />
                        );
                      })}

                      {/* Radiating Attribute Ovals */}
                      {attrs.map((attr, aIdx) => {
                        const angle = -Math.PI / 2 + (2 * Math.PI * aIdx) / N;
                        const isWide = attr.label.length > 7;
                        const Rx = 125 + (isWide ? 20 : 0);
                        const Ry = 85;
                        const ax = cx + Rx * Math.cos(angle);
                        const ay = cy + Ry * Math.sin(angle);

                        const pillW = Math.max(46, attr.label.length * 7 + 16);
                        const pillH = 22;

                        return (
                          <g
                            key={aIdx}
                            className="chen-attr-node"
                            onClick={() => {
                              setSelectedModelId(model.id);
                              setSearchField(attr.label);
                            }}
                          >
                            <rect
                              x={ax - pillW / 2}
                              y={ay - pillH / 2}
                              width={pillW}
                              height={pillH}
                              rx={pillH / 2}
                              ry={pillH / 2}
                              fill="#09120e"
                              stroke={attr.required ? "#00ff88" : "#22c55e"}
                              strokeWidth={attr.required ? "1.2" : "0.9"}
                            />
                            <text
                              x={ax}
                              y={ay + 3.5}
                              textAnchor="middle"
                              fill="#00ff88"
                              fontSize="10"
                              fontFamily="monospace"
                              fontWeight={attr.required ? "700" : "500"}
                            >
                              {attr.label}
                            </text>
                          </g>
                        );
                      })}

                      {/* Center Entity Rectangle */}
                      <g
                        className="chen-entity-node"
                        onClick={() => {
                          setSelectedModelId(model.id);
                          if (onSelectModel) onSelectModel(model);
                        }}
                        onDoubleClick={() => handleOpenSource(model)}
                      >
                        <rect
                          x={cx - 52}
                          y={cy - 24}
                          width="104"
                          height="48"
                          rx="3"
                          fill="#0b130e"
                          stroke={isSelected ? "#00ff88" : "#22c55e"}
                          strokeWidth={isSelected ? "2" : "1.2"}
                          filter={isSelected ? "url(#chen-glow)" : undefined}
                        />
                        {/* Double inner border for strong Chen entity style */}
                        <rect
                          x={cx - 48}
                          y={cy - 20}
                          width="96"
                          height="40"
                          rx="2"
                          fill="none"
                          stroke="#153623"
                          strokeWidth="1"
                        />
                        <text
                          x={cx}
                          y={cy - 2}
                          textAnchor="middle"
                          fill="#00ff88"
                          fontSize="12"
                          fontWeight="700"
                        >
                          {model.name}
                        </text>
                        <text
                          x={cx}
                          y={cy + 13}
                          textAnchor="middle"
                          fill="#71717a"
                          fontSize="10"
                        >
                          {model.collection}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}

          {/* VIEW MODE 2: SCHEMA CARDS GRID */}
          {viewMode === "cards" && (
            <div
              className="mongoschema-cards-flow"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left" }}
            >
              {filteredModels.map(model => {
                const isSelected = activeModel?.id === model.id;
                return (
                  <div
                    key={model.id}
                    className={`mongoschema-card ${isSelected ? "selected" : ""}`}
                    onClick={() => setSelectedModelId(model.id)}
                  >
                    {/* Card Header */}
                    <div className="mongoschema-card-header">
                      <div className="mongoschema-card-title-wrap">
                        <span className="mongoschema-card-model-name">{model.name}</span>
                        <span className="mongoschema-card-collection">{model.collection}</span>
                      </div>
                      <div className="mongoschema-card-actions">
                        <button
                          className="mongoschema-card-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedModelId(model.id);
                          }}
                        >
                          Table
                        </button>
                        <button
                          className="mongoschema-card-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenSource(model);
                          }}
                        >
                          Source
                        </button>
                      </div>
                    </div>

                    {/* Card Fields List */}
                    <div className="mongoschema-card-fields">
                      {model.fields.slice(0, 12).map((f, idx) => {
                        const isNested = f.name.includes(".");
                        return (
                          <div key={idx} className="mongoschema-field-row">
                            <span className={`mongoschema-field-key ${isNested ? "nested" : ""}`}>
                              {f.name}
                            </span>
                            <span className="mongoschema-field-type">
                              {f.required && <span className="mongoschema-req-check">✓</span>}
                              {f.type}
                            </span>
                          </div>
                        );
                      })}
                      {model.fields.length > 12 && (
                        <div style={{ color: "#71717a", fontSize: "10px", marginTop: "4px" }}>
                          +{model.fields.length - 12} more fields...
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW MODE 3: API ROUTES & ROUTE FLOW */}
          {(viewMode === "routes" || viewMode === "flow") && (
            <div className="mongoschema-routes-wrap">
              <div className="mongoschema-routes-title">
                <FaNetworkWired /> Backend Express Routes & Queried MongoDB Models
              </div>
              <table className="mongoschema-table">
                <thead>
                  <tr>
                    <th>HTTP Method</th>
                    <th>Route Path</th>
                    <th>Queried MongoDB Models</th>
                    <th>Security</th>
                  </tr>
                </thead>
                <tbody>
                  {backendEndpoints.map((ep, i) => (
                    <tr key={i}>
                      <td>
                        <span style={{
                          fontFamily: "monospace",
                          fontWeight: "700",
                          color: ep.method === "GET" ? "#00ff88" : ep.method === "POST" ? "#38bdf8" : "#f59e0b"
                        }}>
                          {ep.method}
                        </span>
                      </td>
                      <td style={{ fontFamily: "monospace", color: "#e4e4e7" }}>{ep.path}</td>
                      <td>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          {ep.models?.length > 0 ? (
                            ep.models.map((m, mi) => (
                              <span
                                key={mi}
                                className="mongoschema-badge-fields"
                                style={{ cursor: "pointer" }}
                                onClick={() => {
                                  const targetM = models.find(mod => mod.name.toLowerCase() === m.toLowerCase());
                                  if (targetM) {
                                    setSelectedModelId(targetM.id);
                                    setViewMode("chen");
                                  }
                                }}
                              >
                                {m}
                              </span>
                            ))
                          ) : (
                            <span style={{ color: "#71717a" }}>Custom Controller</span>
                          )}
                        </div>
                      </td>
                      <td>
                        {ep.isProtected ? (
                          <span style={{ color: "#f87171", display: "flex", alignItems: "center", gap: "4px" }}>
                            <FaShieldAlt size={10} /> Protected
                          </span>
                        ) : (
                          <span style={{ color: "#71717a" }}>Public</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 3. RIGHT SCHEMA DETAILS PANEL (Available in Cards mode or when an Entity is selected) */}
      {viewMode === "cards" && activeModel && (
        <div className="mongoschema-detail-panel">
          {/* Header */}
          <div className="mongoschema-detail-header">
            <div className="mongoschema-detail-title-row">
              <span className="mongoschema-detail-title">{activeModel.name}</span>
              <span className="mongoschema-badge-collection">collection: {activeModel.collection}</span>
              <span className="mongoschema-badge-fields">{activeModel.fields.length} fields</span>
            </div>

            <div className="mongoschema-detail-filepath">
              {activeModel.filePath}
            </div>

            <div className="mongoschema-detail-actions-bar">
              <input
                type="text"
                className="mongoschema-filter-fields"
                placeholder="Filter fields..."
                value={searchField}
                onChange={(e) => setSearchField(e.target.value)}
              />
              <button
                className="mongoschema-action-btn"
                onClick={() => handleOpenSource(activeModel)}
                title="Open Source Code in Editor"
              >
                <FaCode size={11} /> Open Source
              </button>
              <button
                className="mongoschema-action-btn"
                onClick={handleCopyJson}
                title="Copy JSON Schema"
              >
                {copied ? <FaCheck color="#00ff88" size={11} /> : <FaCopy size={11} />}
                {copied ? "Copied" : "Copy JSON"}
              </button>
              <button
                className="mongoschema-action-btn primary"
                onClick={() => setSearchField("")}
                title="Refresh Schema"
              >
                <FaSyncAlt size={10} /> Refresh
              </button>
            </div>
          </div>

          {/* Details Table */}
          <div className="mongoschema-detail-table-wrap">
            <table className="mongoschema-table">
              <thead>
                <tr>
                  <th style={{ width: "24px" }}>#</th>
                  <th>Field Name</th>
                  <th>Type</th>
                  <th style={{ width: "60px" }}>Required</th>
                  <th style={{ width: "50px" }}>Unique</th>
                  <th style={{ width: "50px" }}>Index</th>
                </tr>
              </thead>
              <tbody>
                {filteredFields.map((field, index) => {
                  const isNested = field.name.includes(".");
                  const hasChildren = field.type === "Object[]";
                  const isExpanded = expandedRows[field.name];

                  return (
                    <tr key={index}>
                      <td style={{ color: "#71717a", fontFamily: "monospace" }}>{index + 1}</td>
                      <td>
                        <div className={`mongoschema-cell-name ${isNested ? "nested" : ""}`}>
                          {hasChildren && (
                            <span
                              style={{ cursor: "pointer", display: "inline-flex", alignItems: "center" }}
                              onClick={() => toggleRowExpand(field.name)}
                            >
                              {isExpanded ? <FaChevronDown size={9} /> : <FaChevronRight size={9} />}
                            </span>
                          )}
                          <span>{field.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`mongoschema-type-badge ${getTypeBadgeClass(field.type)}`}>
                          {field.type}
                        </span>
                      </td>
                      <td style={{ textAlign: "center", color: field.required ? "#00ff88" : "#52525b" }}>
                        {field.required ? "✓" : "—"}
                      </td>
                      <td style={{ textAlign: "center", color: field.unique ? "#00ff88" : "#52525b" }}>
                        {field.unique ? "✓" : "—"}
                      </td>
                      <td style={{ textAlign: "center", color: field.index ? "#38bdf8" : "#52525b" }}>
                        {field.index ? "✓" : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
