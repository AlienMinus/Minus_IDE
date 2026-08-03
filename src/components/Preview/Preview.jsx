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

  // Load HTML file content when sourceFile is provided
  useEffect(() => {
    if (!sourceFile || !sourceFile.handle) {
      setHtmlUrl(null);
      setFavicon(null);
      setTitle(null);
      return;
    }

    let isMounted = true;
    let currentUrl = null;

    const loadHtmlFile = async () => {
      setLoadingFile(true);
      try {
        const file = await sourceFile.handle.getFile();
        const htmlContent = sourceFile.content || (await file.text());
        
        // Extract favicon and title
        const extractedFavicon = extractFaviconFromHtml(htmlContent);
        const extractedTitle = extractTitleFromHtml(htmlContent);
        
        if (isMounted) {
          setFavicon(extractedFavicon);
          setTitle(extractedTitle);
        }
        
        const blob = new Blob([htmlContent], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        currentUrl = url;
        if (isMounted) {
          setHtmlUrl(url);
        }
      } catch (error) {
        console.error("Failed to load HTML file:", error);
      } finally {
        if (isMounted) {
          setLoadingFile(false);
        }
      }
    };

    loadHtmlFile();

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
