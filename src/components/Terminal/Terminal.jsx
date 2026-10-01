import "./Terminal.css";
import { useEffect, useRef } from "react";
import { Terminal as XtermTerminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { SearchAddon } from "@xterm/addon-search";
import "@xterm/xterm/css/xterm.css";
import useTerminal from "../../hooks/useTerminal";
import { FaPlay, FaTrash, FaPlus, FaCheckCircle, FaSpinner } from "react-icons/fa";

function TerminalComponent() {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const {
    activeTerminal,
    terminals,
    createTerminal,
    executeCommand,
    runActiveFile,
    isRunning,
    setActiveTerminal
  } = useTerminal();

  const currentCommand = useRef("");
  const outputLines = useRef(0);
  const historyIndex = useRef(0);

  // Initialize xterm
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
        } catch {
          // Ignore resize errors when unmounted
        }
      });
      resizeObserver.observe(terminalRef.current);

      // Keyboard navigation and shortcuts
      terminal.onKey(({ key, domEvent }) => {
        const term = xtermRef.current;
        if (!term || !activeTerminal) return;

        // Ctrl+C (Interrupt / Cancel)
        if (domEvent.ctrlKey && domEvent.key.toLowerCase() === 'c') {
          domEvent.preventDefault();
          term.write('^C\r\n$ ');
          currentCommand.current = "";
          return;
        }

        // Ctrl+L (Clear screen)
        if (domEvent.ctrlKey && domEvent.key.toLowerCase() === 'l') {
          domEvent.preventDefault();
          executeCommand('clear');
          currentCommand.current = "";
          return;
        }

        // Arrow Up (History backward)
        if (domEvent.key === 'ArrowUp') {
          domEvent.preventDefault();
          if (activeTerminal.history && historyIndex.current > 0) {
            historyIndex.current--;
            const command = activeTerminal.history[historyIndex.current] || "";
            term.write('\x1b[2K\r$ ' + command);
            currentCommand.current = command;
          }
        }
        // Arrow Down (History forward)
        else if (domEvent.key === 'ArrowDown') {
          domEvent.preventDefault();
          if (activeTerminal.history && historyIndex.current < activeTerminal.history.length - 1) {
            historyIndex.current++;
            const command = activeTerminal.history[historyIndex.current] || "";
            term.write('\x1b[2K\r$ ' + command);
            currentCommand.current = command;
          } else if (activeTerminal.history) {
            historyIndex.current = activeTerminal.history.length;
            term.write('\x1b[2K\r$ ');
            currentCommand.current = "";
          }
        }
      });

      // Data handler (Typing, Paste, Enter, Backspace)
      terminal.onData((data) => {
        const term = xtermRef.current;
        if (!term) return;

        if (data === "\r") {
          // Enter key
          term.write('\r\n');
          const toExecute = currentCommand.current;
          currentCommand.current = "";
          executeCommand(toExecute);
          if (activeTerminal?.history) {
            historyIndex.current = activeTerminal.history.length + 1;
          }
        } else if (data === "\x7f" || data === "\b") {
          // Backspace key
          if (currentCommand.current.length > 0) {
            term.write("\b \b");
            currentCommand.current = currentCommand.current.slice(0, -1);
          }
        } else if (data === "\t") {
          // Tab autocompletion for common commands
          const partial = currentCommand.current.toLowerCase();
          const suggestions = ['run', 'runtimes', 'c', 'python', 'node', 'bash', 'react', 'gcc', 'ls', 'cat', 'clear', 'help'];
          const match = suggestions.find(s => s.startsWith(partial) && s !== partial);
          if (match) {
            const added = match.slice(partial.length);
            currentCommand.current += added;
            term.write(added);
          }
        } else if (data.length > 0 && !data.includes('\x1b')) {
          // Printable characters or pasted text
          currentCommand.current += data;
          term.write(data);
        }
      });
    }
  }, [executeCommand, activeTerminal]);

  useEffect(() => {
    if (activeTerminal?.history) {
      historyIndex.current = activeTerminal.history.length;
    }
  }, [activeTerminal]);

  // Synchronize terminal output buffer with active terminal state
  useEffect(() => {
    const term = xtermRef.current;
    if (!term || !activeTerminal) return;

    const writeOutput = (lines) => {
      lines.forEach((line, index) => {
        // Ensure \r\n line endings for smooth xterm rendering
        const formatted = String(line).replace(/\r?\n/g, '\r\n');
        if (index === lines.length - 1 && formatted.endsWith('$ ')) {
          term.write(formatted);
        } else {
          term.writeln(formatted);
        }
      });
    };

    if (activeTerminal.output.length > outputLines.current) {
      const newLines = activeTerminal.output.slice(outputLines.current);
      writeOutput(newLines);
      outputLines.current = activeTerminal.output.length;
    } else if (activeTerminal.output.length < outputLines.current) {
      // Clear screen reset
      term.clear();
      writeOutput(activeTerminal.output);
      outputLines.current = activeTerminal.output.length;
    }
  }, [activeTerminal, activeTerminal?.output]);

  return (
    <div className="terminal-container">
      <div className="terminal-toolbar">
        <div className="terminal-toolbar-left">
          <div className="terminal-tabs-header">
            {terminals.map(t => (
              <button
                key={t.id}
                className={`terminal-tab-item ${activeTerminal?.id === t.id ? 'active' : ''}`}
                onClick={() => setActiveTerminal(t)}
              >
                {t.title}
              </button>
            ))}
            <button className="terminal-add-btn" onClick={createTerminal} title="New Terminal">
              <FaPlus />
            </button>
          </div>
        </div>

        <div className="terminal-toolbar-right">
          {isRunning ? (
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
            title="Execute Active File in Sandbox"
          >
            <FaPlay className="action-icon" /> Run Active File
          </button>

          <button
            className="term-action-btn"
            onClick={() => executeCommand('clear')}
            title="Clear Terminal Screen"
          >
            <FaTrash className="action-icon" /> Clear
          </button>
        </div>
      </div>
      <div ref={terminalRef} className="terminal" />
    </div>
  );
}

export default TerminalComponent;