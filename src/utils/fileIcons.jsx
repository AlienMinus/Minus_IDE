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
  const { className = "", style = {}, size = 16 } = options;
  const iconSize = size || 16;

  const renderIcon = (Component, color, customClass = "") => (
    <Component
      className={`file-icon ${customClass} ${className}`.trim()}
      style={{
        color,
        flexShrink: 0,
        width: iconSize,
        height: iconSize,
        minWidth: iconSize,
        minHeight: iconSize,
        display: "inline-block",
        verticalAlign: "middle",
        ...style
      }}
      size={iconSize}
    />
  );

  if (!fileNameOrExt) {
    return renderIcon(FaFileAlt, "#94a3b8", "default-icon");
  }

  const str = String(fileNameOrExt).trim();
  const ext = str.includes(".") ? getFileExtension(str) : str.toLowerCase();
  const lowerName = str.toLowerCase();

  // Special names
  if (lowerName === ".gitignore" || lowerName === ".gitattributes") {
    return renderIcon(FaGitAlt, "#f05032", "git-icon");
  }
  if (lowerName.startsWith(".env")) {
    return renderIcon(FaCog, "#eab308", "env-icon");
  }
  if (lowerName === "package.json" || lowerName === "tsconfig.json") {
    return renderIcon(FaFileCode, "#38bdf8", "config-icon");
  }
  if (lowerName === "dockerfile" || lowerName.startsWith("dockerfile.")) {
    return renderIcon(FaTerminal, "#0ea5e9", "docker-icon");
  }
  if (lowerName === "preview") {
    return renderIcon(FaGlobe, "#60a5fa", "preview-icon");
  }

  switch (ext) {
    // Microsoft Word / Documents
    case "doc":
    case "docx":
    case "odt":
    case "rtf":
      return renderIcon(FaFileWord, "#185abd", "docx-icon");

    // Microsoft Excel / Spreadsheets
    case "xls":
    case "xlsx":
    case "ods":
      return renderIcon(FaFileExcel, "#107c41", "xlsx-icon");

    // CSV / Delimited Data
    case "csv":
    case "tsv":
      return renderIcon(FaFileCsv, "#0d9488", "csv-icon");

    // Microsoft PowerPoint / Presentations
    case "ppt":
    case "pptx":
    case "odp":
      return renderIcon(FaFilePowerpoint, "#d24726", "pptx-icon");

    // PDF Documents
    case "pdf":
      return renderIcon(FaFilePdf, "#ef4444", "pdf-icon");

    // Markdown
    case "md":
    case "markdown":
    case "mdown":
    case "mkd":
      return renderIcon(FaMarkdown, "#38bdf8", "md-icon");

    // React
    case "jsx":
    case "tsx":
      return renderIcon(FaReact, "#61dafb", "react-icon");

    // JavaScript
    case "js":
    case "mjs":
    case "cjs":
      return renderIcon(FaJsSquare, "#facc15", "js-icon");

    // TypeScript
    case "ts":
      return renderIcon(FaFileCode, "#3178c6", "ts-icon");

    // HTML
    case "html":
    case "htm":
      return renderIcon(FaHtml5, "#f97316", "html-icon");

    // CSS
    case "css":
    case "scss":
    case "sass":
    case "less":
      return renderIcon(FaCss3Alt, "#38bdf8", "css-icon");

    // Python
    case "py":
    case "pyw":
    case "ipynb":
      return renderIcon(FaPython, "#387eb8", "py-icon");

    // C / C++
    case "c":
    case "cpp":
    case "cc":
    case "cxx":
    case "h":
    case "hpp":
      return renderIcon(FaFileCode, "#00599c", "c-icon");

    // Shell Scripts
    case "sh":
    case "bash":
    case "zsh":
    case "bat":
    case "cmd":
    case "ps1":
      return renderIcon(FaTerminal, "#22c55e", "sh-icon");

    // JSON
    case "json":
    case "jsonc":
      return renderIcon(FaFileCode, "#eab308", "json-icon");

    // YAML
    case "yaml":
    case "yml":
      return renderIcon(FaFileCode, "#c084fc", "yaml-icon");

    // XML
    case "xml":
    case "svg":
      return renderIcon(FaFileCode, "#fb923c", "xml-icon");

    // SQL / Database
    case "sql":
    case "sqlite":
    case "db":
      return renderIcon(FaDatabase, "#06b6d4", "sql-icon");

    // Java
    case "java":
    case "class":
    case "jar":
      return renderIcon(FaJava, "#ea580c", "java-icon");

    // Rust
    case "rs":
      return renderIcon(FaRust, "#dea584", "rust-icon");

    // Images
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
    case "ico":
    case "bmp":
      return renderIcon(FaFileImage, "#ec4899", "img-icon");

    // Audio
    case "mp3":
    case "wav":
    case "ogg":
    case "flac":
    case "m4a":
      return renderIcon(FaFileAudio, "#a855f7", "audio-icon");

    // Video
    case "mp4":
    case "webm":
    case "mkv":
    case "mov":
    case "avi":
    case "wmv":
    case "flv":
    case "m4v":
    case "3gp":
    case "mpg":
    case "mpeg":
    case "ogv":
      return renderIcon(FaFileVideo, "#f43f5e", "video-icon");

    // Archives
    case "zip":
    case "rar":
    case "7z":
    case "tar":
    case "gz":
      return renderIcon(FaFileArchive, "#f59e0b", "archive-icon");

    // Plain text & Logs
    case "txt":
    case "log":
    case "ini":
    case "conf":
      return renderIcon(FaFileAlt, "#94a3b8", "txt-icon");

    default:
      return renderIcon(FaFileAlt, "#94a3b8", "default-icon");
  }
}

export function FileIcon({ name, className = "", style = {}, size }) {
  return getFileIcon(name, { className, style, size });
}
