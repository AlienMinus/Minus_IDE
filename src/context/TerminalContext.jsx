import { createContext, useState, useEffect } from "react";
import commandsData from "../data/commands.json";

export const TerminalContext = createContext();

export function TerminalProvider({ children }) {
    const [terminals, setTerminals] = useState([
        {
            id: 1,
            title: "Terminal 1",
            cwd: "~/WebIDE",
            history: [],
            output: [
                "WebIDE Terminal",
                "--------------------------------",
                "Node.js v22.0.0",
                "",
                "$ "
            ]
        }
    ]);
    const [activeTerminal, setActiveTerminal] = useState(terminals[0]);
    const [commands] = useState(commandsData);

    function createTerminal() {

        const newTerminal = {
            id: Date.now(),
            title: `Terminal ${terminals.length + 1}`,
            cwd: "~/WebIDE",
            history: [],
            output: ["$ "]
        };

        setTerminals(prev => [...prev, newTerminal]);
        setActiveTerminal(newTerminal);

    }

    function closeTerminal(id) {

        const updated = terminals.filter(
            terminal => terminal.id !== id
        );

        setTerminals(updated);

        if (activeTerminal?.id === id) {

            if (updated.length > 0) {
                setActiveTerminal(updated[0]);
            }
            else {
                setActiveTerminal(null);
            }

        }

    }

    function appendOutput(text) {

        if (!activeTerminal) return;

        const updatedTerminals = terminals.map(terminal => {

            if (terminal.id === activeTerminal.id) {

                return {
                    ...terminal,
                    output: [...terminal.output, text]
                };

            }

            return terminal;

        });

        setTerminals(updatedTerminals);

        setActiveTerminal(
            updatedTerminals.find(
                terminal => terminal.id === activeTerminal.id
            )
        );

    }

    function executeCommand(command) {
        if (!activeTerminal) return;

        const commandWithPrompt = `$ ${command}`;
        const newHistory = [...activeTerminal.history, command];

        const execute = () => {
            const parts = command.trim().split(" ");
            const cmd = parts[0];
            const args = parts.slice(1).join(" ");
            let output = [...activeTerminal.output, commandWithPrompt];

            const append = (text) => {
                output.push(text);
            };

            switch (cmd) {
                case "help":
                    append("Available commands:");
                    commands.forEach(c => {
                        if (c.usage) {
                            append(`  ${c.command} - ${c.description} (e.g., ${c.usage})`);
                        } else {
                            append(`  ${c.command} - ${c.description}`);
                        }
                    });
                    break;
                case "date":
                    append(new Date().toLocaleDateString());
                    break;
                case "time":
                    append(new Date().toLocaleTimeString());
                    break;
                case "history":
                    newHistory.forEach(c => append(c));
                    break;
                case "clear":
                    output = [];
                    break;
                case "echo":
                    let echoOutput = args;
                    if ((args.startsWith('"') && args.endsWith('"')) || (args.startsWith("'") && args.endsWith("'"))) {
                        echoOutput = args.substring(1, args.length - 1);
                    }
                    append(echoOutput);
                    break;
                case "color":
                    document.documentElement.style.setProperty('--text-color', args);
                    append("Text color changed to " + args);
                    break;
                case "resetcolor":
                    document.documentElement.style.setProperty('--text-color', '#0f0');
                    append("Text color reset to default");
                    break;
                default:
                    append(`Command not found: ${command}`);
                    break;
            }
            append("$ ");
            return output;
        };

        const newOutput = execute();
        const finalTerminal = {
            ...activeTerminal,
            history: newHistory,
            output: newOutput,
        };

        const updatedTerminals = terminals.map(t =>
            t.id === activeTerminal.id ? finalTerminal : t
        );

        setTerminals(updatedTerminals);
        setActiveTerminal(finalTerminal);
    }

    const value = {
        terminals,
        activeTerminal,
        commands,
        createTerminal,
        closeTerminal,
        setActiveTerminal,
        appendOutput,
        executeCommand
    };

    return (
        <TerminalContext.Provider value={value}>
            {children}
        </TerminalContext.Provider>
    );
}