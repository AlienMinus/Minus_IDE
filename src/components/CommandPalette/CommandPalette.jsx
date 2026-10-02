import React, { useState, useEffect, useRef } from "react";
import { FaSearch, FaTimes } from "react-icons/fa";
import "./CommandPalette.css";

export default function CommandPalette({
  isOpen,
  onClose,
  mode = "commands", // "commands" | "views"
  commands = [],
  onExecute
}) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
    }
  }, [isOpen, mode]);

  const filteredCommands = commands.filter((cmd) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      cmd.label.toLowerCase().includes(q) ||
      (cmd.description && cmd.description.toLowerCase().includes(q)) ||
      (cmd.category && cmd.category.toLowerCase().includes(q))
    );
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector(".palette-item.selected");
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(filteredCommands.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(filteredCommands.length, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        executeItem(filteredCommands[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const executeItem = (item) => {
    onClose();
    if (item.action) {
      item.action();
    } else if (onExecute) {
      onExecute(item);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="palette-backdrop" onClick={onClose}>
      <div className="palette-container" onClick={(e) => e.stopPropagation()}>
        <div className="palette-input-wrapper">
          <FaSearch className="palette-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="palette-input"
            placeholder={
              mode === "views"
                ? "Open View... (e.g. Explorer, Terminal, Problems)"
                : "> Type a command to run..."
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {query && (
            <button className="palette-clear-btn" onClick={() => setQuery("")}>
              <FaTimes />
            </button>
          )}
        </div>

        <div className="palette-list" ref={listRef}>
          {filteredCommands.length === 0 ? (
            <div className="palette-empty">No matching commands found.</div>
          ) : (
            filteredCommands.map((item, idx) => (
              <div
                key={item.id || idx}
                className={`palette-item ${selectedIndex === idx ? "selected" : ""}`}
                onClick={() => executeItem(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div className="palette-item-left">
                  {item.category && (
                    <span className="palette-item-category">{item.category}:</span>
                  )}
                  <span className="palette-item-label">{item.label}</span>
                  {item.description && (
                    <span className="palette-item-desc">{item.description}</span>
                  )}
                </div>
                {item.shortcut && (
                  <span className="palette-item-shortcut">{item.shortcut}</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
