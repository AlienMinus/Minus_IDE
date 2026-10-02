import "./Editor.css";
import { useEffect, useState, useRef, useCallback } from "react";
import MonacoEditor from "@monaco-editor/react";
import useEditor from "../../hooks/useEditor";
import Preview from "../Preview";
import LiveBrowser from "../LiveBrowser/LiveBrowser";
import {
  DocxPreview,
  PptxPreview,
  XlsxPreview,
  CsvPreview,
  MarkdownPreview,
  ImagePreview
} from "../Previews";
import { getFileExtension } from "../../utils/fileIcons";
import { isBinaryFile } from "../../services/fileService";
import { checkClientSyntax, getCodeDiagnostics } from "../../utils/codeDiagnostics";
import useFile from "../../hooks/useFile";

function Editor() {
  const { activeFile, updateContent, setEditorInstance, closeFile, setProblems, isWordWrapOn, saveActiveFile, files } = useEditor();
  const { persistedFolderInfo } = useFile();
  const [previewUrl, setPreviewUrl] = useState(null);
  const monacoRef = useRef(null);
  const editorRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const saveActiveFileRef = useRef(saveActiveFile);
  saveActiveFileRef.current = saveActiveFile;
  const mediaBlobUrlRef = useRef(null);

  const runDiagnostics = useCallback(async (code, file, monacoInstance, editorInstance) => {
    if (!file || file.isBinary || file.isPreview || file.isLiveUrl) return;
    const monaco = monacoInstance || monacoRef.current;
    const editor = editorInstance || editorRef.current;
    if (!monaco || !editor) return;

    const model = editor.getModel();
    if (!model) return;

    const language = file.language || getFileExtension(file.name);
    const filename = file.name || "";

    // 1. Instant client-side check (0ms latency)
    const clientMarkers = checkClientSyntax(code, language, filename);
    monaco.editor.setModelMarkers(model, "diagnostics", clientMarkers);

    // 2. Authoritative compiler/interpreter check (GCC, Python AST, etc.)
    try {
      const markers = await getCodeDiagnostics({ code, language, filename });
      if (markers !== undefined) {
        monaco.editor.setModelMarkers(model, "diagnostics", markers);
      }
    } catch {}
  }, []);

  function handleEditorChange(value) {
    updateContent(value);

    // 0ms instant syntax feedback on keystroke
    if (editorRef.current && monacoRef.current && activeFile) {
      const model = editorRef.current.getModel();
      if (model) {
        const lang = activeFile.language || getFileExtension(activeFile.name);
        const instantMarkers = checkClientSyntax(value, lang, activeFile.name);
        monacoRef.current.editor.setModelMarkers(model, "diagnostics", instantMarkers);
      }
    }

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      runDiagnostics(value, activeFile);
    }, 250);
  }

  useEffect(() => {
    let isCancelled = false;

    async function createMediaPreview() {
      if (!activeFile) {
        setPreviewUrl(null);
        return;
      }

      const extension = getFileExtension(activeFile.name);
      const isImage = ["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(extension);
      const isMedia = isImage || ["pdf", "mp3", "wav", "mp4", "webm"].includes(extension);

      if (!isMedia) {
        setPreviewUrl(null);
        return;
      }

      // Find file handle if not directly on activeFile
      let handle = activeFile.handle;
      if (!handle && files) {
        const found = files.find((f) => f.id === activeFile.id || f.path === activeFile.path || f.name === activeFile.name);
        if (found?.handle) {
          handle = found.handle;
        }
      }

      if (handle) {
        try {
          const file = await handle.getFile();
          if (isCancelled) return;

          if (file.size === 0) {
            setPreviewUrl("EMPTY_FILE");
            return;
          }

          if (isImage) {
            // Use FileReader to create permanent, unrevokable Data URL
            const reader = new FileReader();
            reader.onload = () => {
              if (!isCancelled) {
                setPreviewUrl(reader.result);
              }
            };
            reader.onerror = () => {
              if (!isCancelled) {
                if (mediaBlobUrlRef.current) URL.revokeObjectURL(mediaBlobUrlRef.current);
                const url = URL.createObjectURL(file);
                mediaBlobUrlRef.current = url;
                setPreviewUrl(url);
              }
            };
            reader.readAsDataURL(file);
            return;
          } else {
            // For PDF, audio, video: use Blob URL with proper lifetime management
            if (mediaBlobUrlRef.current) {
              URL.revokeObjectURL(mediaBlobUrlRef.current);
            }
            const mimeType = extension === "mp4" ? "video/mp4" :
                             extension === "mp3" ? "audio/mpeg" :
                             extension === "pdf" ? "application/pdf" : file.type;
            const blob = file.type ? file : new Blob([await file.arrayBuffer()], { type: mimeType });
            if (isCancelled) return;
            const url = URL.createObjectURL(blob);
            mediaBlobUrlRef.current = url;
            setPreviewUrl(url);
            return;
          }
        } catch (e) {
          console.error("Failed to load binary media from handle:", e);
        }
      }

      // If no handle or handle failed, try backend host path
      const filePath = activeFile.path || (persistedFolderInfo?.path ? `${persistedFolderInfo.path}/${activeFile.name}` : null);
      if (filePath) {
        try {
          const res = await fetch(`/api/sandbox/workspace/file?path=${encodeURIComponent(filePath)}`);
          if (res.ok) {
            const blob = await res.blob();
            if (isCancelled) return;
            if (blob.size === 0) {
              setPreviewUrl("EMPTY_FILE");
              return;
            }
            if (isImage) {
              const reader = new FileReader();
              reader.onload = () => {
                if (!isCancelled) setPreviewUrl(reader.result);
              };
              reader.readAsDataURL(blob);
              return;
            } else {
              if (mediaBlobUrlRef.current) URL.revokeObjectURL(mediaBlobUrlRef.current);
              const url = URL.createObjectURL(blob);
              mediaBlobUrlRef.current = url;
              setPreviewUrl(url);
              return;
            }
          }
        } catch (err) {
          console.warn("Backend media load error:", err);
        }
      }

      setPreviewUrl(null);
    }

    createMediaPreview();

    return () => {
      isCancelled = true;
    };
  }, [activeFile?.id, activeFile?.name, activeFile?.path, files, persistedFolderInfo?.path]);

  function renderBinaryPreview() {
    if (!activeFile) {
      return null;
    }

    const extension = getFileExtension(activeFile.name);
    const imageExtensions = new Set(["png", "jpg", "jpeg", "gif", "svg", "webp"]);

    if (previewUrl === "EMPTY_FILE") {
      return (
        <div className="editor-binary-state" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "10px", color: "#cccccc" }}>
          <div style={{ fontSize: "28px" }}>⚠️</div>
          <div style={{ fontSize: "16px", fontWeight: "600" }}>Image file is empty (0 bytes)</div>
          <div style={{ color: "#858585", fontSize: "13px" }}>{activeFile.name} does not contain any image data.</div>
        </div>
      );
    }

    if (extension === "pdf") {
      if (!previewUrl) {
        return <div className="editor-binary-state">Loading PDF preview...</div>;
      }
      return <iframe title={activeFile.name} src={previewUrl} className="binary-preview" />;
    }

    if (imageExtensions.has(extension)) {
      if (!previewUrl) {
        return <div className="editor-binary-state">Loading image preview...</div>;
      }
      return <ImagePreview src={previewUrl} fileName={activeFile.name} />;
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
    editorRef.current = editor;
    monacoRef.current = monaco;
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

    // Run initial diagnostics on editor mount
    if (activeFile && activeFile.content != null) {
      runDiagnostics(activeFile.content, activeFile, monaco, editor);
    }
  }

  // Synchronize Monaco markers with Problems panel in real-time
  useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco) return;

    const syncMarkers = () => {
      const allMarkers = monaco.editor.getModelMarkers({});
      const formatted = allMarkers.map((m) => {
        const uriPath = m.resource?.path || "";
        const fname = uriPath.split("/").pop() || activeFile?.name || "file";
        return {
          id: `${fname}-${m.startLineNumber}-${m.startColumn}-${m.message}`,
          filename: fname,
          fileId: activeFile?.id,
          message: m.message,
          severity: m.severity, // 8 = Error, 4 = Warning, 2 = Info
          startLineNumber: m.startLineNumber,
          startColumn: m.startColumn,
          endLineNumber: m.endLineNumber,
          endColumn: m.endColumn,
          source: m.source || (m.severity === 8 ? "Error" : "Warning")
        };
      });
      if (setProblems) {
        setProblems(formatted);
      }
    };

    const disposable = monaco.editor.onDidChangeMarkers(() => {
      syncMarkers();
    });

    syncMarkers();

    return () => disposable.dispose();
  }, [setProblems, activeFile?.id, activeFile?.name]);

  // Re-run diagnostics when switching active file
  useEffect(() => {
    if (activeFile && activeFile.content != null && monacoRef.current && editorRef.current) {
      runDiagnostics(activeFile.content, activeFile);
    }
  }, [activeFile?.id, activeFile?.name, runDiagnostics]);

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
  if (activeFile.isBinary || isBinaryFile(activeFile.name)) {
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
          wordWrap: isWordWrapOn ? "on" : "off",
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