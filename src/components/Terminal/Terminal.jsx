import "./Terminal.css";
import { useEffect, useRef } from "react";
import { Terminal as XtermTerminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { SearchAddon } from "@xterm/addon-search";
import "@xterm/xterm/css/xterm.css";
import useTerminal from "../../hooks/useTerminal";
import {
  FaPlay,
  FaTrash,
  FaPlus,
  FaCheckCircle,
  FaSpinner,
  FaTimes,
  FaColumns,
  FaStop,
  FaTrashAlt
} from "react-icons/fa";

function TerminalComponent() {
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

  const activeTerminalRef = useRef(activeTerminal);
  activeTerminalRef.current = activeTerminal;

  const currentCommand = useRef("");
  const outputLines = useRef(0);
  const historyIndex = useRef(-1);
  const lastTerminalId = useRef(activeTerminal?.id);

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
      terminal.loadAddon(new WebLinksAddon());
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

      // Keyboard navigation and shortcuts
      terminal.onKey(({ domEvent }) => {
        const term = xtermRef.current;
        if (!term) return;

        const currentPrompt = activeTerminalRef.current?.replState?.prompt || '$ ';

        // Ctrl+C (Interrupt / Cancel)
        if (domEvent.ctrlKey && domEvent.key.toLowerCase() === 'c') {
          domEvent.preventDefault();
          term.write('^C\r\n' + currentPrompt);
          currentCommand.current = "";
          historyIndex.current = -1;
          terminateTask();
          return;
        }

        // Ctrl+L (Clear screen)
        if (domEvent.ctrlKey && domEvent.key.toLowerCase() === 'l') {
          domEvent.preventDefault();
          executeCommand('clear');
          currentCommand.current = "";
          historyIndex.current = -1;
          return;
        }

        // Arrow Up (Recall previous commands)
        if (domEvent.key === 'ArrowUp') {
          domEvent.preventDefault();
          const history = activeTerminalRef.current?.history || [];
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
          const history = activeTerminalRef.current?.history || [];
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

      // Data handler
      terminal.onData((data) => {
        const term = xtermRef.current;
        if (!term) return;

        if (data === "\r") {
          const toExecute = currentCommand.current;
          currentCommand.current = "";
          historyIndex.current = -1;
          const currentPrompt = activeTerminalRef.current?.replState?.prompt || '$ ';
          if (!toExecute.trim() && !activeTerminalRef.current?.replState?.isMultiLine) {
            term.write('\r\n' + currentPrompt);
            outputLines.current += 1;
            executeCommand("");
            return;
          }
          term.write('\r\n');
          // Advance outputLines by 1 so the command echo in activeTerminal.output is not printed twice!
          outputLines.current += 1;
          executeCommand(toExecute);
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

  // Synchronize terminal output buffer
  useEffect(() => {
    const term = xtermRef.current;
    if (!term || !activeTerminal) return;

    const writeOutput = (lines) => {
      lines.forEach((line, index) => {
        const formatted = String(line).replace(/\r?\n/g, '\r\n');
        const isPromptLine = index === lines.length - 1 && (
          formatted.endsWith('$ ') ||
          formatted.endsWith('>>> ') ||
          formatted.endsWith('... ') ||
          formatted.endsWith('> ')
        );
        if (isPromptLine) {
          term.write(formatted);
        } else {
          term.writeln(formatted);
        }
      });
    };

    if (lastTerminalId.current !== activeTerminal.id) {
      lastTerminalId.current = activeTerminal.id;
      term.clear();
      writeOutput(activeTerminal.output);
      outputLines.current = activeTerminal.output.length;
      return;
    }

    if (activeTerminal.output.length > outputLines.current) {
      const newLines = activeTerminal.output.slice(outputLines.current);
      writeOutput(newLines);
      outputLines.current = activeTerminal.output.length;
    } else if (activeTerminal.output.length < outputLines.current) {
      term.clear();
      writeOutput(activeTerminal.output);
      outputLines.current = activeTerminal.output.length;
    }
  }, [activeTerminal, activeTerminal?.output]);

  // Secondary split terminal initialization
  useEffect(() => {
    if (!isSplit || !splitTerminalRef.current) return;

    if (!splitXtermRef.current) {
      const splitTerm = new XtermTerminal({
        cursorBlink: true,
        fontSize: 13,
        fontFamily: "'Cascadia Code', Consolas, monospace",
        theme: {
          background: "#161616",
          foreground: "#cccccc",
          cursor: "#ffffff"
        }
      });
      const splitFit = new FitAddon();
      splitTerm.loadAddon(splitFit);
      splitTerm.open(splitTerminalRef.current);
      splitFit.fit();
      splitXtermRef.current = splitTerm;
      splitFitAddonRef.current = splitFit;

      splitTerm.writeln("\x1b[36m[Split Pane Active]\x1b[0m");
      splitTerm.write("$ ");
    }
  }, [isSplit]);

  return (
    <div className="terminal-container">
      <div className="terminal-toolbar">
        <div className="terminal-toolbar-left">
          <div className="terminal-tabs-header">
            {terminals.map(t => (
              <div
                key={t.id}
                className={`terminal-tab-item ${activeTerminal?.id === t.id ? 'active' : ''}`}
                onClick={() => setActiveTerminal(t)}
              >
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
            <button className="terminal-add-btn" onClick={createTerminal} title="New Terminal (Ctrl+Shift+`)">
              <FaPlus />
            </button>
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
            title="Execute Active File in Sandbox (F5)"
          >
            <FaPlay className="action-icon" /> Run Active File
          </button>

          {isRunning && (
            <button
              className="term-action-btn stop-action-btn"
              onClick={terminateTask}
              title="Terminate Running Process (Ctrl+C)"
            >
              <FaStop className="action-icon" /> Stop
            </button>
          )}

          <button
            className="term-action-btn"
            onClick={splitTerminal}
            title="Split Terminal Side by Side (Ctrl+Shift+5)"
          >
            <FaColumns className="action-icon" /> Split
          </button>

          <button
            className="term-action-btn kill-btn"
            onClick={() => killTerminal(activeTerminal?.id)}
            title="Kill Terminal Session"
          >
            <FaTrashAlt className="action-icon" /> Kill Terminal
          </button>

          <button
            className="term-action-btn"
            onClick={() => executeCommand('clear')}
            title="Clear Terminal Screen (Ctrl+L)"
          >
            <FaTrash className="action-icon" /> Clear
          </button>
        </div>
      </div>

      <div className={`terminal-body-split-wrapper ${isSplit ? 'split' : ''}`}>
        <div ref={terminalRef} className="terminal main-pane" />
        {isSplit && (
          <div className="split-pane-container">
            <div ref={splitTerminalRef} className="terminal split-pane" />
          </div>
        )}
      </div>
    </div>
  );
}

export default TerminalComponent;