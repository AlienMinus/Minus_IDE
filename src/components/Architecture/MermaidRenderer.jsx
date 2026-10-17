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
  FaSpinner
} from "react-icons/fa";

export default function MermaidRenderer({ code, title = "Diagram" }) {
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(100);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const renderId = useRef(`mermaid-${Math.random().toString(36).substring(2, 9)}`);

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
              fallback.onerror = (e) => reject(new Error("Failed to load Mermaid script from CDN"));
              document.head.appendChild(fallback);
            };
            document.head.appendChild(script);
          });
        }

        if (isCancelled || !containerRef.current) return;

        // 2. Initialize Mermaid with VS Code dark theme
        window.mermaid.initialize({
          startOnLoad: false,
          securityLevel: "loose",
          theme: "dark",
          themeVariables: {
            darkMode: true,
            background: "#181818",
            primaryColor: "#0e639c",
            primaryTextColor: "#ffffff",
            primaryBorderColor: "#1177bb",
            lineColor: "#58a6ff",
            secondaryColor: "#238636",
            tertiaryColor: "#1f1f1f",
            edgeLabelBackground: "#181818",
            actorBorder: "#388bfd",
            actorBkg: "#161b22",
            actorTextColor: "#ffffff",
            signalColor: "#58a6ff",
            signalTextColor: "#e6edf3"
          }
        });

        // 3. Render SVG
        const uniqueId = `mmd-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const { svg } = await window.mermaid.render(uniqueId, code);

        if (!isCancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
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
        <div className="mermaid-title">{title}</div>
        <div className="mermaid-actions">
          <button
            className="mermaid-btn"
            onClick={() => setZoom(z => Math.max(z - 10, 50))}
            title="Zoom Out"
          >
            <FaSearchMinus />
          </button>
          <span style={{ fontSize: "11px", color: "#888" }}>{zoom}%</span>
          <button
            className="mermaid-btn"
            onClick={() => setZoom(z => Math.min(z + 10, 180))}
            title="Zoom In"
          >
            <FaSearchPlus />
          </button>
          <button
            className="mermaid-btn"
            onClick={() => setZoom(100)}
            title="Reset Zoom"
          >
            <FaExpandArrowsAlt /> Reset
          </button>
          <button
            className="mermaid-btn"
            onClick={handleDownloadSvg}
            title="Download SVG Diagram"
          >
            <FaDownload /> Download SVG
          </button>
          <button
            className="mermaid-btn"
            onClick={handleCopyCode}
            title="Copy Mermaid Code"
          >
            {copied ? <FaCheck style={{ color: "#3fb950" }} /> : <FaCopy />}
            {copied ? "Copied!" : "Copy Code"}
          </button>
          <button
            className="mermaid-btn"
            onClick={() => setShowCode(v => !v)}
            title="Toggle Mermaid Code"
          >
            <FaCode /> {showCode ? "Hide Code" : "Show Code"}
          </button>
        </div>
      </div>

      {/* Rendered SVG Viewport */}
      <div className="mermaid-canvas-viewport">
        {loading && (
          <div className="mermaid-loading-state">
            <FaSpinner className="spin-icon" size={24} color="#007acc" />
            <span>Rendering visual Mermaid diagram...</span>
          </div>
        )}

        <div
          ref={containerRef}
          className="mermaid-svg-output"
          style={{
            transform: `scale(${zoom / 100})`,
            display: loading ? "none" : "flex"
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
