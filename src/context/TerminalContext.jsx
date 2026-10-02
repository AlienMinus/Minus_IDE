import { createContext, useState, useContext, useCallback, useRef, useEffect } from "react";
import commandsData from "../data/commands.json";
import {
  executeCode,
  executeCommand as executeShellCommand,
  getSandboxStatus,
  detectLanguage,
  validateWorkspacePath
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
        const initialCwd = currentWorkspacePath || "~/HyperionIDE";
        return [
            {
                id: 1,
                title: "Terminal 1",
                cwd: initialCwd,
                history: [],
                output: [
                    "\x1b[1;36m========================================================\x1b[0m",
                    "\x1b[1;36m  Hyperion IDE Execution Sandbox Terminal v2.0         \x1b[0m",
                    "\x1b[1;36m========================================================\x1b[0m",
                    "\x1b[32m✔ Sandbox Engine: Online\x1b[0m",
                    initialCwd && initialCwd !== "~/HyperionIDE"
                        ? `\x1b[34m📁 Workspace Directory:\x1b[0m \x1b[1m${initialCwd}\x1b[0m`
                        : "\x1b[90mTip: Open a folder to bind the terminal to that directory.\x1b[0m",
                    "\x1b[90mSupported Runtimes: C (GCC), Python 3.12, Node.js, Bash, React 19\x1b[0m",
                    "\x1b[90mType '\x1b[33mhelp\x1b[90m' for command list, '\x1b[33mruntimes\x1b[90m' to check compilers, or '\x1b[33mpwd\x1b[90m' for directory.\x1b[0m",
                    "",
                    "$ "
                ]
            }
        ];
    });

    // Sync terminal cwd whenever workspace folder path is updated / resolved
    useEffect(() => {
        if (currentWorkspacePath && (currentWorkspacePath.includes(':') || currentWorkspacePath.includes('/'))) {
            setTerminals(prev => prev.map(t => {
                if (!t.cwd || t.cwd === "~/HyperionIDE" || t.cwd === "portfolio_v1" || !t.cwd.includes(':')) {
                    return { ...t, cwd: currentWorkspacePath };
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

    const activeTerminal = terminals.find(t => t.id === activeTerminalId) || terminals[0];

    function createTerminal() {
        const newId = Date.now();
        const termCwd = activeTerminal?.cwd || currentWorkspacePath || "~/HyperionIDE";
        const newTerminal = {
            id: newId,
            title: `Terminal ${terminals.length + 1}`,
            cwd: termCwd,
            history: [],
            output: [
                `Hyperion Terminal ${terminals.length + 1}`,
                `Directory: ${termCwd}`,
                "--------------------------------",
                "$ "
            ]
        };

        setTerminals(prev => [...prev, newTerminal]);
        setActiveTerminalId(newId);
    }

    /**
     * Kill Terminal (terminate terminal session and reset if all killed)
     */
    function killTerminal(idToKill) {
        const targetId = idToKill || activeTerminalId;
        setIsRunning(false);

        setTerminals(prev => {
            const updated = prev.filter(t => t.id !== targetId);
            if (updated.length === 0) {
                const freshId = Date.now();
                const freshTerm = {
                    id: freshId,
                    title: "Terminal 1",
                    cwd: "~/HyperionIDE",
                    history: [],
                    output: [
                        "\x1b[33m[Hyperion] Terminal reset.\x1b[0m",
                        "$ "
                    ]
                };
                setActiveTerminalId(freshId);
                return [freshTerm];
            }

            if (activeTerminalId === targetId) {
                setActiveTerminalId(updated[0].id);
            }
            return updated;
        });

        if (isSplit && terminals.length <= 2) {
            setIsSplit(false);
        }
    }

    /**
     * Terminate currently running task / process
     */
    function terminateTask() {
        setIsRunning(false);
        appendToTerminal([
            "\x1b[31m[Terminated] Running task was terminated by user.\x1b[0m",
            "$ "
        ]);
    }

    /**
     * Split terminal side by side
     */
    function splitTerminal() {
        const newId = Date.now();
        const termCwd = activeTerminal?.cwd || currentWorkspacePath || "~/HyperionIDE";
        const newTerm = {
            id: newId,
            title: `Terminal ${terminals.length + 1} (Split)`,
            cwd: termCwd,
            history: [],
            output: [
                "\x1b[36m[Split Terminal Pane]\x1b[0m",
                `Directory: ${termCwd}`,
                "$ "
            ]
        };

        setTerminals(prev => [...prev, newTerm]);
        setIsSplit(true);
    }

    function toggleMaximizeTerminal() {
        setIsMaximized(prev => !prev);
    }

    const appendToTerminal = useCallback((textOrLines) => {
        setTerminals(prev => prev.map(t => {
            if (t.id !== activeTerminalId) return t;
            const newLines = Array.isArray(textOrLines) ? textOrLines : [textOrLines];
            return {
                ...t,
                output: [...t.output, ...newLines]
            };
        }));
    }, [activeTerminalId]);

    const setTerminalOutput = useCallback((newOutput) => {
        setTerminals(prev => prev.map(t => {
            if (t.id !== activeTerminalId) return t;
            return {
                ...t,
                output: newOutput
            };
        }));
    }, [activeTerminalId]);

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
     * Configure Tasks... (Opens .vscode/tasks.json)
     */
    const configureTasks = useCallback(() => {
        if (createOrOpenFile) {
            createOrOpenFile(".vscode/tasks.json", DEFAULT_TASKS_JSON);
            appendToTerminal([
                "\x1b[36m[Hyperion] Opened .vscode/tasks.json in the editor.\x1b[0m",
                "$ "
            ]);
        }
    }, [createOrOpenFile, appendToTerminal]);

    /**
     * Configure Default Build Task...
     */
    const configureDefaultBuildTask = useCallback(() => {
        if (createOrOpenFile) {
            createOrOpenFile(".vscode/tasks.json", DEFAULT_TASKS_JSON);
            appendToTerminal([
                "\x1b[36m[Hyperion] Configured default build task in .vscode/tasks.json\x1b[0m",
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
    const executeCommand = useCallback(async (command) => {
        if (!activeTerminal) return;

        const trimmed = command.trim();
        const commandWithPrompt = `$ ${command}`;
        const newHistory = [...activeTerminal.history, command];

        if (!trimmed) {
            setTerminals(prev => prev.map(t => {
                if (t.id !== activeTerminalId) return t;
                return {
                    ...t,
                    output: [...t.output, "$ "]
                };
            }));
            return;
        }

        setTerminals(prev => prev.map(t => {
            if (t.id !== activeTerminalId) return t;
            return {
                ...t,
                history: newHistory,
                output: [...t.output, commandWithPrompt]
            };
        }));

        const parts = trimmed.split(/\s+/);
        const cmd = parts[0].toLowerCase();
        const argsStr = parts.slice(1).join(" ");

        if (cmd === "clear") {
            setTerminalOutput(["$ "]);
            return;
        }

        if (cmd === "kill" || cmd === "exit") {
            killTerminal(activeTerminalId);
            return;
        }

        if (cmd === "help") {
            const helpLines = [
                "\x1b[1;36m=== Hyperion IDE Sandbox Commands & Runtimes ===\x1b[0m",
                "",
                "\x1b[1;33mExecution Commands:\x1b[0m",
                "  \x1b[32mrun\x1b[0m              - Run active file in appropriate sandbox (C, Python, Node, Bash, React)",
                "  \x1b[32mrun <file>\x1b[0m       - Run specific file from workspace (e.g. run main.c, run script.py)",
                "  \x1b[32mruntimes\x1b[0m         - Inspect sandbox status, versions, compilers, and paths",
                "  \x1b[32mc <file|code>\x1b[0m    - Compile and run C code via MinGW GCC",
                "  \x1b[32mpython <file>\x1b[0m    - Execute Python code via Python 3.12 (or: python -c \"code\")",
                "  \x1b[32mnode <file>\x1b[0m      - Execute JavaScript via Node.js (or: node -e \"code\")",
                "  \x1b[32mbash <file>\x1b[0m      - Execute Bash shell script or commands via GNU Bash",
                "  \x1b[32mreact <file>\x1b[0m     - Transpile & preview React 19 JSX component",
                "",
                "\x1b[1;33mShell Commands:\x1b[0m",
                "  \x1b[32mls, dir\x1b[0m          - List files in current sandbox workspace",
                "  \x1b[32mcat <file>\x1b[0m       - Display file content",
                "  \x1b[32mpwd\x1b[0m              - Print working directory",
                "  \x1b[32mecho <text>\x1b[0m      - Output text",
                "  \x1b[32mkill, exit\x1b[0m       - Kill current terminal session",
                "  \x1b[32mclear\x1b[0m            - Clear terminal (shortcut: Ctrl+L)",
                "  \x1b[32mhistory\x1b[0m          - Show command history",
                "  \x1b[32mdate, time\x1b[0m       - Show date and time",
                "",
                "\x1b[90mTip: You can also click the ▶ Run button in the top navbar to execute the active file.\x1b[0m",
                "$ "
            ];
            appendToTerminal(helpLines);
            return;
        }

        if (cmd === "runtimes" || cmd === "sandboxes" || cmd === "status") {
            appendToTerminal(["\x1b[34m[Hyperion]\x1b[0m Checking sandbox compilers and runtimes..."]);
            try {
                const info = await getSandboxStatus();
                const runtimes = info.data?.runtimes || {};
                const lines = [
                    "\x1b[1;32mHyperion Sandbox Environment:\x1b[0m",
                    `  OS: ${info.data?.os || 'Windows (x64)'}`,
                    `  Status: \x1b[32m${info.status.toUpperCase()}\x1b[0m`,
                    "--------------------------------------------------",
                    `  \x1b[1mC Language:\x1b[0m    ${runtimes.c?.available ? '\x1b[32m✔ Available\x1b[0m (' + runtimes.c.version + ')' : '\x1b[31m✘ Not Found\x1b[0m'}`,
                    `  \x1b[1mPython:\x1b[0m        ${runtimes.python?.available ? '\x1b[32m✔ Available\x1b[0m (' + runtimes.python.version + ')' : '\x1b[31m✘ Not Found\x1b[0m'}`,
                    `  \x1b[1mNode.js:\x1b[0m       ${runtimes.node?.available ? '\x1b[32m✔ Available\x1b[0m (' + runtimes.node.version + ')' : '\x1b[31m✘ Not Found\x1b[0m'}`,
                    `  \x1b[1mJavaScript:\x1b[0m    ${runtimes.javascript?.available ? '\x1b[32m✔ Available\x1b[0m (' + runtimes.javascript.version + ')' : '\x1b[31m✘ Not Found\x1b[0m'}`,
                    `  \x1b[1mGNU Bash:\x1b[0m      ${runtimes.bash?.available ? '\x1b[32m✔ Available\x1b[0m (' + runtimes.bash.version + ')' : '\x1b[31m✘ Not Found\x1b[0m'}`,
                    `  \x1b[1mReact Engine:\x1b[0m  ${runtimes.react?.available ? '\x1b[32m✔ Available\x1b[0m (' + runtimes.react.version + ')' : '\x1b[31m✘ Not Found\x1b[0m'}`,
                    "--------------------------------------------------",
                    "$ "
                ];
                appendToTerminal(lines);
            } catch (err) {
                appendToTerminal([`\x1b[31mFailed to retrieve status: ${err.message}\x1b[0m`, "$ "]);
            }
            return;
        }

        if (cmd === "run") {
            if (!argsStr) {
                await runActiveFile();
                return;
            }

            const targetFilename = argsStr.trim();
            const foundFile = files.find(f => f.name.toLowerCase() === targetFilename.toLowerCase() || (f.path && f.path.toLowerCase().endsWith(targetFilename.toLowerCase())));

            if (!foundFile) {
                const targetLang = detectLanguage(targetFilename);
                appendToTerminal([
                    `\x1b[34m[Sandbox]\x1b[0m Executing '${targetFilename}' (${targetLang.toUpperCase()}) via shell...`
                ]);
                const shellRes = await executeShellCommand(`run ${targetFilename}`, { virtualFiles: files });
                appendToTerminal([
                    shellRes.stdout || '',
                    shellRes.stderr ? `\x1b[31m${shellRes.stderr}\x1b[0m` : '',
                    "$ "
                ].filter(Boolean));
                return;
            }

            const lang = detectLanguage(foundFile.name);
            await runCodeSnippet({
                language: lang,
                code: foundFile.content || '',
                filename: foundFile.name,
                targetFile: foundFile
            });
            return;
        }

        if (cmd === "c" && argsStr) {
            const foundFile = files.find(f => f.name === argsStr);
            const codeToRun = foundFile ? foundFile.content : argsStr;
            const fname = foundFile ? foundFile.name : 'main.c';
            await runCodeSnippet({ language: 'c', code: codeToRun, filename: fname, targetFile: foundFile });
            return;
        }

        if (cmd === "react" && argsStr) {
            const foundFile = files.find(f => f.name === argsStr);
            if (foundFile) {
                await runCodeSnippet({ language: 'react', code: foundFile.content || '', filename: foundFile.name, targetFile: foundFile });
            } else {
                appendToTerminal([`\x1b[31mFile '${argsStr}' not found in workspace.\x1b[0m`, "$ "]);
            }
            return;
        }

        if (cmd === "date") {
            appendToTerminal([new Date().toLocaleDateString(), "$ "]);
            return;
        }

        if (cmd === "time") {
            appendToTerminal([new Date().toLocaleTimeString(), "$ "]);
            return;
        }

        if (cmd === "history") {
            appendToTerminal([...newHistory, "$ "]);
            return;
        }

        if (cmd === "color") {
            document.documentElement.style.setProperty('--text-color', argsStr);
            appendToTerminal([`Text color changed to ${argsStr}`, "$ "]);
            return;
        }

        if (cmd === "resetcolor") {
            document.documentElement.style.setProperty('--text-color', '#0f0');
            appendToTerminal(["Text color reset to default", "$ "]);
            return;
        }

        if (cmd === "cd") {
            const target = argsStr.trim();
            if (!target || target === "~") {
                const homeOrRoot = currentWorkspacePath || "~/HyperionIDE";
                setTerminals((prev) =>
                    prev.map((t) => (t.id === activeTerminalId ? { ...t, cwd: homeOrRoot } : t))
                );
                appendToTerminal([`\x1b[32m✔ Directory: ${homeOrRoot}\x1b[0m`, "$ "]);
                return;
            }

            let candidate = target.replace(/^["']|["']$/g, "");
            if (!candidate.includes(":") && !candidate.startsWith("/") && !candidate.startsWith("\\")) {
                const base = (activeTerminal?.cwd || currentWorkspacePath || "").replace(/\\/g, "/");
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
                    setTerminals((prev) =>
                        prev.map((t) => (t.id === activeTerminalId ? { ...t, cwd: finalPath } : t))
                    );
                    if (fileCtx?.setWorkspacePath) {
                        fileCtx.setWorkspacePath(finalPath);
                    }
                    saveWorkspaceState({ folderPath: finalPath });
                    appendToTerminal([`\x1b[32m✔ Directory changed to: ${finalPath}\x1b[0m`, "$ "]);
                } else {
                    appendToTerminal([`\x1b[31mcd: no such file or directory: ${target}\x1b[0m`, "$ "]);
                }
            } catch (err) {
                appendToTerminal([`\x1b[31mcd error: ${err.message}\x1b[0m`, "$ "]);
            }
            return;
        }

        if (cmd === "pwd" || cmd === "cwd") {
            const currentCwd = activeTerminal?.cwd || currentWorkspacePath || "~/HyperionIDE";
            const isPhysical = currentCwd && (currentCwd.includes(':') || currentCwd.startsWith('/'));
            try {
                const res = await executeShellCommand("pwd", {
                    cwd: currentCwd,
                    virtualFiles: isPhysical ? undefined : files
                });
                const outLines = [];
                if (res.cwd) {
                    outLines.push(res.cwd);
                } else if (res.stdout) {
                    outLines.push(...res.stdout.trim().split("\n"));
                } else {
                    outLines.push(currentCwd);
                }
                outLines.push("$ ");
                appendToTerminal(outLines);
            } catch {
                appendToTerminal([currentCwd, "$ "]);
            }
            return;
        }

        setIsRunning(true);
        lastActionRef.current = { type: 'command', command: trimmed };

        try {
            const targetCwd = activeTerminal?.cwd || currentWorkspacePath;
            const isPhysical = targetCwd && (targetCwd.includes(':') || targetCwd.startsWith('/'));
            const res = await executeShellCommand(trimmed, {
                cwd: targetCwd,
                virtualFiles: isPhysical ? undefined : files
            });

            const outLines = [];
            if (res.stdout) {
                const stdoutFormatted = res.stdout.replace(/\r\n/g, '\n').split('\n');
                outLines.push(...stdoutFormatted);
            }
            if (res.stderr) {
                const stderrFormatted = res.stderr.replace(/\r\n/g, '\n').split('\n')
                    .map(l => `\x1b[31m${l}\x1b[0m`);
                outLines.push(...stderrFormatted);
            }

            outLines.push("$ ");
            appendToTerminal(outLines);

        } catch (err) {
            appendToTerminal([
                `\x1b[31mCommand execution error: ${err.message}\x1b[0m`,
                "$ "
            ]);
        } finally {
            setIsRunning(false);
        }

    }, [activeTerminal, activeTerminalId, files, currentWorkspacePath, fileCtx, runActiveFile, runCodeSnippet, appendToTerminal, setTerminalOutput]);

    const value = {
        terminals,
        activeTerminal,
        activeTerminalId,
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