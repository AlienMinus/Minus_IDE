import { createContext, useState, useContext, useCallback, useRef, useEffect } from "react";
import commandsData from "../data/commands.json";
import {
  executeCode,
  executeCommand as executeShellCommand,
  streamShellCommand,
  getSandboxStatus,
  detectLanguage,
  validateWorkspacePath,
  startReplSession,
  evalReplCode,
  exitReplSession
} from "../services/sandboxService";
import { EditorContext } from "./EditorContext";
import { FileContext } from "./FileContext";
import { getStoredWorkspaceState, saveWorkspaceState } from "../services/workspacePersistence";

export const TerminalContext = createContext();

const DEFAULT_TASKS_JSON = JSON.stringify({
  version: "2.0.0",
  tasks: [
    {
      label: "Build Project",
      type: "shell",
      command: "npm run build",
      group: {
        kind: "build",
        isDefault: true
      },
      problemMatcher: []
    },
    {
      label: "Compile & Run C (GCC)",
      type: "shell",
      command: "gcc -O2 src/main.c -o main.exe && ./main.exe",
      group: "build"
    },
    {
      label: "Run Python Script",
      type: "shell",
      command: "python src/script.py"
    },
    {
      label: "Run Node.js",
      type: "shell",
      command: "node src/index.js"
    },
    {
      label: "Run Bash Script",
      type: "shell",
      command: "bash src/script.sh"
    },
    {
      label: "Run Tests",
      type: "shell",
      command: "npm test"
    }
  ]
}, null, 2);

export function TerminalProvider({ children }) {
    const editorCtx = useContext(EditorContext);
    const fileCtx = useContext(FileContext);
    const activeFile = editorCtx?.activeFile;
    const files = editorCtx?.files || [];
    const openPreviewTab = editorCtx?.openPreviewTab;
    const getSelectedText = editorCtx?.getSelectedText;
    const createOrOpenFile = editorCtx?.createOrOpenFile;

    const cachedState = getStoredWorkspaceState();
    const currentWorkspacePath = fileCtx?.persistedFolderInfo?.path || cachedState?.folderPath || null;

    const [terminals, setTerminals] = useState(() => {
        const cached = getStoredWorkspaceState();
        const initialCwd = currentWorkspacePath || cached?.folderPath || "D:\\Rough\\WebIDE";
        const prompt = `PS ${initialCwd}> `;
        return [
            {
                id: 1,
                title: "pwsh 1",
                cwd: initialCwd,
                profile: "powershell",
                prompt,
                history: [],
                output: [
                    "Windows PowerShell",
                    "Copyright (C) Microsoft Corporation. All rights reserved.",
                    "",
                    prompt
                ]
            }
        ];
    });

    // Sync terminal cwd whenever workspace folder path is updated / resolved
    useEffect(() => {
        if (currentWorkspacePath && (currentWorkspacePath.includes(':') || currentWorkspacePath.includes('/'))) {
            setTerminals(prev => prev.map(t => {
                if (!t.cwd || t.cwd === "~/HyperionIDE" || t.cwd === "portfolio_v1" || !t.cwd.includes(':')) {
                    const nextPrompt = t.profile === 'cmd' ? `${currentWorkspacePath}> ` : `PS ${currentWorkspacePath}> `;
                    if (activeTerminalRef.current && activeTerminalRef.current.id === t.id) {
                        activeTerminalRef.current.cwd = currentWorkspacePath;
                        activeTerminalRef.current.prompt = nextPrompt;
                    }
                    return { ...t, cwd: currentWorkspacePath, prompt: nextPrompt };
                }
                return t;
            }));
        }
    }, [currentWorkspacePath]);

    const [activeTerminalId, setActiveTerminalId] = useState(1);
    const [commands] = useState(commandsData);
    const [isRunning, setIsRunning] = useState(false);
    const [latestExecution, setLatestExecution] = useState(null);
    const [isSplit, setIsSplit] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [isTaskPickerOpen, setIsTaskPickerOpen] = useState(false);

    const lastActionRef = useRef(null);

    const activeTerminalIdRef = useRef(activeTerminalId);
    activeTerminalIdRef.current = activeTerminalId;

    const activeTerminal = terminals.find(t => t.id === activeTerminalId) || terminals[0];

    const activeTerminalRef = useRef(activeTerminal);
    activeTerminalRef.current = activeTerminal;
    const terminalsRef = useRef(terminals);
    terminalsRef.current = terminals;
    const activeProcessAbortCtrl = useRef(null);
    const detectedUrlsRef = useRef(new Set());

    const [defaultProfile, setDefaultProfileState] = useState(() => {
        return localStorage.getItem('hyperion_default_terminal_profile') || 'powershell';
    });

    const setDefaultProfile = (prof) => {
        setDefaultProfileState(prof);
        try {
            localStorage.setItem('hyperion_default_terminal_profile', prof);
        } catch {}
    };

    function createTerminal(profileName = null) {
        const newId = Date.now();
        const cached = getStoredWorkspaceState();
        const workspacePath = fileCtx?.persistedFolderInfo?.path || cached?.folderPath;
        const hasRealWorkspace = workspacePath &&
                                 workspacePath !== "~/HyperionIDE" &&
                                 workspacePath !== "portfolio_v1" &&
                                 (workspacePath.includes(':') || workspacePath.includes('/'));

        const termCwd = (activeTerminalRef.current?.cwd && activeTerminalRef.current.cwd !== "~/HyperionIDE")
            ? activeTerminalRef.current.cwd
            : (hasRealWorkspace ? workspacePath : (currentWorkspacePath || "~/HyperionIDE"));

        const prof = profileName || defaultProfile || 'powershell';
        let title = `Terminal ${terminals.length + 1}`;
        let prompt = "$ ";
        let output = [
            `Hyperion Terminal ${terminals.length + 1}`,
            `Directory: ${termCwd}`,
            "--------------------------------",
            "$ "
        ];

        if (prof === 'powershell') {
            title = `pwsh ${terminals.length + 1}`;
            prompt = `PS ${termCwd}> `;
            output = [
                "Windows PowerShell",
                "Copyright (C) Microsoft Corporation. All rights reserved.",
                "",
                prompt
            ];
        } else if (prof === 'bash') {
            title = `bash ${terminals.length + 1}`;
            prompt = "$ ";
            output = [
                "MINGW64 Git Bash Environment",
                `Directory: ${termCwd}`,
                prompt
            ];
        } else if (prof === 'cmd') {
            title = `cmd ${terminals.length + 1}`;
            prompt = `${termCwd}> `;
            output = [
                "Microsoft Windows [Version 10.0.26100]",
                "(c) Microsoft Corporation. All rights reserved.",
                "",
                prompt
            ];
        } else if (prof === 'node') {
            title = `node ${terminals.length + 1}`;
            prompt = "> ";
            output = [
                "Welcome to Node.js v24.11.1 (JavaScript Debug Terminal).",
                'Type ".help" for more information.',
                prompt
            ];
        } else if (prof === 'python') {
            title = `python ${terminals.length + 1}`;
            prompt = ">>> ";
            output = [
                "Python 3.12.0 (tags/v3.12.0) [MSC v.1935 64 bit (AMD64)] on win32",
                'Type "help", "copyright", "credits" or "license" for more information.',
                prompt
            ];
        } else if (prof === 'cypher') {
            title = `Cypher AI Security`;
            prompt = "cypher> ";
            output = [
                "\x1b[35m╔═══════════════════════════════════════════════════════════════════╗\x1b[0m",
                "\x1b[35m║        🔐 CYPHER AI SECURITY & THREAT INTELLIGENCE CLI            ║\x1b[0m",
                "\x1b[35m╚═══════════════════════════════════════════════════════════════════╝\x1b[0m",
                "\x1b[90mSecurity Engine: Active | Vulnerability Sentinel: ONLINE\x1b[0m",
                "\x1b[36mCommands: 'scan', 'audit', 'secrets', 'runtimes', 'help'\x1b[0m",
                "",
                prompt
            ];
        } else if (prof === 'agent') {
            title = `Agent Host`;
            prompt = "agent> ";
            output = [
                "\x1b[32m[Agent Host (Local)]\x1b[0m",
                "Connected to Hyperion Autonomous Agent Hub at localhost:3000",
                `Local Workspace: ${termCwd}`,
                "",
                prompt
            ];
        }

        const newTerminal = {
            id: newId,
            title,
            cwd: termCwd,
            profile: prof,
            prompt,
            history: [],
            output
        };

        activeTerminalRef.current = newTerminal;
        setTerminals(prev => {
            const updated = [...prev, newTerminal];
            terminalsRef.current = updated;
            return updated;
        });
        setActiveTerminalId(newId);
        activeTerminalIdRef.current = newId;

        // Auto-launch REPL session if node or python
        if (prof === 'node' || prof === 'python') {
            setTimeout(() => {
                startReplSession({
                    sessionId: `term-${newId}`,
                    runtime: prof,
                    cwd: termCwd
                }).then(session => {
                    setTerminals(prev => prev.map(t => {
                        if (t.id !== newId) return t;
                        return {
                            ...t,
                            replState: {
                                active: true,
                                runtime: prof,
                                sessionId: `term-${newId}`,
                                prompt: session.prompt || (prof === 'node' ? '> ' : '>>> '),
                                isMultiLine: false
                            }
                        };
                    }));
                }).catch(() => {});
            }, 100);
        }
    }

    /**
     * Kill Terminal (terminate terminal session and reset if all killed)
     * Preserves working directory (PWD) so killing terminal does not reset folder state.
     */
    function killTerminal(idToKill) {
        const targetId = idToKill || activeTerminalId;
        const termToKill = terminals.find(t => t.id === targetId);
        if (termToKill?.replState?.active) {
            exitReplSession(termToKill.replState.sessionId).catch(() => {});
        }
        if (activeProcessAbortCtrl.current) {
            try { activeProcessAbortCtrl.current.abort(); } catch {}
            activeProcessAbortCtrl.current = null;
        }
        setIsRunning(false);

        // Intelligently preserve working directory (PWD)
        const cached = getStoredWorkspaceState();
        const workspacePath = fileCtx?.persistedFolderInfo?.path || cached?.folderPath;
        const hasRealWorkspace = workspacePath &&
                                 workspacePath !== "~/HyperionIDE" &&
                                 workspacePath !== "portfolio_v1" &&
                                 (workspacePath.includes(':') || workspacePath.includes('/'));

        let preservedCwd;
        if (termToKill?.cwd && termToKill.cwd !== "~/HyperionIDE") {
            // Keep the exact directory of the terminal being killed
            preservedCwd = termToKill.cwd;
        } else if (activeTerminalRef.current?.cwd && activeTerminalRef.current.cwd !== "~/HyperionIDE") {
            // Keep the current active terminal directory
            preservedCwd = activeTerminalRef.current.cwd;
        } else if (hasRealWorkspace) {
            // Fall back to active workspace directory
            preservedCwd = workspacePath;
        } else {
            preservedCwd = termToKill?.cwd || activeTerminalRef.current?.cwd || currentWorkspacePath || "~/HyperionIDE";
        }

        setTerminals(prev => {
            const updated = prev.filter(t => t.id !== targetId);
            if (updated.length === 0) {
                const freshId = Date.now();
                const freshTerm = {
                    id: freshId,
                    title: "Terminal 1",
                    cwd: preservedCwd,
                    history: [],
                    output: [
                        "\x1b[33m[Hyperion] Terminal session reset.\x1b[0m",
                        `\x1b[90mDirectory: ${preservedCwd}\x1b[0m`,
                        "$ "
                    ]
                };
                activeTerminalRef.current = freshTerm;
                terminalsRef.current = [freshTerm];
                setActiveTerminalId(freshId);
                activeTerminalIdRef.current = freshId;
                setIsSplit(false);
                return [freshTerm];
            }

            if (activeTerminalId === targetId) {
                const nextActive = updated[0];
                activeTerminalRef.current = nextActive;
                setActiveTerminalId(nextActive.id);
                activeTerminalIdRef.current = nextActive.id;
            }
            terminalsRef.current = updated;

            const remainingHasSplit = updated.some(t => t.title?.includes('(Split)'));
            if (!remainingHasSplit) {
                setIsSplit(false);
            }
            return updated;
        });
    }

    /**
     * Terminate currently running task / process
     */
    function terminateTask() {
        if (activeProcessAbortCtrl.current) {
            try {
                activeProcessAbortCtrl.current.abort();
            } catch {}
            activeProcessAbortCtrl.current = null;
        }

        if (activeTerminalRef.current?.replState?.active) {
            exitReplSession(activeTerminalRef.current.replState.sessionId).catch(() => {});
            setTerminals(prev => prev.map(t => {
                if (t.id !== activeTerminalId) return t;
                return {
                    ...t,
                    replState: null,
                    output: [...t.output, "\x1b[90m[KeyboardInterrupt: Exited REPL]\x1b[0m", "$ "]
                };
            }));
            setIsRunning(false);
            return;
        }
        setIsRunning(false);
        appendToTerminal([
            "\x1b[31m[Terminated] Running task was terminated by user.\x1b[0m",
            "$ "
        ]);
    }

    /**
     * Split terminal side by side
     */
    function splitTerminal(profileName = null) {
        if (isSplit && !profileName) {
            const existingSplit = terminals.find(t => t.title?.includes('(Split)'));
            if (existingSplit) {
                killTerminal(existingSplit.id);
                setIsSplit(false);
                return;
            }
        }

        const newId = Date.now();
        const cached = getStoredWorkspaceState();
        const workspacePath = fileCtx?.persistedFolderInfo?.path || cached?.folderPath;
        const hasRealWorkspace = workspacePath &&
                                 workspacePath !== "~/HyperionIDE" &&
                                 workspacePath !== "portfolio_v1" &&
                                 (workspacePath.includes(':') || workspacePath.includes('/'));

        const termCwd = (activeTerminalRef.current?.cwd && activeTerminalRef.current.cwd !== "~/HyperionIDE")
            ? activeTerminalRef.current.cwd
            : (activeTerminal?.cwd && activeTerminal.cwd !== "~/HyperionIDE")
            ? activeTerminal.cwd
            : (hasRealWorkspace ? workspacePath : (currentWorkspacePath || "~/HyperionIDE"));

        const prof = profileName || defaultProfile || 'powershell';
        let title = `Terminal ${terminals.length + 1} (Split)`;
        let prompt = "$ ";
        let output = [prompt];

        if (prof === 'powershell') {
            title = `pwsh (Split)`;
            prompt = `PS ${termCwd}> `;
            output = [
                prompt
            ];
        } else if (prof === 'bash') {
            title = `bash (Split)`;
            prompt = "$ ";
            output = [
                prompt
            ];
        } else if (prof === 'cmd') {
            title = `cmd (Split)`;
            prompt = `${termCwd}> `;
            output = [
                prompt
            ];
        } else if (prof === 'node') {
            title = `node (Split)`;
            prompt = "> ";
            output = [
                prompt
            ];
        } else if (prof === 'python') {
            title = `python (Split)`;
            prompt = ">>> ";
            output = [
                prompt
            ];
        } else if (prof === 'cypher') {
            title = `Cypher (Split)`;
            prompt = "cypher> ";
            output = [
                "\x1b[35m[Cypher AI Security Terminal]\x1b[0m",
                prompt
            ];
        }

        const newTerm = {
            id: newId,
            title,
            cwd: termCwd,
            profile: prof,
            prompt,
            history: [],
            output
        };

        setTerminals(prev => {
            const base = isSplit ? prev.filter(t => !t.title?.includes('(Split)')) : prev;
            const updated = [...base, newTerm];
            terminalsRef.current = updated;
            return updated;
        });
        setIsSplit(true);

        if (prof === 'node' || prof === 'python') {
            setTimeout(() => {
                startReplSession({
                    sessionId: `term-${newId}`,
                    runtime: prof,
                    cwd: termCwd
                }).then(session => {
                    setTerminals(prev => prev.map(t => {
                        if (t.id !== newId) return t;
                        return {
                            ...t,
                            replState: {
                                active: true,
                                runtime: prof,
                                sessionId: `term-${newId}`,
                                prompt: session.prompt || (prof === 'node' ? '> ' : '>>> '),
                                isMultiLine: false
                            }
                        };
                    }));
                }).catch(() => {});
            }, 100);
        }
    }

    function toggleMaximizeTerminal() {
        setIsMaximized(prev => !prev);
    }

    const appendToTerminal = useCallback((textOrLines, targetTermId = null) => {
        setTerminals(prev => prev.map(t => {
            const destId = targetTermId ?? activeTerminalIdRef.current;
            if (t.id !== destId) return t;
            const newLines = Array.isArray(textOrLines) ? textOrLines : [textOrLines];
            return {
                ...t,
                output: [...t.output, ...newLines]
            };
        }));
    }, []);

    const setTerminalOutput = useCallback((newOutput, targetTermId = null) => {
        setTerminals(prev => prev.map(t => {
            const destId = targetTermId ?? activeTerminalIdRef.current;
            if (t.id !== destId) return t;
            return {
                ...t,
                output: newOutput
            };
        }));
    }, []);

    /**
     * Run Code in the Sandbox
     */
    const runCodeSnippet = useCallback(async ({ language, code, filename, targetFile }) => {
        if (!code && code !== '') {
            appendToTerminal(["\x1b[31m[Error] No code content to execute.\x1b[0m", "$ "]);
            return;
        }

        setIsRunning(true);
        lastActionRef.current = { type: 'code', language, code, filename, targetFile };
        const startTime = Date.now();

        appendToTerminal([
            `\x1b[34m[Sandbox]\x1b[0m Running \x1b[1m${filename || language}\x1b[0m in \x1b[33m${language.toUpperCase()}\x1b[0m sandbox...`
        ]);

        try {
            const res = await executeCode({
                language,
                code,
                filename,
                files
            });

            const duration = res.executionTimeMs || (Date.now() - startTime);

            setLatestExecution({
                filename: filename || `${language}-script`,
                language,
                timestamp: new Date().toLocaleTimeString(),
                duration,
                exitCode: res.exitCode,
                success: res.success,
                stdout: res.stdout,
                stderr: res.stderr,
                stage: res.stage
            });

            const outputLines = [];

            if (res.stdout) {
                const formatted = res.stdout.replace(/\r\n/g, '\n').split('\n');
                outputLines.push(...formatted);
            }

            if (res.stderr) {
                const formattedErr = res.stderr.replace(/\r\n/g, '\n').split('\n')
                    .map(line => `\x1b[31m${line}\x1b[0m`);
                outputLines.push(...formattedErr);
            }

            if (res.success) {
                outputLines.push(`\x1b[32m✔ [Process exited with code ${res.exitCode ?? 0} in ${duration}ms]\x1b[0m`);
            } else {
                outputLines.push(`\x1b[31m✘ [Process failed with exit code ${res.exitCode ?? 1} in ${duration}ms]\x1b[0m`);
            }

            if ((language === 'react' || language === 'jsx') && openPreviewTab && targetFile) {
                openPreviewTab(targetFile);
                outputLines.push(`\x1b[36mℹ Opened live interactive React preview in Preview tab.\x1b[0m`);
            }

            outputLines.push("$ ");
            appendToTerminal(outputLines);

        } catch (err) {
            appendToTerminal([
                `\x1b[31m[Sandbox Error] ${err.message}\x1b[0m`,
                "$ "
            ]);
        } finally {
            setIsRunning(false);
        }
    }, [files, openPreviewTab, appendToTerminal]);

    /**
     * Run the currently active editor file
     */
    const runActiveFile = useCallback(async (fileOverride) => {
        const fileToRun = fileOverride || activeFile;
        if (!fileToRun) {
            appendToTerminal([
                "\x1b[33m[Hyperion] No active file selected in the editor.\x1b[0m",
                "\x1b[90mSelect a file in the explorer, or run: run <filename>\x1b[0m",
                "$ "
            ]);
            return;
        }

        const lang = detectLanguage(fileToRun.name);
        await runCodeSnippet({
            language: lang,
            code: fileToRun.content || '',
            filename: fileToRun.name,
            targetFile: fileToRun
        });
    }, [activeFile, appendToTerminal, runCodeSnippet]);

    /**
     * Run Selected Text in Monaco Editor
     */
    const runSelectedText = useCallback(async () => {
        const selected = getSelectedText ? getSelectedText() : "";
        if (!selected || !selected.trim()) {
            appendToTerminal([
                "\x1b[33m[Hyperion] No text selected in editor.\x1b[0m",
                "\x1b[90mHighlight code in the editor and click 'Run Selected Text' to execute it.\x1b[0m",
                "$ "
            ]);
            return;
        }

        const lang = activeFile ? detectLanguage(activeFile.name) : "javascript";
        appendToTerminal([
            `\x1b[34m[Sandbox]\x1b[0m Executing selected ${lang.toUpperCase()} text...`
        ]);

        await runCodeSnippet({
            language: lang,
            code: selected,
            filename: `selection.${lang === 'c' ? 'c' : lang === 'python' ? 'py' : 'js'}`
        });
    }, [getSelectedText, activeFile, appendToTerminal, runCodeSnippet]);

    /**
     * Run Build Task (Ctrl+Shift+B)
     */
    const runBuildTask = useCallback(async () => {
        appendToTerminal([
            "\x1b[34m[Build Task]\x1b[0m Executing project build task...",
            "$ npm run build"
        ]);

        setIsRunning(true);
        lastActionRef.current = { type: 'command', command: 'npm run build' };

        try {
            const targetCwd = activeTerminal?.cwd || currentWorkspacePath;
            const res = await executeShellCommand('npm run build', { cwd: targetCwd, virtualFiles: files });
            const outLines = [];
            if (res.stdout) {
                outLines.push(...res.stdout.replace(/\r\n/g, '\n').split('\n'));
            }
            if (res.stderr) {
                outLines.push(...res.stderr.replace(/\r\n/g, '\n').split('\n').map(l => `\x1b[31m${l}\x1b[0m`));
            }
            outLines.push(res.success ? "\x1b[32m✔ Build completed successfully.\x1b[0m" : "\x1b[31m✘ Build failed.\x1b[0m");
            outLines.push("$ ");
            appendToTerminal(outLines);
        } catch (err) {
            appendToTerminal([`\x1b[31mBuild error: ${err.message}\x1b[0m`, "$ "]);
        } finally {
            setIsRunning(false);
        }
    }, [files, activeTerminal?.cwd, currentWorkspacePath, appendToTerminal]);

    /**
     * Show Running Tasks & Status
     */
    const showRunningTasks = useCallback(async () => {
        appendToTerminal([
            "\x1b[1;36m=== Running Tasks & Sandbox Environment ===\x1b[0m",
            `  Active Terminal: ${activeTerminal?.title || 'Terminal 1'}`,
            `  Running Process Status: ${isRunning ? '\x1b[33mACTIVE (Running)\x1b[0m' : '\x1b[32mIDLE\x1b[0m'}`,
            `  Total Terminals: ${terminals.length}`,
            "--------------------------------------------------"
        ]);

        try {
            const status = await getSandboxStatus();
            const runtimes = status.data?.runtimes || {};
            const lines = [
                `  C (GCC):      ${runtimes.c?.available ? '✔ ' + runtimes.c.version : '✘ Not detected'}`,
                `  Python:       ${runtimes.python?.available ? '✔ ' + runtimes.python.version : '✘ Not detected'}`,
                `  Node.js:      ${runtimes.node?.available ? '✔ ' + runtimes.node.version : '✘ Not detected'}`,
                `  Bash:         ${runtimes.bash?.available ? '✔ ' + runtimes.bash.version : '✘ Not detected'}`,
                `  React:        ${runtimes.react?.available ? '✔ ' + runtimes.react.version : '✘ Not detected'}`,
                "--------------------------------------------------",
                "$ "
            ];
            appendToTerminal(lines);
        } catch (err) {
            appendToTerminal([`\x1b[31mFailed to fetch tasks: ${err.message}\x1b[0m`, "$ "]);
        }
    }, [activeTerminal, isRunning, terminals.length, appendToTerminal]);

    /**
     * Restart Running Task / Re-run Last Action
     */
    const restartRunningTask = useCallback(async () => {
        if (!lastActionRef.current) {
            if (activeFile) {
                await runActiveFile();
            } else {
                appendToTerminal([
                    "\x1b[33m[Hyperion] No previous task to restart. Run a file or task first.\x1b[0m",
                    "$ "
                ]);
            }
            return;
        }

        const last = lastActionRef.current;
        if (last.type === 'code') {
            await runCodeSnippet(last);
        } else if (last.type === 'command') {
            appendToTerminal([`\x1b[34m[Restarting Task]\x1b[0m ${last.command}`]);
            setIsRunning(true);
            try {
                const targetCwd = activeTerminal?.cwd || currentWorkspacePath;
                const res = await executeShellCommand(last.command, { cwd: targetCwd, virtualFiles: files });
                appendToTerminal([res.stdout || '', res.stderr ? `\x1b[31m${res.stderr}\x1b[0m` : '', "$ "].filter(Boolean));
            } catch (err) {
                appendToTerminal([`\x1b[31m${err.message}\x1b[0m`, "$ "]);
            } finally {
                setIsRunning(false);
            }
        }
    }, [activeFile, files, activeTerminal?.cwd, currentWorkspacePath, appendToTerminal, runActiveFile, runCodeSnippet]);

    /**
     * Configure Tasks... (Opens .hyperion/tasks.json)
     */
    const configureTasks = useCallback(() => {
        if (createOrOpenFile) {
            createOrOpenFile(".hyperion/tasks.json", DEFAULT_TASKS_JSON);
            appendToTerminal([
                "\x1b[36m[Hyperion] Opened .hyperion/tasks.json in the editor.\x1b[0m",
                "$ "
            ]);
        }
    }, [createOrOpenFile, appendToTerminal]);

    /**
     * Configure Default Build Task...
     */
    const configureDefaultBuildTask = useCallback(() => {
        if (createOrOpenFile) {
            createOrOpenFile(".hyperion/tasks.json", DEFAULT_TASKS_JSON);
            appendToTerminal([
                "\x1b[36m[Hyperion] Configured default build task in .hyperion/tasks.json\x1b[0m",
                "$ "
            ]);
        }
    }, [createOrOpenFile, appendToTerminal]);

    /**
     * Execute a named or predefined task
     */
    const runTask = useCallback(async (taskCmd) => {
        setIsTaskPickerOpen(false);
        appendToTerminal([`\x1b[34m[Task Runner]\x1b[0m $ ${taskCmd}`]);
        setIsRunning(true);
        lastActionRef.current = { type: 'command', command: taskCmd };

        try {
            const targetCwd = activeTerminal?.cwd || currentWorkspacePath;
            const res = await executeShellCommand(taskCmd, { cwd: targetCwd, virtualFiles: files });
            const outLines = [];
            if (res.stdout) {
                outLines.push(...res.stdout.replace(/\r\n/g, '\n').split('\n'));
            }
            if (res.stderr) {
                outLines.push(...res.stderr.replace(/\r\n/g, '\n').split('\n').map(l => `\x1b[31m${l}\x1b[0m`));
            }
            outLines.push(res.success ? "\x1b[32m✔ Task completed.\x1b[0m" : "\x1b[31m✘ Task failed.\x1b[0m");
            outLines.push("$ ");
            appendToTerminal(outLines);
        } catch (err) {
            appendToTerminal([`\x1b[31mTask error: ${err.message}\x1b[0m`, "$ "]);
        } finally {
            setIsRunning(false);
        }
    }, [files, activeTerminal?.cwd, currentWorkspacePath, appendToTerminal]);

    /**
     * Execute Terminal Command
     */
    const executeCommand = useCallback(async (command, targetTermId = null) => {
        const targetId = targetTermId ?? activeTerminalIdRef.current;
        const targetTerm = terminalsRef.current.find(t => t.id === targetId) || terminals.find(t => t.id === targetId) || activeTerminal;
        if (!targetTerm) return;

        const trimmed = command.trim();

        // 1. If currently in an active REPL session, route input directly to REPL engine
        if (targetTerm?.replState?.active) {
            const repl = targetTerm.replState;
            const currentPrompt = repl.prompt || (repl.runtime === 'node' ? '> ' : '>>> ');
            const commandWithPrompt = `${currentPrompt}${command}`;
            const newHistory = [...targetTerm.history, command];

            // If empty enter on single-line prompt, just reprint prompt
            if (!trimmed && !repl.isMultiLine) {
                setTerminals(prev => prev.map(t => {
                    if (t.id !== targetId) return t;
                    return {
                        ...t,
                        output: [...t.output, currentPrompt]
                    };
                }));
                return;
            }

            setTerminals(prev => prev.map(t => {
                if (t.id !== targetId) return t;
                return {
                    ...t,
                    history: newHistory,
                    output: [...t.output, commandWithPrompt]
                };
            }));

            // Handle user typing exit
            const isExit = trimmed === 'exit()' || trimmed === 'quit()' || trimmed === '.exit' ||
                (trimmed === 'exit' && (repl.runtime === 'python' || repl.runtime === 'node'));

            if (isExit) {
                exitReplSession(repl.sessionId).catch(() => {});
                setTerminals(prev => prev.map(t => {
                    if (t.id !== targetId) return t;
                    return {
                        ...t,
                        replState: null,
                        output: [...t.output, `\x1b[90m[Exited ${repl.runtime.toUpperCase()} REPL]\x1b[0m`, "$ "]
                    };
                }));
                return;
            }

            setIsRunning(true);
            try {
                const res = await evalReplCode({
                    sessionId: repl.sessionId,
                    code: command
                });

                if (res.exited) {
                    setTerminals(prev => prev.map(t => {
                        if (t.id !== targetId) return t;
                        const outLines = [];
                        if (res.output) {
                            outLines.push(...res.output.replace(/\r\n/g, '\n').split('\n'));
                        }
                        outLines.push(`\x1b[90m[Exited ${repl.runtime.toUpperCase()} REPL]\x1b[0m`, "$ ");
                        return {
                            ...t,
                            replState: null,
                            output: [...t.output, ...outLines]
                        };
                    }));
                } else {
                    const outLines = [];
                    if (res.output) {
                        outLines.push(...res.output.replace(/\r\n/g, '\n').split('\n'));
                    }
                    const nextPrompt = res.prompt || (repl.runtime === 'node' ? '> ' : '>>> ');
                    outLines.push(nextPrompt);

                    setTerminals(prev => prev.map(t => {
                        if (t.id !== targetId) return t;
                        return {
                            ...t,
                            replState: {
                                ...t.replState,
                                prompt: nextPrompt,
                                isMultiLine: !!res.isMultiLine
                            },
                            output: [...t.output, ...outLines]
                        };
                    }));
                }
            } catch (err) {
                appendToTerminal([`\x1b[31mREPL evaluation error: ${err.message}\x1b[0m`, currentPrompt], targetId);
            } finally {
                setIsRunning(false);
            }
            return;
        }

        const activePrompt = targetTerm?.replState?.prompt || targetTerm?.prompt || '$ ';
        const commandWithPrompt = `${activePrompt}${command}`;
        const newHistory = [...targetTerm.history, command];

        if (!trimmed) {
            setTerminals(prev => prev.map(t => {
                if (t.id !== targetId) return t;
                return {
                    ...t,
                    output: [...t.output, activePrompt]
                };
            }));
            return;
        }

        setTerminals(prev => prev.map(t => {
            if (t.id !== targetId) return t;
            return {
                ...t,
                history: newHistory,
                output: [...t.output, commandWithPrompt]
            };
        }));

        const parts = trimmed.split(/\s+/);
        const cmd = parts[0].toLowerCase();
        const argsStr = parts.slice(1).join(" ");

        if (cmd === "clear" || cmd === "cls") {
            setTerminalOutput([activePrompt], targetId);
            return;
        }

        if (cmd === "kill" || cmd === "exit") {
            killTerminal(targetId);
            return;
        }

        if (cmd === "cd") {
            const currentCwd = targetTerm?.cwd || currentWorkspacePath || "D:\\Rough\\WebIDE";
            const target = argsStr.trim();
            if (!target || target === "~") {
                const cached = getStoredWorkspaceState();
                const workspacePath = fileCtx?.persistedFolderInfo?.path || cached?.folderPath;
                const homeOrRoot = (workspacePath && workspacePath !== "~/HyperionIDE" && workspacePath !== "portfolio_v1")
                    ? workspacePath
                    : (currentWorkspacePath || "D:\\Rough\\WebIDE");
                const nextPrompt = (targetTerm?.profile === 'cmd') ? `${homeOrRoot}> ` : `PS ${homeOrRoot}> `;
                if (targetTerm) {
                    targetTerm.cwd = homeOrRoot;
                    targetTerm.prompt = nextPrompt;
                }
                setTerminals((prev) =>
                    prev.map((t) => (t.id === targetId ? { ...t, cwd: homeOrRoot, prompt: nextPrompt } : t))
                );
                appendToTerminal([nextPrompt], targetId);
                return;
            }

            let candidate = target.replace(/^["']|["']$/g, "");
            if (!candidate.includes(":") && !candidate.startsWith("/") && !candidate.startsWith("\\")) {
                const base = currentCwd.replace(/\\/g, "/");
                if (candidate === "..") {
                    const parts = base.split("/").filter(Boolean);
                    parts.pop();
                    candidate = parts.join("/");
                    if (candidate.endsWith(":")) candidate += "/";
                } else if (candidate === ".") {
                    candidate = base;
                } else {
                    candidate = `${base}/${candidate}`;
                }
            }

            try {
                const check = await validateWorkspacePath(candidate);
                if (check.exists && check.isDirectory) {
                    const finalPath = check.path;
                    const nextPrompt = (targetTerm?.profile === 'cmd') ? `${finalPath}> ` : `PS ${finalPath}> `;
                    if (targetTerm) {
                        targetTerm.cwd = finalPath;
                        targetTerm.prompt = nextPrompt;
                    }
                    setTerminals((prev) =>
                        prev.map((t) => (t.id === targetId ? { ...t, cwd: finalPath, prompt: nextPrompt } : t))
                    );
                    if (fileCtx?.setWorkspacePath) {
                        fileCtx.setWorkspacePath(finalPath);
                    }
                    saveWorkspaceState({ folderPath: finalPath });
                    appendToTerminal([nextPrompt], targetId);
                } else {
                    appendToTerminal([`cd: no such file or directory: ${target}`, activePrompt], targetId);
                }
            } catch (err) {
                appendToTerminal([`cd error: ${err.message}`, activePrompt], targetId);
            }
            return;
        }

        if (cmd === "pwd" || cmd === "cwd") {
            const currentCwd = targetTerm?.cwd || currentWorkspacePath || "D:\\Rough\\WebIDE";
            appendToTerminal([currentCwd, activePrompt], targetId);
            return;
        }

        // Direct System Shell execution (PowerShell / Command Prompt / Bash)
        // Stream command execution directly in native host OS shell
        const targetCwd = targetTerm?.cwd || currentWorkspacePath || "D:\\Rough\\WebIDE";
        const isPhysical = targetCwd && (targetCwd.includes(':') || targetCwd.startsWith('/'));

        setIsRunning(true);
        lastActionRef.current = { type: 'command', command: trimmed };

        const abortCtrl = new AbortController();
        activeProcessAbortCtrl.current = abortCtrl;
        let collectedOutput = "";

        try {
            await streamShellCommand({
                command: trimmed,
                cwd: targetCwd,
                profile: targetTerm?.profile || defaultProfile || 'powershell',
                virtualFiles: isPhysical ? undefined : files,
                timeoutMs: 0,
                signal: abortCtrl.signal,
                onChunk: (chunk) => {
                    collectedOutput += chunk;
                    const chunkLines = chunk.replace(/\r\n/g, '\n').split('\n');
                    appendToTerminal(chunkLines, targetId);

                    // Scan for local dev server URLs WITH explicit port
                    const cleanCollected = String(collectedOutput)
                        .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
                        .replace(/[\x1b\x00-\x1f\x7f]/g, '');

                    const portUrlRegex = /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0):(\d{2,5})(?:\/[^\s"'\)\]>]*)?/gi;
                    let match;
                    while ((match = portUrlRegex.exec(cleanCollected)) !== null) {
                        let detectedUrl = match[0].replace('0.0.0.0', 'localhost').replace(/[\.,;:]$/, '');
                        if (!detectedUrlsRef.current.has(detectedUrl)) {
                            detectedUrlsRef.current.add(detectedUrl);
                            appendToTerminal([
                                `\r\n\x1b[1;32m✔ Local Dev Server detected:\x1b[0m \x1b[1;36m${detectedUrl}\x1b[0m`,
                                `\x1b[90m➜ Opening Live Preview in Editor...\x1b[0m\r\n`
                            ], targetId);
                            if (editorCtx?.openLiveBrowserTab) {
                                editorCtx.openLiveBrowserTab(detectedUrl, `Preview: ${detectedUrl}`);
                            }
                        }
                    }
                },
                onExit: (code) => {
                    activeProcessAbortCtrl.current = null;
                    setIsRunning(false);
                    appendToTerminal([activePrompt], targetId);
                }
            });
        } catch (err) {
            if (err.name !== 'AbortError') {
                appendToTerminal([`\x1b[31m${err.message}\x1b[0m`, activePrompt], targetId);
            }
        } finally {
            activeProcessAbortCtrl.current = null;
            setIsRunning(false);
        }
    }, [activeTerminal, activeTerminalId, files, currentWorkspacePath, fileCtx, runActiveFile, runCodeSnippet, appendToTerminal, setTerminalOutput, editorCtx]);

    const value = {
        terminals,
        activeTerminal,
        activeTerminalId,
        defaultProfile,
        setDefaultProfile,
        commands,
        isRunning,
        latestExecution,
        isSplit,
        isMaximized,
        isTaskPickerOpen,
        createTerminal,
        closeTerminal: killTerminal,
        killTerminal,
        terminateTask,
        splitTerminal,
        toggleMaximizeTerminal,
        runBuildTask,
        runSelectedText,
        showRunningTasks,
        restartRunningTask,
        configureTasks,
        configureDefaultBuildTask,
        runTask,
        openTaskPicker: () => setIsTaskPickerOpen(true),
        closeTaskPicker: () => setIsTaskPickerOpen(false),
        setActiveTerminal: (terminalOrId) => {
            const id = typeof terminalOrId === 'object' ? terminalOrId.id : terminalOrId;
            setActiveTerminalId(id);
        },
        appendOutput: appendToTerminal,
        executeCommand,
        runActiveFile
    };

    return (
        <TerminalContext.Provider value={value}>
            {children}
        </TerminalContext.Provider>
    );
}