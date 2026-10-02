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
import useEditor from "../hooks/useEditor";

function MainLayout() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { sidebarActive, setSidebarActive } = useEditor();

  return (
    <div className="layout">
      <Navbar
        isChatOpen={isChatOpen}
        toggleChat={() => setIsChatOpen((prev) => !prev)}
      />

      {/* Main Content */}
      <div className="layout-main-container">
        {/* Fixed Activity Bar */}
        <Sidebar active={sidebarActive} onSetActive={setSidebarActive} />

        {/* Resizable Explorer / Editor / Chat */}
        <PanelGroup direction="horizontal" className="layout-body">
          {/* Explorer / Extensions / Search */}
          <Panel
            className="explorer-panel"
            defaultSize={20}
            minSize={12}
            maxSize={35}
          >
            {sidebarActive === "extensions" ? (
              <Extensions />
            ) : sidebarActive === "search" ? (
              <Search />
            ) : (
              <Explorer />
            )}
          </Panel>

          <PanelResizeHandle className="resize-handle" />

          {/* Editor + Bottom Panel */}
          <Panel className="editor-panel" defaultSize={80} minSize={40}>

            <PanelGroup direction="vertical">

              {/* Editor */}
              <Panel defaultSize={72} minSize={40}>

                <div className="editor-section">

                  <Tabs />
                      <Breadcrumb />


                  <div className="editor-wrapper">
                    <Editor />
                  </div>

                </div>

              </Panel>

              <PanelResizeHandle className="resize-handle-horizontal" />

              {/* Bottom Panel */}
              <Panel defaultSize={28} minSize={15}>

                <BottomPanel />

              </Panel>

            </PanelGroup>

          </Panel>

          {isChatOpen && (
            <>
              <PanelResizeHandle className="resize-handle" />
              <Panel className="chat-panel" defaultSize={20} minSize={15} maxSize={35}>
                <Chat />
              </Panel>
            </>
          )}

        </PanelGroup>
      </div>

      <StatusBar />
      <TaskPicker />
    </div>
  );
}

export default MainLayout;