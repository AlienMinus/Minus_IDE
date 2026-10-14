import "./Terminal.css";
import { useEffect, useRef, useState } from "react";
import { Terminal as XtermTerminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { SearchAddon } from "@xterm/addon-search";
import "@xterm/xterm/css/xterm.css";
import useTerminal from "../../hooks/useTerminal";
import useEditor from "../../hooks/useEditor";
import TerminalDropdownMenu from "./TerminalDropdownMenu";
import {
  FaPlay,
  FaTrash,
  FaPlus,
  FaCheckCircle,
  FaSpinner,
  FaTimes,
  FaColumns,
  FaStop,
  FaTrashAlt,
  FaGlobe,
  FaChevronDown
} from "react-icons/fa";

function TerminalComponent({ hideToolbar = false }) {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);

  const splitTerminalRef = useRef(null);
  const splitXtermRef = useRef(null);
  const splitFitAddonRef = useRef(null);

  const {
    activeTerminal,
    terminals,
    createTerminal,
    executeCommand,
    runActiveFile,
    killTerminal,
    terminateTask,
    splitTerminal,
    isSplit,
    isRunning,
    setActiveTerminal
  } = useTerminal();

  const { openLiveBrowserTab } = useEditor();

  const executeCommandRef = useRef(executeCommand);
  executeCommandRef.current = executeCommand;
  const terminateTaskRef = useRef(terminateTask);
  terminateTaskRef.current = terminateTask;
  const openLiveBrowserTabRef = useRef(openLiveBrowserTab);
  openLiveBrowserTabRef.current = openLiveBrowserTab;

  const splitSession = isSplit
    ? (terminals.find(t => t.title?.includes('(Split)')) || (terminals.length > 1 ? terminals[terminals.length - 1] : null))
    : null;
  const mainSession = isSplit
    ? (terminals.find(t => t.id !== splitSession?.id) || terminals[0])
    : activeTerminal;

  const splitSessionRef = useRef(splitSession);
  splitSessionRef.current = splitSession;
  const mainSessionRef = useRef(mainSession);
  mainSessionRef.current = mainSession;

  const activeTerminalRef = useRef(activeTerminal);
  activeTerminalRef.current = activeTerminal;

  const currentCommand = useRef("");
  const outputLines = useRef(0);
  const historyIndex = useRef(-1);
  const lastTerminalId = useRef(mainSession?.id);

  const splitCurrentCommand = useRef("");
  const splitOutputLines = useRef(0);
  const splitHistoryIndex = useRef(-1);
  const lastSplitTerminalId = useRef(splitSession?.id);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownAnchorRef = useRef(null);

  const [splitRatio, setSplitRatio] = useState(50);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const splitWrapperRef = useRef(null);
  const isDraggingRef = useRef(false);

  // Global Terminal Shortcuts (Ctrl+Shift+`, Ctrl+Shift+5, Ctrl+Shift+Alt+`)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Shift+` -> New Terminal
      if (e.ctrlKey && e.shiftKey && !e.altKey && (e.key === '`' || e.code === 'Backquote')) {
        e.preventDefault();
        createTerminal();
      }
      // Ctrl+Shift+Alt+` -> New Terminal Window
      else if (e.ctrlKey && e.shiftKey && e.altKey && (e.key === '`' || e.code === 'Backquote')) {
        e.preventDefault();
        createTerminal();
      }
      // Ctrl+Shift+5 -> Split Terminal
      else if (e.ctrlKey && e.shiftKey && (e.key === '%' || e.key === '5' || e.code === 'Digit5')) {
        e.preventDefault();
        splitTerminal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createTerminal, splitTerminal]);

  // Handle separator dragging between split panes
  const handleResizerMouseDown = (e) => {
    e.preventDefault();
    isDraggingRef.current = true;
    setIsDraggingSplit(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent) => {
      if (!isDraggingRef.current || !splitWrapperRef.current) return;
      const rect = splitWrapperRef.current.getBoundingClientRect();
      const offsetX = moveEvent.clientX - rect.left;
      const percentage = (offsetX / rect.width) * 100;
      const clamped = Math.min(Math.max(percentage, 15), 85);
      setSplitRatio(clamped);

      requestAnimationFrame(() => {
        try { fitAddonRef.current?.fit(); } catch {}
        try { splitFitAddonRef.current?.fit(); } catch {}
      });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      setIsDraggingSplit(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setTimeout(() => {
        try { fitAddonRef.current?.fit(); } catch {}
        try { splitFitAddonRef.current?.fit(); } catch {}
      }, 40);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleResizerDoubleClick = () => {
    setSplitRatio(50);
    setTimeout(() => {
      try { fitAddonRef.current?.fit(); } catch {}
      try { splitFitAddonRef.current?.fit(); } catch {}
    }, 40);
  };

  // Initialize main xterm
  useEffect(() => {
    if (!terminalRef.current) return;

    if (!xtermRef.current) {
      const terminal = new XtermTerminal({
        cursorBlink: true,
        cursorStyle: "block",
        fontSize: 14,
        fontFamily: "'Cascadia Code', Consolas, 'Fira Code', monospace",
        lineHeight: 1.25,
        theme: {
          background: "#181818",
          foreground: "#d4d4d4",
          cursor: "#ffffff",
          selectionBackground: "#264f78",
          black: "#1e1e1e",
          brightBlack: "#808080",
          red: "#f44747",
          brightRed: "#f44747",
          green: "#6a9955",
          brightGreen: "#b5cea8",
          yellow: "#dcdcaa",
          brightYellow: "#d7ba7d",
          blue: "#569cd6",
          brightBlue: "#9cdcfe",
          magenta: "#c586c0",
          brightMagenta: "#d16969",
          cyan: "#4ec9b0",
          brightCyan: "#4fc1ff",
          white: "#d4d4d4",
          brightWhite: "#ffffff"
        },
      });

      const fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);
      const webLinksAddon = new WebLinksAddon((event, uri) => {
        if (uri.includes('localhost') || uri.includes('127.0.0.1') || uri.includes('0.0.0.0')) {
          event?.preventDefault?.();
          const clean = uri.replace('0.0.0.0', 'localhost');
          if (openLiveBrowserTabRef.current) {
            openLiveBrowserTabRef.current(clean, `Preview: ${clean}`);
            return;
          }
        }
        window.open(uri, '_blank', 'noopener,noreferrer');
      });
      terminal.loadAddon(webLinksAddon);
      terminal.loadAddon(new SearchAddon());

      terminal.open(terminalRef.current);
      fitAddon.fit();

      xtermRef.current = terminal;
      fitAddonRef.current = fitAddon;

      const resizeObserver = new ResizeObserver(() => {
        try {
          fitAddon.fit();
        } catch {}
      });
      resizeObserver.observe(terminalRef.current);

      // Keyboard navigation and shortcuts for main terminal
      terminal.onKey(({ domEvent }) => {
        const term = xtermRef.current;
        if (!term) return;

        const currentPrompt = mainSessionRef.current?.replState?.prompt || '$ ';

        // Ctrl+C (Interrupt / Cancel)
        if (domEvent.ctrlKey && domEvent.key.toLowerCase() === 'c') {
          domEvent.preventDefault();
          term.write('^C\r\n' + currentPrompt);
          currentCommand.current = "";
          historyIndex.current = -1;
          terminateTaskRef.current();
          return;
        }

        // Ctrl+L (Clear screen)
        if (domEvent.ctrlKey && domEvent.key.toLowerCase() === 'l') {
          domEvent.preventDefault();
          if (mainSessionRef.current) {
            executeCommandRef.current('clear', mainSessionRef.current.id);
          }
          currentCommand.current = "";
          historyIndex.current = -1;
          return;
        }

        // Arrow Up (Recall previous commands)
        if (domEvent.key === 'ArrowUp') {
          domEvent.preventDefault();
          const history = mainSessionRef.current?.history || [];
          if (history.length === 0) return;

          let newIdx;
          if (historyIndex.current === -1) {
            newIdx = history.length - 1;
          } else if (historyIndex.current > 0) {
            newIdx = historyIndex.current - 1;
          } else {
            newIdx = 0;
          }

          historyIndex.current = newIdx;
          const cmd = history[newIdx] || "";
          term.write('\x1b[2K\r' + currentPrompt + cmd);
          currentCommand.current = cmd;
          return;
        }

        // Arrow Down (Recall next commands)
        else if (domEvent.key === 'ArrowDown') {
          domEvent.preventDefault();
          const history = mainSessionRef.current?.history || [];
          if (history.length === 0 || historyIndex.current === -1) return;

          if (historyIndex.current < history.length - 1) {
            historyIndex.current++;
            const cmd = history[historyIndex.current] || "";
            term.write('\x1b[2K\r' + currentPrompt + cmd);
            currentCommand.current = cmd;
          } else {
            historyIndex.current = -1;
            term.write('\x1b[2K\r' + currentPrompt);
            currentCommand.current = "";
          }
          return;
        }
      });

      // Data handler for main terminal
      terminal.onData((data) => {
        const term = xtermRef.current;
        if (!term) return;

        if (mainSessionRef.current && activeTerminalRef.current?.id !== mainSessionRef.current.id) {
          setActiveTerminal(mainSessionRef.current);
        }

        if (data === "\r") {
          const toExecute = currentCommand.current;
          currentCommand.current = "";
          historyIndex.current = -1;
          const currentPrompt = mainSessionRef.current?.replState?.prompt || '$ ';
          if (!toExecute.trim() && !mainSessionRef.current?.replState?.isMultiLine) {
            term.write('\r\n' + currentPrompt);
            outputLines.current += 1;
            if (mainSessionRef.current) {
              executeCommandRef.current("", mainSessionRef.current.id);
            }
            return;
          }
          term.write('\r\n');
          // Advance outputLines by 1 so the command echo in activeTerminal.output is not printed twice!
          outputLines.current += 1;
          if (mainSessionRef.current) {
            executeCommandRef.current(toExecute, mainSessionRef.current.id);
          }
        } else if (data === "\x7f" || data === "\b") {
          if (currentCommand.current.length > 0) {
            term.write("\b \b");
            currentCommand.current = currentCommand.current.slice(0, -1);
          }
        } else if (data === "\t") {
          const partial = currentCommand.current.toLowerCase();
          const suggestions = ['run', 'runtimes', 'c', 'python', 'node', 'bash', 'react', 'gcc', 'ls', 'cat', 'clear', 'help', 'kill', 'pwd', 'cd'];
          const match = suggestions.find(s => s.startsWith(partial) && s !== partial);
          if (match) {
            const added = match.slice(partial.length);
            currentCommand.current += added;
            term.write(added);
          }
        } else if (data.length > 0 && !data.includes('\x1b')) {
          currentCommand.current += data;
          term.write(data);
        }
      });
    }
  }, [executeCommand, terminateTask]);

  // Synchronize main terminal output buffer
  useEffect(() => {
    const term = xtermRef.current;
    if (!term || !mainSession) return;

    const isPromptLine = (str) => /(?:\$ |>>> |\.\.\. |> |cypher> |agent> )$/.test(str);

    const writeOutput = (lines) => {
      lines.forEach((line, index) => {
        const formatted = String(line).replace(/\r?\n/g, '\r\n');
        if (index === lines.length - 1 && isPromptLine(formatted)) {
          term.write(formatted);
        } else {
          term.writeln(formatted);
        }
      });
    };

    if (lastTerminalId.current !== mainSession.id) {
      lastTerminalId.current = mainSession.id;
      term.reset();
      writeOutput(mainSession.output);
      outputLines.current = mainSession.output.length;
      return;
    }

    if (mainSession.output.length > outputLines.current) {
      const newLines = mainSession.output.slice(outputLines.current);
      writeOutput(newLines);
      outputLines.current = mainSession.output.length;
    } else if (mainSession.output.length < outputLines.current) {
      term.reset();
      writeOutput(mainSession.output);
      outputLines.current = mainSession.output.length;
    }
  }, [mainSession, mainSession?.output]);

  // Secondary split terminal initialization & interaction
  useEffect(() => {
    if (!isSplit) {
      if (splitXtermRef.current) {
        try { splitXtermRef.current.dispose(); } catch {}
        splitXtermRef.current = null;
        splitFitAddonRef.current = null;
        splitOutputLines.current = 0;
        splitCurrentCommand.current = "";
        lastSplitTerminalId.current = null;
      }
      return;
    }

    if (!splitTerminalRef.current) return;

    if (!splitXtermRef.current) {
      const splitTerm = new XtermTerminal({
        cursorBlink: true,
        cursorStyle: "block",
        fontSize: 14,
        fontFamily: "'Cascadia Code', Consolas, 'Fira Code', monospace",
        lineHeight: 1.25,
        theme: {
          background: "#181818",
          foreground: "#d4d4d4",
          cursor: "#ffffff",
          selectionBackground: "#264f78",
          black: "#1e1e1e",
          brightBlack: "#808080",
          red: "#f44747",
          brightRed: "#f44747",
          green: "#6a9955",
          brightGreen: "#b5cea8",
          yellow: "#dcdcaa",
          brightYellow: "#d7ba7d",
          blue: "#569cd6",
          brightBlue: "#9cdcfe",
          magenta: "#c586c0",
          brightMagenta: "#d16969",
          cyan: "#4ec9b0",
          brightCyan: "#4fc1ff",
          white: "#d4d4d4",
          brightWhite: "#ffffff"
        }
      });
      const splitFit = new FitAddon();
      splitTerm.loadAddon(splitFit);
      const splitWebLinks = new WebLinksAddon((event, uri) => {
        if (uri.includes('localhost') || uri.includes('127.0.0.1') || uri.includes('0.0.0.0')) {
          event?.preventDefault?.();
          const clean = uri.replace('0.0.0.0', 'localhost');
          if (openLiveBrowserTabRef.current) {
            openLiveBrowserTabRef.current(clean, `Preview: ${clean}`);
            return;
          }
        }
        window.open(uri, '_blank', 'noopener,noreferrer');
      });
      splitTerm.loadAddon(splitWebLinks);
      splitTerm.loadAddon(new SearchAddon());

      splitTerm.open(splitTerminalRef.current);
      splitFit.fit();

      splitXtermRef.current = splitTerm;
      splitFitAddonRef.current = splitFit;

      const resizeObserver = new ResizeObserver(() => {
        try {
          splitFit.fit();
        } catch {}
      });
      resizeObserver.observe(splitTerminalRef.current);

      // Keyboard navigation & shortcuts for split terminal
      splitTerm.onKey(({ domEvent }) => {
        const term = splitXtermRef.current;
        if (!term) return;

        const currentPrompt = splitSessionRef.current?.replState?.prompt || '$ ';

        // Ctrl+C (Interrupt / Cancel)
        if (domEvent.ctrlKey && domEvent.key.toLowerCase() === 'c') {
          domEvent.preventDefault();
          term.write('^C\r\n' + currentPrompt);
          splitCurrentCommand.current = "";
          splitHistoryIndex.current = -1;
          terminateTaskRef.current();
          return;
        }

        // Ctrl+L (Clear screen)
        if (domEvent.ctrlKey && domEvent.key.toLowerCase() === 'l') {
          domEvent.preventDefault();
          if (splitSessionRef.current) {
            executeCommandRef.current('clear', splitSessionRef.current.id);
          }
          splitCurrentCommand.current = "";
          splitHistoryIndex.current = -1;
          return;
        }

        // Arrow Up (Recall previous commands)
        if (domEvent.key === 'ArrowUp') {
          domEvent.preventDefault();
          const history = splitSessionRef.current?.history || [];
          if (history.length === 0) return;

          let newIdx;
          if (splitHistoryIndex.current === -1) {
            newIdx = history.length - 1;
          } else if (splitHistoryIndex.current > 0) {
            newIdx = splitHistoryIndex.current - 1;
          } else {
            newIdx = 0;
          }

          splitHistoryIndex.current = newIdx;
          const cmd = history[newIdx] || "";
          term.write('\x1b[2K\r' + currentPrompt + cmd);
          splitCurrentCommand.current = cmd;
          return;
        }

        // Arrow Down (Recall next commands)
        else if (domEvent.key === 'ArrowDown') {
          domEvent.preventDefault();
          const history = splitSessionRef.current?.history || [];
          if (history.length === 0 || splitHistoryIndex.current === -1) return;

          if (splitHistoryIndex.current < history.length - 1) {
            splitHistoryIndex.current++;
            const cmd = history[splitHistoryIndex.current] || "";
            term.write('\x1b[2K\r' + currentPrompt + cmd);
            splitCurrentCommand.current = cmd;
          } else {
            splitHistoryIndex.current = -1;
            term.write('\x1b[2K\r' + currentPrompt);
            splitCurrentCommand.current = "";
          }
          return;
        }
      });

      // Data handler for split terminal typing
      splitTerm.onData((data) => {
        const term = splitXtermRef.current;
        if (!term) return;

        if (splitSessionRef.current && activeTerminalRef.current?.id !== splitSessionRef.current.id) {
          setActiveTerminal(splitSessionRef.current);
        }

        if (data === "\r") {
          const toExecute = splitCurrentCommand.current;
          splitCurrentCommand.current = "";
          splitHistoryIndex.current = -1;
          const currentPrompt = splitSessionRef.current?.replState?.prompt || '$ ';

          if (!toExecute.trim() && !splitSessionRef.current?.replState?.isMultiLine) {
            term.write('\r\n' + currentPrompt);
            splitOutputLines.current += 1;
            if (splitSessionRef.current) {
              executeCommandRef.current("", splitSessionRef.current.id);
            }
            return;
          }

          term.write('\r\n');
          splitOutputLines.current += 1;
          if (splitSessionRef.current) {
            executeCommandRef.current(toExecute, splitSessionRef.current.id);
          }
        } else if (data === "\x7f" || data === "\b") {
          if (splitCurrentCommand.current.length > 0) {
            term.write("\b \b");
            splitCurrentCommand.current = splitCurrentCommand.current.slice(0, -1);
          }
        } else if (data === "\t") {
          const partial = splitCurrentCommand.current.toLowerCase();
          const suggestions = ['run', 'runtimes', 'c', 'python', 'node', 'bash', 'react', 'gcc', 'ls', 'cat', 'clear', 'help', 'kill', 'pwd', 'cd'];
          const match = suggestions.find(s => s.startsWith(partial) && s !== partial);
          if (match) {
            const added = match.slice(partial.length);
            splitCurrentCommand.current += added;
            term.write(added);
          }
        } else if (data.length > 0 && !data.includes('\x1b')) {
          splitCurrentCommand.current += data;
          term.write(data);
        }
      });

      splitOutputLines.current = 0;

      setTimeout(() => {
        try { splitTerm.focus(); } catch {}
      }, 50);
    }
  }, [isSplit]);

  // Synchronize split terminal output buffer
  useEffect(() => {
    const term = splitXtermRef.current;
    if (!term || !splitSession || !isSplit) return;

    const isPromptLine = (str) => /(?:\$ |>>> |\.\.\. |> |cypher> |agent> )$/.test(str);

    const writeSplitOutput = (lines) => {
      lines.forEach((line, index) => {
        const formatted = String(line).replace(/\r?\n/g, '\r\n');
        if (index === lines.length - 1 && isPromptLine(formatted)) {
          term.write(formatted);
        } else {
          term.writeln(formatted);
        }
      });
    };

    if (lastSplitTerminalId.current !== splitSession.id) {
      lastSplitTerminalId.current = splitSession.id;
      term.reset();
      writeSplitOutput(splitSession.output);
      splitOutputLines.current = splitSession.output.length;
      return;
    }

    if (splitSession.output.length > splitOutputLines.current) {
      const newLines = splitSession.output.slice(splitOutputLines.current);
      writeSplitOutput(newLines);
      splitOutputLines.current = splitSession.output.length;
    } else if (splitSession.output.length < splitOutputLines.current) {
      term.reset();
      writeSplitOutput(splitSession.output);
      splitOutputLines.current = splitSession.output.length;
    }
  }, [splitSession, splitSession?.output, isSplit]);

  return (
    <div className="terminal-container">
      {!hideToolbar && (
        <div className="terminal-toolbar">
          <div className="terminal-toolbar-left">
            <div className="terminal-tabs-header">
              {terminals.map(t => (
                <div
                  key={t.id}
                  className={`terminal-tab-item ${activeTerminal?.id === t.id ? 'active' : ''}`}
                  onClick={() => setActiveTerminal(t)}
                >
                  {t.title?.includes('(Split)') && <FaColumns style={{ fontSize: '10px', marginRight: '4px' }} />}
                  <span>{t.title}</span>
                  <span
                    className="terminal-tab-kill"
                    onClick={(e) => {
                      e.stopPropagation();
                      killTerminal(t.id);
                    }}
                    title="Kill Terminal"
                  >
                    <FaTimes />
                  </span>
                </div>
              ))}
              <div className="term-add-dropdown-container" ref={dropdownAnchorRef}>
                <div className="term-add-split-btn">
                  <button
                    className="terminal-add-btn"
                    onClick={() => createTerminal()}
                    title="New Terminal (Ctrl+Shift+`)"
                  >
                    <FaPlus />
                  </button>
                  <button
                    className={`terminal-add-btn term-add-chevron ${isDropdownOpen ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDropdownOpen(prev => !prev);
                    }}
                    title="Terminal Profiles & Options"
                  >
                    <FaChevronDown style={{ fontSize: '9px' }} />
                  </button>
                </div>
                <TerminalDropdownMenu
                  isOpen={isDropdownOpen}
                  onClose={() => setIsDropdownOpen(false)}
                  anchorRef={dropdownAnchorRef}
                />
              </div>
              {activeTerminal?.cwd && (
                <span className="terminal-cwd-badge" title={`Working Directory: ${activeTerminal.cwd}`}>
                  📁 {activeTerminal.cwd}
                </span>
              )}
            </div>
          </div>

          <div className="terminal-toolbar-right">
            {activeTerminal?.replState?.active ? (
              <span
                className="sandbox-status-badge repl-active"
                style={{ background: '#0e639c', color: '#fff' }}
                title={`Active ${activeTerminal.replState.runtime.toUpperCase()} REPL. Type exit() or .exit to return.`}
              >
                <FaCheckCircle /> {activeTerminal.replState.runtime.toUpperCase()} REPL
              </span>
            ) : isRunning ? (
              <span className="sandbox-status-badge running">
                <FaSpinner className="spin-icon" /> RUNNING
              </span>
            ) : (
              <span className="sandbox-status-badge active" title="MinGW GCC, Python 3.12, Node.js, Bash & React ready">
                <FaCheckCircle /> SANDBOX ONLINE
              </span>
            )}

            <button
              className="term-action-btn run-action-btn"
              onClick={() => runActiveFile()}
              disabled={isRunning}
              title="Run Active File (F5)"
              aria-label="Run Active File"
            >
              <FaPlay className="action-icon" />
            </button>

            {isRunning && (
              <button
                className="term-action-btn stop-action-btn"
                onClick={terminateTask}
                title="Terminate Running Process (Ctrl+C)"
                aria-label="Terminate Process"
              >
                <FaStop className="action-icon" />
              </button>
            )}

            <button
              className="term-action-btn"
              onClick={() => splitTerminal()}
              title="Split Terminal Side by Side (Ctrl+Shift+5)"
              aria-label="Split Terminal"
            >
              <FaColumns className="action-icon" />
            </button>

            <button
              className="term-action-btn kill-btn"
              onClick={() => killTerminal(activeTerminal?.id)}
              title="Kill Terminal Session"
              aria-label="Kill Terminal"
            >
              <FaTrashAlt className="action-icon" />
            </button>

            <button
              className="term-action-btn"
              onClick={() => executeCommand('clear')}
              title="Clear Terminal Screen (Ctrl+L)"
              aria-label="Clear Terminal Screen"
            >
              <FaTrash className="action-icon" />
            </button>
          </div>
        </div>
      )}

      <div
        ref={splitWrapperRef}
        className={`terminal-body-split-wrapper ${isSplit ? 'split' : ''} ${isDraggingSplit ? 'resizing' : ''}`}
      >
        <div
          ref={terminalRef}
          className={`terminal main-pane ${activeTerminal?.id === mainSession?.id ? 'active-focus' : ''}`}
          style={isSplit ? { width: `${splitRatio}%`, flex: 'none' } : { width: '100%', flex: '1' }}
          onClick={() => {
            if (mainSession) setActiveTerminal(mainSession);
            xtermRef.current?.focus();
          }}
        />
        {isSplit && (
          <>
            <div
              className="terminal-split-resizer"
              onMouseDown={handleResizerMouseDown}
              onDoubleClick={handleResizerDoubleClick}
              title="Drag to adjust split widths. Double-click to reset (50/50)."
            />
            <div
              className={`split-pane-container ${activeTerminal?.id === splitSession?.id ? 'active-focus' : ''}`}
              style={{ width: `calc(${100 - splitRatio}% - 5px)`, flex: 'none' }}
              onClick={() => {
                if (splitSession) setActiveTerminal(splitSession);
                splitXtermRef.current?.focus();
              }}
            >
              <div ref={splitTerminalRef} className="terminal split-pane" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default TerminalComponent;