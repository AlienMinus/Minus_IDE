import React, { useState, useEffect } from "react";
import mammoth from "mammoth";
import JSZip from "jszip";
import {
  FaFileWord,
  FaSearchPlus,
  FaSearchMinus,
  FaRedo,
  FaCopy,
  FaCheck,
  FaPrint,
  FaSpinner,
  FaExclamationTriangle,
  FaSun,
  FaMoon
} from "react-icons/fa";
import "./DocxPreview.css";

// Fallback XML parser if mammoth encounters unusual OpenXML formatting
async function parseDocxXmlFallback(arrayBuffer) {
  try {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const docXmlStr = await zip.file("word/document.xml")?.async("text");
    if (!docXmlStr) return "<p>No readable content found.</p>";

    const parser = new DOMParser();
    const xml = parser.parseFromString(docXmlStr, "application/xml");
    const paragraphs = Array.from(xml.querySelectorAll("p"));

    if (paragraphs.length === 0) return "<p>Empty document.</p>";

    return paragraphs
      .map((p) => {
        const texts = Array.from(p.querySelectorAll("t"))
          .map((t) => t.textContent || "")
          .join("");
        if (!texts.trim()) return "";
        return `<p>${texts}</p>`;
      })
      .filter(Boolean)
      .join("\n");
  } catch (err) {
    console.error("Docx fallback parse error:", err);
    return `<p>Failed to parse document: ${err.message}</p>`;
  }
}

export function DocxPreview({ file }) {
  const [htmlContent, setHtmlContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(100);
  const [isDarkPage, setIsDarkPage] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({ words: 0, characters: 0 });

  useEffect(() => {
    let isCancelled = false;

    async function loadDocx() {
      setLoading(true);
      setError(null);

      try {
        let arrayBuffer = null;

        if (file?.handle) {
          const rawFile = await file.handle.getFile();
          arrayBuffer = await rawFile.arrayBuffer();
        } else if (file?.rawFile && typeof file.rawFile.arrayBuffer === "function") {
          arrayBuffer = await file.rawFile.arrayBuffer();
        } else if (file?.content instanceof ArrayBuffer) {
          arrayBuffer = file.content;
        } else if (file?.content instanceof Uint8Array) {
          arrayBuffer = file.content.buffer;
        }

        if (!arrayBuffer) {
          throw new Error("Unable to read binary data for this Word document.");
        }

        // Convert with mammoth
        let html = "";
        try {
          const result = await mammoth.convertToHtml({ arrayBuffer });
          html = result.value;
        } catch (mErr) {
          console.warn("Mammoth conversion warning, trying fallback:", mErr);
          html = await parseDocxXmlFallback(arrayBuffer);
        }

        if (!html || !html.trim()) {
          html = await parseDocxXmlFallback(arrayBuffer);
        }

        if (isCancelled) return;

        // Compute word/char stats
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = html;
        const textOnly = tempDiv.textContent || tempDiv.innerText || "";
        const words = textOnly.trim().split(/\s+/).filter(Boolean).length;
        const characters = textOnly.length;

        setStats({ words, characters });
        setHtmlContent(html || "<p><em>This document is empty.</em></p>");
      } catch (err) {
        if (!isCancelled) {
          console.error("Error loading DOCX:", err);
          setError(err.message || "Failed to parse Word document.");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    if (file) {
      loadDocx();
    }

    return () => {
      isCancelled = true;
    };
  }, [file]);

  const handleCopy = () => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = htmlContent;
    const plainText = tempDiv.textContent || tempDiv.innerText || "";
    navigator.clipboard.writeText(plainText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="docx-preview-container">
      {/* Top Toolbar */}
      <div className="docx-toolbar">
        <div className="docx-toolbar-left">
          <FaFileWord className="docx-brand-icon" />
          <span className="docx-file-name">{file?.name || "Document.docx"}</span>
          <span className="docx-badge">Word Document</span>
        </div>

        <div className="docx-toolbar-center">
          <button
            className="docx-tool-btn"
            onClick={() => setZoom((z) => Math.max(50, z - 10))}
            title="Zoom Out"
          >
            <FaSearchMinus />
          </button>
          <span className="docx-zoom-indicator">{zoom}%</span>
          <button
            className="docx-tool-btn"
            onClick={() => setZoom((z) => Math.min(200, z + 10))}
            title="Zoom In"
          >
            <FaSearchPlus />
          </button>
          <button
            className="docx-tool-btn"
            onClick={() => setZoom(100)}
            title="Reset Zoom"
          >
            <FaRedo />
          </button>
        </div>

        <div className="docx-toolbar-right">
          <span className="docx-stat-pill">{stats.words.toLocaleString()} words</span>
          <button
            className={`docx-tool-btn ${isDarkPage ? "active" : ""}`}
            onClick={() => setIsDarkPage((prev) => !prev)}
            title={isDarkPage ? "Light Paper Mode" : "Dark Paper Mode"}
          >
            {isDarkPage ? <FaSun /> : <FaMoon />}
          </button>
          <button
            className="docx-tool-btn"
            onClick={handleCopy}
            title="Copy plain text"
          >
            {copied ? <FaCheck style={{ color: "#22c55e" }} /> : <FaCopy />}
          </button>
          <button
            className="docx-tool-btn"
            onClick={handlePrint}
            title="Print / Save PDF"
          >
            <FaPrint />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="docx-scroll-wrapper">
        {loading ? (
          <div className="docx-state-view">
            <FaSpinner className="docx-spinner" />
            <span>Parsing Word Document...</span>
          </div>
        ) : error ? (
          <div className="docx-state-view docx-error">
            <FaExclamationTriangle className="docx-error-icon" />
            <h4>Failed to display document</h4>
            <p>{error}</p>
          </div>
        ) : (
          <div
            className="docx-page-scaler"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
          >
            <article
              className={`docx-paper ${isDarkPage ? "docx-paper-dark" : "docx-paper-light"}`}
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default DocxPreview;
