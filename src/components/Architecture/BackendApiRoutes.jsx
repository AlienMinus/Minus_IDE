// src/components/Architecture/BackendApiRoutes.jsx
import { useState, useMemo, useEffect } from "react";
import "./BackendApiRoutes.css";
import {
  FaNetworkWired,
  FaSyncAlt,
  FaDownload,
  FaProjectDiagram,
  FaDatabase,
  FaCode,
  FaSearch,
  FaShieldAlt
} from "react-icons/fa";
import useEditor from "../../hooks/useEditor";
import { extractWorkspaceRoutes } from "../../services/backendRouteParser";
import { isIgnoredPath } from "../../services/architectureScanner";

export default function BackendApiRoutes({ onOpenModel = null }) {
  const { files = [], openFile, openMongoSchemaTab, jumpToProblem, scanWorkspaceFiles, isScanningWorkspace, scanProgress } = useEditor();

  const [activeMethod, setActiveMethod] = useState("ALL");
  const [search, setSearch] = useState("");
  const [protectedOnly, setProtectedOnly] = useState(false);
  const [viewMode, setViewMode] = useState("table"); // "table" | "flow"
  const [zoom, setZoom] = useState(100);

  // Extract all routes from workspace across all folder directories
  const routesData = useMemo(() => {
    return extractWorkspaceRoutes(files);
  }, [files]);

  const { routers = [], endpoints = [], stats = { totalEndpoints: 0, routerFiles: 0, protectedCount: 0, linkedModelsCount: 0 }, methodCounts = {} } = routesData;

  // Auto-scan on mount if any files lack content or no endpoints found yet
  useEffect(() => {
    if (!scanWorkspaceFiles || isScanningWorkspace) return;
    const hasUnscannedFiles = files.some(f =>
      !isIgnoredPath(f.path, f.name) &&
      (f.content == null || f.content === "") &&
      ["js", "jsx", "ts", "tsx", "json"].some(ext => (f.name || "").toLowerCase().endsWith("." + ext))
    );
    if (hasUnscannedFiles || endpoints.length === 0) {
      scanWorkspaceFiles(false);
    }
  }, [files.length]);

  // Filtered endpoints for table
  const filteredEndpoints = useMemo(() => {
    return endpoints.filter(ep => {
      if (activeMethod !== "ALL" && ep.method !== activeMethod) return false;
      if (protectedOnly && !ep.isProtected) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        ep.path?.toLowerCase().includes(q) ||
        ep.handler?.toLowerCase().includes(q) ||
        ep.middlewares?.toLowerCase().includes(q) ||
        (ep.models || []).some(m => m.toLowerCase().includes(q))
      );
    });
  }, [endpoints, activeMethod, protectedOnly, search]);

  const handleOpenSourceLine = (ep) => {
    if (!openFile) return;
    let target = files.find(f => !isIgnoredPath(f.path, f.name) && (f.id === ep.fileId || f.path === ep.filePath));
    if (!target) {
      target = files.find(f => !isIgnoredPath(f.path, f.name) && f.name === "server.js");
    }
    if (target) {
      openFile(target);
      if (jumpToProblem && ep.line) {
        jumpToProblem({
          fileId: target.id,
          filename: target.name,
          lineNumber: ep.line,
          startLineNumber: ep.line,
          column: 1
        });
      }
    }
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(routesData, null, 2));
    const dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", "backend-api-routes.json");
    dlAnchor.click();
  };

  const handleModelClick = (modelName) => {
    if (openMongoSchemaTab) {
      openMongoSchemaTab(modelName);
    } else if (onOpenModel) {
      onOpenModel(modelName);
    }
  };

  // Distinct linked models for Visual Flow Graph
  const allUniqueModels = useMemo(() => {
    const set = new Set();
    endpoints.forEach(e => (e.models || []).forEach(m => set.add(m)));
    return Array.from(set);
  }, [endpoints]);

  // Visual Flow Graph Layout Coordinates
  const flowLayout = useMemo(() => {
    const routerX = 140;
    const routerY = Math.max(120, (endpoints.length * 52) / 2);

    const endpointsX = 480;
    const endpointsYStep = 56;
    const endpointsStartY = 40;

    const endpointNodes = endpoints.map((ep, i) => ({
      ...ep,
      x: endpointsX,
      y: endpointsStartY + i * endpointsYStep,
      w: 220,
      h: 44
    }));

    const modelsX = 840;
    const modelsYStep = 80;
    const modelsStartY = Math.max(40, (endpointNodes.length * endpointsYStep - allUniqueModels.length * modelsYStep) / 2);

    const modelNodes = allUniqueModels.map((m, i) => ({
      name: m,
      x: modelsX,
      y: modelsStartY + i * modelsYStep,
      w: 130,
      h: 46
    }));

    return {
      router: { name: routers[0]?.fileName || "Server.js", routesCount: endpoints.length, x: routerX, y: routerY, w: 160, h: 56 },
      endpointNodes,
      modelNodes,
      totalHeight: Math.max(800, endpointNodes.length * endpointsYStep + 100),
      totalWidth: 1060
    };
  }, [endpoints, routers, allUniqueModels]);

  return (
    <div className="routes-container">
      {/* 1. TOP HEADER */}
      <div className="routes-header">
        <div className="routes-title-wrap">
          <div className="routes-title">
            <FaNetworkWired size={18} /> Backend API Routes
          </div>
          <span className="routes-endpoint-count-pill">{stats.totalEndpoints} endpoints</span>
        </div>

        <div className="routes-header-actions">
          <button
            className={`routes-action-pill ${viewMode === "flow" ? "active" : ""}`}
            onClick={() => setViewMode(v => v === "flow" ? "table" : "flow")}
          >
            <FaProjectDiagram size={11} /> {viewMode === "flow" ? "Table View" : "Visual Flow Graph"}
          </button>
          <button
            className="routes-action-pill"
            onClick={() => openMongoSchemaTab && openMongoSchemaTab()}
          >
            <FaDatabase size={11} /> ER Diagram
          </button>
          <button
            className="routes-action-pill"
            onClick={handleExportJson}
          >
            <FaDownload size={11} /> Export JSON
          </button>
          <button
            className={`routes-btn-refresh ${isScanningWorkspace ? "scanning" : ""}`}
            onClick={() => scanWorkspaceFiles && scanWorkspaceFiles(true)}
            disabled={isScanningWorkspace}
            title="Scan all workspace files across all folders to parse backend API routes without opening each file"
          >
            <FaSyncAlt className={isScanningWorkspace ? "spinning" : ""} size={10} />
            {isScanningWorkspace
              ? (scanProgress ? `Scanning (${scanProgress.current}/${scanProgress.total})...` : "Scanning...")
              : "⚡ Scan / Refresh"}
          </button>
        </div>
      </div>

      {/* 2. STATS 4-CARD SUMMARY */}
      <div className="routes-stats-row">
        <div className="routes-stat-box">
          <span className="routes-stat-number">{stats.totalEndpoints}</span>
          <span className="routes-stat-label">Endpoints</span>
        </div>
        <div className="routes-stat-box">
          <span className="routes-stat-number">{stats.routerFiles}</span>
          <span className="routes-stat-label">Router Files</span>
        </div>
        <div className="routes-stat-box">
          <span className="routes-stat-number">{stats.protectedCount}</span>
          <span className="routes-stat-label">Protected</span>
        </div>
        <div className="routes-stat-box">
          <span className="routes-stat-number">{stats.linkedModelsCount}</span>
          <span className="routes-stat-label">Linked Models</span>
        </div>
      </div>

      {/* 3. FILTER BAR */}
      <div className="routes-filter-bar">
        <div className="routes-method-pills">
          {["ALL", "GET", "POST", "PUT", "DELETE", "PATCH"].map(m => (
            <button
              key={m}
              className={`routes-method-btn ${activeMethod === m ? "active" : ""}`}
              onClick={() => setActiveMethod(m)}
            >
              {m} ({methodCounts[m] || 0})
            </button>
          ))}
        </div>

        <div className="routes-search-section">
          <input
            type="text"
            className="routes-search-input"
            placeholder="Search path, handler, middleware..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <label className="routes-checkbox-label">
            <input
              type="checkbox"
              checked={protectedOnly}
              onChange={(e) => setProtectedOnly(e.target.checked)}
            />
            Protected Only
          </label>
        </div>
      </div>

      {/* 4. MAIN CONTENT VIEWPORT */}
      {routers.length === 0 ? (
        <div className="routes-empty-state" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", textAlign: "center", color: "#a1a1aa" }}>
          <FaNetworkWired size={44} style={{ color: "#38bdf8", marginBottom: "16px", opacity: 0.8 }} />
          <h3 style={{ color: "#f4f4f5", fontSize: "18px", marginBottom: "8px" }}>No Backend API Routes Indexed</h3>
          <p style={{ maxWidth: "460px", fontSize: "13px", lineHeight: "1.6", marginBottom: "20px" }}>
            Express server routes, router definitions, and API endpoints are indexed automatically across all workspace folders. Click below to scan the workspace.
          </p>
          <button
            className="routes-btn-refresh"
            onClick={() => scanWorkspaceFiles && scanWorkspaceFiles(true)}
            disabled={isScanningWorkspace}
            style={{ padding: "8px 18px", fontSize: "13px" }}
          >
            <FaSyncAlt className={isScanningWorkspace ? "spinning" : ""} size={12} />
            {isScanningWorkspace ? "Scanning Codebase..." : "⚡ Scan Codebase for Routes"}
          </button>
        </div>
      ) : viewMode === "table" ? (
        <div className="routes-scroll-body">
          {routers.map((router, rIdx) => (
            <div key={rIdx} style={{ marginBottom: "24px" }}>
              <div className="routes-file-header">
                <div>
                  <span className="routes-file-name">{router.fileName}</span>
                  <span className="routes-file-path">{router.filePath}</span>
                </div>
                <span className="routes-file-count">{filteredEndpoints.length} routes</span>
              </div>

              <table className="routes-table">
                <thead>
                  <tr>
                    <th style={{ width: "70px" }}>METHOD</th>
                    <th style={{ width: "200px" }}>ENDPOINT PATH</th>
                    <th style={{ width: "70px" }}>PARAMS</th>
                    <th style={{ width: "100px" }}>MIDDLEWARES</th>
                    <th>HANDLER</th>
                    <th style={{ width: "220px" }}>LINKED MODELS</th>
                    <th style={{ width: "80px", textAlign: "right" }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEndpoints.map((ep, eIdx) => {
                    const methodClass = ep.method.toLowerCase();
                    return (
                      <tr key={eIdx}>
                        <td>
                          <span className={`routes-badge-method ${methodClass}`}>
                            {ep.method}
                          </span>
                        </td>
                        <td>
                          <span className="routes-cell-path">
                            {ep.path}
                          </span>
                        </td>
                        <td style={{ color: "#71717a" }}>{ep.params}</td>
                        <td style={{ color: "#71717a" }}>{ep.middlewares}</td>
                        <td>
                          <span className="routes-cell-handler">
                            {ep.handler}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                            {ep.models.map((m, mIdx) => (
                              <span
                                key={mIdx}
                                className="routes-model-pill"
                                onClick={() => handleModelClick(m)}
                                title={`View ${m} in MongoSchema ERD`}
                              >
                                {m}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <span
                            className="routes-action-code"
                            onClick={() => handleOpenSourceLine(ep)}
                            title={`Jump to line ${ep.line} in ${router.fileName}`}
                          >
                            Code :{ep.line}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ) : (
        /* VISUAL FLOW GRAPH VIEW (3-COLUMN BEZIER FLOW) */
        <div className="routes-flow-canvas-viewport">
          <svg
            className="routes-flow-svg"
            style={{
              width: flowLayout.totalWidth,
              height: flowLayout.totalHeight,
              transform: `scale(${zoom / 100})`,
              transformOrigin: "top left"
            }}
          >
            {/* 1. Connecting Bezier Curves from Router to Endpoints */}
            {flowLayout.endpointNodes.map((ep, i) => {
              const x1 = flowLayout.router.x + flowLayout.router.w;
              const y1 = flowLayout.router.y + flowLayout.router.h / 2;
              const x2 = ep.x;
              const y2 = ep.y + ep.h / 2;
              const dx = (x2 - x1) * 0.5;

              return (
                <path
                  key={`r-to-e-${i}`}
                  d={`M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`}
                  className="routes-flow-curve"
                />
              );
            })}

            {/* 2. Connecting Bezier Curves from Endpoints to Linked Models */}
            {flowLayout.endpointNodes.map((ep, i) => {
              const x1 = ep.x + ep.w;
              const y1 = ep.y + ep.h / 2;

              return (ep.models || []).map((mName, mi) => {
                const targetModel = flowLayout.modelNodes.find(mn => mn.name.toLowerCase() === mName.toLowerCase());
                if (!targetModel) return null;

                const x2 = targetModel.x;
                const y2 = targetModel.y + targetModel.h / 2;
                const dx = (x2 - x1) * 0.5;

                return (
                  <path
                    key={`e-to-m-${i}-${mi}`}
                    d={`M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`}
                    className="routes-flow-curve"
                  />
                );
              });
            })}

            {/* 3. Column 1: Router Node */}
            <g
              className="routes-flow-node-router"
              onClick={() => handleOpenSourceLine(flowLayout.endpointNodes[0] || {})}
            >
              <rect
                x={flowLayout.router.x}
                y={flowLayout.router.y}
                width={flowLayout.router.w}
                height={flowLayout.router.h}
                rx={6}
                fill="#0d1416"
                stroke="#00ff88"
                strokeWidth={1.5}
              />
              <text
                x={flowLayout.router.x + 14}
                y={flowLayout.router.y + 24}
                fill="#00ff88"
                fontSize="13"
                fontWeight="700"
              >
                Router: {flowLayout.router.name}
              </text>
              <text
                x={flowLayout.router.x + 14}
                y={flowLayout.router.y + 42}
                fill="#71717a"
                fontSize="11"
              >
                {flowLayout.router.routesCount} routes
              </text>
            </g>

            {/* 4. Column 2: Endpoint Nodes */}
            {flowLayout.endpointNodes.map((ep, i) => (
              <g
                key={`ep-${i}`}
                className="routes-flow-node-endpoint"
                onClick={() => handleOpenSourceLine(ep)}
              >
                <rect
                  x={ep.x}
                  y={ep.y}
                  width={ep.w}
                  height={ep.h}
                  rx={5}
                  fill="#101214"
                  stroke="#27272a"
                  strokeWidth={1}
                />
                <text
                  x={ep.x + 10}
                  y={ep.y + 18}
                  fill={ep.method === "GET" ? "#00ff88" : ep.method === "POST" ? "#38bdf8" : "#f59e0b"}
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="700"
                >
                  {ep.method}
                </text>
                <text
                  x={ep.x + (ep.method === "GET" ? 42 : ep.method === "POST" ? 46 : 38)}
                  y={ep.y + 18}
                  fill="#00ff88"
                  fontSize="11"
                  fontFamily="monospace"
                  fontWeight="600"
                >
                  {ep.path}
                </text>
                <text
                  x={ep.x + 10}
                  y={ep.y + 34}
                  fill="#60a5fa"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {ep.handler?.length > 28 ? ep.handler.slice(0, 26) + "..." : ep.handler}
                </text>
              </g>
            ))}

            {/* 5. Column 3: Model Nodes */}
            {flowLayout.modelNodes.map((mn, i) => (
              <g
                key={`mn-${i}`}
                className="routes-flow-node-model"
                onClick={() => handleModelClick(mn.name)}
              >
                <rect
                  x={mn.x}
                  y={mn.y}
                  width={mn.w}
                  height={mn.h}
                  rx={5}
                  fill="#0c1214"
                  stroke="#38bdf8"
                  strokeWidth={1}
                />
                <text
                  x={mn.x + 12}
                  y={mn.y + 20}
                  fill="#00ff88"
                  fontSize="13"
                  fontWeight="700"
                >
                  {mn.name}
                </text>
                <text
                  x={mn.x + 12}
                  y={mn.y + 36}
                  fill="#71717a"
                  fontSize="10"
                >
                  Model Schema
                </text>
              </g>
            ))}
          </svg>
        </div>
      )}
    </div>
  );
}

