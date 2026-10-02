import "./Editor.css";
import { useEffect, useState } from "react";
import MonacoEditor from "@monaco-editor/react";
import useEditor from "../../hooks/useEditor";
import Preview from "../Preview";
import LiveBrowser from "../LiveBrowser/LiveBrowser";
import {
  DocxPreview,
  PptxPreview,
  XlsxPreview,
  CsvPreview,
  MarkdownPreview
} from "../Previews";
import { getFileExtension } from "../../utils/fileIcons";

function Editor() {
  const { activeFile, updateContent, setEditorInstance, closeFile } = useEditor();
  const [previewUrl, setPreviewUrl] = useState(null);

  function handleEditorChange(value) {
    updateContent(value);
  }

  useEffect(() => {
    let objectUrl;

    async function createMediaPreview() {
      if (!activeFile || !activeFile.isBinary || !activeFile.handle) {
        setPreviewUrl(null);
        return;
      }

      const extension = getFileExtension(activeFile.name);

      if (["pdf", "png", "jpg", "jpeg", "gif", "svg", "webp", "mp3", "mp4"].includes(extension)) {
        try {
          const file = await activeFile.handle.getFile();
          objectUrl = URL.createObjectURL(file);
          setPreviewUrl(objectUrl);
        } catch (e) {
          console.error("Failed to load binary media:", e);
        }
        return;
      }

      setPreviewUrl(null);
    }

    createMediaPreview();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [activeFile]);

  function renderBinaryPreview() {
    if (!activeFile) {
      return null;
    }

    if (!activeFile.handle) {
      return <div className="editor-binary-state">Binary preview not available.</div>;
    }

    const extension = getFileExtension(activeFile.name);
    const imageExtensions = new Set(["png", "jpg", "jpeg", "gif", "svg", "webp"]);

    if (extension === "pdf") {
      if (!previewUrl) {
        return <div className="editor-binary-state">Loading PDF preview...</div>;
      }
      return <iframe title={activeFile.name} src={previewUrl} className="binary-preview" />;
    }

    if (imageExtensions.has(extension)) {
      if (!previewUrl) {
        return <div className="editor-binary-state">Loading image...</div>;
      }
      return <img alt={activeFile.name} src={previewUrl} className="image-preview" />;
    }

    if (extension === "mp3" || extension === "wav") {
      if (!previewUrl) {
        return <div className="editor-binary-state">Loading audio preview...</div>;
      }
      return (
        <div className="editor-binary-state media-preview">
          <audio controls src={previewUrl} className="audio-player">
            Your browser does not support the audio element.
          </audio>
        </div>
      );
    }

    if (extension === "mp4" || extension === "webm") {
      if (!previewUrl) {
        return <div className="editor-binary-state">Loading video preview...</div>;
      }
      return (
        <div className="editor-binary-state media-preview">
          <video controls src={previewUrl} className="video-player" />
        </div>
      );
    }

    return (
      <div className="editor-binary-state">
        <div>Cannot preview this binary file type directly in the editor.</div>
        <div>{activeFile.name}</div>
        {previewUrl && (
          <a href={previewUrl} target="_blank" rel="noreferrer">
            Open file externally
          </a>
        )}
      </div>
    );
  }

  function handleEditorDidMount(editor, monaco) {
    editor.focus();
    if (setEditorInstance) {
      setEditorInstance(editor);
    }

    monaco.editor.defineTheme("webide-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#1e1e1e",
        "editorLineNumber.foreground": "#858585",
        "editorCursor.foreground": "#ffffff"
      }
    });

    monaco.editor.setTheme("webide-dark");
  }

  if (!activeFile) {
    return (
      <div className="editor-container">
        <div className="editor-empty-state">Select a file from the explorer to start editing.</div>
      </div>
    );
  }

  // 1. Live Browser Preview tab (VS Code Simple Browser style)
  if (activeFile.isLiveUrl || activeFile.type === "browser") {
    return (
      <div className="editor-container">
        <LiveBrowser
          initialUrl={activeFile.url}
          title={activeFile.name}
          onClose={() => closeFile(activeFile.id)}
        />
      </div>
    );
  }

  // 2. Static HTML / React Live Sandbox Preview tab
  if (activeFile.isPreview) {
    return (
      <div className="editor-container">
        <div className="editor-preview-container">
          <Preview sourceFile={activeFile.sourceFile} />
        </div>
      </div>
    );
  }

  const ext = getFileExtension(activeFile.name);

  // 2. Microsoft Word Document (.docx, .doc)
  if (ext === "docx" || ext === "doc") {
    return (
      <div className="editor-container">
        <DocxPreview file={activeFile} />
      </div>
    );
  }

  // 3. Microsoft PowerPoint Presentation (.pptx, .ppt)
  if (ext === "pptx" || ext === "ppt") {
    return (
      <div className="editor-container">
        <PptxPreview file={activeFile} />
      </div>
    );
  }

  // 4. Microsoft Excel Spreadsheet (.xlsx, .xls)
  if (ext === "xlsx" || ext === "xls") {
    return (
      <div className="editor-container">
        <XlsxPreview file={activeFile} />
      </div>
    );
  }

  // 5. CSV / TSV Data (.csv, .tsv)
  if (ext === "csv" || ext === "tsv") {
    return (
      <div className="editor-container">
        <CsvPreview file={activeFile} />
      </div>
    );
  }

  // 6. Markdown (.md, .markdown)
  if (ext === "md" || ext === "markdown") {
    return (
      <div className="editor-container">
        <MarkdownPreview
          file={activeFile}
          onContentChange={handleEditorChange}
          onMount={handleEditorDidMount}
        />
      </div>
    );
  }

  // 7. Binary preview (PDF, Image, Audio, Video)
  if (activeFile.isBinary) {
    return (
      <div className="editor-container">
        {renderBinaryPreview()}
      </div>
    );
  }

  // 8. Code & Text Editor (Monaco)
  return (
    <div className="editor-container">
      <MonacoEditor
        height="100%"
        language={activeFile.language || "javascript"}
        value={activeFile.content || ""}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: true },
          fontSize: 15,
          fontFamily: "Consolas",
          lineNumbers: "on",
          automaticLayout: true,
          scrollBeyondLastLine: false,
          tabSize: 4,
          wordWrap: "on",
          cursorBlinking: "smooth",
          smoothScrolling: true,
          mouseWheelZoom: true,
          renderWhitespace: "selection",
          bracketPairColorization: { enabled: true },
          guides: { indentation: true },
          formatOnPaste: true,
          formatOnType: true
        }}
      />
    </div>
  );
}

export default Editor;