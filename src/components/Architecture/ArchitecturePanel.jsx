// src/components/Architecture/ArchitecturePanel.jsx
import { useState, useMemo } from "react";
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
  FaLayerGroup
} from "react-icons/fa";
import useEditor from "../../hooks/useEditor";
import { scanCodebaseArchitecture } from "../../services/architectureScanner";

export default function ArchitecturePanel({ onOpenFullView }) {
  const { files = [], openFile } = useEditor();
  const [search, setSearch] = useState("");
  const [collapsedLayers, setCollapsedLayers] = useState({});

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
      const matchFuncs = (n.details.functions || []).some(f => f.toLowerCase().includes(q));
      const matchFields = (n.details.fields || []).some(f => f.name?.toLowerCase().includes(q));
      return matchName || matchFile || matchVars || matchFuncs || matchFields;
    });
  }, [architecture.nodes, search]);

  const layerDefinitions = [
    { key: "model", label: "Database Models", icon: <FaDatabase color="#3fb950" /> },
    { key: "backend", label: "Backend & Routes", icon: <FaServer color="#f85149" /> },
    { key: "service", label: "Services & APIs", icon: <FaSyncAlt color="#d29922" /> },
    { key: "context", label: "Context & State", icon: <FaLayerGroup color="#bc8cff" /> },
    { key: "hook", label: "Custom Hooks", icon: <FaCode color="#f0883e" /> },
    { key: "page", label: "Pages & Views", icon: <FaCube color="#58a6ff" /> },
    { key: "component", label: "UI Components", icon: <FaCube color="#79c0ff" /> }
  ];

  const handleNodeClick = (node) => {
    const targetFile = files.find(f => f.name === node.fileName || f.path === node.filePath);
    if (targetFile && openFile) {
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

        <button className="arch-open-canvas-btn" onClick={onOpenFullView}>
          <FaProjectDiagram /> Open Visual Blueprint
        </button>
      </div>

      {/* Stats Summary Chips */}
      <div className="arch-stats-row">
        <span className="arch-stat-chip model" title="Database Models">
          <FaDatabase /> {architecture.stats.models} Models
        </span>
        <span className="arch-stat-chip component" title="Components & Pages">
          <FaCube /> {architecture.stats.components + architecture.stats.pages} UI
        </span>
        <span className="arch-stat-chip context" title="Context Providers">
          <FaLayerGroup /> {architecture.stats.contexts} Contexts
        </span>
        <span className="arch-stat-chip service" title="Services & APIs">
          <FaSyncAlt /> {architecture.stats.services} Services
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

