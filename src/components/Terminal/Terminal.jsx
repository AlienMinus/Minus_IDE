import "./Terminal.css";
import { useEffect, useRef, useState } from "react";
import { Terminal as XtermTerminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { SearchAddon } from "@xterm/addon-search";
import "@xterm/xterm/css/xterm.css";
import useTerminal from "../../hooks/useTerminal";
import useEditor from "../../hooks/useEditor";
import useTheme from "../../hooks/useTheme";
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
import {
  VscSplitHorizontal,
  VscTrash,
  VscEllipsis,
  VscScreenFull,
  VscClose
} from "react-icons/vsc";

function redrawLine(term, prompt, command, cursorIndex) {
  if (!term) return;
  const backSteps = command.length - cursorIndex;
  if (backSteps > 0) {
    term.write(`\r\x1b[2K${prompt}${command}\x1b[${backSteps}D`);
  } else {
    term.write(`\r\x1b[2K${prompt}${command}`);
  }
}

function TerminalComponent({ hideToolbar = false }) {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);

  const splitTerminalRef = useRef(null);
  const splitXtermRef = useRef(null);
  const splitFitAddonRef = useRef(null);

  const terminalContainerRef = useRef(null);
  const [sidebarWidth, setSidebarWidth] = useState(150);
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);
  const isDraggingSidebarRef = useRef(false);
  const [isSidebarDropdownOpen, setIsSidebarDropdownOpen] = useState(false);
  const sidebarDropdownAnchorRef = useRef(null);

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
    setActiveTerminal,
    toggleMaximizeTerminal,
    isMaximized
  } = useTerminal();

  const {
    openLiveBrowserTab,
    toggleBottomPanel,
    setIsBottomPanelOpen
  } = useEditor();

  const { currentTheme, isDark } = useTheme();

  const getXtermTheme = (theme, dark) => {
    const ui = theme?.ui || {};
    const bg = ui.editorBg || ui.bgPrimary || (dark ? "#181818" : "#ffffff");
    const fg = ui.textPrimary || (dark ? "#d4d4d4" : "#1f2328");
    const cursor = ui.accentColor || (dark ? "#ffffff" : "#0969da");
    const selectBg = dark ? "rgba(255, 255, 255, 0.2)" : "rgba(9, 105, 218, 0.25)";
    return {
      background: bg,
      foreground: fg,
      cursor: cursor,
      cursorAccent: bg,
      selectionBackground: selectBg,
      black: dark ? "#1e1e1e" : "#24292e",
      brightBlack: dark ? "#808080" : "#6a737d",
      red: "#f44747",
      brightRed: "#f44747",
      green: "#6a9955",
      brightGreen: "#3fb950",
      yellow: "#dcdcaa",
      brightYellow: "#d7ba7d",
      blue: "#569cd6",
      brightBlue: "#2188ff",
      magenta: "#c586c0",
      brightMagenta: "#bc8cff",
      cyan: "#4ec9b0",
      brightCyan: "#39c5bb",
      white: dark ? "#d4d4d4" : "#24292e",
      brightWhite: dark ? "#ffffff" : "#000000"
    };
  };

  useEffect(() => {
    const termTheme = getXtermTheme(currentTheme, isDark);
    if (xtermRef.current) {
      xtermRef.current.options.theme = termTheme;
    }
    if (splitXtermRef.current) {
      splitXtermRef.current.options.theme = termTheme;
    }
  }, [currentTheme, isDark]);

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
  const cursorPos = useRef(0);
  const outputLines = useRef(0);
  const historyIndex = useRef(-1);
  const lastTerminalId = useRef(mainSession?.id);

  const splitCurrentCommand = useRef("");
  const splitCursorPos = useRef(0);
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

  // Handle separator dragging between terminal panes and rightmost tabs sidebar
  const handleSidebarResizerMouseDown = (e) => {
    e.preventDefault();
    isDraggingSidebarRef.current = true;
    setIsDraggingSidebar(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent) => {
      if (!isDraggingSidebarRef.current || !terminalContainerRef.current) return;
      const rect = terminalContainerRef.current.getBoundingClientRect();
      const newWidth = rect.right - moveEvent.clientX;
      const clamped = Math.min(Math.max(newWidth, 100), 280);
      setSidebarWidth(clamped);

      requestAnimationFrame(() => {
        try { fitAddonRef.current?.fit(); } catch {}
        try { splitFitAddonRef.current?.fit(); } catch {}
      });
    };

    const handleMouseUp = () => {
      isDraggingSidebarRef.current = false;
      setIsDraggingSidebar(false);
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

  // Re-fit xterm buffers whenever split ratio, split state, or sidebar width changes
  useEffect(() => {
    const timer = setTimeout(() => {
      try { fitAddonRef.current?.fit(); } catch {}
      try { splitFitAddonRef.current?.fit(); } catch {}
    }, 40);
    return () => clearTimeout(timer);
  }, [isSplit, splitRatio, sidebarWidth]);

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
        theme: getXtermTheme(currentTheme, isDark),
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

        const currentPrompt = mainSessionRef.current?.replState?.prompt || mainSessionRef.current?.prompt || '$ ';

        // Ctrl+C (Interrupt / Cancel)
        if (domEvent.ctrlKey && domEvent.key.toLowerCase() === 'c') {
          domEvent.preventDefault();
          term.write('^C\r\n' + currentPrompt);
          currentCommand.current = "";
          cursorPos.current = 0;
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
          cursorPos.current = 0;
          historyIndex.current = -1;
          return;
        }

        // Arrow Left (Move cursor back / inside quotes)
        if (domEvent.key === 'ArrowLeft') {
          domEvent.preventDefault();
          if (cursorPos.current > 0) {
            cursorPos.current--;
            term.write('\x1b[1D');
          }
          return;
        }

        // Arrow Right (Move cursor forward)
        if (domEvent.key === 'ArrowRight') {
          domEvent.preventDefault();
          if (cursorPos.current < currentCommand.current.length) {
            cursorPos.current++;
            term.write('\x1b[1C');
          }
          return;
        }

        // Home or Ctrl+A (Jump to beginning of command)
        if (domEvent.key === 'Home' || (domEvent.ctrlKey && domEvent.key.toLowerCase() === 'a')) {
          domEvent.preventDefault();
          cursorPos.current = 0;
          redrawLine(term, currentPrompt, currentCommand.current, 0);
          return;
        }

        // End or Ctrl+E (Jump to end of command)
        if (domEvent.key === 'End' || (domEvent.ctrlKey && domEvent.key.toLowerCase() === 'e')) {
          domEvent.preventDefault();
          cursorPos.current = currentCommand.current.length;
          redrawLine(term, currentPrompt, currentCommand.current, currentCommand.current.length);
          return;
        }

        // Delete (Delete character ahead of cursor)
        if (domEvent.key === 'Delete') {
          domEvent.preventDefault();
          if (cursorPos.current < currentCommand.current.length) {
            const prev = currentCommand.current;
            currentCommand.current = prev.slice(0, cursorPos.current) + prev.slice(cursorPos.current + 1);
            redrawLine(term, currentPrompt, currentCommand.current, cursorPos.current);
          }
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
          currentCommand.current = cmd;
          cursorPos.current = cmd.length;
          redrawLine(term, currentPrompt, cmd, cmd.length);
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
            currentCommand.current = cmd;
            cursorPos.current = cmd.length;
            redrawLine(term, currentPrompt, cmd, cmd.length);
          } else {
            historyIndex.current = -1;
            currentCommand.current = "";
            cursorPos.current = 0;
            redrawLine(term, currentPrompt, "", 0);
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

        const currentPrompt = mainSessionRef.current?.replState?.prompt || mainSessionRef.current?.prompt || '$ ';

        if (data === "\r") {
          const toExecute = currentCommand.current;
          currentCommand.current = "";
          cursorPos.current = 0;
          historyIndex.current = -1;
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
          if (cursorPos.current > 0) {
            const prev = currentCommand.current;
            currentCommand.current = prev.slice(0, cursorPos.current - 1) + prev.slice(cursorPos.current);
            cursorPos.current--;
            redrawLine(term, currentPrompt, currentCommand.current, cursorPos.current);
          }
        } else if (data === "\t") {
          const partial = currentCommand.current.slice(0, cursorPos.current).toLowerCase();
          const suggestions = ['echo', 'run', 'runtimes', 'c', 'python', 'node', 'bash', 'react', 'gcc', 'ls', 'cat', 'clear', 'help', 'kill', 'pwd', 'cd', 'scan', 'audit', 'secrets'];
          const match = suggestions.find(s => s.startsWith(partial) && s !== partial);
          if (match) {
            const added = match.slice(partial.length);
            const prev = currentCommand.current;
            currentCommand.current = prev.slice(0, cursorPos.current) + added + prev.slice(cursorPos.current);
            cursorPos.current += added.length;
            redrawLine(term, currentPrompt, currentCommand.current, cursorPos.current);
          }
        } else if (data.length > 0 && !data.includes('\x1b')) {
          const prev = currentCommand.current;
          currentCommand.current = prev.slice(0, cursorPos.current) + data + prev.slice(cursorPos.current);
          cursorPos.current += data.length;
          if (cursorPos.current === currentCommand.current.length) {
            term.write(data);
          } else {
            redrawLine(term, currentPrompt, currentCommand.current, cursorPos.current);
          }
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
        theme: getXtermTheme(currentTheme, isDark),
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
          splitCursorPos.current = 0;
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
          splitCursorPos.current = 0;
          splitHistoryIndex.current = -1;
          return;
        }

        // Arrow Left (Cursor Left)
        if (domEvent.key === 'ArrowLeft') {
          domEvent.preventDefault();
          if (splitCursorPos.current > 0) {
            splitCursorPos.current -= 1;
            term.write('\x1b[1D');
          }
          return;
        }

        // Arrow Right (Cursor Right)
        if (domEvent.key === 'ArrowRight') {
          domEvent.preventDefault();
          if (splitCursorPos.current < splitCurrentCommand.current.length) {
            splitCursorPos.current += 1;
            term.write('\x1b[1C');
          }
          return;
        }

        // Home / Ctrl+A (Move cursor to start of line)
        if (domEvent.key === 'Home' || (domEvent.ctrlKey && domEvent.key.toLowerCase() === 'a')) {
          domEvent.preventDefault();
          splitCursorPos.current = 0;
          redrawLine(term, currentPrompt, splitCurrentCommand.current, splitCursorPos.current);
          return;
        }

        // End / Ctrl+E (Move cursor to end of line)
        if (domEvent.key === 'End' || (domEvent.ctrlKey && domEvent.key.toLowerCase() === 'e')) {
          domEvent.preventDefault();
          splitCursorPos.current = splitCurrentCommand.current.length;
          redrawLine(term, currentPrompt, splitCurrentCommand.current, splitCursorPos.current);
          return;
        }

        // Delete (Delete character at cursor)
        if (domEvent.key === 'Delete') {
          domEvent.preventDefault();
          const prev = splitCurrentCommand.current;
          if (splitCursorPos.current < prev.length) {
            splitCurrentCommand.current = prev.slice(0, splitCursorPos.current) + prev.slice(splitCursorPos.current + 1);
            redrawLine(term, currentPrompt, splitCurrentCommand.current, splitCursorPos.current);
          }
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
          splitCurrentCommand.current = cmd;
          splitCursorPos.current = cmd.length;
          redrawLine(term, currentPrompt, cmd, splitCursorPos.current);
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
            splitCurrentCommand.current = cmd;
            splitCursorPos.current = cmd.length;
            redrawLine(term, currentPrompt, cmd, splitCursorPos.current);
          } else {
            splitHistoryIndex.current = -1;
            splitCurrentCommand.current = "";
            splitCursorPos.current = 0;
            redrawLine(term, currentPrompt, "", 0);
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

        const currentPrompt = splitSessionRef.current?.replState?.prompt || '$ ';

        if (data === "\r") {
          const toExecute = splitCurrentCommand.current;
          splitCurrentCommand.current = "";
          splitCursorPos.current = 0;
          splitHistoryIndex.current = -1;

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
          if (splitCursorPos.current > 0) {
            const prev = splitCurrentCommand.current;
            splitCurrentCommand.current = prev.slice(0, splitCursorPos.current - 1) + prev.slice(splitCursorPos.current);
            splitCursorPos.current -= 1;
            redrawLine(term, currentPrompt, splitCurrentCommand.current, splitCursorPos.current);
          }
        } else if (data === "\t") {
          const partial = splitCurrentCommand.current.slice(0, splitCursorPos.current).toLowerCase();
          const suggestions = ['run', 'runtimes', 'c', 'python', 'node', 'bash', 'react', 'gcc', 'ls', 'cat', 'clear', 'help', 'kill', 'pwd', 'cd'];
          const match = suggestions.find(s => s.startsWith(partial) && s !== partial);
          if (match) {
            const added = match.slice(partial.length);
            const prev = splitCurrentCommand.current;
            splitCurrentCommand.current = prev.slice(0, splitCursorPos.current) + added + prev.slice(splitCursorPos.current);
            splitCursorPos.current += added.length;
            redrawLine(term, currentPrompt, splitCurrentCommand.current, splitCursorPos.current);
          }
        } else if (data.length > 0 && !data.includes('\x1b')) {
          const prev = splitCurrentCommand.current;
          const insertPos = splitCursorPos.current;
          splitCurrentCommand.current = prev.slice(0, insertPos) + data + prev.slice(insertPos);
          splitCursorPos.current += data.length;

          if (splitCursorPos.current === splitCurrentCommand.current.length) {
            term.write(data);
          } else {
            redrawLine(term, currentPrompt, splitCurrentCommand.current, splitCursorPos.current);
          }
        }
      });

      // Write initial output on mount
      if (splitSessionRef.current) {
        lastSplitTerminalId.current = splitSessionRef.current.id;
        splitTerm.reset();
        const initialLines = splitSessionRef.current.output || [];
        initialLines.forEach((line, index) => {
          const formatted = String(line).replace(/\r?\n/g, '\r\n');
          const isPrompt = /(?:\$ |>>> |\.\.\. |> |cypher> |agent> )$/.test(formatted);
          if (index === initialLines.length - 1 && isPrompt) {
            splitTerm.write(formatted);
          } else {
            splitTerm.writeln(formatted);
          }
        });
        splitOutputLines.current = initialLines.length;
      }

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
    <div
      ref={terminalContainerRef}
      className={`terminal-container ${isMaximized ? 'terminal-maximized' : ''}`}
    >
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

      <div className="terminal-main-workspace">
        <div
          ref={splitWrapperRef}
          className={`terminal-body-split-wrapper ${isSplit ? 'split' : ''} ${isDraggingSplit ? 'resizing' : ''}`}
        >
          <div
            className={`terminal-pane-wrapper main-pane ${activeTerminal?.id === mainSession?.id ? 'active-focus' : ''}`}
            style={isSplit ? { width: `${splitRatio}%`, flex: 'none' } : { width: '100%', flex: '1' }}
            onClick={() => {
              if (mainSession) setActiveTerminal(mainSession);
              xtermRef.current?.focus();
            }}
          >
            <div ref={terminalRef} className="terminal-xterm-render" />
          </div>
          {isSplit && (
            <>
              <div
                className="terminal-split-resizer"
                onMouseDown={handleResizerMouseDown}
                onDoubleClick={handleResizerDoubleClick}
                title="Drag to adjust split widths. Double-click to reset (50/50)."
              />
              <div
                className={`terminal-pane-wrapper split-pane ${activeTerminal?.id === splitSession?.id ? 'active-focus' : ''}`}
                style={{ width: `calc(${100 - splitRatio}% - 5px)`, flex: 'none' }}
                onClick={() => {
                  if (splitSession) setActiveTerminal(splitSession);
                  splitXtermRef.current?.focus();
                }}
              >
                <div ref={splitTerminalRef} className="terminal-xterm-render" />
              </div>
            </>
          )}
        </div>

        {/* Resizer for Rightmost Sidebar */}
        <div
          className="terminal-sidebar-resizer"
          onMouseDown={handleSidebarResizerMouseDown}
          onDoubleClick={() => {
            setSidebarWidth(150);
            setTimeout(() => {
              try { fitAddonRef.current?.fit(); } catch {}
              try { splitFitAddonRef.current?.fit(); } catch {}
            }, 40);
          }}
          title="Drag to adjust terminal tabs sidebar width. Double-click to reset (150px)."
        />

        {/* Rightmost Terminal Tabs Sidebar (matching Image 2) */}
        <div className="terminal-tabs-sidebar" style={{ width: `${sidebarWidth}px` }}>
          <div className="terminal-tabs-sidebar-header">
            <div className="sidebar-header-left">
              <button
                className="sidebar-tool-btn"
                onClick={() => splitTerminal()}
                title="Split Terminal (Ctrl+Shift+5)"
                aria-label="Split Terminal"
              >
                <VscSplitHorizontal />
              </button>
              <button
                className="sidebar-tool-btn"
                onClick={() => killTerminal(activeTerminal?.id)}
                title="Kill Terminal"
                aria-label="Kill Terminal"
              >
                <VscTrash />
              </button>
              <div className="sidebar-dropdown-anchor" ref={sidebarDropdownAnchorRef}>
                <button
                  className={`sidebar-tool-btn ${isSidebarDropdownOpen ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSidebarDropdownOpen(prev => !prev);
                  }}
                  title="More Actions..."
                  aria-label="More Actions"
                >
                  <VscEllipsis />
                </button>
                <TerminalDropdownMenu
                  isOpen={isSidebarDropdownOpen}
                  onClose={() => setIsSidebarDropdownOpen(false)}
                  anchorRef={sidebarDropdownAnchorRef}
                />
              </div>
            </div>

            <div className="sidebar-header-divider">|</div>

            <div className="sidebar-header-right">
              <button
                className="sidebar-tool-btn"
                onClick={() => toggleMaximizeTerminal && toggleMaximizeTerminal()}
                title={isMaximized ? "Restore Panel Size" : "Maximize Panel Size"}
                aria-label="Toggle Maximize Panel"
              >
                <VscScreenFull />
              </button>
              <button
                className="sidebar-tool-btn"
                onClick={() => {
                  if (setIsBottomPanelOpen) setIsBottomPanelOpen(false);
                  else if (toggleBottomPanel) toggleBottomPanel();
                }}
                title="Close Panel (Ctrl+J)"
                aria-label="Close Panel"
              >
                <VscClose />
              </button>
            </div>
          </div>

          <div className="terminal-tabs-sidebar-list">
            {terminals.map((t) => {
              const isActive = activeTerminal?.id === t.id;
              const isSplitSession = isSplit && t.title?.includes('(Split)');
              const isMainWithSplit = isSplit && (t.id === mainSession?.id);

              return (
                <div
                  key={t.id}
                  className={`terminal-sidebar-tab-row ${isActive ? 'active' : ''} ${isMainWithSplit ? 'tree-parent' : ''} ${isSplitSession ? 'tree-child' : ''}`}
                  onClick={() => {
                    setActiveTerminal(t);
                    if (t.id === splitSession?.id) {
                      splitXtermRef.current?.focus();
                    } else {
                      xtermRef.current?.focus();
                    }
                  }}
                  title={t.title}
                >
                  {isMainWithSplit && <span className="term-tree-branch">┌</span>}
                  {isSplitSession && <span className="term-tree-branch">└</span>}

                  <span className="term-sidebar-icon">
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
                      <path fillRule="evenodd" d="M1.5 2A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-13zm0 1h13a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5z"/>
                      <path fillRule="evenodd" d="M3.854 5.146a.5.5 0 0 1 0 .708L5.793 7.8 3.854 9.746a.5.5 0 0 1-.708-.708L4.379 7.8 3.146 6.566a.5.5 0 0 1 .708-.708zM6.5 9.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1H7a.5.5 0 0 1-.5-.5z"/>
                    </svg>
                  </span>

                  <span className="term-sidebar-title">
                    {t.title.replace(' (Split)', '')}
                  </span>

                  {terminals.length > 1 && (
                    <button
                      className="term-sidebar-item-kill"
                      onClick={(e) => {
                        e.stopPropagation();
                        killTerminal(t.id);
                      }}
                      title="Kill Terminal"
                    >
                      <VscClose />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Global resizing overlay during dragging */}
      {(isDraggingSplit || isDraggingSidebar) && (
        <div className="terminal-resizing-overlay" />
      )}
    </div>
  );
}

export default TerminalComponent;