import { createContext, useState } from "react";
import fileTree from "../data/fileTree";

function flattenFiles(tree) {
  let files = [];

  tree.forEach((item) => {
    if (item.type === "file") {
      files.push(item);
    }

    if (item.children) {
      files = [...files, ...flattenFiles(item.children)];
    }
  });

  return files;
}

const initialFiles = flattenFiles(fileTree);

export const EditorContext = createContext(null);

export function EditorProvider({ children }) {
  const [files, setFiles] = useState(initialFiles);
  const [openFiles, setOpenFiles] = useState(initialFiles.slice(0, 1));
  const [activeFile, setActiveFile] = useState(initialFiles[0] ?? null);

  function openFile(file) {
    const exists = openFiles.some((f) => f.id === file.id);

    if (!exists) {
      setOpenFiles([...openFiles, file]);
    }

    setActiveFile(file);
  }

  function closeFile(id) {
    const updated = openFiles.filter((file) => file.id !== id);

    setOpenFiles(updated);

    if (activeFile && activeFile.id === id) {
      setActiveFile(updated[0] ?? null);
    }
  }

  function updateContent(value) {
    if (!activeFile) return;

    const updatedFiles = files.map((file) =>
      file.id === activeFile.id ? { ...file, content: value } : file,
    );

    setFiles(updatedFiles);
    setOpenFiles(openFiles.map((file) => (file.id === activeFile.id ? { ...file, content: value } : file)));
    setActiveFile({ ...activeFile, content: value });
  }

  return (
    <EditorContext.Provider
      value={{
        files,
        openFiles,
        activeFile,
        openFile,
        closeFile,
        updateContent,
        setActiveFile,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
}
