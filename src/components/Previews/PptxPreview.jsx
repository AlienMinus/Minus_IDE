import React, { useState, useEffect, useRef } from "react";
import JSZip from "jszip";
import {
  FaFilePowerpoint,
  FaChevronLeft,
  FaChevronRight,
  FaExpand,
  FaCompress,
  FaSpinner,
  FaExclamationTriangle,
  FaListUl,
  FaImage,
  FaThLarge
} from "react-icons/fa";
import "./PptxPreview.css";

// Helper to extract text runs, paragraphs, and shapes from PPTX slide XML
function parseSlideXml(slideXmlStr, relationships = {}, mediaFiles = {}) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(slideXmlStr, "application/xml");

  let title = "";
  const contentBlocks = [];
  const images = [];

  // Check relationship images
  const blips = Array.from(xml.querySelectorAll("blip, a\\:blip"));
  for (const blip of blips) {
    const embedId = blip.getAttribute("r:embed") || blip.getAttribute("embed");
    if (embedId && relationships[embedId]) {
      const mediaPath = relationships[embedId];
      if (mediaFiles[mediaPath]) {
        images.push(mediaFiles[mediaPath]);
      }
    }
  }

  // Parse text shapes
  const shapes = Array.from(xml.querySelectorAll("sp, p\\:sp"));
  shapes.forEach((sp) => {
    // Check if title placeholder
    const ph = sp.querySelector("ph, p\\:ph");
    const phType = ph ? ph.getAttribute("type") : null;
    const isTitle = phType === "title" || phType === "ctrTitle" || phType === "subTitle";

    const paragraphs = Array.from(sp.querySelectorAll("p, a\\:p"));
    const paraTexts = paragraphs.map((p) => {
      const runs = Array.from(p.querySelectorAll("r, a\\:r, a\\:fld"));
      const text = runs.map((r) => r.querySelector("t, a\\:t")?.textContent || "").join("");
      const isBullet = !!p.querySelector("buChar, buAutoNum, buBlip, a\\:buChar");
      return { text: text.trim(), isBullet };
    }).filter((item) => item.text.length > 0);

    if (paraTexts.length === 0) return;

    if (isTitle && !title) {
      title = paraTexts.map((p) => p.text).join(" ");
    } else {
      contentBlocks.push(...paraTexts);
    }
  });

  return {
    title: title || "Slide",
    contentBlocks,
    images
  };
}

export function PptxPreview({ file }) {
  const [slides, setSlides] = useState([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const containerRef = useRef(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadPptx() {
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
          throw new Error("Unable to read binary data for this PowerPoint presentation.");
        }

        const zip = await JSZip.loadAsync(arrayBuffer);

        // Find slide XML files and sort by index
        const slideFiles = Object.keys(zip.files)
          .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
          .sort((a, b) => {
            const numA = parseInt(a.match(/slide(\d+)\.xml/)?.[1] || "0", 10);
            const numB = parseInt(b.match(/slide(\d+)\.xml/)?.[1] || "0", 10);
            return numA - numB;
          });

        if (slideFiles.length === 0) {
          throw new Error("No slides found in this presentation.");
        }

        // Preload media files (images)
        const mediaFiles = {};
        const mediaEntries = Object.keys(zip.files).filter((name) => name.startsWith("ppt/media/"));
        await Promise.all(
          mediaEntries.map(async (mediaPath) => {
            const ext = mediaPath.split(".").pop().toLowerCase();
            const mimeType = ext === "png" ? "image/png" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "svg" ? "image/svg+xml" : "image/png";
            const base64 = await zip.file(mediaPath)?.async("base64");
            if (base64) {
              const relKey = mediaPath.replace("ppt/", "");
              mediaFiles[relKey] = `data:${mimeType};base64,${base64}`;
              mediaFiles[mediaPath] = `data:${mimeType};base64,${base64}`;
            }
          })
        );

        // Parse each slide
        const parsedSlides = await Promise.all(
          slideFiles.map(async (slidePath, index) => {
            const slideNum = index + 1;
            const slideXml = await zip.file(slidePath)?.async("text");
            if (!slideXml) return { number: slideNum, title: `Slide ${slideNum}`, contentBlocks: [], images: [] };

            // Load relationships for this slide
            const relsPath = `ppt/slides/_rels/slide${slideNum}.xml.rels`;
            const relationships = {};
            const relsXml = await zip.file(relsPath)?.async("text");
            if (relsXml) {
              const relsDoc = new DOMParser().parseFromString(relsXml, "application/xml");
              Array.from(relsDoc.querySelectorAll("Relationship")).forEach((rel) => {
                const id = rel.getAttribute("Id");
                const target = rel.getAttribute("Target");
                if (id && target) {
                  // Normalize target
                  const cleanTarget = target.replace("../media/", "media/").replace("media/", "media/");
                  relationships[id] = cleanTarget;
                }
              });
            }

            const parsed = parseSlideXml(slideXml, relationships, mediaFiles);
            return {
              number: slideNum,
              ...parsed
            };
          })
        );

        if (isCancelled) return;
        setSlides(parsedSlides);
        setCurrentSlideIndex(0);
      } catch (err) {
        if (!isCancelled) {
          console.error("Error loading PPTX:", err);
          setError(err.message || "Failed to parse PowerPoint presentation.");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    if (file) {
      loadPptx();
    }

    return () => {
      isCancelled = true;
    };
  }, [file]);

  // Keyboard navigation (Arrow Left / Arrow Right)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        setCurrentSlideIndex((prev) => Math.min(slides.length - 1, prev + 1));
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        setCurrentSlideIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === "Home") {
        setCurrentSlideIndex(0);
      } else if (e.key === "End") {
        setCurrentSlideIndex(slides.length - 1);
      } else if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [slides.length, isFullscreen]);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const currentSlide = slides[currentSlideIndex];

  return (
    <div
      ref={containerRef}
      className={`pptx-preview-container ${isFullscreen ? "pptx-fullscreen" : ""}`}
    >
      {/* Top Toolbar */}
      <div className="pptx-toolbar">
        <div className="pptx-toolbar-left">
          <FaFilePowerpoint className="pptx-brand-icon" />
          <span className="pptx-file-name">{file?.name || "Presentation.pptx"}</span>
          <span className="pptx-badge">Presentation</span>
        </div>

        <div className="pptx-toolbar-center">
          <button
            className="pptx-tool-btn"
            disabled={currentSlideIndex === 0}
            onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
            title="Previous Slide (Left Arrow)"
          >
            <FaChevronLeft />
          </button>
          <span className="pptx-slide-counter">
            {slides.length > 0 ? `${currentSlideIndex + 1} / ${slides.length}` : "0 / 0"}
          </span>
          <button
            className="pptx-tool-btn"
            disabled={currentSlideIndex >= slides.length - 1}
            onClick={() => setCurrentSlideIndex((prev) => Math.min(slides.length - 1, prev + 1))}
            title="Next Slide (Right Arrow)"
          >
            <FaChevronRight />
          </button>
        </div>

        <div className="pptx-toolbar-right">
          <button
            className={`pptx-tool-btn ${showThumbnails ? "active" : ""}`}
            onClick={() => setShowThumbnails((prev) => !prev)}
            title="Toggle Slide Thumbnails"
          >
            <FaThLarge />
          </button>
          <button
            className="pptx-tool-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Presentation (F)"}
          >
            {isFullscreen ? <FaCompress /> : <FaExpand />}
          </button>
        </div>
      </div>

      {/* Main Stage */}
      <div className="pptx-stage-wrapper">
        {loading ? (
          <div className="pptx-state-view">
            <FaSpinner className="pptx-spinner" />
            <span>Parsing Presentation Slides...</span>
          </div>
        ) : error ? (
          <div className="pptx-state-view pptx-error">
            <FaExclamationTriangle className="pptx-error-icon" />
            <h4>Failed to load presentation</h4>
            <p>{error}</p>
          </div>
        ) : currentSlide ? (
          <div className="pptx-canvas-area">
            {/* 16:9 Slide Canvas */}
            <div className="pptx-slide-canvas">
              <div className="pptx-slide-header">
                <span className="pptx-slide-num">SLIDE {currentSlide.number}</span>
                <span className="pptx-slide-deck-tag">Hyperion Presentation Deck</span>
              </div>

              <h2 className="pptx-slide-title">{currentSlide.title}</h2>

              <div className="pptx-slide-body">
                {currentSlide.contentBlocks.length > 0 ? (
                  <div className="pptx-blocks-list">
                    {currentSlide.contentBlocks.map((block, idx) => (
                      <div
                        key={idx}
                        className={`pptx-block-item ${block.isBullet ? "is-bullet" : "is-para"}`}
                      >
                        {block.isBullet && <FaListUl className="bullet-dot" />}
                        <span className="block-text">{block.text}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="pptx-empty-slide-note">No body text on this slide.</div>
                )}

                {/* Embedded Slide Images */}
                {currentSlide.images && currentSlide.images.length > 0 && (
                  <div className="pptx-slide-media-grid">
                    {currentSlide.images.map((imgSrc, imgIdx) => (
                      <div key={imgIdx} className="pptx-image-box">
                        <img src={imgSrc} alt={`Slide media ${imgIdx + 1}`} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pptx-slide-footer">
                <span>{file?.name}</span>
                <span>Page {currentSlide.number}</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Bottom Thumbnail Strip */}
      {showThumbnails && slides.length > 0 && !loading && (
        <div className="pptx-thumbnails-strip">
          {slides.map((s, idx) => (
            <div
              key={s.number}
              className={`pptx-thumb-card ${idx === currentSlideIndex ? "active" : ""}`}
              onClick={() => setCurrentSlideIndex(idx)}
            >
              <div className="pptx-thumb-num">{s.number}</div>
              <div className="pptx-thumb-title">{s.title || `Slide ${s.number}`}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PptxPreview;
