import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import MonacoEditor from "@monaco-editor/react";
import {
  FaMarkdown,
  FaEye,
  FaEdit,
  FaColumns,
  FaCopy,
  FaCheck,
  FaSpinner
} from "react-icons/fa";
import "./MarkdownPreview.css";

function CodeBlock({ node, inline, className, children, ...props }) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || "");
  const lang = match ? match[1] : "";
  const codeString = String(children).replace(/\n$/, "");

  const handleCopyCode = () => {
    navigator.clipboard.writeText(codeString).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (inline) {
    return (
      <code className="md-inline-code" {...props}>
        {children}
      </code>
    );
  }

  return (
    <div className="md-code-block-wrapper">
      <div className="md-code-block-header">
        <span className="md-code-lang">{lang || "text"}</span>
        <button
          className="md-code-copy-btn"
          onClick={handleCopyCode}
          title="Copy code"
        >
          {copied ? <FaCheck style={{ color: "#22c55e" }} /> : <FaCopy />}
        </button>
      </div>
      <pre className="md-pre" {...props}>
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}

export function MarkdownPreview({ file, onContentChange, onMount }) {
  const [content, setContent] = useState("");
  const [mode, setMode] = useState("preview"); // "preview" | "split" | "editor"
  const [loading, setLoading] = useState(true);
  const [copiedAll, setCopiedAll] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function loadMarkdown() {
      setLoading(true);
      try {
        let text = "";
        if (file?.content != null && typeof file.content === "string") {
          text = file.content;
        } else if (file?.handle) {
          const rawFile = await file.handle.getFile();
          text = await rawFile.text();
        } else if (file?.rawFile && typeof file.rawFile.text === "function") {
          text = await rawFile.text();
        }

        if (!isCancelled) {
          setContent(text || "");
          setLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("Error loading markdown:", err);
          setContent("# Error\nFailed to read markdown file.");
          setLoading(false);
        }
      }
    }

    if (file) {
      loadMarkdown();
    }

    return () => {
      isCancelled = true;
    };
  }, [file]);

  const handleChange = (val) => {
    setContent(val || "");
    if (onContentChange) {
      onContentChange(val || "");
    }
  };

  const handleCopyAll = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    });
  };

  // Word & character statistics
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const characters = content.length;

  return (
    <div className="md-preview-container">
      {/* Top Toolbar */}
      <div className="md-toolbar">
        <div className="md-toolbar-left">
          <FaMarkdown className="md-brand-icon" />
          <span className="md-file-name">{file?.name || "document.md"}</span>
          <span className="md-badge">Markdown</span>
        </div>

        <div className="md-toolbar-center">
          <div className="md-mode-switch">
            <button
              className={`md-mode-btn ${mode === "preview" ? "active" : ""}`}
              onClick={() => setMode("preview")}
              title="Rich Rendered Preview"
            >
              <FaEye />
              <span>Preview</span>
            </button>
            <button
              className={`md-mode-btn ${mode === "split" ? "active" : ""}`}
              onClick={() => setMode("split")}
              title="Side-by-Side Editor & Preview"
            >
              <FaColumns />
              <span>Split</span>
            </button>
            <button
              className={`md-mode-btn ${mode === "editor" ? "active" : ""}`}
              onClick={() => setMode("editor")}
              title="Raw Code Editor"
            >
              <FaEdit />
              <span>Editor</span>
            </button>
          </div>
        </div>

        <div className="md-toolbar-right">
          <span className="md-stat-badge">{words.toLocaleString()} words</span>
          <button
            className="md-tool-btn"
            onClick={handleCopyAll}
            title="Copy Raw Markdown"
          >
            {copiedAll ? <FaCheck style={{ color: "#22c55e" }} /> : <FaCopy />}
            <span>Copy</span>
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="md-view-wrapper">
        {loading ? (
          <div className="md-state-view">
            <FaSpinner className="md-spinner" />
            <span>Loading markdown...</span>
          </div>
        ) : (
          <div className={`md-body-layout md-layout-${mode}`}>
            {/* Monaco Editor Pane (Visible in 'editor' and 'split' modes) */}
            {(mode === "editor" || mode === "split") && (
              <div className="md-editor-pane">
                <MonacoEditor
                  height="100%"
                  language="markdown"
                  value={content}
                  onChange={handleChange}
                  onMount={onMount}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    fontFamily: "Consolas",
                    lineNumbers: "on",
                    automaticLayout: true,
                    wordWrap: "on",
                    scrollBeyondLastLine: false,
                    tabSize: 2
                  }}
                />
              </div>
            )}

            {/* Rendered Markdown Pane (Visible in 'preview' and 'split' modes) */}
            {(mode === "preview" || mode === "split") && (
              <div className="md-rendered-pane">
                <article className="md-article">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code: CodeBlock
                    }}
                  >
                    {content}
                  </ReactMarkdown>
                </article>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MarkdownPreview;
