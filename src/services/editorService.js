import { readFileContent, writeFileContent, isBinaryFile } from "./fileService";

export async function loadEditorFile(file) {
  if (!file || !file.handle) {
    return file;
  }

  if (file.content != null || file.isBinary) {
    return file;
  }

  const content = await readFileContent(file.handle);
  if (content === null && isBinaryFile(file.name)) {
    return { ...file, content: "", isBinary: true };
  }

  return { ...file, content };
}

export async function saveEditorFile(file) {
  if (!file || !file.handle) {
    throw new Error("Cannot save file without a valid file handle.");
  }

  await writeFileContent(file.handle, file.content || "");
  return file;
}

export function refreshEditorContent(fileId, files, openFiles, activeFile, value) {
  const updatedFiles = files.map((item) =>
    item.id === fileId ? { ...item, content: value } : item,
  );

  const updatedOpenFiles = openFiles.map((item) =>
    item.id === fileId ? { ...item, content: value } : item,
  );

  const updatedActiveFile = activeFile && activeFile.id === fileId ? { ...activeFile, content: value } : activeFile;

  return { updatedFiles, updatedOpenFiles, updatedActiveFile };
}
