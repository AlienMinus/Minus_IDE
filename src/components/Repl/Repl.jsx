import "./Repl.css";
import { useEffect, useRef, useState, useContext, useCallback } from "react";
import { Terminal as XtermTerminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";
import {
  FaPlay,
  FaRedo,
  FaTrash,
  FaStop,
  FaCheckCircle,
  FaSpinner
} from "react-icons/fa";
import { SiPython, SiNodedotjs } from "react-icons/si";
import { startReplSession, evalReplCode, exitReplSession } from "../../services/sandboxService";
import { EditorContext } from "../../context/EditorContext";
import { FileContext } from "../../context/FileContext";
import { getStoredWorkspaceState } from "../../services/workspacePersistence";

export default function Repl() {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);

  const editorCtx = useContext(EditorContext);
  const fileCtx = useContext(FileContext);
  const getSelectedText = editorCtx?.getSelectedText;

  const cachedState = getStoredWorkspaceState();
  const workspacePath = fileCtx?.persistedFolderInfo?.path || cachedState?.folderPath || null;

  const [runtime, setRuntime] = useState("python");
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState("initializing");

  const currentCommand = useRef("");
  const historyRef = useRef([]);
  const historyIndex = useRef(-1);
  const promptRef = useRef(">>> ");
  const isMultiLineRef = useRef(false);
  const activeSessionIdRef = useRef(`repl-panel-${runtime}`);
  const runtimeRef = useRef(runtime);
  runtimeRef.current = runtime;

  const initSession = useCallback(async (selectedRuntime = runtime) => {
    const term = xtermRef.current;
    if (!term) return;

    setStatus("initializing");
    term.clear();
    term.writeln(`\x1b[90mStarting ${selectedRuntime.toUpperCase()} interactive REPL session...\x1b[0m`);

    const sessionId = `repl-panel-${selectedRuntime}-${Date.now()}`;
    activeSessionIdRef.current = sessionId;

    try {
      const res = await startReplSession({
        sessionId,
        runtime: selectedRuntime,
        cwd: workspacePath
      });

      term.clear();
      if (res.banner) {
        const lines = res.banner.split(/\r?\n/);
        lines.forEach(l => term.writeln(l));
      }

      const p = res.prompt || (selectedRuntime === "node" ? "> " : ">>> ");
      promptRef.current = p;
      isMultiLineRef.current = false;
      currentCommand.current = "";
      historyIndex.current = -1;

      term.write(p);
      setStatus("ready");
    } catch (err) {
      term.writeln(`\x1b[31mFailed to start ${selectedRuntime} REPL: ${err.message}\x1b[0m`);
      term.writeln(`\x1b[90mCheck if ${selectedRuntime} runtime is installed on the host machine.\x1b[0m`);
      setStatus("error");
    }
  }, [runtime, workspacePath]);

  // Initialize terminal instance once
  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XtermTerminal({
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

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());

    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
      } catch {}
    });
    resizeObserver.observe(terminalRef.current);

    // Keyboard navigation
    term.onKey(({ domEvent }) => {
      const activePrompt = promptRef.current || "$ ";

      // Ctrl+C (Cancel line or interrupt)
      if (domEvent.ctrlKey && domEvent.key.toLowerCase() === "c") {
        domEvent.preventDefault();
        term.write(`^C\r\n${activePrompt}`);
        currentCommand.current = "";
        historyIndex.current = -1;
        isMultiLineRef.current = false;
        return;
      }

      // Ctrl+L (Clear screen)
      if (domEvent.ctrlKey && domEvent.key.toLowerCase() === "l") {
        domEvent.preventDefault();
        term.clear();
        term.write(activePrompt + currentCommand.current);
        return;
      }

      // Arrow Up
      if (domEvent.key === "ArrowUp") {
        domEvent.preventDefault();
        const hist = historyRef.current;
        if (hist.length === 0) return;

        let newIdx;
        if (historyIndex.current === -1) {
          newIdx = hist.length - 1;
        } else if (historyIndex.current > 0) {
          newIdx = historyIndex.current - 1;
        } else {
          newIdx = 0;
        }

        historyIndex.current = newIdx;
        const cmd = hist[newIdx] || "";
        term.write(`\x1b[2K\r${activePrompt}${cmd}`);
        currentCommand.current = cmd;
        return;
      }

      // Arrow Down
      if (domEvent.key === "ArrowDown") {
        domEvent.preventDefault();
        const hist = historyRef.current;
        if (hist.length === 0 || historyIndex.current === -1) return;

        if (historyIndex.current < hist.length - 1) {
          historyIndex.current++;
          const cmd = hist[historyIndex.current] || "";
          term.write(`\x1b[2K\r${activePrompt}${cmd}`);
          currentCommand.current = cmd;
        } else {
          historyIndex.current = -1;
          term.write(`\x1b[2K\r${activePrompt}`);
          currentCommand.current = "";
        }
        return;
      }
    });

    // Character data handler
    term.onData(async (data) => {
      if (data === "\r") {
        const toEval = currentCommand.current;
        currentCommand.current = "";
        historyIndex.current = -1;

        const activePrompt = promptRef.current || "$ ";

        // Empty line when NOT in multi-line block
        if (!toEval.trim() && !isMultiLineRef.current) {
          term.write(`\r\n${activePrompt}`);
          return;
        }

        term.write("\r\n");

        if (toEval.trim()) {
          historyRef.current.push(toEval);
        }

        // Handle exit command
        const trimmed = toEval.trim();
        const isExit = trimmed === "exit()" || trimmed === "quit()" || trimmed === ".exit" ||
          (trimmed === "exit" && (runtimeRef.current === "python" || runtimeRef.current === "node"));

        if (isExit) {
          term.writeln(`\x1b[90m[Exited ${runtimeRef.current.toUpperCase()} REPL. Restarting session...]\x1b[0m`);
          await exitReplSession(activeSessionIdRef.current).catch(() => {});
          await initSession(runtimeRef.current);
          return;
        }

        setIsRunning(true);
        setStatus("evaluating");

        try {
          const res = await evalReplCode({
            sessionId: activeSessionIdRef.current,
            code: toEval
          });

          if (res.exited) {
            term.writeln(`\x1b[90m[REPL session closed by process]\x1b[0m`);
            await initSession(runtimeRef.current);
            return;
          }

          if (res.output) {
            const lines = res.output.replace(/\r\n/g, "\n").split("\n");
            lines.forEach(l => term.writeln(l));
          }

          const nextPrompt = res.prompt || (runtimeRef.current === "node" ? "> " : ">>> ");
          promptRef.current = nextPrompt;
          isMultiLineRef.current = !!res.isMultiLine;
          term.write(nextPrompt);
        } catch (err) {
          term.writeln(`\x1b[31mError: ${err.message}\x1b[0m`);
          const defaultPrompt = runtimeRef.current === "node" ? "> " : ">>> ";
          promptRef.current = defaultPrompt;
          isMultiLineRef.current = false;
          term.write(defaultPrompt);
        } finally {
          setIsRunning(false);
          setStatus("ready");
        }

      } else if (data === "\x7f" || data === "\b") {
        if (currentCommand.current.length > 0) {
          term.write("\b \b");
          currentCommand.current = currentCommand.current.slice(0, -1);
        }
      } else if (data.length > 0 && !data.includes("\x1b")) {
        currentCommand.current += data;
        term.write(data);
      }
    });

    initSession(runtime);

    return () => {
      exitReplSession(activeSessionIdRef.current).catch(() => {});
      term.dispose();
      xtermRef.current = null;
    };
  }, []);

  const switchRuntime = (newRuntime) => {
    if (newRuntime === runtime) return;
    setRuntime(newRuntime);
    runtimeRef.current = newRuntime;
    initSession(newRuntime);
  };

  const handleRestart = () => {
    initSession(runtime);
  };

  const handleClear = () => {
    const term = xtermRef.current;
    if (term) {
      term.clear();
      term.write(promptRef.current || "$ ");
      currentCommand.current = "";
    }
  };

  const handleEvalSelection = async () => {
    const selected = getSelectedText ? getSelectedText() : "";
    if (!selected || !selected.trim()) {
      const term = xtermRef.current;
      if (term) {
        term.writeln("\r\n\x1b[33m[No text selected in editor. Highlight code first.]\x1b[0m");
        term.write(promptRef.current || "$ ");
      }
      return;
    }

    const term = xtermRef.current;
    if (!term) return;

    term.write(`\r\n\x1b[36m>>> # Evaluating selected code:\x1b[0m\r\n`);
    const lines = selected.split(/\r?\n/);
    lines.forEach(l => term.writeln(`\x1b[90m| ${l}\x1b[0m`));

    setIsRunning(true);
    setStatus("evaluating");

    try {
      const res = await evalReplCode({
        sessionId: activeSessionIdRef.current,
        code: selected
      });

      if (res.output) {
        const outLines = res.output.replace(/\r\n/g, "\n").split("\n");
        outLines.forEach(l => term.writeln(l));
      }

      const nextPrompt = res.prompt || (runtime === "node" ? "> " : ">>> ");
      promptRef.current = nextPrompt;
      isMultiLineRef.current = !!res.isMultiLine;
      term.write(nextPrompt);
    } catch (err) {
      term.writeln(`\x1b[31mError: ${err.message}\x1b[0m`);
      term.write(promptRef.current || "$ ");
    } finally {
      setIsRunning(false);
      setStatus("ready");
    }
  };

  return (
    <div className="repl-container">
      <div className="repl-toolbar">
        <div className="repl-toolbar-left">
          <div className="repl-runtime-selector">
            <button
              className={`repl-runtime-btn python ${runtime === "python" ? "active" : ""}`}
              onClick={() => switchRuntime("python")}
              title="Python 3.12 Interactive Console"
            >
              <SiPython /> Python 3.12
            </button>
            <button
              className={`repl-runtime-btn node ${runtime === "node" ? "active" : ""}`}
              onClick={() => switchRuntime("node")}
              title="Node.js Interactive REPL"
            >
              <SiNodedotjs /> Node.js
            </button>
          </div>

          {status === "evaluating" || isRunning ? (
            <span className="repl-status-badge evaluating">
              <FaSpinner className="spin-icon" /> Evaluating
            </span>
          ) : status === "ready" ? (
            <span className="repl-status-badge ready">
              <FaCheckCircle /> {runtime.toUpperCase()} REPL Ready
            </span>
          ) : (
            <span className="repl-status-badge evaluating">
              <FaSpinner className="spin-icon" /> Starting
            </span>
          )}
        </div>

        <div className="repl-toolbar-right">
          <button
            className="repl-btn eval-sel-btn"
            onClick={handleEvalSelection}
            disabled={isRunning}
            title="Evaluate Selected Code from Editor"
            aria-label="Evaluate Selected Code"
          >
            <FaPlay />
          </button>

          <button
            className="repl-btn"
            onClick={handleRestart}
            disabled={isRunning}
            title="Restart REPL Session (Clean Environment)"
            aria-label="Restart REPL Session"
          >
            <FaRedo />
          </button>

          <button
            className="repl-btn"
            onClick={handleClear}
            title="Clear REPL Screen (Ctrl+L)"
            aria-label="Clear REPL Screen"
          >
            <FaTrash />
          </button>
        </div>
      </div>

      <div ref={terminalRef} className="repl-terminal-body" />
    </div>
  );
}
