import "./MainLayouts.css";
import { useState } from "react";

import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";

import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import Explorer from "../components/Explorer";
import Extensions from "../components/Extensions";
import Tabs from "../components/Tabs";
import Editor from "../components/Editor";
import Chat from "../components/Chat";
import BottomPanel from "../components/BottomPanel";
import StatusBar from "../components/Statusbar";
import Breadcrumb from "../components/Breadcrumb";
import TaskPicker from "../components/TaskPicker/TaskPicker";
import Search from "../components/Search/Search";
import SourceControl from "../components/SourceControl/SourceControl";
import RunDebug from "../components/RunDebug/RunDebug";
import CommandPalette from "../components/CommandPalette/CommandPalette";
import useEditor from "../hooks/useEditor";
import useTerminal from "../hooks/useTerminal";
import useFile from "../hooks/useFile";

function MainLayout() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const {
    sidebarActive,
    setSidebarActive,
    isSidebarVisible,
    toggleSidebar,
    isBottomPanelOpen,
    toggleBottomPanel,
    isStatusBarVisible,
    toggleStatusBar,
    isZenMode,
    toggleZenMode,
    toggleFullScreen,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    commandPaletteMode,
    openView,
    toggleWordWrap,
    saveActiveFile
  } = useEditor();

  const {
    createTerminal,
    runActiveFile,
    runBuildTask,
    splitTerminal,
    executeCommand
  } = useTerminal();

  const { openFolder } = useFile();

  const handleSidebarClick = (id) => {
    if (sidebarActive === id && isSidebarVisible) {
      toggleSidebar();
    } else {
      setSidebarActive(id);
      if (!isSidebarVisible) {
        toggleSidebar();
      }
    }
  };

  // List of all commands for Command Palette
  const allCommands = [
    // Views
    { id: "view-explorer", category: "View", label: "Explorer", shortcut: "Ctrl+Shift+E", action: () => openView("explorer") },
    { id: "view-search", category: "View", label: "Search", shortcut: "Ctrl+Shift+F", action: () => openView("search") },
    { id: "view-git", category: "View", label: "Source Control", shortcut: "Ctrl+Shift+G", action: () => openView("git") },
    { id: "view-run", category: "View", label: "Run and Debug", shortcut: "Ctrl+Shift+D", action: () => openView("run") },
    { id: "view-extensions", category: "View", label: "Extensions", shortcut: "Ctrl+Shift+X", action: () => openView("extensions") },
    { id: "view-chat", category: "View", label: "Chat", shortcut: "Ctrl+Alt+I", action: () => setIsChatOpen(true) },
    { id: "view-browser", category: "View", label: "Live Browser Preview", shortcut: "Ctrl+Alt+/", action: () => openView("browser") },
    { id: "view-terminal", category: "View", label: "Terminal", shortcut: "Ctrl+`", action: () => openView("terminal") },
    { id: "view-problems", category: "View", label: "Problems", shortcut: "Ctrl+Shift+M", action: () => openView("problems") },
    { id: "view-output", category: "View", label: "Output", shortcut: "Ctrl+Shift+U", action: () => openView("output") },
    { id: "view-debug", category: "View", label: "Debug Console", shortcut: "Ctrl+Shift+Y", action: () => openView("debugConsole") },
    { id: "view-ports", category: "View", label: "Ports", action: () => openView("ports") },
    { id: "view-repl", category: "View", label: "REPL", action: () => openView("repl") },
    
    // Toggles & Layout
    { id: "toggle-wrap", category: "View", label: "Toggle Word Wrap", shortcut: "Alt+Z", action: toggleWordWrap },
    { id: "toggle-sidebar", category: "View", label: "Toggle Primary Side Bar", shortcut: "Ctrl+B", action: toggleSidebar },
    { id: "toggle-panel", category: "View", label: "Toggle Panel", shortcut: "Ctrl+J", action: toggleBottomPanel },
    { id: "toggle-statusbar", category: "View", label: "Toggle Status Bar", action: toggleStatusBar },
    { id: "toggle-zen", category: "View", label: "Toggle Zen Mode", action: toggleZenMode },
    { id: "toggle-fullscreen", category: "View", label: "Toggle Full Screen", shortcut: "F11", action: toggleFullScreen },

    // Terminal & Tasks
    { id: "term-new", category: "Terminal", label: "Create New Terminal", shortcut: "Ctrl+Shift+`", action: createTerminal },
    { id: "term-split", category: "Terminal", label: "Split Terminal Side by Side", action: splitTerminal },
    { id: "term-run-file", category: "Terminal", label: "Run Active File", shortcut: "F5", action: runActiveFile },
    { id: "term-build", category: "Terminal", label: "Run Build Task", shortcut: "Ctrl+Shift+B", action: runBuildTask },
    { id: "term-clear", category: "Terminal", label: "Clear Terminal Screen", action: () => executeCommand("clear") },

    // File
    { id: "file-save", category: "File", label: "Save Active File", shortcut: "Ctrl+S", action: saveActiveFile },
    { id: "file-open-folder", category: "File", label: "Open Folder...", action: openFolder }
  ];

  const viewOnlyCommands = allCommands.filter((c) => c.category === "View" && !c.label.startsWith("Toggle"));

  return (
    <div className={`layout ${isZenMode ? "zen-mode" : ""}`}>
      <Navbar
        isChatOpen={isChatOpen}
        toggleChat={() => setIsChatOpen((prev) => !prev)}
      />

      {/* Main Content */}
      <div className="layout-main-container">
        {/* Fixed Activity Bar */}
        {!isZenMode && (
          <Sidebar active={sidebarActive} onSetActive={handleSidebarClick} />
        )}

        {/* Resizable Explorer / Editor / Chat */}
        <PanelGroup direction="horizontal" className="layout-body">
          {/* Explorer / Extensions / Search */}
          {!isZenMode && isSidebarVisible && (
            <>
              <Panel
                id="explorer-panel"
                order={1}
                className="explorer-panel"
                defaultSize={20}
                minSize={12}
                maxSize={35}
              >
                {sidebarActive === "extensions" ? (
                  <Extensions />
                ) : sidebarActive === "search" ? (
                  <Search />
                ) : sidebarActive === "git" ? (
                  <SourceControl />
                ) : sidebarActive === "run" ? (
                  <RunDebug />
                ) : (
                  <Explorer />
                )}
              </Panel>

              <PanelResizeHandle id="explorer-resize-handle" className="resize-handle" />
            </>
          )}

          {/* Editor + Bottom Panel */}
          <Panel id="editor-panel" order={2} className="editor-panel" defaultSize={80} minSize={40}>
            <PanelGroup direction="vertical">
              {/* Editor */}
              <Panel id="editor-code-panel" order={1} defaultSize={!isZenMode && isBottomPanelOpen ? 72 : 100} minSize={30}>
                <div className="editor-section">
                  <Tabs />
                  <Breadcrumb />

                  <div className="editor-wrapper">
                    <Editor />
                  </div>
                </div>
              </Panel>

              {/* Bottom Panel */}
              {!isZenMode && isBottomPanelOpen && (
                <>
                  <PanelResizeHandle id="bottom-panel-resize-handle" className="resize-handle-horizontal" />
                  <Panel id="bottom-panel" order={2} defaultSize={28} minSize={15}>
                    <BottomPanel />
                  </Panel>
                </>
              )}
            </PanelGroup>
          </Panel>

          {!isZenMode && isChatOpen && (
            <>
              <PanelResizeHandle id="chat-resize-handle" className="resize-handle" />
              <Panel id="chat-panel" order={3} className="chat-panel" defaultSize={20} minSize={15} maxSize={35}>
                <Chat />
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>

      {!isZenMode && isStatusBarVisible && <StatusBar />}
      <TaskPicker />

      {/* VS Code Command Palette & Open View Switcher */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        mode={commandPaletteMode}
        commands={commandPaletteMode === "views" ? viewOnlyCommands : allCommands}
      />
    </div>
  );
}

export default MainLayout;