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
        expandEmmet,
        openView,
        toggleWordWrap,
        toggleSidebar,
        toggleBottomPanel,
        toggleStatusBar,
        toggleZenMode,
        toggleFullScreen,
        setIsCommandPaletteOpen,
        setCommandPaletteMode,
        editorRef
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

    // Keyboard shortcuts for terminal, edit & view actions
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "F5") {
                e.preventDefault();
                runActiveFile();
            } else if (e.key === "F11") {
                e.preventDefault();
                toggleFullScreen();
            } else if (e.ctrlKey && e.shiftKey && (e.key === "P" || e.key === "p")) {
                e.preventDefault();
                setCommandPaletteMode("commands");
                setIsCommandPaletteOpen(true);
            } else if (e.ctrlKey && e.shiftKey && (e.key === "E" || e.key === "e")) {
                e.preventDefault();
                openView("explorer");
            } else if (e.ctrlKey && e.shiftKey && (e.key === "F" || e.key === "f")) {
                e.preventDefault();
                openView("search");
            } else if (e.ctrlKey && e.shiftKey && (e.key === "G" || e.key === "g")) {
                e.preventDefault();
                openView("git");
            } else if (e.ctrlKey && e.shiftKey && (e.key === "D" || e.key === "d")) {
                e.preventDefault();
                openView("run");
            } else if (e.ctrlKey && e.shiftKey && (e.key === "X" || e.key === "x")) {
                e.preventDefault();
                openView("extensions");
            } else if (e.ctrlKey && e.altKey && (e.key === "I" || e.key === "i")) {
                e.preventDefault();
                if (toggleChat) toggleChat();
            } else if (e.ctrlKey && e.altKey && (e.key === "/" || e.key === "?")) {
                e.preventDefault();
                openView("browser");
            } else if (e.ctrlKey && e.shiftKey && (e.key === "M" || e.key === "m")) {
                e.preventDefault();
                openView("problems");
            } else if (e.ctrlKey && e.shiftKey && (e.key === "U" || e.key === "u")) {
                e.preventDefault();
                openView("output");
            } else if (e.ctrlKey && e.shiftKey && (e.key === "Y" || e.key === "y")) {
                e.preventDefault();
                openView("debugConsole");
            } else if (e.ctrlKey && e.key === "`" && !e.shiftKey) {
                e.preventDefault();
                openView("terminal");
            } else if (e.altKey && (e.key === "Z" || e.key === "z")) {
                e.preventDefault();
                toggleWordWrap();
            } else if (e.ctrlKey && (e.key === "B" || e.key === "b") && !e.shiftKey) {
                e.preventDefault();
                toggleSidebar();
            } else if (e.ctrlKey && (e.key === "J" || e.key === "j") && !e.shiftKey) {
                e.preventDefault();
                toggleBottomPanel();
            } else if (e.ctrlKey && e.shiftKey && (e.key === "B" || e.key === "b")) {
                e.preventDefault();
                runBuildTask();
            } else if (e.ctrlKey && e.shiftKey && e.key === "`") {
                e.preventDefault();
                createTerminal();
            } else if (e.ctrlKey && e.shiftKey && (e.key === "H" || e.key === "h")) {
                e.preventDefault();
                replaceInFiles();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [
        runActiveFile,
        runBuildTask,
        createTerminal,
        replaceInFiles,
        openView,
        toggleWordWrap,
        toggleSidebar,
        toggleBottomPanel,
        toggleFullScreen,
        setIsCommandPaletteOpen,
        setCommandPaletteMode,
        toggleChat
    ]);

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

    const viewMenuItems = viewMenu.map((item) => {
        switch (item.id) {
            case "commandPalette":
                return {
                    ...item,
                    onClick: () => {
                        setCommandPaletteMode("commands");
                        setIsCommandPaletteOpen(true);
                        setOpenMenu(null);
                    }
                };
            case "openView":
                return {
                    ...item,
                    onClick: () => {
                        setCommandPaletteMode("views");
                        setIsCommandPaletteOpen(true);
                        setOpenMenu(null);
                    }
                };
            case "appearance":
                return {
                    ...item,
                    items: (item.items || []).map((subItem) => {
                        switch (subItem.id) {
                            case "toggleFullScreen":
                                return {
                                    ...subItem,
                                    onClick: () => {
                                        toggleFullScreen();
                                        setOpenMenu(null);
                                    }
                                };
                            case "toggleZenMode":
                                return {
                                    ...subItem,
                                    onClick: () => {
                                        toggleZenMode();
                                        setOpenMenu(null);
                                    }
                                };
                            case "toggleSidebar":
                                return {
                                    ...subItem,
                                    onClick: () => {
                                        toggleSidebar();
                                        setOpenMenu(null);
                                    }
                                };
                            case "togglePanel":
                                return {
                                    ...subItem,
                                    onClick: () => {
                                        toggleBottomPanel();
                                        setOpenMenu(null);
                                    }
                                };
                            case "toggleStatusBar":
                                return {
                                    ...subItem,
                                    onClick: () => {
                                        toggleStatusBar();
                                        setOpenMenu(null);
                                    }
                                };
                            case "zoomIn":
                                return {
                                    ...subItem,
                                    onClick: () => {
                                        editorRef.current?.trigger("editor", "editor.action.fontZoomIn", null);
                                        setOpenMenu(null);
                                    }
                                };
                            case "zoomOut":
                                return {
                                    ...subItem,
                                    onClick: () => {
                                        editorRef.current?.trigger("editor", "editor.action.fontZoomOut", null);
                                        setOpenMenu(null);
                                    }
                                };
                            case "resetZoom":
                                return {
                                    ...subItem,
                                    onClick: () => {
                                        editorRef.current?.trigger("editor", "editor.action.fontZoomReset", null);
                                        setOpenMenu(null);
                                    }
                                };
                            default:
                                return subItem;
                        }
                    })
                };
            case "editorLayout":
                return {
                    ...item,
                    items: (item.items || []).map((subItem) => {
                        switch (subItem.id) {
                            case "layoutSingle":
                                return {
                                    ...subItem,
                                    onClick: () => {
                                        openView("explorer");
                                        setOpenMenu(null);
                                    }
                                };
                            case "layoutSplitRight":
                            case "layoutSplitDown":
                                return {
                                    ...subItem,
                                    onClick: () => {
                                        splitTerminal();
                                        setOpenMenu(null);
                                    }
                                };
                            case "toggleMaximized":
                                return {
                                    ...subItem,
                                    onClick: () => {
                                        toggleMaximizeTerminal();
                                        setOpenMenu(null);
                                    }
                                };
                            default:
                                return subItem;
                        }
                    })
                };
            case "explorer":
                return {
                    ...item,
                    onClick: () => {
                        openView("explorer");
                        setOpenMenu(null);
                    }
                };
            case "search":
                return {
                    ...item,
                    onClick: () => {
                        openView("search");
                        setOpenMenu(null);
                    }
                };
            case "sourceControl":
                return {
                    ...item,
                    onClick: () => {
                        openView("git");
                        setOpenMenu(null);
                    }
                };
            case "run":
                return {
                    ...item,
                    onClick: () => {
                        openView("run");
                        setOpenMenu(null);
                    }
                };
            case "extensions":
                return {
                    ...item,
                    onClick: () => {
                        openView("extensions");
                        setOpenMenu(null);
                    }
                };
            case "chat":
                return {
                    ...item,
                    onClick: () => {
                        if (toggleChat) toggleChat();
                        setOpenMenu(null);
                    }
                };
            case "browser":
                return {
                    ...item,
                    onClick: () => {
                        openView("browser");
                        setOpenMenu(null);
                    }
                };
            case "problems":
                return {
                    ...item,
                    onClick: () => {
                        openView("problems");
                        setOpenMenu(null);
                    }
                };
            case "output":
                return {
                    ...item,
                    onClick: () => {
                        openView("output");
                        setOpenMenu(null);
                    }
                };
            case "debugConsole":
                return {
                    ...item,
                    onClick: () => {
                        openView("debugConsole");
                        setOpenMenu(null);
                    }
                };
            case "terminal":
                return {
                    ...item,
                    onClick: () => {
                        openView("terminal");
                        setOpenMenu(null);
                    }
                };
            case "wordWrap":
                return {
                    ...item,
                    onClick: () => {
                        toggleWordWrap();
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
            
            {openMenu === 'file' && <DropdownMenu ref={dropdownRef} menu={fileMenuItems} position={menuPosition} onItemClick={() => setOpenMenu(null)} />}
            {openMenu === 'edit' && <DropdownMenu ref={dropdownRef} menu={editMenuItems} position={menuPosition} onItemClick={() => setOpenMenu(null)} />}
            {openMenu === 'view' && <DropdownMenu ref={dropdownRef} menu={viewMenuItems} position={menuPosition} onItemClick={() => setOpenMenu(null)} />}
            {openMenu === 'terminal' && <DropdownMenu ref={dropdownRef} menu={terminalMenuItems} position={menuPosition} onItemClick={() => setOpenMenu(null)} />}
            {openMenu === 'help' && <DropdownMenu ref={dropdownRef} menu={helpMenu} position={menuPosition} onItemClick={() => setOpenMenu(null)} />}


        </header>
    );

}

export default Navbar;