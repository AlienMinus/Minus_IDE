import "./Editor.css";

import MonacoEditor from "@monaco-editor/react";
import useEditor from "../../hooks/useEditor";

function Editor() {
  const { activeFile, updateContent } = useEditor();

  function handleEditorChange(value) {
    updateContent(value);
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
      ) : (
        <div className="editor-empty-state">Select a file from the explorer to start editing.</div>
      )}
    </div>
  );
}

export default Editor;