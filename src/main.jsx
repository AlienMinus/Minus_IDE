import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";

import { ThemeProvider } from "./context/ThemeContext";
import { FileProvider } from "./context/FileContext";
import { EditorProvider } from "./context/EditorContext";
import { TerminalProvider } from "./context/TerminalContext";

import "./styles/variables.css";
import "./index.css";
import "./App.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <FileProvider>
        <EditorProvider>
          <TerminalProvider>
            <App />
          </TerminalProvider>
        </EditorProvider>
      </FileProvider>
    </ThemeProvider>
  </React.StrictMode>
);
