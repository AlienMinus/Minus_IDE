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

function MainLayout() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [sidebarActive, setSidebarActive] = useState("explorer");

  return (
    <div className="layout">
      <Navbar
        isChatOpen={isChatOpen}
        toggleChat={() => setIsChatOpen((prev) => !prev)}
      />

      {/* Main Content */}
      <PanelGroup direction="horizontal" className="layout-body">

        {/* Activity Bar */}
        <Panel
          className="sidebar-panel"
          defaultSize={5}
          minSize={5}
          maxSize={6}
        >
          <Sidebar active={sidebarActive} onSetActive={setSidebarActive} />
        </Panel>

        <PanelResizeHandle className="resize-handle" />

        {/* Explorer / Extensions */}
        <Panel
          className="explorer-panel"
          defaultSize={18}
          minSize={15}
          maxSize={30}
        >
          {sidebarActive === "extensions" ? <Extensions /> : <Explorer />}
        </Panel>

        <PanelResizeHandle className="resize-handle" />

        {/* Editor + Bottom Panel */}
        <Panel className="editor-panel" defaultSize={77} minSize={40}>

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

      <StatusBar />
    </div>
  );
}

export default MainLayout;