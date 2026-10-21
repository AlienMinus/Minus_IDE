# Hyperion IDE — Next-Generation Autonomous AI Web IDE & QA Studio

> **Hyperion IDE** is a high-performance, full-stack browser-based IDE and automated testing suite built with Monaco Editor, Three.js 3D architectural visualization, and a deep-learning **Autonomous QA Agent** that tests live web applications like a real human user.

---

## 🌟 Key Capabilities & Features

### 1. 🤖 Autonomous QA Agent & Selenium Automation Studio
Hyperion features a built-in automated QA testing suite located in the **Run & Debug** (`Ctrl+Shift+D`) panel and full editor tab view:
- **Real-User Autonomous Exploration**:
  - **Natural Mousewheel Scroll**: Smoothly scrolls down to explore below-the-fold content, animations, and returns to top landmarks.
  - **Route Traversal Patrol**: Sequentially discovers, navigates, and verifies all internal application routes (e.g. `/#skills`, `/#projects`, `/#contact`), auditing view state changes.
  - **Form Validation & Keystroke Testing**: Tests empty field submissions to verify boundary validation without app crash, then injects realistic user inputs with synthetic typing.
  - **Interactive Controls & State Resiliency**: Tests buttons, accordions, theme switches, and modal open/close transitions.
  - **Visual AI Cursor**: Smooth cubic-bezier mouse cursor with click ripples, typing indicators, and thought speech pills.
  - **Health Scoring & Audit Reports**: Generates detailed Markdown (`TEST_REPORT.md`), HTML, and JSON reports with quality scores (0-100).

### 2. 🎯 Chromium-Style Inspect & Select Element Engine
- **Global Toggle**: Activate anytime via `Ctrl+Shift+C` (or the crosshair toolbar buttons).
- **Live Hover Overlay**: Highlights any element inside the live preview iframe with a translucent blue highlight box and floating DevTools pill showing `tag`, `#id`, `.classes`, dimensions (`W × H px`), and accessibility role.
- **Click-to-Freeze**: Clicking any element captures complete element metadata without triggering page navigation or form submission.
- **Accurate Locators**: Generates clean, robust CSS selectors, XPath expressions, and semantic Testing Library locators (`By.role(...)`, `By.text(...)`).
- **Quick Actions**:
  - 🤖 **Send Agent Here**: Glides the AI cursor directly to the inspected element and logs reasoning thoughts.
  - ⚡ **Click Element**: Dispatches a synthetic click with live cursor pulse.
  - ⌨️ **Send Keys**: Dispatches keystrokes directly into inputs/textareas.
  - ➕ **Add Test Step**: Pre-fills the custom test case builder.
  - 🎯 **Target for Agent**: Commands the Autonomous QA agent to prioritize the inspected component.

### 3. 🌐 Builtin Live Browser Preview & Same-Origin Sandbox Proxy
- Embedded browser with address bar, back/forward navigation, reload, external launch, and live status badge.
- **Split Preview**: View the live preview side-by-side with tests in the Selenium QA Studio.
- **Transparent In-Memory Proxy**: Seamlessly proxies local dev servers (e.g., port 5174) through `/api/sandbox/preview-proxy`, enabling same-origin DOM access, accurate element bounding rects, and synthetic interactions without modifying user files on disk.

### 4. ⚙️ Visual Settings System
- **Access**: Press `Ctrl+,` or open via the bottom-left gear Manage menu.
- **Interactive UI**: Search settings by keyword across categories:
  - **Text Editor**: Font Size, Font Family, Tab Size, Word Wrap, Line Numbers, Minimap, Format on Save.
  - **Workbench & Themes**: Color theme selector, icon theme, layout density, status bar toggles.
  - **Autonomous QA & Testing**: Execution speed (`slow`, `normal`, `fast`, `turbo`), highlight colors, health score thresholds.
  - **Terminal**: Integrated font size, cursor styles (`line`, `block`, `underline`).
  - **AI Assistant**: Model engine selection (`gemini-2.5-flash`, `gemini-2.5-pro`), auto-context, inline suggestions.
- **Dual Mode**: Switch seamlessly between Visual UI and direct `settings.json` editing.

### 5. 🎨 Multi-Theme Engine
Persisted themes available via the Manage menu (`Themes >`) or Settings:
- **Hyperion Dark Modern** — Default
- **Dark+ (default dark)**
- **GitHub Dark Default**
- **One Dark Pro (Atom)**
- **Dracula Official**
- **Monokai Classic**
- **Nord Arctic Ice**
- **SynthWave '84 (Cyberpunk Neon)**
- **Hyperion Light Modern**
- **GitHub Light Default**
- **Solarized Light**

### 6. ℹ️ Comprehensive Help & Diagnostics System
Accessible via the top navigation bar **Help** dropdown:
- **Welcome & Getting Started**: Guided onboarding and feature highlights.
- **Documentation**: Architectural overview and testing reference.
- **Editor Playground**: Interactive Monaco tips and keyboard shortcuts.
- **Release Notes**: Latest feature updates and changelog.
- **Keyboard Shortcuts Reference**: Searchable cheat sheet of all IDE hotkeys.
- **Process Explorer**: Live view of active development servers, sandbox bridge, and memory utilization.
- **Check for Updates**: Interactive version verification.
- **About Hyperion**: Complete environment and build metadata.

### 7. 📐 Full-Stack Architecture Visualizer
- **Visual Blueprint**: Full-screen interactive canvas rendering system architecture.
- **Three.js 3D Visualizer**: Real-time 3D component topology and execution flow animation.
- **MongoDB ERD & API Routes**: Auto-generated schema entity-relationship diagrams and backend endpoint matrices.

---

## ⌨️ Essential Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl+Shift+P` | Open Command Palette |
| `Ctrl+,` | Open Settings Page |
| `Ctrl+Shift+C` | Toggle Chromium Inspect & Select Element |
| `Ctrl+Shift+D` | Open Run and Debug / Selenium QA Studio |
| `Ctrl+Alt+/` | Open Live Browser Preview Tab |
| `Ctrl+B` | Toggle Primary Side Bar |
| `Ctrl+J` | Toggle Bottom Panel |
| `Ctrl+\`` | Toggle Integrated Terminal |
| `F5` | Run Active File in Terminal |
| `Ctrl+Shift+B` | Run Configured Build Task |
| `Ctrl+K Z` | Toggle Zen Mode |
| `F11` | Toggle Full Screen |

---

## 📁 Repository Structure

```
WebIDE/
├── public/                 # Static assets, icons, documentation
├── server/                 # Express backend, sandbox proxy, and execution routes
│   ├── routes/
│   │   ├── sandbox.js      # Live preview proxy and in-memory HTML injectors
│   │   ├── git.js          # Git cloning and source control endpoints
│   │   └── terminal.js     # WebSocket / terminal process spawning
│   └── server.js           # Main backend entry point (:5000)
├── src/
│   ├── components/
│   │   ├── Architecture/   # Three.js 3D diagram, ERD, and blueprint canvas
│   │   ├── Editor/         # Monaco Editor wrapper and custom tab handlers
│   │   ├── Help/           # HelpModal & Help topics
│   │   ├── LiveBrowser/    # Hyperion IDE-style Simple Browser previewer
│   │   ├── Navbar/         # Top menu bar, window controls, and dropdowns
│   │   ├── RunDebug/       # RunDebug panel, SeleniumRunner & QA Studio
│   │   ├── Sidebar/        # Activity bar & Manage Gear context menu
│   │   └── Terminal/       # xterm.js terminal integration
│   ├── context/
│   │   ├── EditorContext.jsx   # Editor state, tabs, and view dispatchers
│   │   ├── FileContext.jsx     # Workspace files and directory persistence
│   │   └── ThemeContext.jsx    # CSS variables and theme persistence
│   ├── data/
│   │   ├── menu.jsx        # Top-level menu definitions (File, Edit, Help...)
│   │   ├── settings.json   # Default user configuration settings
│   │   └── themes.json     # Multi-theme palette specifications
│   ├── pages/
│   │   └── SettingsPage/   # Visual Settings UI and settings.json editor
│   ├── services/
│   │   ├── elementInspector.js # Chromium hover highlight & locator engine
│   │   ├── seleniumAgent.js    # Autonomous QA Agent human emulation
│   │   └── seleniumEngine.js   # Hyperion WebDriver & AI cursor animation
│   └── main.jsx            # React root with providers
├── package.json
└── vite.config.js          # Vite build configuration with proxy rules
```

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Monaco Editor (`@monaco-editor/react`), `react-resizable-panels`, `react-icons`, `@testing-library/dom`
- **Visualization**: Three.js, Mermaid.js
- **Testing & QA**: W3C DOM Automation, Hyperion WebDriver, Custom AI Cursor Simulator
- **Styling**: Pure CSS Variables with live multi-theme injection

---

## 📄 License

MIT License — Developed by Google DeepMind Advanced Agentic Coding.

