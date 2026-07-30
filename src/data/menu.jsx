import {
    FaCheck,
    FaFile,
    FaFolderOpen,
    FaFolder,
    FaSave,
    FaShareAlt,
    FaCog,
    FaChevronRight
} from "react-icons/fa";

export const fileMenu = [

    // New
    {
        id: "newTextFile",
        label: "New Text File",
        shortcut: "Ctrl+N",
        icon: <FaFile />,
        onClick: () => {}
    },

    {
        id: "newFile",
        label: "New File...",
        shortcut: "Ctrl+Alt+N",
        icon: <FaFile />,
        onClick: () => {}
    },

    {
        id: "newWindow",
        label: "New Window",
        shortcut: "Ctrl+Shift+N",
        onClick: () => {}
    },

    {
        id: "newWindowProfile",
        label: "New Window with Profile",
        submenu: true,
        iconRight: <FaChevronRight />
    },

    {
        type: "separator"
    },

    // Open
    {
        id: "openFile",
        label: "Open File...",
        shortcut: "Ctrl+O",
        icon: <FaFolderOpen />,
        onClick: () => {}
    },

    {
        id: "openFolder",
        label: "Open Folder...",
        shortcut: "Ctrl+K Ctrl+O",
        icon: <FaFolder />,
        onClick: () => {}
    },

    {
        id: "openWorkspace",
        label: "Open Workspace from File...",
        onClick: () => {}
    },

    {
        id: "openRecent",
        label: "Open Recent",
        submenu: true,
        iconRight: <FaChevronRight />
    },

    {
        type: "separator"
    },

    // Workspace
    {
        id: "addFolder",
        label: "Add Folder to Workspace...",
        onClick: () => {}
    },

    {
        id: "saveWorkspaceAs",
        label: "Save Workspace As...",
        onClick: () => {}
    },

    {
        id: "duplicateWorkspace",
        label: "Duplicate Workspace",
        onClick: () => {}
    },

    {
        type: "separator"
    },

    // Save
    {
        id: "save",
        label: "Save",
        shortcut: "Ctrl+S",
        icon: <FaSave />,
        onClick: () => {}
    },

    {
        id: "saveAs",
        label: "Save As...",
        shortcut: "Ctrl+Shift+S",
        onClick: () => {}
    },

    {
        id: "saveAll",
        label: "Save All",
        shortcut: "Ctrl+K S",
        disabled: true,
        onClick: () => {}
    },

    {
        type: "separator"
    },

    // Share
    {
        id: "share",
        label: "Share",
        submenu: true,
        icon: <FaShareAlt />,
        iconRight: <FaChevronRight />
    },

    {
        type: "separator"
    },

    // Auto Save
    {
        id: "autoSave",
        label: "Auto Save",
        checked: true,
        icon: <FaCheck />,
        onClick: () => {}
    },

    {
        id: "preferences",
        label: "Preferences",
        submenu: true,
        icon: <FaCog />,
        iconRight: <FaChevronRight />
    },

    {
        type: "separator"
    },

    // Close
    {
        id: "revertFile",
        label: "Revert File",
        onClick: () => {}
    },

    {
        id: "closeEditor",
        label: "Close Editor",
        shortcut: "Ctrl+F4",
        onClick: () => {}
    },

    {
        id: "closeFolder",
        label: "Close Folder",
        shortcut: "Ctrl+K F",
        onClick: () => {}
    },

    {
        id: "closeWindow",
        label: "Close Window",
        shortcut: "Alt+F4",
        onClick: () => {}
    },

    {
        type: "separator"
    },

    // Exit
    {
        id: "exit",
        label: "Exit",
        onClick: () => {}
    }

];


export const editMenu = [

    {
        id: "undo",
        label: "Undo",
        shortcut: "Ctrl+Z",
        onClick: () => {}
    },

    {
        id: "redo",
        label: "Redo",
        shortcut: "Ctrl+Y",
        onClick: () => {}
    },

    {
        type: "separator"
    },

    {
        id: "cut",
        label: "Cut",
        shortcut: "Ctrl+X",
        onClick: () => {}
    },

    {
        id: "copy",
        label: "Copy",
        shortcut: "Ctrl+C",
        onClick: () => {}
    },

    {
        id: "paste",
        label: "Paste",
        shortcut: "Ctrl+V",
        onClick: () => {}
    },

    {
        type: "separator"
    },

    {
        id: "find",
        label: "Find",
        shortcut: "Ctrl+F",
        onClick: () => {}
    },

    {
        id: "replace",
        label: "Replace",
        shortcut: "Ctrl+H",
        onClick: () => {}
    },

    {
        type: "separator"
    },

    {
        id: "findInFiles",
        label: "Find in Files",
        shortcut: "Ctrl+Shift+F",
        onClick: () => {}
    },

    {
        id: "replaceInFiles",
        label: "Replace in Files",
        shortcut: "Ctrl+Shift+H",
        onClick: () => {}
    },

    {
        type: "separator"
    },

    {
        id: "toggleLineComment",
        label: "Toggle Line Comment",
        shortcut: "Ctrl+/",
        onClick: () => {}
    },

    {
        id: "toggleBlockComment",
        label: "Toggle Block Comment",
        shortcut: "Shift+Alt+A",
        onClick: () => {}
    },

    {
        id: "emmetExpand",
        label: "Emmet: Expand Abbreviation",
        shortcut: "Tab",
        onClick: () => {}
    }

];

export const viewMenu = [

    {
        id: "commandPalette",
        label: "Command Palette...",
        shortcut: "Ctrl+Shift+P",
        onClick: () => {}
    },

    {
        id: "openView",
        label: "Open View...",
        onClick: () => {}
    },

    {
        type: "separator"
    },

    {
        id: "appearance",
        label: "Appearance",
        submenu: true
    },

    {
        id: "editorLayout",
        label: "Editor Layout",
        submenu: true
    },

    {
        type: "separator"
    },

    {
        id: "explorer",
        label: "Explorer",
        shortcut: "Ctrl+Shift+E",
        onClick: () => {}
    },

    {
        id: "search",
        label: "Search",
        shortcut: "Ctrl+Shift+F",
        onClick: () => {}
    },

    {
        id: "sourceControl",
        label: "Source Control",
        shortcut: "Ctrl+Shift+G",
        onClick: () => {}
    },

    {
        id: "run",
        label: "Run",
        shortcut: "Ctrl+Shift+D",
        onClick: () => {}
    },

    {
        id: "extensions",
        label: "Extensions",
        shortcut: "Ctrl+Shift+X",
        onClick: () => {}
    },

    {
        type: "separator"
    },

    {
        id: "chat",
        label: "Chat",
        shortcut: "Ctrl+Alt+I",
        onClick: () => {}
    },

    {
        id: "browser",
        label: "Browser",
        shortcut: "Ctrl+Alt+/",
        onClick: () => {}
    },

    {
        type: "separator"
    },

    {
        id: "problems",
        label: "Problems",
        shortcut: "Ctrl+Shift+M",
        onClick: () => {}
    },

    {
        id: "output",
        label: "Output",
        shortcut: "Ctrl+Shift+U",
        onClick: () => {}
    },

    {
        id: "debugConsole",
        label: "Debug Console",
        shortcut: "Ctrl+Shift+Y",
        onClick: () => {}
    },

    {
        id: "terminal",
        label: "Terminal",
        shortcut: "Ctrl+`",
        onClick: () => {}
    },

    {
        type: "separator"
    },

    {
        id: "wordWrap",
        label: "Word Wrap",
        shortcut: "Alt+Z",
        onClick: () => {}
    }

];

export const terminalMenu = [

    {
        id: "newTerminal",
        label: "New Terminal",
        shortcut: "Ctrl+Shift+`",
        onClick: () => {}
    },

    {
        id: "splitTerminal",
        label: "Split Terminal",
        shortcut: "Ctrl+Shift+5",
        onClick: () => {}
    },

    {
        id: "newTerminalWindow",
        label: "New Terminal Window",
        shortcut: "Ctrl+Shift+Alt+`",
        onClick: () => {}
    },

    {
        type: "separator"
    },

    {
        id: "runTask",
        label: "Run Task...",
        onClick: () => {}
    },

    {
        id: "runBuildTask",
        label: "Run Build Task...",
        shortcut: "Ctrl+Shift+B",
        onClick: () => {}
    },

    {
        id: "runActiveFile",
        label: "Run Active File",
        onClick: () => {}
    },

    {
        id: "runSelectedText",
        label: "Run Selected Text",
        onClick: () => {}
    },

    {
        type: "separator"
    },

    {
        id: "showRunningTasks",
        label: "Show Running Tasks...",
        disabled: true
    },

    {
        id: "restartRunningTask",
        label: "Restart Running Task...",
        disabled: true
    },

    {
        id: "terminateTask",
        label: "Terminate Task...",
        disabled: true
    },

    {
        type: "separator"
    },

    {
        id: "configureTasks",
        label: "Configure Tasks...",
        onClick: () => {}
    },

    {
        id: "configureDefaultBuildTask",
        label: "Configure Default Build Task...",
        onClick: () => {}
    }

];

export const helpMenu = [

    {
        id: "welcome",
        label: "Welcome",
        onClick: () => {}
    },

    {
        id: "showAllCommands",
        label: "Show All Commands",
        shortcut: "Ctrl+Shift+P",
        onClick: () => {}
    },

    {
        id: "documentation",
        label: "Documentation",
        onClick: () => {}
    },

    {
        id: "editorPlayground",
        label: "Editor Playground",
        onClick: () => {}
    },

    {
        id: "walkthrough",
        label: "Open Walkthrough...",
        onClick: () => {}
    },

    {
        id: "releaseNotes",
        label: "Show Release Notes",
        onClick: () => {}
    },

    {
        id: "accessibility",
        label: "Get Started with Accessibility Features",
        onClick: () => {}
    },

    {
        id: "askVSCode",
        label: "Ask @vscode",
        onClick: () => {}
    },

    {
        type: "separator"
    },

    {
        id: "keyboardShortcuts",
        label: "Keyboard Shortcuts Reference",
        shortcut: "Ctrl+K Ctrl+R",
        onClick: () => {}
    },

    {
        id: "videoTutorials",
        label: "Video Tutorials",
        onClick: () => {}
    },

    {
        id: "tipsAndTricks",
        label: "Tips and Tricks",
        onClick: () => {}
    },

    {
        type: "separator"
    },

    {
        id: "youtube",
        label: "Join Us on YouTube",
        onClick: () => {}
    },

    {
        id: "featureRequests",
        label: "Search Feature Requests",
        onClick: () => {}
    },

    {
        id: "reportIssue",
        label: "Report Issue",
        onClick: () => {}
    },

    {
        type: "separator"
    },

    {
        id: "license",
        label: "View License",
        onClick: () => {}
    },

    {
        id: "privacy",
        label: "Privacy Statement",
        onClick: () => {}
    },

    {
        type: "separator"
    },

    {
        id: "developerTools",
        label: "Toggle Developer Tools",
        onClick: () => {}
    },

    {
        id: "processExplorer",
        label: "Open Process Explorer",
        onClick: () => {}
    },

    {
        type: "separator"
    },

    {
        id: "checkUpdates",
        label: "Check for Updates...",
        onClick: () => {}
    },

    {
        type: "separator"
    },

    {
        id: "about",
        label: "About",
        onClick: () => {}
    }

];

export const selectionMenu = [];
export const goMenu = [];
export const runMenu = [];