import React, { useState, useRef, useEffect } from "react";
import { FaSearchPlus, FaSearchMinus, FaRedo } from "react-icons/fa";
import "./ImagePreview.css";

export default function ImagePreview({ src, fileName }) {
  const [zoom, setZoom] = useState(1);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const handleImageLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.target;
    setDimensions({ width: naturalWidth, height: naturalHeight });
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(Number((prev + 0.25).toFixed(2)), 5));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(Number((prev - 0.25).toFixed(2)), 0.25));
  };

  const handleResetZoom = () => {
    setZoom(1);
  };

  // Mouse wheel zoom
  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        handleZoomIn();
      } else {
        handleZoomOut();
      }
    }
  };

  // Drag to pan
  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Only left-click
    isDraggingRef.current = true;
    startPosRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: containerRef.current ? containerRef.current.scrollLeft : 0,
      scrollTop: containerRef.current ? containerRef.current.scrollTop : 0
    };
    if (containerRef.current) {
      containerRef.current.style.cursor = "grabbing";
      containerRef.current.style.userSelect = "none";
    }
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    const dx = e.clientX - startPosRef.current.x;
    const dy = e.clientY - startPosRef.current.y;
    containerRef.current.scrollLeft = startPosRef.current.scrollLeft - dx;
    containerRef.current.scrollTop = startPosRef.current.scrollTop - dy;
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    if (containerRef.current) {
      containerRef.current.style.cursor = "default";
      containerRef.current.style.userSelect = "auto";
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, []);

  return (
    <div
      className="image-preview-root"
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* VS Code Floating Zoom & Info Toolbar */}
      <div className="image-preview-toolbar" onMouseDown={(e) => e.stopPropagation()}>
        <button
          className="img-tool-btn"
          onClick={handleZoomOut}
          title="Zoom Out (Ctrl+Minus / Ctrl+Wheel Down)"
          aria-label="Zoom Out"
        >
          <FaSearchMinus />
        </button>

        <span
          className="img-zoom-label"
          onClick={handleResetZoom}
          title="Click to reset to 100% (1:1 Natural Size)"
        >
          {Math.round(zoom * 100)}%
        </span>

        <button
          className="img-tool-btn"
          onClick={handleZoomIn}
          title="Zoom In (Ctrl+Plus / Ctrl+Wheel Up)"
          aria-label="Zoom In"
        >
          <FaSearchPlus />
        </button>

        <button
          className="img-tool-btn"
          onClick={handleResetZoom}
          title="Reset to 100% Original Size"
          aria-label="Reset Zoom"
        >
          <FaRedo />
        </button>

        {dimensions.width > 0 && (
          <span className="img-dimensions-badge">
            {dimensions.width} × {dimensions.height} px
          </span>
        )}
      </div>

      {/* Centered Image Canvas - strictly natural size, never fit-to-window */}
      <div className="image-viewport-wrapper">
        <div
          className="image-canvas-frame"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "center center"
          }}
        >
          <img
            src={src}
            alt={fileName || "Image Preview"}
            onLoad={handleImageLoad}
            className="natural-image"
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
}
