import React, { useState, useMemo, useEffect, useRef } from "react";
import useEditor from "../../hooks/useEditor";
import { getFileIcon } from "../../utils/fileIcons";
import {
  FaChevronRight,
  FaChevronDown,
  FaTimes
} from "react-icons/fa";
import {
  VscRefresh,
  VscClearAll,
  VscNewFile,
  VscListTree,
  VscCollapseAll,
  VscReplaceAll,
  VscCaseSensitive,
  VscWholeWord,
  VscRegex,
  VscEllipsis
} from "react-icons/vsc";
import "./Search.css";

export function Search() {
  const {
    files,
    openFile,
    updateContent,
    searchQuery,
    setSearchQuery,
    replaceQuery,
    setReplaceQuery,
    isReplaceOpen,
    setIsReplaceOpen,
    editorRef
  } = useEditor();

  const [matchCase, setMatchCase] = useState(false);
  const [matchWholeWord, setMatchWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [preserveCase, setPreserveCase] = useState(false);
  const [showIncludeExclude, setShowIncludeExclude] = useState(false);
  const [filesToInclude, setFilesToInclude] = useState("");
  const [filesToExclude, setFilesToExclude] = useState("");
  const [collapsedFiles, setCollapsedFiles] = useState({});
  const [viewAsTree, setViewAsTree] = useState(true);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Compute search matches across files with optional file inclusion/exclusion
  const searchResults = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) return [];

    let regex = null;
    try {
      let pattern = searchQuery;
      if (!useRegex) {
        pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }
      if (matchWholeWord) {
        pattern = `\\b${pattern}\\b`;
      }
      regex = new RegExp(pattern, matchCase ? "g" : "gi");
    } catch {
      return [];
    }

    const includeFilters = filesToInclude
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const excludeFilters = filesToExclude
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const results = [];

    files.forEach((file) => {
      const filePath = (file.path || file.name || "").toLowerCase();

      // Check exclude
      if (excludeFilters.some((filter) => filePath.includes(filter))) {
        return;
      }

      // Check include
      if (includeFilters.length > 0 && !includeFilters.some((filter) => filePath.includes(filter))) {
        return;
      }

      if (!file.content || typeof file.content !== "string") return;

      const lines = file.content.split("\n");
      const fileMatches = [];

      lines.forEach((lineText, lineIdx) => {
        let match;
        regex.lastIndex = 0;
        while ((match = regex.exec(lineText)) !== null) {
          fileMatches.push({
            lineNumber: lineIdx + 1,
            column: match.index + 1,
            matchLength: match[0].length,
            matchText: match[0],
            lineText: lineText.trim(),
            lineIndex: lineIdx
          });
          if (!regex.global) break;
        }
      });

      if (fileMatches.length > 0) {
        results.push({
          file,
          matches: fileMatches
        });
      }
    });

    return results;
  }, [files, searchQuery, matchCase, matchWholeWord, useRegex, filesToInclude, filesToExclude]);

  const totalMatchesCount = useMemo(() => {
    return searchResults.reduce((acc, curr) => acc + curr.matches.length, 0);
  }, [searchResults]);

  const toggleFileCollapse = (fileId) => {
    setCollapsedFiles((prev) => ({ ...prev, [fileId]: !prev[fileId] }));
  };

  const handleCollapseAll = () => {
    const all = {};
    searchResults.forEach((r) => {
      all[r.file.id] = true;
    });
    setCollapsedFiles(all);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setReplaceQuery("");
  };

  const handleMatchClick = (file, match) => {
    openFile(file);
    setTimeout(() => {
      if (editorRef?.current) {
        editorRef.current.revealLineInCenter(match.lineNumber);
        editorRef.current.setPosition({
          lineNumber: match.lineNumber,
          column: match.column
        });
        editorRef.current.setSelection({
          startLineNumber: match.lineNumber,
          startColumn: match.column,
          endLineNumber: match.lineNumber,
          endColumn: match.column + match.matchLength
        });
        editorRef.current.focus();
      }
    }, 100);
  };

  const handleReplaceInFile = (file) => {
    if (!searchQuery) return;
    let pattern = searchQuery;
    if (!useRegex) {
      pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
    if (matchWholeWord) {
      pattern = `\\b${pattern}\\b`;
    }
    const regex = new RegExp(pattern, matchCase ? "g" : "gi");
    const newContent = file.content.replace(regex, replaceQuery || "");

    openFile(file);
    updateContent(newContent);
  };

  const handleReplaceAll = () => {
    if (!searchQuery) return;
    searchResults.forEach((res) => {
      handleReplaceInFile(res.file);
    });
  };

  return (
    <aside className="search-panel">
      {/* Search Header matching Image 2 */}
      <div className="search-panel-header">
        <span className="search-panel-title">Search</span>

        <div className="search-header-actions">
          <button
            className="search-header-btn"
            onClick={() => searchInputRef.current?.focus()}
            title="Refresh"
          >
            <VscRefresh />
          </button>
          <button
            className="search-header-btn"
            onClick={handleClearSearch}
            title="Clear Search Results"
          >
            <VscClearAll />
          </button>
          <button
            className="search-header-btn"
            onClick={() => setViewAsTree((prev) => !prev)}
            title={viewAsTree ? "View as List" : "View as Tree"}
          >
            <VscListTree />
          </button>
          <button
            className="search-header-btn"
            onClick={handleCollapseAll}
            title="Collapse All"
          >
            <VscCollapseAll />
          </button>
        </div>
      </div>

      {/* Inputs Area */}
      <div className="search-inputs-area">
        {/* Search Input Row with Green Focus Outline */}
        <div className="search-row-container">
          <button
            className={`search-expand-toggle ${isReplaceOpen ? "expanded" : ""}`}
            onClick={() => setIsReplaceOpen((prev) => !prev)}
            title="Toggle Replace"
          >
            <FaChevronDown className="search-toggle-chevron" />
          </button>

          <div className="search-field-wrapper search-primary-field">
            <input
              ref={searchInputRef}
              type="text"
              className="search-field-input"
              value={searchQuery || ""}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
            />
            <div className="search-modifiers">
              <button
                className={`search-mod-btn ${matchCase ? "active" : ""}`}
                onClick={() => setMatchCase((v) => !v)}
                title="Match Case (Alt+C)"
              >
                <span className="mod-label">Aa</span>
              </button>
              <button
                className={`search-mod-btn ${matchWholeWord ? "active" : ""}`}
                onClick={() => setMatchWholeWord((v) => !v)}
                title="Match Whole Word (Alt+W)"
              >
                <span className="mod-label underlined">ab</span>
              </button>
              <button
                className={`search-mod-btn ${useRegex ? "active" : ""}`}
                onClick={() => setUseRegex((v) => !v)}
                title="Use Regular Expression (Alt+R)"
              >
                <span className="mod-label star">.*</span>
              </button>
            </div>
          </div>
        </div>

        {/* Replace Input Row */}
        {isReplaceOpen && (
          <div className="search-row-container replace-row-container">
            <div className="replace-spacer" />
            <div className="search-field-wrapper replace-field-wrapper">
              <input
                type="text"
                className="search-field-input"
                value={replaceQuery || ""}
                onChange={(e) => setReplaceQuery(e.target.value)}
                placeholder="Replace"
              />
              <div className="search-modifiers">
                <button
                  className={`search-mod-btn ${preserveCase ? "active" : ""}`}
                  onClick={() => setPreserveCase((v) => !v)}
                  title="Preserve Case (Alt+P)"
                >
                  <span className="mod-label">AB</span>
                </button>
                <button
                  className="search-mod-btn"
                  onClick={handleReplaceAll}
                  title="Replace All (Ctrl+Alt+Enter)"
                  disabled={!searchQuery || searchResults.length === 0}
                >
                  <VscReplaceAll />
                </button>
                <button
                  className={`search-mod-btn ${showIncludeExclude ? "active" : ""}`}
                  onClick={() => setShowIncludeExclude((v) => !v)}
                  title="Toggle Search Details"
                >
                  <VscEllipsis />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Optional Files to include / exclude filter */}
        {showIncludeExclude && (
          <div className="search-details-section">
            <div className="search-filter-row">
              <label>files to include</label>
              <input
                type="text"
                value={filesToInclude}
                onChange={(e) => setFilesToInclude(e.target.value)}
                placeholder="e.g. *.js, src/**"
                className="search-filter-input"
              />
            </div>
            <div className="search-filter-row">
              <label>files to exclude</label>
              <input
                type="text"
                value={filesToExclude}
                onChange={(e) => setFilesToExclude(e.target.value)}
                placeholder="e.g. node_modules, dist"
                className="search-filter-input"
              />
            </div>
          </div>
        )}
      </div>

      {/* Results summary bar */}
      <div className="search-summary-bar">
        {searchQuery ? (
          <span>
            {totalMatchesCount} result{totalMatchesCount === 1 ? "" : "s"} in{" "}
            {searchResults.length} file{searchResults.length === 1 ? "" : "s"}
          </span>
        ) : (
          <span className="search-empty-hint">Type keyword to search across files</span>
        )}
      </div>

      {/* Results Tree List */}
      <div className="search-results-list">
        {searchResults.map(({ file, matches }) => {
          const isCollapsed = collapsedFiles[file.id];
          return (
            <div key={file.id} className="search-file-group">
              <div
                className="search-file-header"
                onClick={() => toggleFileCollapse(file.id)}
              >
                <span className="search-collapse-arrow">
                  {isCollapsed ? <FaChevronRight /> : <FaChevronDown />}
                </span>
                {getFileIcon(file.name)}
                <span className="search-file-name">{file.name}</span>
                <span className="search-file-path">{file.path}</span>
                <span className="search-count-pill">{matches.length}</span>
              </div>

              {!isCollapsed && (
                <div className="search-matches-list">
                  {matches.map((m, mIdx) => (
                    <div
                      key={mIdx}
                      className="search-match-item"
                      onClick={() => handleMatchClick(file, m)}
                    >
                      <span className="search-match-line-num">{m.lineNumber}</span>
                      <span className="search-match-preview">
                        {m.lineText}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

export default Search;
