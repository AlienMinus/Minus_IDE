import { useEffect, useState } from "react";
import { FaGlobe, FaSpinner } from "react-icons/fa";
import "./Preview.css";

const DEFAULT_SERVICES = [
  {
    id: "frontend",
    label: "Frontend",
    description: "HTML preview target",
    url: "http://localhost:5500"
  },
  {
    id: "backend",
    label: "Backend",
    description: "API / backend target",
    url: "http://localhost:3000"
  }
];

// Extract favicon from HTML content
function extractFaviconFromHtml(htmlContent) {
  if (!htmlContent) return null;
  
  // Try to find link rel="icon" or link rel="shortcut icon"
  const iconMatch = htmlContent.match(/<link[^>]*rel=["'](?:shortcut\s+)?icon["'][^>]*href=["']([^"']+)["'][^>]*>/i);
  if (iconMatch) return iconMatch[1];
  
  // Try to find favicon.ico in head
  const faviconMatch = htmlContent.match(/<link[^>]*href=["']([^"']+\.ico)["'][^>]*>/i);
  if (faviconMatch) return faviconMatch[1];
  
  return null;
}

// Extract title from HTML content
function extractTitleFromHtml(htmlContent) {
  if (!htmlContent) return null;
  const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i);
  return titleMatch ? titleMatch[1].trim() : null;
}

function Preview({ compact = false, onOpenPreview, sourceFile }) {
  const [services, setServices] = useState(DEFAULT_SERVICES);
  const [loading, setLoading] = useState(true);
  const [htmlUrl, setHtmlUrl] = useState(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [favicon, setFavicon] = useState(null);
  const [title, setTitle] = useState(null);

function generateReactPreviewHtml(jsxCode, fileName) {
  const sanitizedCode = (jsxCode || '')
    .replace(/import\s+React\s*,\s*\{([^}]+)\}\s*from\s*['"]react['"];?/g, 'const { $1 } = React;')
    .replace(/import\s+\*\s+as\s+React\s+from\s*['"]react['"];?/g, '')
    .replace(/import\s+React\s+from\s*['"]react['"];?/g, '')
    .replace(/import\s+['"][^'"]+\.css['"];?/g, '')
    .replace(/export\s+default\s+function\s+([A-Za-z0-9_]+)/g, 'function $1')
    .replace(/export\s+default\s+([A-Za-z0-9_]+);?/g, 'window.__DefaultComp = $1;');

  const compMatch = jsxCode?.match(/(?:export\s+default\s+function\s+|function\s+|const\s+)([A-Za-z0-9_]+)/);
  const detectedName = compMatch ? compMatch[1] : 'App';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${fileName} - React Live Sandbox</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body {
      margin: 0;
      padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #181818;
      color: #f1f5f9;
    }
    #error-box {
      display: none;
      background: #450a0a;
      border: 1px solid #ef4444;
      color: #fca5a5;
      padding: 14px;
      border-radius: 6px;
      margin-bottom: 16px;
      white-space: pre-wrap;
      font-family: monospace;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div id="error-box"></div>
  <div id="root"></div>

  <script>
    window.onerror = function(msg, url, line, col, err) {
      var box = document.getElementById('error-box');
      box.style.display = 'block';
      box.textContent = 'React Error: ' + msg + (line ? ' (Line ' + line + ')' : '');
    };
  </script>

  <script type="text/babel">
    try {
      ${sanitizedCode}

      var Target = window.__DefaultComp || (typeof ${detectedName} !== 'undefined' ? ${detectedName} : null);
      if (Target) {
        var root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<Target />);
      } else {
        document.getElementById('root').innerHTML = '<div style="color:#94a3b8;padding:20px;">Component loaded. Export a React component to preview.</div>';
      }
    } catch (e) {
      var box = document.getElementById('error-box');
      box.style.display = 'block';
      box.textContent = 'Compilation Error: ' + e.message;
    }
  </script>
</body>
</html>`;
}

  // Load HTML or React file content when sourceFile is provided
  useEffect(() => {
    if (!sourceFile) {
      setHtmlUrl(null);
      setFavicon(null);
      setTitle(null);
      return;
    }

    let isMounted = true;
    let currentUrl = null;

    const loadContent = async () => {
      setLoadingFile(true);
      try {
        let content = sourceFile.content;
        if (content == null && sourceFile.handle) {
          const file = await sourceFile.handle.getFile();
          content = await file.text();
        }

        if (!content && content !== '') {
          content = '<div>No content in file.</div>';
        }

        const ext = sourceFile.name?.split('.').pop()?.toLowerCase();
        const isReact = ['jsx', 'tsx'].includes(ext) || sourceFile.language === 'react';

        let finalHtml = content;
        if (isReact) {
          finalHtml = generateReactPreviewHtml(content, sourceFile.name);
          if (isMounted) {
            setTitle(`${sourceFile.name} (Live React Sandbox)`);
          }
        } else {
          // Extract favicon and title for HTML files
          const extractedFavicon = extractFaviconFromHtml(content);
          const extractedTitle = extractTitleFromHtml(content);
          if (isMounted) {
            setFavicon(extractedFavicon);
            setTitle(extractedTitle || sourceFile.name);
          }
        }

        const blob = new Blob([finalHtml], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        currentUrl = url;
        if (isMounted) {
          setHtmlUrl(url);
        }
      } catch (error) {
        console.error("Failed to load preview:", error);
      } finally {
        if (isMounted) {
          setLoadingFile(false);
        }
      }
    };

    loadContent();

    return () => {
      isMounted = false;
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [sourceFile]);

  const openPreview = (service) => {
    window.open(service.url, "_blank", "noopener,noreferrer");
    if (onOpenPreview) {
      onOpenPreview(service);
    }
  };

  // Render HTML file preview
  if (sourceFile && htmlUrl) {
    return (
      <div className="preview-file-container">
        <div className="preview-file-header">
          {favicon ? (
            <img src={favicon} alt="favicon" className="preview-favicon" onError={(e) => {
              e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="12" fill="%2360a5fa">W</text></svg>';
            }} />
          ) : (
            <div className="preview-favicon-fallback">
              <FaGlobe />
            </div>
          )}
          <span className="preview-file-title">{title || sourceFile.name}</span>
        </div>
        <iframe
          title={sourceFile.name}
          src={htmlUrl}
          className="preview-iframe"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        />
      </div>
    );
  }

  if (sourceFile && loadingFile) {
    return (
      <div className="preview-file-container preview-loading">
        <FaSpinner className="preview-spinner-large" />
        <span>Loading preview...</span>
      </div>
    );
  }

  return (
    <div className={`preview-panel ${compact ? "preview-panel-compact" : ""}`}>
      <div className="preview-header">
        <div>
          <h3>Preview</h3>
          <p>Frontend and backend status</p>
        </div>
        {loading && (
          <span className="preview-badge">
            <FaSpinner className="preview-spinner" />
            Checking
          </span>
        )}
      </div>

      <div className="preview-list">
        {services.map((service) => (
          <div className={`preview-item ${service.status}`} key={service.id}>
            <div className="preview-item-main">
              <div className="preview-icon">
                <FaGlobe />
              </div>
              <div className="preview-copy">
                <strong>{service.label}</strong>
                <span>{service.description}</span>
                <code>{service.url}</code>
              </div>
            </div>

            <div className="preview-meta">
              <span className={`preview-status ${service.status}`}>{service.status}</span>
              <button type="button" onClick={() => openPreview(service)}>
                Open
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="preview-output">
        <span>Output</span>
        <ul>
          {services.map((service) => (
            <li key={`${service.id}-output`}>
              <strong>{service.label}:</strong> {service.output}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default Preview;
