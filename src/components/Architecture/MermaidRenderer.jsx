// src/components/Architecture/MermaidRenderer.jsx
import { useEffect, useRef, useState } from "react";
import "./MermaidRenderer.css";
import {
  FaSearchPlus,
  FaSearchMinus,
  FaExpandArrowsAlt,
  FaCopy,
  FaDownload,
  FaCode,
  FaCheck,
  FaSpinner,
  FaCube
} from "react-icons/fa";

export default function MermaidRenderer({ code, title = "Diagram", onSwitchTo3D }) {
  const containerRef = useRef(null);
  const viewportRef = useRef(null);
  const naturalSizeRef = useRef({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);

  const applySvgZoom = (svgEl, zoomVal, natW, natH) => {
    if (!svgEl || !natW || !natH) return;
    const scale = zoomVal / 100;
    const w = Math.round(natW * scale);
    const h = Math.round(natH * scale);
    svgEl.setAttribute("width", w);
    svgEl.setAttribute("height", h);
    svgEl.style.width = `${w}px`;
    svgEl.style.height = `${h}px`;
    svgEl.style.minWidth = `${w}px`;
    svgEl.style.minHeight = `${h}px`;
    svgEl.style.maxWidth = "none";
    svgEl.style.shapeRendering = "geometricPrecision";
    svgEl.style.textRendering = "geometricPrecision";
  };

  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);

    const initAndRender = async () => {
      try {
        // 1. Ensure Mermaid library is loaded in the window
        if (!window.mermaid) {
          await new Promise((resolve, reject) => {
            const existingScript = document.getElementById("mermaid-script");
            if (existingScript) {
              existingScript.addEventListener("load", resolve);
              existingScript.addEventListener("error", reject);
              return;
            }

            const script = document.createElement("script");
            script.id = "mermaid-script";
            script.src = "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js";
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => {
              // Try fallback CDN
              const fallback = document.createElement("script");
              fallback.src = "https://unpkg.com/mermaid@10/dist/mermaid.min.js";
              fallback.onload = () => resolve();
              fallback.onerror = () => reject(new Error("Failed to load Mermaid script from CDN"));
              document.head.appendChild(fallback);
            };
            document.head.appendChild(script);
          });
        }

        if (isCancelled || !containerRef.current) return;

        // 2. Initialize Mermaid with vibrant dark theme and squared straight lines
        window.mermaid.initialize({
          startOnLoad: false,
          securityLevel: "loose",
          theme: "dark",
          flowchart: {
            curve: "stepBefore",
            useMaxWidth: false,
            htmlLabels: true
          },
          themeVariables: {
            darkMode: true,
            background: "#101214",
            primaryColor: "#0284c7",
            primaryTextColor: "#ffffff",
            primaryBorderColor: "#38bdf8",
            lineColor: "#38bdf8",
            secondaryColor: "#059669",
            tertiaryColor: "#1e1b4b",
            edgeLabelBackground: "#18181b",
            actorBorder: "#38bdf8",
            actorBkg: "#0f172a",
            actorTextColor: "#ffffff",
            signalColor: "#38bdf8",
            signalTextColor: "#e2e8f0"
          }
        });

        // 3. Render SVG
        const uniqueId = `mmd-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const { svg } = await window.mermaid.render(uniqueId, code);

        if (!isCancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          const svgEl = containerRef.current.querySelector("svg");
          if (svgEl) {
            let natW = 1000;
            let natH = 600;
            const viewBox = svgEl.getAttribute("viewBox");
            if (viewBox) {
              const parts = viewBox.split(/[\s,]+/).map(Number);
              if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
                natW = parts[2];
                natH = parts[3];
              }
            } else {
              const b = svgEl.getBoundingClientRect();
              if (b.width > 0) natW = b.width;
              if (b.height > 0) natH = b.height;
            }
            naturalSizeRef.current = { width: natW, height: natH };
            applySvgZoom(svgEl, zoom, natW, natH);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          console.warn("Mermaid rendering warning:", err);
          setError(err.message || "Failed to render Mermaid diagram");
          setLoading(false);
        }
      }
    };

    initAndRender();

    return () => {
      isCancelled = true;
    };
  }, [code]);

  // Apply vector-sharp zoom whenever zoom changes
  useEffect(() => {
    if (!containerRef.current) return;
    const svgEl = containerRef.current.querySelector("svg");
    if (!svgEl) return;
    const { width: natW, height: natH } = naturalSizeRef.current;
    if (natW > 0 && natH > 0) {
      applySvgZoom(svgEl, zoom, natW, natH);
    }
  }, [zoom]);

  // Mouse Drag / Pan Handlers
  const handleMouseDown = (e) => {
    if (e.button !== 0 || e.target.closest("button") || e.target.closest(".mermaid-header-bar")) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - pan.x,
      y: e.clientY - pan.y
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom on Ctrl + Wheel
  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -15 : 15;
      setZoom(z => Math.max(25, Math.min(z + delta, 500)));
    }
  };

  const handleReset = () => {
    setZoom(100);
    setPan({ x: 0, y: 0 });
  };

  const handleFit = () => {
    if (!containerRef.current || !viewportRef.current) return;
    const svgEl = containerRef.current.querySelector("svg");
    if (!svgEl) return;
    const vp = viewportRef.current.getBoundingClientRect();
    const bb = svgEl.getBoundingClientRect();
    if (bb.width > 0 && bb.height > 0) {
      const currentScale = zoom / 100;
      const naturalW = bb.width / currentScale;
      const naturalH = bb.height / currentScale;
      const scaleX = (vp.width - 60) / naturalW;
      const scaleY = (vp.height - 60) / naturalH;
      const fitScale = Math.max(25, Math.min(Math.floor(Math.min(scaleX, scaleY) * 100), 250));
      setZoom(fitScale);
      setPan({ x: 0, y: 0 });
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSvg = () => {
    if (!containerRef.current) return;
    const svgEl = containerRef.current.querySelector("svg");
    if (!svgEl) return;

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const dlAnchor = document.createElement("a");
    dlAnchor.href = url;
    dlAnchor.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, "-")}.svg`;
    dlAnchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mermaid-renderer-wrapper">
      {/* Header Toolbar */}
      <div className="mermaid-header-bar">
        <div className="mermaid-title">
          <FaExpandArrowsAlt size={12} style={{ color: "#38bdf8" }} />
          <span>{title}</span>
          <span className="mermaid-drag-hint">🖱️ Click & drag to pan • Ctrl + Scroll to zoom</span>
        </div>
        <div className="mermaid-actions">
          <div className="mermaid-zoom-controls">
            <button
              className="mermaid-btn icon-only"
              onClick={() => setZoom(z => Math.max(z - 15, 25))}
              title="Zoom Out (Min 25%)"
            >
              <FaSearchMinus size={11} />
            </button>
            <span className="mermaid-zoom-val">{zoom}%</span>
            <button
              className="mermaid-btn icon-only"
              onClick={() => setZoom(z => Math.min(z + 15, 500))}
              title="Zoom In (Max 500%)"
            >
              <FaSearchPlus size={11} />
            </button>
          </div>

          <div className="mermaid-preset-pills">
            <button className={`mermaid-preset-btn ${zoom === 50 ? "active" : ""}`} onClick={() => setZoom(50)}>50%</button>
            <button className={`mermaid-preset-btn ${zoom === 100 ? "active" : ""}`} onClick={() => setZoom(100)}>100%</button>
            <button className={`mermaid-preset-btn ${zoom === 150 ? "active" : ""}`} onClick={() => setZoom(150)}>150%</button>
            <button className={`mermaid-preset-btn ${zoom === 200 ? "active" : ""}`} onClick={() => setZoom(200)}>200%</button>
            <button className={`mermaid-preset-btn ${zoom === 300 ? "active" : ""}`} onClick={() => setZoom(300)}>300%</button>
          </div>

          <button
            className="mermaid-btn"
            onClick={handleFit}
            title="Fit Diagram into Viewport"
          >
            <FaExpandArrowsAlt size={11} /> Fit
          </button>
          <button
            className="mermaid-btn"
            onClick={handleReset}
            title="Reset Pan & Zoom (100%)"
          >
            Reset
          </button>
          {onSwitchTo3D && (
            <button
              className="mermaid-btn"
              onClick={onSwitchTo3D}
              style={{
                background: "rgba(56, 189, 248, 0.16)",
                borderColor: "rgba(56, 189, 248, 0.45)",
                color: "#38bdf8",
                fontWeight: "600"
              }}
              title="Switch to Interactive 3D Architecture Canvas"
            >
              <FaCube size={11} /> 3D View
            </button>
          )}
          <button
            className="mermaid-btn"
            onClick={handleDownloadSvg}
            title="Download SVG Diagram"
          >
            <FaDownload size={11} /> SVG
          </button>
          <button
            className="mermaid-btn"
            onClick={handleCopyCode}
            title="Copy Mermaid Code"
          >
            {copied ? <FaCheck style={{ color: "#3fb950" }} size={11} /> : <FaCopy size={11} />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            className="mermaid-btn"
            onClick={() => setShowCode(v => !v)}
            title="Toggle Mermaid Code"
          >
            <FaCode size={11} /> {showCode ? "Hide" : "Code"}
          </button>
        </div>
      </div>

      {/* Rendered SVG Viewport with Pan and Zoom */}
      <div
        ref={viewportRef}
        className={`mermaid-canvas-viewport ${isDragging ? "dragging" : ""}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onDoubleClick={handleReset}
      >
        {loading && (
          <div className="mermaid-loading-state">
            <FaSpinner className="spin-icon" size={24} color="#38bdf8" />
            <span>Rendering visual Mermaid diagram...</span>
          </div>
        )}

        <div
          ref={containerRef}
          className="mermaid-svg-output"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px)`,
            display: loading ? "none" : "flex",
            cursor: isDragging ? "grabbing" : "grab"
          }}
        />

        {error && !loading && (
          <div className="mermaid-loading-state" style={{ color: "#f85149" }}>
            <span>Could not render Mermaid SVG. (Error: {error})</span>
            <button className="mermaid-btn" onClick={() => setShowCode(true)} style={{ marginTop: "10px" }}>
              View Mermaid Source Code
            </button>
          </div>
        )}
      </div>

      {/* Optional Raw Code Inspector */}
      {showCode && (
        <div className="mermaid-raw-code-box">
          <pre className="mermaid-raw-pre">{code}</pre>
        </div>
      )}
    </div>
  );
}
