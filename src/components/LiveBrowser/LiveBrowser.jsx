import { useState, useRef, useEffect } from "react";
import "./LiveBrowser.css";
import {
  FaArrowLeft,
  FaArrowRight,
  FaRedo,
  FaExternalLinkAlt,
  FaLock,
  FaGlobe,
  FaTimes
} from "react-icons/fa";

export default function LiveBrowser({ initialUrl = "http://localhost:5173", title, onClose }) {
  const [url, setUrl] = useState(initialUrl);
  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [history, setHistory] = useState([initialUrl]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [iframeKey, setIframeKey] = useState(Date.now());
  const iframeRef = useRef(null);

  useEffect(() => {
    if (initialUrl && initialUrl !== url) {
      setUrl(initialUrl);
      setInputUrl(initialUrl);
      setHistory(prev => [...prev, initialUrl]);
      setHistoryIndex(prev => prev + 1);
      setIframeKey(Date.now());
    }
  }, [initialUrl]);

  const handleNavigate = (targetUrl) => {
    let clean = targetUrl.trim();
    if (!clean) return;
    if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
      clean = "http://" + clean;
    }
    setUrl(clean);
    setInputUrl(clean);
    setHistory(prev => [...prev.slice(0, historyIndex + 1), clean]);
    setHistoryIndex(prev => prev + 1);
    setIsLoading(true);
    setIframeKey(Date.now());
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleNavigate(inputUrl);
    }
  };

  const handleReload = () => {
    setIsLoading(true);
    setIframeKey(Date.now());
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      setHistoryIndex(newIdx);
      const prevUrl = history[newIdx];
      setUrl(prevUrl);
      setInputUrl(prevUrl);
      setIframeKey(Date.now());
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      const newIdx = historyIndex + 1;
      setHistoryIndex(newIdx);
      const nextUrl = history[newIdx];
      setUrl(nextUrl);
      setInputUrl(nextUrl);
      setIframeKey(Date.now());
    }
  };

  const handleOpenExternal = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="live-browser-container">
      {/* VS Code Simple Browser Navigation Bar */}
      <div className="live-browser-toolbar">
        <div className="live-browser-nav-buttons">
          <button
            className="browser-btn"
            onClick={handleBack}
            disabled={historyIndex === 0}
            title="Back"
          >
            <FaArrowLeft />
          </button>
          <button
            className="browser-btn"
            onClick={handleForward}
            disabled={historyIndex >= history.length - 1}
            title="Forward"
          >
            <FaArrowRight />
          </button>
          <button
            className={`browser-btn ${isLoading ? "spinning" : ""}`}
            onClick={handleReload}
            title="Reload (Ctrl+R)"
          >
            <FaRedo />
          </button>
        </div>

        {/* Address Bar */}
        <div className="live-browser-address-bar">
          <span className="address-bar-icon">
            {url.startsWith("https://") ? <FaLock className="lock-icon" /> : <FaGlobe />}
          </span>
          <input
            type="text"
            className="address-bar-input"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="http://localhost:5173"
            spellCheck={false}
          />
          <span className="live-badge" title="Live Preview Server Connected">
            <span className="live-dot" /> LIVE
          </span>
        </div>

        {/* Browser Actions */}
        <div className="live-browser-actions">
          <button
            className="browser-btn action-btn"
            onClick={handleOpenExternal}
            title="Open in External Browser"
          >
            <FaExternalLinkAlt />
          </button>
          {onClose && (
            <button
              className="browser-btn close-btn"
              onClick={onClose}
              title="Close Preview Tab"
            >
              <FaTimes />
            </button>
          )}
        </div>
      </div>

      {/* Embedded Iframe */}
      <div className="live-browser-body">
        <iframe
          key={iframeKey}
          ref={iframeRef}
          src={url}
          className="live-browser-iframe"
          title={title || "Live Web Preview"}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
          onLoad={() => setIsLoading(false)}
        />
      </div>
    </div>
  );
}
