import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";

import { FileProvider } from "./context/FileContext";
import { EditorProvider } from "./context/EditorContext";
import { TerminalProvider } from "./context/TerminalContext";

import "./index.css";
import "./App.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <FileProvider>
      <EditorProvider>
        <TerminalProvider>
          <App />
        </TerminalProvider>
      </EditorProvider>
    </FileProvider>
  </React.StrictMode>
);