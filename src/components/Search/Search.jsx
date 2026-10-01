import React, { useState, useMemo, useEffect, useRef } from "react";
import useEditor from "../../hooks/useEditor";
import { getFileIcon } from "../../utils/fileIcons";
import {
  FaSearch,
  FaChevronRight,
  FaChevronDown,
  FaTimes,
  FaRedo,
  FaCheck
} from "react-icons/fa";
import { VscReplace, VscReplaceAll, VscRegex, VscWholeWord } from "react-icons/vsc";
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
  const [collapsedFiles, setCollapsedFiles] = useState({});
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Compute search matches across files
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

    const results = [];

    files.forEach((file) => {
      if (!file.content || typeof file.content !== "string") return;

      const lines = file.content.split("\n");
      const fileMatches = [];

      lines.forEach((lineText, lineIdx) => {
        let match;
        // reset regex lastIndex
        regex.lastIndex = 0;
        while ((match = regex.exec(lineText)) !== null) {
          fileMatches.push({
            lineNumber: lineIdx + 1,
            column: match.index + 1,
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
  }, [files, searchQuery, matchCase, matchWholeWord, useRegex]);

  const totalMatchesCount = useMemo(() => {
    return searchResults.reduce((acc, curr) => acc + curr.matches.length, 0);
  }, [searchResults]);

  const toggleFileCollapse = (fileId) => {
    setCollapsedFiles((prev) => ({ ...prev, [fileId]: !prev[fileId] }));
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
      <div className="search-panel-header">
        <span className="search-panel-title">SEARCH</span>
      </div>

      <div className="search-inputs-area">
        {/* Search Input Row */}
        <div className="search-input-row">
          <button
            className={`search-expand-toggle ${isReplaceOpen ? "expanded" : ""}`}
            onClick={() => setIsReplaceOpen((prev) => !prev)}
            title="Toggle Replace"
          >
            {isReplaceOpen ? <FaChevronDown /> : <FaChevronRight />}
          </button>

          <div className="search-field-wrapper">
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
                <span className="mod-text">Aa</span>
              </button>
              <button
                className={`search-mod-btn ${matchWholeWord ? "active" : ""}`}
                onClick={() => setMatchWholeWord((v) => !v)}
                title="Match Whole Word (Alt+W)"
              >
                <VscWholeWord />
              </button>
              <button
                className={`search-mod-btn ${useRegex ? "active" : ""}`}
                onClick={() => setUseRegex((v) => !v)}
                title="Use Regular Expression (Alt+R)"
              >
                <VscRegex />
              </button>
            </div>
          </div>
        </div>

        {/* Replace Input Row */}
        {isReplaceOpen && (
          <div className="search-input-row replace-row">
            <div className="replace-spacer" />
            <div className="search-field-wrapper">
              <input
                type="text"
                className="search-field-input"
                value={replaceQuery || ""}
                onChange={(e) => setReplaceQuery(e.target.value)}
                placeholder="Replace"
              />
              <div className="search-modifiers">
                <button
                  className="search-mod-btn"
                  onClick={handleReplaceAll}
                  title="Replace All (Ctrl+Alt+Enter)"
                  disabled={!searchQuery || searchResults.length === 0}
                >
                  <VscReplaceAll />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results summary message */}
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

      {/* Results Tree */}
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
                      <span className="search-match-preview">{m.lineText}</span>
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
