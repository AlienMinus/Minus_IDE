import "./Terminal.css";

import { useEffect, useRef } from "react";

import { Terminal as XtermTerminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { SearchAddon } from "@xterm/addon-search";

import "@xterm/xterm/css/xterm.css";
import useTerminal from "../../hooks/useTerminal";

function TerminalComponent() {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const { activeTerminal, executeCommand } = useTerminal();
  const currentCommand = useRef("");
  const outputLines = useRef(0);
  const historyIndex = useRef(0);

  useEffect(() => {
    if (!terminalRef.current) return;

    if (!xtermRef.current) {
      const terminal = new XtermTerminal({
        cursorBlink: true,
        cursorStyle: "block",
        fontSize: 14,
        fontFamily: "Consolas, monospace",
        theme: {
          background: "#181818",
          foreground: "#d4d4d4",
          cursor: "#ffffff",
          selectionBackground: "#264f78",
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
        fitAddon.fit();
      });

      resizeObserver.observe(terminalRef.current);

      terminal.onKey(({ key, domEvent }) => {
        const term = xtermRef.current;
        if (!term || !activeTerminal) return;

        if (domEvent.key === 'ArrowUp') {
            if (historyIndex.current > 0) {
                historyIndex.current--;
                const command = activeTerminal.history[historyIndex.current];
                term.write('\x1b[2K\r$ ' + command);
                currentCommand.current = command;
            }
        } else if (domEvent.key === 'ArrowDown') {
            if (historyIndex.current < activeTerminal.history.length - 1) {
                historyIndex.current++;
                const command = activeTerminal.history[historyIndex.current];
                term.write('\x1b[2K\r$ ' + command);
                currentCommand.current = command;
            } else {
                historyIndex.current = activeTerminal.history.length;
                term.write('\x1b[2K\r$ ');
                currentCommand.current = "";
            }
        }
      });

      terminal.onData((data) => {
        const term = xtermRef.current;
        if (!term) return;

        if (data === "\r") {
          // Enter key
          if (currentCommand.current) {
            term.write('\x1b[2K\r'); // Clear current line
            executeCommand(currentCommand.current);
            currentCommand.current = "";
            if (activeTerminal) {
              historyIndex.current = activeTerminal.history.length + 1;
            }
          }
        } else if (data === "\x7f") {
          // Backspace
          if (currentCommand.current.length > 0) {
            term.write("\b \b");
            currentCommand.current = currentCommand.current.slice(0, -1);
          }
        } else if (data.charCodeAt(0) >= 32) { // printable characters
          currentCommand.current += data;
          term.write(data);
        }
      });
    }

    return () => {
      // Don't dispose here to maintain terminal state across renders
    };
  }, [executeCommand, activeTerminal]);

  useEffect(() => {
    if (activeTerminal) {
        historyIndex.current = activeTerminal.history.length;
    }
  }, [activeTerminal]);

  useEffect(() => {
    const term = xtermRef.current;
    if (!term || !activeTerminal) return;

    const writeOutput = (lines) => {
      lines.forEach((line, index) => {
        if (index === lines.length - 1 && line.endsWith('$ ')) {
          term.write(line);
        } else {
          term.writeln(line);
        }
      });
    };

    if (activeTerminal.output.length > outputLines.current) {
      const newLines = activeTerminal.output.slice(outputLines.current);
      writeOutput(newLines);
      outputLines.current = activeTerminal.output.length;
    } else if (activeTerminal.output.length < outputLines.current) {
      // Handle clear screen case
      term.clear();
      writeOutput(activeTerminal.output);
      outputLines.current = activeTerminal.output.length;
    }
  }, [activeTerminal, activeTerminal.output]);

  return (
    <div className="terminal-container">
      <div className="terminal-toolbar">
        <span>TERMINAL</span>
      </div>
      <div ref={terminalRef} className="terminal" />
    </div>
  );
}

export default TerminalComponent;