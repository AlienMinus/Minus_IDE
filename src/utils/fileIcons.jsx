import React from "react";
import {
  FaFileWord,
  FaFileExcel,
  FaFilePowerpoint,
  FaFileCsv,
  FaFilePdf,
  FaMarkdown,
  FaReact,
  FaJsSquare,
  FaHtml5,
  FaCss3Alt,
  FaPython,
  FaTerminal,
  FaFileCode,
  FaFileImage,
  FaFileAudio,
  FaFileVideo,
  FaFileArchive,
  FaFileAlt,
  FaDatabase,
  FaCog,
  FaGitAlt,
  FaJava,
  FaRust,
  FaGlobe
} from "react-icons/fa";

/**
 * Get clean lower-case file extension from filename or path
 */
export function getFileExtension(filename = "") {
  if (!filename) return "";
  const clean = filename.split("?")[0].split("#")[0];
  const parts = clean.split("/");
  const baseName = parts[parts.length - 1];

  // Check special dotfiles
  if (baseName.startsWith(".") && !baseName.slice(1).includes(".")) {
    return baseName.toLowerCase();
  }

  const dotIndex = baseName.lastIndexOf(".");
  if (dotIndex === -1 || dotIndex === 0) return "";
  return baseName.slice(dotIndex + 1).toLowerCase();
}

/**
 * Return the appropriate React icon for a given file name or extension
 */
export function getFileIcon(fileNameOrExt, options = {}) {
  const { className = "", style = {}, size } = options;
  if (!fileNameOrExt) {
    return <FaFileAlt className={`file-icon ${className}`} style={{ color: "#94a3b8", ...style }} size={size} />;
  }

  const str = String(fileNameOrExt).trim();
  const ext = str.includes(".") ? getFileExtension(str) : str.toLowerCase();
  const lowerName = str.toLowerCase();

  // Special names
  if (lowerName === ".gitignore" || lowerName === ".gitattributes") {
    return <FaGitAlt className={`file-icon ${className}`} style={{ color: "#f05032", ...style }} size={size} />;
  }
  if (lowerName.startsWith(".env")) {
    return <FaCog className={`file-icon ${className}`} style={{ color: "#eab308", ...style }} size={size} />;
  }
  if (lowerName === "package.json" || lowerName === "tsconfig.json") {
    return <FaFileCode className={`file-icon ${className}`} style={{ color: "#38bdf8", ...style }} size={size} />;
  }
  if (lowerName === "dockerfile" || lowerName.startsWith("dockerfile.")) {
    return <FaTerminal className={`file-icon ${className}`} style={{ color: "#0ea5e9", ...style }} size={size} />;
  }
  if (lowerName === "preview") {
    return <FaGlobe className={`file-icon ${className}`} style={{ color: "#60a5fa", ...style }} size={size} />;
  }

  switch (ext) {
    // Microsoft Word / Documents
    case "doc":
    case "docx":
    case "odt":
    case "rtf":
      return <FaFileWord className={`file-icon docx-icon ${className}`} style={{ color: "#185abd", ...style }} size={size} />;

    // Microsoft Excel / Spreadsheets
    case "xls":
    case "xlsx":
    case "ods":
      return <FaFileExcel className={`file-icon xlsx-icon ${className}`} style={{ color: "#107c41", ...style }} size={size} />;

    // CSV / Delimited Data
    case "csv":
    case "tsv":
      return <FaFileCsv className={`file-icon csv-icon ${className}`} style={{ color: "#0d9488", ...style }} size={size} />;

    // Microsoft PowerPoint / Presentations
    case "ppt":
    case "pptx":
    case "odp":
      return <FaFilePowerpoint className={`file-icon pptx-icon ${className}`} style={{ color: "#d24726", ...style }} size={size} />;

    // PDF Documents
    case "pdf":
      return <FaFilePdf className={`file-icon pdf-icon ${className}`} style={{ color: "#ef4444", ...style }} size={size} />;

    // Markdown
    case "md":
    case "markdown":
    case "mdown":
    case "mkd":
      return <FaMarkdown className={`file-icon md-icon ${className}`} style={{ color: "#38bdf8", ...style }} size={size} />;

    // React
    case "jsx":
    case "tsx":
      return <FaReact className={`file-icon react-icon ${className}`} style={{ color: "#61dafb", ...style }} size={size} />;

    // JavaScript
    case "js":
    case "mjs":
    case "cjs":
      return <FaJsSquare className={`file-icon js-icon ${className}`} style={{ color: "#facc15", ...style }} size={size} />;

    // TypeScript
    case "ts":
      return <FaFileCode className={`file-icon ts-icon ${className}`} style={{ color: "#3178c6", ...style }} size={size} />;

    // HTML
    case "html":
    case "htm":
      return <FaHtml5 className={`file-icon html-icon ${className}`} style={{ color: "#f97316", ...style }} size={size} />;

    // CSS
    case "css":
    case "scss":
    case "sass":
    case "less":
      return <FaCss3Alt className={`file-icon css-icon ${className}`} style={{ color: "#38bdf8", ...style }} size={size} />;

    // Python
    case "py":
    case "pyw":
    case "ipynb":
      return <FaPython className={`file-icon py-icon ${className}`} style={{ color: "#387eb8", ...style }} size={size} />;

    // C / C++
    case "c":
    case "cpp":
    case "cc":
    case "cxx":
    case "h":
    case "hpp":
      return <FaFileCode className={`file-icon c-icon ${className}`} style={{ color: "#00599c", ...style }} size={size} />;

    // Shell Scripts
    case "sh":
    case "bash":
    case "zsh":
    case "bat":
    case "cmd":
    case "ps1":
      return <FaTerminal className={`file-icon sh-icon ${className}`} style={{ color: "#22c55e", ...style }} size={size} />;

    // JSON
    case "json":
    case "jsonc":
      return <FaFileCode className={`file-icon json-icon ${className}`} style={{ color: "#eab308", ...style }} size={size} />;

    // YAML
    case "yaml":
    case "yml":
      return <FaFileCode className={`file-icon yaml-icon ${className}`} style={{ color: "#c084fc", ...style }} size={size} />;

    // XML
    case "xml":
    case "svg":
      return <FaFileCode className={`file-icon xml-icon ${className}`} style={{ color: "#fb923c", ...style }} size={size} />;

    // SQL / Database
    case "sql":
    case "sqlite":
    case "db":
      return <FaDatabase className={`file-icon sql-icon ${className}`} style={{ color: "#06b6d4", ...style }} size={size} />;

    // Java
    case "java":
    case "class":
    case "jar":
      return <FaJava className={`file-icon java-icon ${className}`} style={{ color: "#ea580c", ...style }} size={size} />;

    // Rust
    case "rs":
      return <FaRust className={`file-icon rust-icon ${className}`} style={{ color: "#dea584", ...style }} size={size} />;

    // Images
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
    case "ico":
    case "bmp":
      return <FaFileImage className={`file-icon img-icon ${className}`} style={{ color: "#ec4899", ...style }} size={size} />;

    // Audio
    case "mp3":
    case "wav":
    case "ogg":
    case "flac":
    case "m4a":
      return <FaFileAudio className={`file-icon audio-icon ${className}`} style={{ color: "#a855f7", ...style }} size={size} />;

    // Video
    case "mp4":
    case "webm":
    case "mkv":
    case "mov":
    case "avi":
      return <FaFileVideo className={`file-icon video-icon ${className}`} style={{ color: "#f43f5e", ...style }} size={size} />;

    // Archives
    case "zip":
    case "rar":
    case "7z":
    case "tar":
    case "gz":
      return <FaFileArchive className={`file-icon archive-icon ${className}`} style={{ color: "#f59e0b", ...style }} size={size} />;

    // Plain text & Logs
    case "txt":
    case "log":
    case "ini":
    case "conf":
      return <FaFileAlt className={`file-icon txt-icon ${className}`} style={{ color: "#94a3b8", ...style }} size={size} />;

    default:
      return <FaFileAlt className={`file-icon default-icon ${className}`} style={{ color: "#94a3b8", ...style }} size={size} />;
  }
}

export function FileIcon({ name, className = "", style = {}, size }) {
  return getFileIcon(name, { className, style, size });
}
