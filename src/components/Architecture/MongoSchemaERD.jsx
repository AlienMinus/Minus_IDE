// src/components/Architecture/MongoSchemaERD.jsx
import { useState, useMemo, useEffect, Fragment, useRef } from "react";
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
  FaShieldAlt,
  FaArrowsAlt
} from "react-icons/fa";
import useEditor from "../../hooks/useEditor";
import { extractMongoSchemas } from "../../services/mongoSchemaParser";
import { scanCodebaseArchitecture, isIgnoredPath } from "../../services/architectureScanner";

export default function MongoSchemaERD({ initialModel = null, onSelectModel = null }) {
  const { files = [], openFile, openBackendRoutesTab, scanWorkspaceFiles, isScanningWorkspace, scanProgress } = useEditor();

  const [searchModel, setSearchModel] = useState("");
  const [searchField, setSearchField] = useState("");
  const [selectedModelId, setSelectedModelId] = useState(initialModel);
  const [showDetailPanel, setShowDetailPanel] = useState(!!initialModel);
  const [viewMode, setViewMode] = useState("cards"); // "cards" | "chen" | "routes" | "flow"
  const [chenLod, setChenLod] = useState("keys"); // "keys" | "all" | "none"
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
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

  // Filtered fields for right detail table (top-level schema fields with nested sub-schemas)
  const filteredFields = useMemo(() => {
    if (!activeModel) return [];
    let list = activeModel.topLevelFields || activeModel.fields.filter(f => !f.name.includes("."));
    const q = searchField.toLowerCase().trim();
    if (q) {
      list = list.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.type.toLowerCase().includes(q) ||
        (f.subFields || []).some(sf => sf.name.toLowerCase().includes(q) || sf.type.toLowerCase().includes(q))
      );
    }
    return list;
  }, [activeModel, searchField]);

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
    setExpandedRows(prev => {
      const current = prev[fieldName];
      const isExpanded = current === undefined ? true : current;
      return { ...prev, [fieldName]: !isExpanded };
    });
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

  // Coordinates for Chen diagram layout (3 columns with wide clearance to prevent attribute overlap)
  const getChenCoordinates = (modelName, idx) => {
    const norm = (modelName || "").toLowerCase();
    const positions = {
      about: { cx: 270, cy: 200 },
      contactinfo: { cx: 780, cy: 200 },
      experience: { cx: 1290, cy: 200 },
      hero: { cx: 270, cy: 580 },
      message: { cx: 780, cy: 580 },
      project: { cx: 1290, cy: 580 },
      skill: { cx: 270, cy: 940 }
    };
    if (positions[norm]) return positions[norm];
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    return { cx: 270 + col * 510, cy: 200 + row * 380 };
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

  // Real schema relationships from explicit foreign references
  const realRelationships = useMemo(() => {
    const rels = [];
    models.forEach(m => {
      (m.relations || []).forEach(r => {
        rels.push({
          from: m.name.toLowerCase(),
          to: (r.targetModel || "").toLowerCase(),
          field: r.fromField
        });
      });
    });
    return rels;
  }, [models]);

  // Canvas Drag & Pan Handlers
  const handleCanvasMouseDown = (e) => {
    if (e.button !== 0 || e.target.closest("button") || e.target.closest("input") || e.target.closest(".mongoschema-card-actions")) return;
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

  const handleResetPan = () => {
    setPan({ x: 0, y: 0 });
    setZoom(100);
  };

  const handleCanvasWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -10 : 10;
      setZoom(z => Math.max(30, Math.min(z + delta, 300)));
    }
  };

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
              onClick={handleResetPan}
              title="Reset Pan & Zoom (100%)"
            >
              Fit
            </button>
            <span style={{ fontSize: "11px", color: "#888", marginLeft: "2px" }}>{zoom}%</span>
            <button
              className="mongoschema-zoom-btn"
              onClick={() => setZoom(z => Math.min(z + 15, 300))}
              title="Zoom In (Max 300%)"
            >
              +
            </button>
            <button
              className="mongoschema-zoom-btn"
              onClick={() => setZoom(z => Math.max(z - 15, 30))}
              title="Zoom Out (Min 30%)"
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
              title="Download full MongoDB schema specification as JSON"
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
                : "Scan Codebase"}
            </button>
          </div>
        </div>

        {/* Canvas Body with Dot Grid & Dragability */}
        <div
          className={`mongoschema-canvas-body ${isDragging ? "dragging" : ""}`}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          onWheel={handleCanvasWheel}
          onDoubleClick={handleResetPan}
          style={{ cursor: isDragging ? "grabbing" : "grab" }}
        >
          {/* VIEW MODE 1: CHEN ERD DIAGRAM */}
          {viewMode === "chen" && (
            <div
              className="chen-viewport"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`,
                transformOrigin: "top left"
              }}
            >
              <svg className="chen-svg-canvas" viewBox="0 0 1600 1180" width="1600" height="1180">
                <defs>
                  {/* Subtle neon green glow filter */}
                  <filter id="chen-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#00ff88" floodOpacity="0.4" />
                  </filter>
                </defs>

                {/* 1. Connecting lines between related entities (only when real schema relations exist) */}
                {showRelationships && realRelationships.map((rel, idx) => {
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
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`,
                transformOrigin: "top left",
              }}
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
                            setShowDetailPanel(true);
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

                    {/* Card Fields List with Nested Sub-Schema Tables */}
                    <div className="mongoschema-card-fields">
                      {(model.topLevelFields || model.fields.filter(f => !f.name.includes("."))).map((f, idx) => {
                        const hasSubFields = showEmbeddedDocs && f.subFields && f.subFields.length > 0;
                        return (
                          <div key={idx} className="mongoschema-card-field-block">
                            <div className="mongoschema-field-row">
                              <span className="mongoschema-field-key">
                                {f.name}
                              </span>
                              <span className="mongoschema-field-type">
                                {f.required && <span className="mongoschema-req-check">✓</span>}
                                {f.type}
                              </span>
                            </div>

                            {/* Nested Sub-Schema Table */}
                            {hasSubFields && (
                              <div className="mongoschema-card-nested-table-wrap">
                                <div className="mongoschema-card-nested-header">
                                  <span className="nested-arrow">↳</span>
                                  <span className="nested-title">Sub-Schema:</span>
                                  <span className="nested-name">{f.subSchemaName || `${f.name}Schema`}</span>
                                </div>
                                <table className="mongoschema-card-nested-table">
                                  <thead>
                                    <tr>
                                      <th>Sub-Field</th>
                                      <th>Type</th>
                                      <th style={{ textAlign: "center", width: "36px" }}>Req</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {f.subFields.map((sf, sIdx) => (
                                      <tr key={sIdx}>
                                        <td className="nested-key-cell">{sf.name}</td>
                                        <td className="nested-type-cell">{sf.type}</td>
                                        <td className="nested-req-cell" style={{ textAlign: "center", color: sf.required ? "#00ff88" : "#52525b" }}>
                                          {sf.required ? "✓" : "—"}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })}
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

      {/* 3. RIGHT SCHEMA DETAILS PANEL (Available in Cards mode when Table is clicked) */}
      {viewMode === "cards" && showDetailPanel && activeModel && (
        <div className="mongoschema-detail-panel">
          {/* Header */}
          <div className="mongoschema-detail-header">
            <div className="mongoschema-detail-title-row">
              <span className="mongoschema-detail-title">{activeModel.name}</span>
              <span className="mongoschema-badge-collection">collection: {activeModel.collection}</span>
              <span className="mongoschema-badge-fields">
                {(activeModel.topLevelFields || activeModel.fields).length} fields
              </span>
              {activeModel.subSchemas?.length > 0 && (
                <span className="mongoschema-badge-subschemas">
                  {activeModel.subSchemas.length} sub-schemas
                </span>
              )}
              <button
                className="mongoschema-card-btn"
                onClick={() => setShowDetailPanel(false)}
                title="Close Schema Table Panel"
                style={{ marginLeft: "auto", color: "#f87171", borderColor: "rgba(248, 113, 113, 0.4)" }}
              >
                ✕ Close
              </button>
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
                  const hasSubFields = field.subFields && field.subFields.length > 0;
                  const isExpanded = expandedRows[field.name] === undefined ? true : expandedRows[field.name];

                  return (
                    <Fragment key={field.name || index}>
                      <tr>
                        <td style={{ color: "#71717a", fontFamily: "monospace" }}>{index + 1}</td>
                        <td>
                          <div className="mongoschema-cell-name">
                            {hasSubFields && (
                              <span
                                className="mongoschema-expand-toggle"
                                onClick={() => toggleRowExpand(field.name)}
                                title={isExpanded ? "Collapse Sub-Schema Table" : "Expand Sub-Schema Table"}
                              >
                                {isExpanded ? <FaChevronDown size={9} /> : <FaChevronRight size={9} />}
                              </span>
                            )}
                            <span>{field.name}</span>
                            {hasSubFields && (
                              <span className="mongoschema-subschema-pill">
                                ↳ {field.subSchemaName || `${field.name}Schema`}
                              </span>
                            )}
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

                      {/* Nested Sub-Schema Table Row */}
                      {hasSubFields && isExpanded && showEmbeddedDocs && (
                        <tr className="mongoschema-nested-table-row">
                          <td colSpan="6" className="mongoschema-nested-table-cell">
                            <div className="mongoschema-nested-table-box">
                              <div className="mongoschema-nested-header-bar">
                                <span className="nested-bar-icon">↳</span>
                                <span className="nested-bar-title">Nested Sub-Schema Table:</span>
                                <span className="nested-bar-name">{field.subSchemaName || `${field.name}Schema`}</span>
                                <span className="nested-bar-count">{field.subFields.length} sub-fields</span>
                              </div>
                              <table className="mongoschema-table mongoschema-inner-subtable">
                                <thead>
                                  <tr>
                                    <th style={{ width: "32px" }}>#</th>
                                    <th>Sub-Field Name</th>
                                    <th>Type</th>
                                    <th style={{ width: "60px", textAlign: "center" }}>Required</th>
                                    <th style={{ width: "50px", textAlign: "center" }}>Unique</th>
                                    <th style={{ width: "50px", textAlign: "center" }}>Index</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {field.subFields.map((sf, sfIdx) => (
                                    <tr key={sfIdx}>
                                      <td style={{ color: "#71717a", fontFamily: "monospace" }}>{index + 1}.{sfIdx + 1}</td>
                                      <td>
                                        <div className="mongoschema-cell-name nested">
                                          <span>{sf.name}</span>
                                        </div>
                                      </td>
                                      <td>
                                        <span className={`mongoschema-type-badge ${getTypeBadgeClass(sf.type)}`}>
                                          {sf.type}
                                        </span>
                                      </td>
                                      <td style={{ textAlign: "center", color: sf.required ? "#00ff88" : "#52525b" }}>
                                        {sf.required ? "✓" : "—"}
                                      </td>
                                      <td style={{ textAlign: "center", color: sf.unique ? "#00ff88" : "#52525b" }}>
                                        {sf.unique ? "✓" : "—"}
                                      </td>
                                      <td style={{ textAlign: "center", color: sf.index ? "#38bdf8" : "#52525b" }}>
                                        {sf.index ? "✓" : "—"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>

            {/* Sub-Schemas Defined in File Section */}
            {activeModel.subSchemas?.length > 0 && (
              <div className="mongoschema-subschemas-section">
                <div className="mongoschema-section-label" style={{ marginTop: "20px", marginBottom: "10px", color: "#38bdf8" }}>
                  SUB-SCHEMAS DEFINED IN {activeModel.name}.js ({activeModel.subSchemas.length})
                </div>
                {activeModel.subSchemas.map((subSchema, ssIdx) => (
                  <div key={ssIdx} className="mongoschema-nested-table-box" style={{ marginBottom: "14px" }}>
                    <div className="mongoschema-nested-header-bar">
                      <span className="nested-bar-icon">📋</span>
                      <span className="nested-bar-title">Sub-Schema:</span>
                      <span className="nested-bar-name">{subSchema.name}</span>
                      <span className="nested-bar-count">{subSchema.fields.length} fields</span>
                    </div>
                    <table className="mongoschema-table mongoschema-inner-subtable">
                      <thead>
                        <tr>
                          <th style={{ width: "32px" }}>#</th>
                          <th>Sub-Field Name</th>
                          <th>Type</th>
                          <th style={{ width: "60px", textAlign: "center" }}>Required</th>
                          <th style={{ width: "50px", textAlign: "center" }}>Unique</th>
                          <th style={{ width: "50px", textAlign: "center" }}>Index</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subSchema.fields.map((sf, sfIdx) => (
                          <tr key={sfIdx}>
                            <td style={{ color: "#71717a", fontFamily: "monospace" }}>{sfIdx + 1}</td>
                            <td>
                              <div className="mongoschema-cell-name nested">
                                <span>{sf.name}</span>
                              </div>
                            </td>
                            <td>
                              <span className={`mongoschema-type-badge ${getTypeBadgeClass(sf.type)}`}>
                                {sf.type}
                              </span>
                            </td>
                            <td style={{ textAlign: "center", color: sf.required ? "#00ff88" : "#52525b" }}>
                              {sf.required ? "✓" : "—"}
                            </td>
                            <td style={{ textAlign: "center", color: sf.unique ? "#00ff88" : "#52525b" }}>
                              {sf.unique ? "✓" : "—"}
                            </td>
                            <td style={{ textAlign: "center", color: sf.index ? "#38bdf8" : "#52525b" }}>
                              {sf.index ? "✓" : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
