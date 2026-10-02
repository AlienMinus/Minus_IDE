import { useState, useRef, useEffect } from "react";
import "./Navbar.css";
import DropdownMenu from "../DropdownMenu";
import useFile from "../../hooks/useFile";
import useEditor from "../../hooks/useEditor";
import useTerminal from "../../hooks/useTerminal";

import {
    FaBars,
    FaFolderOpen,
    FaPlay,
    FaSearch,
    FaSpinner
} from "react-icons/fa";

import { TbMessageChatbot } from "react-icons/tb";

import { fileMenu, editMenu, viewMenu, terminalMenu, helpMenu } from "../../data/menu.jsx";

function Navbar({ isChatOpen, toggleChat }) {
    const fileRef = useRef(null);
    const editRef = useRef(null);
    const viewRef = useRef(null);
    const terminalRef = useRef(null);
    const helpRef = useRef(null);
    const dropdownRef = useRef(null);

    const { openFolder, openFolderByPath, persistedFolderInfo } = useFile();
    const {
        activeFile,
        saveActiveFile,
        undo,
        redo,
        cut,
        copy,
        paste,
        find,
        replace,
        findInFiles,
        replaceInFiles,
        toggleLineComment,
        toggleBlockComment,
        expandEmmet
    } = useEditor();
    const {
        runActiveFile,
        isRunning,
        createTerminal,
        splitTerminal,
        toggleMaximizeTerminal,
        openTaskPicker,
        runBuildTask,
        runSelectedText,
        showRunningTasks,
        restartRunningTask,
        terminateTask,
        configureTasks,
        configureDefaultBuildTask
    } = useTerminal();
    const [openMenu, setOpenMenu] = useState(null);
    const [selectedMenu, setSelectedMenu] = useState(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const [searchQuery, setSearchQuery] = useState("");
    const closeTimer = useRef(null);

    const clearCloseTimer = () => {
        if (closeTimer.current) {
            window.clearTimeout(closeTimer.current);
            closeTimer.current = null;
        }
    };

    // Keyboard shortcuts for terminal & edit actions
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "F5") {
                e.preventDefault();
                runActiveFile();
            } else if (e.ctrlKey && e.shiftKey && (e.key === "B" || e.key === "b")) {
                e.preventDefault();
                runBuildTask();
            } else if (e.ctrlKey && e.shiftKey && e.key === "`") {
                e.preventDefault();
                createTerminal();
            } else if (e.ctrlKey && e.shiftKey && (e.key === "F" || e.key === "f")) {
                e.preventDefault();
                findInFiles();
            } else if (e.ctrlKey && e.shiftKey && (e.key === "H" || e.key === "h")) {
                e.preventDefault();
                replaceInFiles();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [runActiveFile, runBuildTask, createTerminal, findInFiles, replaceInFiles]);

    const menuButtons = [
        { key: "file", label: "File", ref: fileRef },
        { key: "edit", label: "Edit", ref: editRef },
        { key: "view", label: "View", ref: viewRef },
        { key: "terminal", label: "Terminal", ref: terminalRef },
        { key: "help", label: "Help", ref: helpRef }
    ];

    const allowedMenuKeys = new Set(menuButtons.map((item) => item.key));

    const fileMenuItems = fileMenu.map((item) => {
        if (item.id === "openFolder") {
            return {
                ...item,
                onClick: async () => {
                    await openFolder();
                    setOpenMenu(null);
                }
            };
        }

        if (item.id === "openFolderPath") {
            return {
                ...item,
                onClick: async () => {
                    const defaultPath = persistedFolderInfo?.path || "E:\\Portfolio\\portfolio_v1";
                    const inputPath = window.prompt("Enter local directory path to open as workspace:", defaultPath);
                    if (inputPath && inputPath.trim()) {
                        await openFolderByPath(inputPath.trim());
                    }
                    setOpenMenu(null);
                }
            };
        }

        if (item.id === "save") {
            return {
                ...item,
                onClick: async () => {
                    await saveActiveFile();
                    setOpenMenu(null);
                }
            };
        }

        return item;
    });

    const editMenuItems = editMenu.map((item) => {
        switch (item.id) {
            case "undo":
                return {
                    ...item,
                    onClick: () => {
                        undo();
                        setOpenMenu(null);
                    }
                };
            case "redo":
                return {
                    ...item,
                    onClick: () => {
                        redo();
                        setOpenMenu(null);
                    }
                };
            case "cut":
                return {
                    ...item,
                    onClick: () => {
                        cut();
                        setOpenMenu(null);
                    }
                };
            case "copy":
                return {
                    ...item,
                    onClick: () => {
                        copy();
                        setOpenMenu(null);
                    }
                };
            case "paste":
                return {
                    ...item,
                    onClick: () => {
                        paste();
                        setOpenMenu(null);
                    }
                };
            case "find":
                return {
                    ...item,
                    onClick: () => {
                        find();
                        setOpenMenu(null);
                    }
                };
            case "replace":
                return {
                    ...item,
                    onClick: () => {
                        replace();
                        setOpenMenu(null);
                    }
                };
            case "findInFiles":
                return {
                    ...item,
                    onClick: () => {
                        findInFiles();
                        setOpenMenu(null);
                    }
                };
            case "replaceInFiles":
                return {
                    ...item,
                    onClick: () => {
                        replaceInFiles();
                        setOpenMenu(null);
                    }
                };
            case "toggleLineComment":
                return {
                    ...item,
                    onClick: () => {
                        toggleLineComment();
                        setOpenMenu(null);
                    }
                };
            case "toggleBlockComment":
                return {
                    ...item,
                    onClick: () => {
                        toggleBlockComment();
                        setOpenMenu(null);
                    }
                };
            case "emmetExpand":
                return {
                    ...item,
                    onClick: () => {
                        expandEmmet();
                        setOpenMenu(null);
                    }
                };
            default:
                return item;
        }
    });

    const terminalMenuItems = terminalMenu.map((item) => {
        switch (item.id) {
            case "newTerminal":
                return {
                    ...item,
                    onClick: () => {
                        createTerminal();
                        setOpenMenu(null);
                    }
                };
            case "splitTerminal":
                return {
                    ...item,
                    onClick: () => {
                        splitTerminal();
                        setOpenMenu(null);
                    }
                };
            case "newTerminalWindow":
                return {
                    ...item,
                    onClick: () => {
                        toggleMaximizeTerminal();
                        setOpenMenu(null);
                    }
                };
            case "runTask":
                return {
                    ...item,
                    onClick: () => {
                        openTaskPicker();
                        setOpenMenu(null);
                    }
                };
            case "runBuildTask":
                return {
                    ...item,
                    onClick: async () => {
                        setOpenMenu(null);
                        await runBuildTask();
                    }
                };
            case "runActiveFile":
                return {
                    ...item,
                    onClick: async () => {
                        setOpenMenu(null);
                        await runActiveFile();
                    }
                };
            case "runSelectedText":
                return {
                    ...item,
                    onClick: async () => {
                        setOpenMenu(null);
                        await runSelectedText();
                    }
                };
            case "showRunningTasks":
                return {
                    ...item,
                    disabled: false,
                    onClick: async () => {
                        setOpenMenu(null);
                        await showRunningTasks();
                    }
                };
            case "restartRunningTask":
                return {
                    ...item,
                    disabled: false,
                    onClick: async () => {
                        setOpenMenu(null);
                        await restartRunningTask();
                    }
                };
            case "terminateTask":
                return {
                    ...item,
                    disabled: false,
                    onClick: () => {
                        setOpenMenu(null);
                        terminateTask();
                    }
                };
            case "configureTasks":
                return {
                    ...item,
                    onClick: () => {
                        configureTasks();
                        setOpenMenu(null);
                    }
                };
            case "configureDefaultBuildTask":
                return {
                    ...item,
                    onClick: () => {
                        configureDefaultBuildTask();
                        setOpenMenu(null);
                    }
                };
            default:
                return item;
        }
    });

    const handleMenuHover = (menu, ref) => {
        if (!allowedMenuKeys.has(menu)) {
            return;
        }

        clearCloseTimer();
        setSelectedMenu(menu);
        setOpenMenu(menu);
        const rect = ref.current.getBoundingClientRect();
        setMenuPosition({ top: rect.bottom + 5, left: rect.left });
    };

    const handleMenuLeave = () => {
        clearCloseTimer();
        closeTimer.current = window.setTimeout(() => {
            if (selectedMenu) {
                const selectedButton = menuButtons.find((button) => button.key === selectedMenu);
                if (selectedButton?.ref?.current) {
                    const rect = selectedButton.ref.current.getBoundingClientRect();
                    setMenuPosition({ top: rect.bottom + 5, left: rect.left });
                }
                setOpenMenu(selectedMenu);
            } else {
                setOpenMenu(null);
            }
        }, 250);
    };

    const handleMenuSelect = (menu, ref) => {
        if (!allowedMenuKeys.has(menu)) {
            return;
        }

        clearCloseTimer();
        if (selectedMenu === menu) {
            setSelectedMenu(null);
            setOpenMenu(null);
            return;
        }

        setSelectedMenu(menu);
        setOpenMenu(menu);
        const rect = ref.current.getBoundingClientRect();
        setMenuPosition({ top: rect.bottom + 5, left: rect.left });
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            const menuRefs = [fileRef, editRef, viewRef, terminalRef, helpRef, dropdownRef].filter(Boolean);
            if (menuRefs.every(ref => ref.current && !ref.current.contains(event.target))) {
                setOpenMenu(null);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            clearCloseTimer();
        };
    }, [openMenu]);


    return (
        <header className="navbar">

            {/* Left */}

            <div className="navbar-left">

                <button className="icon-btn">
                    <FaBars />
                </button>

                <h2 className="logo">
                    <img src="/favicon-nobg.png" alt="Favicon" className="logo-image" />yperion IDE
                </h2>


                <div className="navbar-menu">
                    {menuButtons.map((button) => (
                        <button
                            key={button.key}
                            ref={button.ref}
                            className={`menu-btn ${selectedMenu === button.key ? 'active' : ''}`}
                            onMouseEnter={() => handleMenuHover(button.key, button.ref)}
                            onMouseLeave={() => handleMenuLeave()}
                            onClick={() => handleMenuSelect(button.key, button.ref)}
                        >
                            {button.label}
                        </button>
                    ))}
                </div>

            </div>

            {/* Center */}

            <div className="navbar-center">
                <div className="search-bar">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search files, symbols, commands..."
                        className="search-input"
                    />
                    <FaSearch className="search-icon" />
                </div>
            </div>

            {/* Right */}

            <div className="navbar-right">

                <button
                    className={`icon-btn run-btn ${isRunning ? 'running' : ''}`}
                    onClick={() => runActiveFile()}
                    disabled={isRunning}
                    title={activeFile ? `Run ${activeFile.name} in Hyperion Terminal (F5)` : 'Run Active File (F5)'}
                >
                    {isRunning ? <FaSpinner className="run-icon spin-icon" /> : <FaPlay className="run-icon" />}
                </button>

                <button
                    className={`icon-btn ${isChatOpen ? "active" : ""}`}
                    onClick={toggleChat}
                    title="Toggle Chat"
                >
                    <TbMessageChatbot />
                </button>

            </div>
            
            {openMenu === 'file' && <DropdownMenu ref={dropdownRef} menu={fileMenuItems} position={menuPosition} />}
            {openMenu === 'edit' && <DropdownMenu ref={dropdownRef} menu={editMenuItems} position={menuPosition} />}
            {openMenu === 'view' && <DropdownMenu ref={dropdownRef} menu={viewMenu} position={menuPosition} />}
            {openMenu === 'terminal' && <DropdownMenu ref={dropdownRef} menu={terminalMenuItems} position={menuPosition} />}
            {openMenu === 'help' && <DropdownMenu ref={dropdownRef} menu={helpMenu} position={menuPosition} />}


        </header>
    );

}

export default Navbar;