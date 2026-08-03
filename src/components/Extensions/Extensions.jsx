import { FaServer } from "react-icons/fa";
import Preview from "../Preview";
import "./Extensions.css";

function Extensions() {
  const openHtmlPreview = (event) => {
    event?.preventDefault();
    window.open("http://127.0.0.1:5500", "_blank", "noopener,noreferrer");
  };

  return (
    <div className="extensions-panel">
      <div className="extensions-header">
        <h2>Extensions</h2>
      </div>

      <div className="extensions-list">
        <div
          className="extension-item"
          onContextMenu={openHtmlPreview}
          title="Right-click to preview HTML on port 5500"
        >
          <div className="extension-item-icon">
            <FaServer />
          </div>
          <div className="extension-item-body">
            <strong>Live Server</strong>
            <span>HTML preview on port 5500</span>
            <code>localhost:5500</code>
          </div>
          <button type="button" onClick={openHtmlPreview}>
            Preview
          </button>
        </div>
      </div>

      <div className="extensions-section">
        <Preview compact={false} />
      </div>
    </div>
  );
}

export default Extensions;
