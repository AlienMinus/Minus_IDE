const languageMap = {
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  css: "css",
  scss: "scss",
  html: "html",
  htm: "html",
  json: "json",
  md: "markdown",
  markdown: "markdown",
  txt: "plaintext",
  py: "python",
  c: "c",
  cpp: "cpp",
  h: "c",
  hpp: "cpp",
  sh: "shell",
  bash: "shell",
  csv: "csv",
  tsv: "csv",
  xml: "xml",
  yaml: "yaml",
  yml: "yaml",
  sql: "sql",
  pdf: "pdf",
  ppt: "pptx",
  pptx: "pptx",
  doc: "docx",
  docx: "docx",
  xls: "xlsx",
  xlsx: "xlsx",
  mp3: "audio",
  mp4: "video"
};

const textExtensions = new Set([
  "js", "mjs", "cjs", "jsx", "ts", "tsx", "css", "scss", "html", "htm",
  "json", "md", "markdown", "txt", "py", "c", "cpp", "h", "hpp", "sh",
  "bash", "csv", "tsv", "yaml", "yml", "xml", "sql", "env", "gitignore"
]);

const binaryExtensions = new Set([
  "pdf",
  "ppt",
  "pptx",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "svg",
  "webp",
  "ico",
  "mp3",
  "wav",
  "mp4",
  "webm",
  "zip",
  "rar"
]);

export function getFileExtension(fileName) {
  return fileName.split(".").pop().toLowerCase();
}

export function getLanguageFromFileName(fileName) {
  const ext = getFileExtension(fileName);
  return languageMap[ext] || "plaintext";
}

export function isTextFile(fileName) {
  return textExtensions.has(getFileExtension(fileName));
}

export function isBinaryFile(fileName) {
  return binaryExtensions.has(getFileExtension(fileName));
}

export async function readFileContent(fileHandle) {
  const file = await fileHandle.getFile();
  const fileName = file.name || "";

  if (isTextFile(fileName)) {
    return await file.text();
  }

  return null;
}

export async function writeFileContent(fileHandle, content) {
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

export async function traverseDirectory(dirHandle, path = "") {
  const entries = [];

  for await (const [name, handle] of dirHandle) {
    const itemPath = path ? `${path}/${name}` : name;

    if (handle.kind === "directory") {
      const children = await traverseDirectory(handle, itemPath);
      entries.push({
        id: itemPath,
        name,
        type: "folder",
        path: itemPath,
        handle,
        children
      });
      continue;
    }

    entries.push({
      id: itemPath,
      name,
      type: "file",
      path: itemPath,
      handle,
      language: getLanguageFromFileName(name),
      content: null
    });
  }

  entries.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "folder" ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return entries;
}

export function flattenFiles(tree) {
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
