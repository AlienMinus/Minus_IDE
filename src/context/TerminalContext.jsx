import { createContext, useState, useContext, useCallback } from "react";
import commandsData from "../data/commands.json";
import { executeCode, executeCommand as executeShellCommand, getSandboxStatus, detectLanguage } from "../services/sandboxService";
import { EditorContext } from "./EditorContext";

export const TerminalContext = createContext();

export function TerminalProvider({ children }) {
    const editorCtx = useContext(EditorContext);
    const activeFile = editorCtx?.activeFile;
    const files = editorCtx?.files || [];
    const openPreviewTab = editorCtx?.openPreviewTab;

    const [terminals, setTerminals] = useState([
        {
            id: 1,
            title: "Terminal 1",
            cwd: "~/HyperionIDE",
            history: [],
            output: [
                "\x1b[1;36m========================================================\x1b[0m",
                "\x1b[1;36m  Hyperion IDE Execution Sandbox Terminal v2.0         \x1b[0m",
                "\x1b[1;36m========================================================\x1b[0m",
                "\x1b[32m✔ Sandbox Engine: Online\x1b[0m",
                "\x1b[90mSupported Runtimes: C (GCC), Python 3.12, Node.js, Bash, React 19\x1b[0m",
                "\x1b[90mType '\x1b[33mhelp\x1b[90m' for command list, '\x1b[33mruntimes\x1b[90m' to check compilers, or '\x1b[33mrun\x1b[90m' to execute current file.\x1b[0m",
                "",
                "$ "
            ]
        }
    ]);
    const [activeTerminalId, setActiveTerminalId] = useState(1);
    const [commands] = useState(commandsData);
    const [isRunning, setIsRunning] = useState(false);
    const [latestExecution, setLatestExecution] = useState(null);

    const activeTerminal = terminals.find(t => t.id === activeTerminalId) || terminals[0];

    function createTerminal() {
        const newId = Date.now();
        const newTerminal = {
            id: newId,
            title: `Terminal ${terminals.length + 1}`,
            cwd: "~/HyperionIDE",
            history: [],
            output: [
                `Hyperion Terminal ${terminals.length + 1}`,
                "--------------------------------",
                "$ "
            ]
        };

        setTerminals(prev => [...prev, newTerminal]);
        setActiveTerminalId(newId);
    }

    function closeTerminal(id) {
        const updated = terminals.filter(t => t.id !== id);
        setTerminals(updated);
        if (activeTerminalId === id) {
            setActiveTerminalId(updated.length > 0 ? updated[0].id : null);
        }
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

            // Record execution metadata for Output panel
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

            // Stdout
            if (res.stdout) {
                const formatted = res.stdout.replace(/\r\n/g, '\n').split('\n');
                outputLines.push(...formatted);
            }

            // Stderr
            if (res.stderr) {
                const formattedErr = res.stderr.replace(/\r\n/g, '\n').split('\n')
                    .map(line => `\x1b[31m${line}\x1b[0m`);
                outputLines.push(...formattedErr);
            }

            // Status message
            if (res.success) {
                outputLines.push(`\x1b[32m✔ [Process exited with code ${res.exitCode ?? 0} in ${duration}ms]\x1b[0m`);
            } else {
                outputLines.push(`\x1b[31m✘ [Process failed with exit code ${res.exitCode ?? 1} in ${duration}ms]\x1b[0m`);
            }

            // If React, trigger live preview if available
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
     * Execute Terminal Command
     */
    const executeCommand = useCallback(async (command) => {
        if (!activeTerminal) return;

        const trimmed = command.trim();
        const commandWithPrompt = `$ ${command}`;
        const newHistory = [...activeTerminal.history, command];

        // Empty command (Enter on blank line)
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

        // Add command with prompt to history and output immediately
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

        // 1. CLEAR
        if (cmd === "clear") {
            setTerminalOutput(["$ "]);
            return;
        }

        // 2. HELP
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

        // 3. RUNTIMES / STATUS
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

        // 4. SMART RUN: run OR run <filename>
        if (cmd === "run") {
            if (!argsStr) {
                // Run currently active file
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

        // 5. DIRECT LANGUAGE RUNNERS
        // c <filename> or c <code>
        if (cmd === "c" && argsStr) {
            const foundFile = files.find(f => f.name === argsStr);
            const codeToRun = foundFile ? foundFile.content : argsStr;
            const fname = foundFile ? foundFile.name : 'main.c';
            await runCodeSnippet({ language: 'c', code: codeToRun, filename: fname, targetFile: foundFile });
            return;
        }

        // react <filename>
        if (cmd === "react" && argsStr) {
            const foundFile = files.find(f => f.name === argsStr);
            if (foundFile) {
                await runCodeSnippet({ language: 'react', code: foundFile.content || '', filename: foundFile.name, targetFile: foundFile });
            } else {
                appendToTerminal([`\x1b[31mFile '${argsStr}' not found in workspace.\x1b[0m`, "$ "]);
            }
            return;
        }

        // 6. BUILT-IN UTILITY COMMANDS (date, time, history, echo)
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

        // 7. GENERAL SHELL & TERMINAL COMMANDS (ls, dir, cat, python, node, bash, gcc, echo, pipes, etc.)
        setIsRunning(true);
        try {
            const res = await executeShellCommand(trimmed, {
                virtualFiles: files
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

    }, [activeTerminal, activeTerminalId, files, runActiveFile, runCodeSnippet, appendToTerminal, setTerminalOutput]);

    const value = {
        terminals,
        activeTerminal,
        activeTerminalId,
        commands,
        isRunning,
        latestExecution,
        createTerminal,
        closeTerminal,
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