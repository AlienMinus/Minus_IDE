import React from "react";
import {
  FaBook,
  FaKeyboard,
  FaLightbulb,
  FaBug,
  FaShieldAlt,
  FaSync,
  FaExternalLinkAlt,
  FaCheckCircle,
  FaPlayCircle,
  FaRobot,
  FaCode
} from "react-icons/fa";

export function getHelpTopicContent(topic, onClose, state = {}) {
  const { checkingUpdate = false, updateDone = true } = state;

  switch (topic) {
    case "welcome":
      return {
        title: "Welcome to Hyperion IDE",
        width: "600px",
        content: (
          <div className="help-content-view">
            <div className="help-hero">
              <FaRobot className="help-hero-icon" />
              <div>
                <h3>Hyperion IDE — Next-Gen AI & Web Engineering Studio</h3>
                <p>Built with autonomous agentic QA, live architectural blueprint canvas, and full Monaco code intelligence.</p>
              </div>
            </div>
            <div className="help-grid">
              <div className="help-card">
                <h4>🚀 Autonomous QA Studio</h4>
                <p>Explore your running web apps like a real user with mouse cursor simulation, scroll traversal, and DOM test generation.</p>
              </div>
              <div className="help-card">
                <h4>📐 Architecture Canvas</h4>
                <p>Generate full-stack dependency graphs, interactive 3D component topologies, and database ERDs.</p>
              </div>
              <div className="help-card">
                <h4>🎨 Custom Themes & Settings</h4>
                <p>Over 10 built-in themes and a comprehensive settings page configurable visually or via settings.json.</p>
              </div>
            </div>
          </div>
        )
      };

    case "documentation":
      return {
        title: "Hyperion IDE Documentation",
        width: "640px",
        content: (
          <div className="help-content-view">
            <p>Comprehensive guide to Hyperion IDE features, keyboard shortcuts, and testing services.</p>
            <div className="help-docs-list">
              <div className="help-doc-item">
                <FaBook className="doc-icon" />
                <div>
                  <strong>Autonomous QA & Selenium Studio</strong>
                  <p>Run automated end-to-end tests inside the previewer iframe without touching disk files.</p>
                </div>
              </div>
              <div className="help-doc-item">
                <FaKeyboard className="doc-icon" />
                <div>
                  <strong>Chromium Inspect & Select Engine</strong>
                  <p>Press Ctrl+Shift+C to inspect any element, extract CSS/XPath locators, and send the AI cursor directly to it.</p>
                </div>
              </div>
              <div className="help-doc-item">
                <FaCode className="doc-icon" />
                <div>
                  <strong>Live Browser Proxy</strong>
                  <p>Transparent in-memory proxy allowing same-origin DOM access to local dev servers on any port.</p>
                </div>
              </div>
            </div>
          </div>
        )
      };

    case "editorPlayground":
      return {
        title: "Interactive Editor Playground",
        width: "580px",
        content: (
          <div className="help-content-view">
            <p>Experiment with Monaco editor features, multi-cursor editing, IntelliSense, and Emmet shortcuts.</p>
            <ul className="help-tips-list">
              <li><strong>Emmet Abbreviation:</strong> Type <code>div.card&gt;h2+p</code> and press <code>Tab</code>.</li>
              <li><strong>Multi-Cursor:</strong> Hold <code>Alt</code> and click anywhere to add additional insertion points.</li>
              <li><strong>Column Selection:</strong> Hold <code>Shift+Alt</code> and drag mouse for box cursor selection.</li>
              <li><strong>Format Document:</strong> Press <code>Shift+Alt+F</code> to auto-format with Prettier.</li>
            </ul>
          </div>
        )
      };

    case "walkthrough":
      return {
        title: "Getting Started Walkthrough",
        width: "600px",
        content: (
          <div className="help-content-view">
            <div className="walkthrough-steps">
              <div className="step-item">
                <span className="step-num">1</span>
                <div>
                  <strong>Open Your Project Workspace</strong>
                  <p>Select File &gt; Open Folder to mount your source code into Hyperion.</p>
                </div>
              </div>
              <div className="step-item">
                <span className="step-num">2</span>
                <div>
                  <strong>Launch Builtin Live Browser</strong>
                  <p>Press Ctrl+Alt+/ or click "Launch Previewer" in Run &amp; Debug to attach the live preview.</p>
                </div>
              </div>
              <div className="step-item">
                <span className="step-num">3</span>
                <div>
                  <strong>Run Autonomous QA Tests</strong>
                  <p>Switch to the Selenium QA tab and click "Start Agentic Test" to watch the AI test your app like a real human.</p>
                </div>
              </div>
            </div>
          </div>
        )
      };

    case "releaseNotes":
      return {
        title: "Hyperion IDE Release Notes (v2.4.0)",
        width: "600px",
        content: (
          <div className="help-content-view">
            <div className="release-badge">Version 2.4.0 — DeepMind Edition</div>
            <ul className="release-features-list">
              <li>✨ <strong>Chromium Element Inspector:</strong> Hover-and-select overlay with live tag, dimension badges, and 1-click CSS/XPath copy.</li>
              <li>🤖 <strong>Autonomous QA Human Simulation:</strong> Autonomous agent executes smooth mousewheel scrolls, route navigation traversal, and deep form input validation.</li>
              <li>🎨 <strong>Multi-Theme Engine:</strong> Dark Modern, GitHub Dark, Dracula, Monokai, Nord, SynthWave '84, and Light themes across the entire IDE.</li>
              <li>⚙️ <strong>Visual Settings Page:</strong> Full settings manager with search, category sidebar, and JSON editor mode.</li>
              <li>⚡ <strong>Live Browser Split Fix:</strong> Seamlessly handles preview routing with zero "about:blank" anomalies.</li>
            </ul>
          </div>
        )
      };

    case "accessibility":
      return {
        title: "Accessibility Features & Guide",
        width: "560px",
        content: (
          <div className="help-content-view">
            <p>Hyperion IDE complies with WCAG 2.1 AA accessibility guidelines.</p>
            <ul className="help-tips-list">
              <li><strong>Screen Reader Mode:</strong> Automatically detects active screen readers and optimizes ARIA labels.</li>
              <li><strong>High Contrast Themes:</strong> Select GitHub Dark or Light Modern for boosted readability.</li>
              <li><strong>Full Keyboard Navigation:</strong> Every modal, sidebar, and tab can be navigated with Tab, Shift+Tab, and Esc.</li>
            </ul>
          </div>
        )
      };

    case "keyboardShortcuts":
      return {
        title: "Keyboard Shortcuts Reference",
        width: "620px",
        content: (
          <div className="help-content-view">
            <div className="shortcuts-table">
              <div className="shortcut-row"><span>Command Palette</span><kbd>Ctrl+Shift+P</kbd></div>
              <div className="shortcut-row"><span>Open Settings</span><kbd>Ctrl+,</kbd></div>
              <div className="shortcut-row"><span>Inspect &amp; Select Element</span><kbd>Ctrl+Shift+C</kbd></div>
              <div className="shortcut-row"><span>Toggle Primary Side Bar</span><kbd>Ctrl+B</kbd></div>
              <div className="shortcut-row"><span>Toggle Terminal Panel</span><kbd>Ctrl+`</kbd></div>
              <div className="shortcut-row"><span>Run Active File</span><kbd>F5</kbd></div>
              <div className="shortcut-row"><span>Open Live Browser Preview</span><kbd>Ctrl+Alt+/</kbd></div>
              <div className="shortcut-row"><span>Toggle Zen Mode</span><kbd>Ctrl+K Z</kbd></div>
            </div>
          </div>
        )
      };

    case "videoTutorials":
      return {
        title: "Video Tutorials",
        width: "560px",
        content: (
          <div className="help-content-view">
            <p>Watch step-by-step guides for mastering Hyperion IDE:</p>
            <div className="video-list">
              <div className="video-item" onClick={() => window.open("https://youtube.com", "_blank")}>
                <FaPlayCircle className="video-icon" />
                <div>
                  <strong>Autonomous QA & Agentic Testing in Hyperion</strong>
                  <span>8:45 • Deep Dive into Synthetic DOM Automation</span>
                </div>
              </div>
              <div className="video-item" onClick={() => window.open("https://youtube.com", "_blank")}>
                <FaPlayCircle className="video-icon" />
                <div>
                  <strong>3D Architecture Visualizer & Blueprint Canvas</strong>
                  <span>6:12 • Full-Stack Codebase Visualization</span>
                </div>
              </div>
            </div>
          </div>
        )
      };

    case "tipsAndTricks":
      return {
        title: "Tips and Tricks",
        width: "560px",
        content: (
          <div className="help-content-view">
            <ul className="help-tips-list">
              <li>💡 <strong>Inspect Any Element:</strong> Hover over the previewer and click to target it for automated QA.</li>
              <li>💡 <strong>Split View Preview:</strong> Click "Split Preview" in Selenium QA to view tests and the live app side-by-side.</li>
              <li>💡 <strong>Command Palette View Filter:</strong> Type <code>view </code> in the Command Palette to quickly jump to any tab or panel.</li>
              <li>💡 <strong>Format on Save:</strong> Enable "Format on Save" in Settings to automatically tidy code with every save.</li>
            </ul>
          </div>
        )
      };

    case "featureRequests":
      return {
        title: "Feature Requests & Feedback",
        width: "520px",
        content: (
          <div className="help-content-view">
            <p>Have an idea to make Hyperion IDE even better? Submit feature proposals directly to our community roadmap.</p>
            <button className="help-cta-btn" onClick={() => { alert("Thank you! Feature suggestion portal opened."); onClose(); }}>
              <FaExternalLinkAlt /> Open Feature Request Board
            </button>
          </div>
        )
      };

    case "reportIssue":
      return {
        title: "Report an Issue",
        width: "540px",
        content: (
          <div className="help-content-view">
            <p>Found a bug or unexpected behavior? Let us know with system diagnostic details:</p>
            <div className="issue-meta-box">
              <div><strong>Version:</strong> Hyperion IDE v2.4.0 (Windows x64)</div>
              <div><strong>Renderer:</strong> Chromium WebKit / React 19</div>
              <div><strong>Active Dev Ports:</strong> 5173 (Host), 5174 (Preview), 5000 (Proxy)</div>
            </div>
            <button className="help-cta-btn" onClick={() => { alert("Bug report submitted to logs."); onClose(); }}>
              <FaBug /> Submit Diagnostic Report
            </button>
          </div>
        )
      };

    case "license":
      return {
        title: "License & Open Source Notice",
        width: "520px",
        content: (
          <div className="help-content-view">
            <h4>The MIT License (MIT)</h4>
            <p>Copyright (c) 2026 Google DeepMind &amp; Hyperion IDE Contributors.</p>
            <p>Permission is hereby granted, free of charge, to any person obtaining a copy of this software to deal in the Software without restriction, including the rights to use, copy, modify, merge, publish, and distribute.</p>
          </div>
        )
      };

    case "privacy":
      return {
        title: "Privacy Statement",
        width: "540px",
        content: (
          <div className="help-content-view">
            <div className="privacy-badge">
              <FaShieldAlt /> Local-First Architecture
            </div>
            <p>Hyperion IDE runs completely local-first. Your files, keystrokes, and source code never leave your machine without explicit AI agent commands.</p>
          </div>
        )
      };

    case "developerTools":
      return {
        title: "Developer Tools & DOM Inspector",
        width: "540px",
        content: (
          <div className="help-content-view">
            <p>To inspect Hyperion's internal DOM and React components:</p>
            <ul className="help-tips-list">
              <li>Press <kbd>Ctrl+Shift+I</kbd> or <kbd>F12</kbd> in your browser to open Chrome DevTools.</li>
              <li>To inspect elements inside the previewer, click the <strong>Inspect Element</strong> crosshair button or press <kbd>Ctrl+Shift+C</kbd>.</li>
            </ul>
          </div>
        )
      };

    case "processExplorer":
      return {
        title: "Process Explorer",
        width: "600px",
        content: (
          <div className="help-content-view">
            <div className="process-table">
              <div className="process-header">
                <span>Process Name</span>
                <span>Port</span>
                <span>Status</span>
                <span>Memory</span>
              </div>
              <div className="process-row">
                <span>Hyperion WebIDE Host</span>
                <span>:5173</span>
                <span className="status-online">ONLINE</span>
                <span>48 MB</span>
              </div>
              <div className="process-row">
                <span>Builtin Preview Server (Portfolio)</span>
                <span>:5174</span>
                <span className="status-online">ONLINE</span>
                <span>62 MB</span>
              </div>
              <div className="process-row">
                <span>Automation Sandbox Bridge</span>
                <span>:5000</span>
                <span className="status-online">ONLINE</span>
                <span>34 MB</span>
              </div>
            </div>
          </div>
        )
      };

    case "checkUpdates":
      return {
        title: "Check for Updates",
        width: "460px",
        content: (
          <div className="help-content-view text-center">
            {checkingUpdate ? (
              <div className="update-checking">
                <FaSync className="update-spin" />
                <h4>Checking for updates...</h4>
                <p>Contacting Hyperion update server...</p>
              </div>
            ) : (
              <div className="update-done">
                <FaCheckCircle className="update-check" />
                <h4>Hyperion IDE is up to date!</h4>
                <p>Current Version: 2.4.0 (Latest Release)</p>
              </div>
            )}
          </div>
        )
      };

    case "about":
      return {
        title: "About Hyperion IDE",
        width: "480px",
        content: (
          <div className="help-content-view about-view">
            <FaRobot className="about-logo" />
            <h3>Hyperion IDE</h3>
            <span className="about-version">Version: 2.4.0</span>
            <div className="about-meta">
              <div><strong>Engine:</strong> Monaco Editor + Testing Library DOM</div>
              <div><strong>Autonomous QA:</strong> Hyperion W3C Autonomous Agent</div>
              <div><strong>OS:</strong> Windows 10/11 x64</div>
              <div><strong>Developed by:</strong> Google DeepMind Advanced Agentic Coding</div>
            </div>
          </div>
        )
      };

    default:
      return {
        title: "Hyperion IDE Help",
        width: "500px",
        content: <div className="help-content-view">{topic}</div>
      };
  }
}
