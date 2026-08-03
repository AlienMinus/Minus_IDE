import "./MainLayouts.css";

import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";

import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import Explorer from "../components/Explorer";
import Tabs from "../components/Tabs";
import Editor from "../components/Editor";
import BottomPanel from "../components/BottomPanel";
import StatusBar from "../components/Statusbar";
import Breadcrumb from "../components/Breadcrumb";

function MainLayout() {
  return (
    <div className="layout">
      <Navbar />

      {/* Main Content */}
      <PanelGroup direction="horizontal" className="layout-body">

        {/* Activity Bar */}
        <Panel
          className="sidebar-panel"
          defaultSize={5}
          minSize={5}
          maxSize={6}
        >
          <Sidebar />
        </Panel>

        <PanelResizeHandle className="resize-handle" />

        {/* Explorer */}
        <Panel
          defaultSize={18}
          minSize={15}
          maxSize={30}
        >
          <Explorer />
        </Panel>

        <PanelResizeHandle className="resize-handle" />

        {/* Editor + Bottom Panel */}
        <Panel defaultSize={77} minSize={40}>

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

      </PanelGroup>

      <StatusBar />
    </div>
  );
}

export default MainLayout;