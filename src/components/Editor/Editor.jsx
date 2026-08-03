import "./Editor.css";

import { useEffect, useState } from "react";
import MonacoEditor from "@monaco-editor/react";
import JSZip from "jszip";
import useEditor from "../../hooks/useEditor";
import Preview from "../Preview";

function extractTextFromXml(xmlString) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlString, "application/xml");
  const textNodes = Array.from(xml.querySelectorAll("t"));
  return textNodes.map((node) => node.textContent || "").join("\n");
}

async function parseDocx(file) {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  const documentXml = await zip.file("word/document.xml")?.async("text");
  return documentXml ? extractTextFromXml(documentXml) : "No previewable content found.";
}

async function parseXlsx(file) {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  const sheets = Object.keys(zip.files).filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name));
  const sheetContents = await Promise.all(
    sheets.map(async (name) => {
      const sheetText = await zip.file(name)?.async("text");
      return sheetText ? extractTextFromXml(sheetText) : "";
    })
  );
  return sheetContents.filter(Boolean).join("\n\n");
}

async function parsePptx(file) {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  const slides = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name));
  const slideContents = await Promise.all(
    slides.map(async (name) => {
      const slideText = await zip.file(name)?.async("text");
      return slideText ? extractTextFromXml(slideText) : "";
    })
  );
  return slideContents.filter(Boolean).join("\n\n");
}

async function createOfficePreview(fileHandle, extension) {
  const file = await fileHandle.getFile();
  if (extension === "docx") {
    return await parseDocx(file);
  }
  if (extension === "xlsx") {
    return await parseXlsx(file);
  }
  if (extension === "pptx") {
    return await parsePptx(file);
  }
  return "";
}

function Editor() {
  const { activeFile, updateContent } = useEditor();
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewContent, setPreviewContent] = useState(null);

  function handleEditorChange(value) {
    updateContent(value);
  }

  useEffect(() => {
    let objectUrl;

    async function createPreview() {
      if (!activeFile || !activeFile.isBinary || !activeFile.handle) {
        setPreviewUrl(null);
        setPreviewContent(null);
        return;
      }

      const extension = activeFile.name.split(".").pop().toLowerCase();
      const file = await activeFile.handle.getFile();

      if (["pdf", "png", "jpg", "jpeg", "gif", "svg", "webp", "mp3", "mp4"].includes(extension)) {
        objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
        setPreviewContent(null);
        return;
      }

      if (["docx", "xlsx", "pptx"].includes(extension)) {
        const content = await createOfficePreview(activeFile.handle, extension);
        setPreviewUrl(null);
        setPreviewContent(content || "No previewable content available.");
        return;
      }

      setPreviewUrl(null);
      setPreviewContent(null);
    }

    createPreview();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [activeFile]);

  function renderBinaryPreview() {
    if (!activeFile || !activeFile.isBinary) {
      return null;
    }

    if (!activeFile.handle) {
      return <div className="editor-binary-state">Binary preview not available.</div>;
    }

    const extension = activeFile.name.split('.').pop().toLowerCase();
    const imageExtensions = new Set(["png", "jpg", "jpeg", "gif", "svg", "webp"]);

    if (extension === "pdf") {
      if (!previewUrl) {
        return <div className="editor-binary-state">Loading preview...</div>;
      }
      return <iframe title={activeFile.name} src={previewUrl} className="binary-preview" />;
    }

    if (imageExtensions.has(extension)) {
      if (!previewUrl) {
        return <div className="editor-binary-state">Loading preview...</div>;
      }
      return <img alt={activeFile.name} src={previewUrl} className="image-preview" />;
    }

    if (extension === "mp3") {
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

    if (extension === "mp4") {
      if (!previewUrl) {
        return <div className="editor-binary-state">Loading video preview...</div>;
      }
      return (
        <div className="editor-binary-state media-preview">
          <video controls src={previewUrl} className="video-player" />
        </div>
      );
    }

    if (["docx", "xlsx", "pptx"].includes(extension)) {
      return (
        <div className="editor-binary-state office-preview">
          <div className="office-preview-header">Preview for {activeFile.name}</div>
          <pre>{previewContent || "Loading preview..."}</pre>
          <a href={previewUrl} target="_blank" rel="noreferrer">Open file externally</a>
        </div>
      );
    }

    return (
      <div className="editor-binary-state">
        <div>Cannot preview this binary file type in the editor.</div>
        <div>{activeFile.name}</div>
        <a href={previewUrl} target="_blank" rel="noreferrer">Open file externally</a>
      </div>
    );
  }

  function handleEditorDidMount(editor, monaco) {
    editor.focus();

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

  return (
    <div className="editor-container">
      {activeFile ? (
        activeFile.isPreview ? (
          <div className="editor-preview-container">
            <Preview sourceFile={activeFile.sourceFile} />
          </div>
        ) : activeFile.isBinary ? (
          renderBinaryPreview()
        ) : (
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
        )
      ) : (
        <div className="editor-empty-state">Select a file from the explorer to start editing.</div>
      )}
    </div>
  );
}

export default Editor;