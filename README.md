# Hyperion IDE — Next-Generation Autonomous AI Web IDE & QA Studio

> **Hyperion IDE** is a high-performance, full-stack browser-based IDE and automated testing suite built with Monaco Editor, Three.js 3D architectural visualization, direct native host terminal execution, and a deep-learning **Autonomous QA Agent** that tests live web applications like a real human user.

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

### 3. 🖥️ Native Host System Terminal
- **Direct Host Shell Connection**: Connected directly to the host OS shell (PowerShell on Windows, Command Prompt, or Git Bash), allowing arbitrary commands (`git`, `npm`, `dir`, `python`, `node`, `curl`, `docker`, etc.) without artificial mock restrictions.
- **Real-Time Streaming Output**: Output streams line-by-line via Server-Sent Events (SSE) directly into an xterm.js instance with ANSI color fidelity.
- **Multi-Terminal & Split Terminal**: Create multiple concurrent terminal sessions, split panes side-by-side (`Ctrl+Shift+5`), or maximize panels (`Ctrl+Shift+M`).
- **Automatic Dev Server Detection**: Automatically detects when `npm run dev`, `vite`, or local servers start listening and opens the Live Preview in the editor.

### 4. 🌐 Builtin Live Browser Preview & Same-Origin Sandbox Proxy
- Embedded browser with address bar, back/forward navigation, reload, external launch, and live status badge.
- **Split Preview**: View the live preview side-by-side with tests in the Selenium QA Studio.
- **Transparent In-Memory Proxy**: Seamlessly proxies local dev servers (e.g., port 5174) through `/api/sandbox/preview-proxy`, enabling same-origin DOM access, accurate element bounding rects, and synthetic interactions without modifying user files on disk.

### 5. 🎨 Global Multi-Theme Engine
Persisted themes available via the Manage gear menu (`Themes >`) or Settings (`workbench.colorTheme`):
- **Light Themes**:
  - `Light 2026 (Default Light)`
  - `2017 Light (C/C++)`
  - `Light (C/C++)`
  - `Light Classic`
  - `Light Modern`
  - `Light+`
  - `Quiet Light`
  - `Solarized Light`
  - `Spinel Light`
- **Dark Themes**:
  - `Dark 2026 (Default Dark)`
  - `2017 Dark (C/C++)`
  - `Abyss`
  - `Dark (C/C++)`
  - `Dark Classic`
  - `Dark Modern`
  - `Dark+`
  - `JellyFish-x-Retro`
  - `Kimbie Dark`
  - `Monokai`
  - `Monokai Dimmed`
  - `One Dark Modern`
  - `One Dark Modern Classic`
  - `Pro Hacker Theme`
  - `Red`
  - `Solarized Dark`
  - `Spinel`
  - `Tomorrow Night Blue`
- **High Contrast Themes**:
  - `Dark High Contrast (Default High Contrast)`
  - `Light High Contrast (Default High Contrast Light)`

Every UI element dynamically updates: Top Navbar, Side Activity Bar, File Explorer, Tab Headers, Monaco Editor, Statusbar, Bottom Panel, Terminal, Context Menus, and Modals.

### 6. ⚙️ Visual Settings System
- **Access**: Press `Ctrl+,` or open via the bottom-left gear Manage menu.
- **Interactive UI**: Search settings by keyword across categories:
  - **Text Editor**: Font Size, Font Family, Tab Size, Word Wrap, Line Numbers, Minimap, Format on Save.
  - **Workbench & Themes**: Color theme selector, icon theme, layout density, status bar toggles.
  - **Autonomous QA & Testing**: Execution speed (`slow`, `normal`, `fast`, `turbo`), highlight colors, health score thresholds.
  - **Terminal**: Integrated font size, cursor styles (`line`, `block`, `underline`).
  - **AI Assistant**: Synchronized model engines (`meta-llama/Llama-3.1-8B-Instruct`, `Qwen/Qwen2.5-Coder-32B-Instruct`, `deepseek-ai/DeepSeek-R1`), auto-context, inline suggestions.
- **Dual Mode**: Switch seamlessly between Visual UI and direct `settings.json` editing.

### 7. 💬 Cypher AI Security Analyst & Assistant
- **Hugging Face Router Integration**: Deep reasoning models synchronized with Settings (`meta-llama/Llama-3.1-8B-Instruct`, `Qwen/Qwen2.5-Coder-32B-Instruct`, `deepseek-ai/DeepSeek-R1`).
- **Real-Time Code Analysis**: Analyzes code against OWASP Top 10 vulnerabilities, injection flaws, and exposed credentials.
- **Context Injection**: Attach workspace files or active editor selection directly into chat conversations.

### 8. ℹ️ Comprehensive Help System & Pre-existing Modal Architecture
Accessible via the top navigation bar **Help** dropdown, rendered using the IDE's unified `<Modal>` component:
- **Welcome & Getting Started**: Guided onboarding and feature highlights.
- **Documentation**: Architectural overview and testing reference.
- **Editor Playground**: Interactive Monaco tips and keyboard shortcuts.
- **Release Notes**: Latest feature updates and changelog.
- **Keyboard Shortcuts Reference**: Searchable cheat sheet of all IDE hotkeys.
- **Process Explorer**: Live view of active development servers, sandbox bridge, and memory utilization.
- **Check for Updates**: Interactive version verification.
- **About Hyperion**: Complete environment and build metadata.

### 9. 📐 Full-Stack Architecture Visualizer
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
| `Ctrl+Shift+\`` | Create New Native Terminal |
| `Ctrl+Shift+5` | Split Terminal Side-by-Side |
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
│   │   ├── ai.js           # Cypher AI assistant & Hugging Face router endpoints
│   │   ├── sandbox.js      # Live preview proxy, streaming execution, and bridge
│   │   └── git.js          # Git cloning and source control endpoints
│   ├── sandboxEngine.js    # Child process execution & native shell spawning
│   └── server.js           # Main backend entry point (:5000)
├── src/
│   ├── components/
│   │   ├── Architecture/   # Three.js 3D diagram, ERD, and blueprint canvas
│   │   ├── BottomPanel/    # Unified bottom panel (Terminal, Output, Problems, Ports)
│   │   ├── Chat/           # Cypher AI security assistant
│   │   ├── CommandPalette/ # Searchable command palette & quick open switcher
│   │   ├── ContextMenu/    # Full-featured context menus
│   │   ├── Editor/         # Monaco Editor wrapper and custom tab handlers
│   │   ├── Explorer/       # File explorer tree with inline creation
│   │   ├── LiveBrowser/    # Hyperion IDE Simple Browser previewer
│   │   ├── Modal/          # Core reusable modal dialog
│   │   ├── Navbar/         # Top menu bar, window controls, and dropdowns
│   │   ├── RunDebug/       # RunDebug panel, SeleniumRunner & QA Studio
│   │   ├── Sidebar/        # Activity bar & Manage Gear context menu
│   │   └── Terminal/       # Native shell integration with xterm.js
│   ├── context/
│   │   ├── EditorContext.jsx   # Editor state, tabs, and view dispatchers
│   │   ├── FileContext.jsx     # Workspace files and directory persistence
│   │   ├── TerminalContext.jsx # Native terminal sessions & command router
│   │   └── ThemeContext.jsx    # CSS variables and theme persistence
│   ├── data/
│   │   ├── commands.json   # Shell command references
│   │   ├── helpTopics.jsx  # Structured content for help dialogues
│   │   ├── menu.jsx        # Top-level menu definitions (File, Edit, Help...)
│   │   ├── settings.json   # Default user configuration settings
│   │   └── themes.json     # Multi-theme palette specifications
│   ├── pages/
│   │   └── SettingsPage/   # Visual Settings UI and settings.json editor
│   ├── services/
│   │   ├── elementInspector.js # Chromium hover highlight & locator engine
│   │   ├── sandboxService.js   # API communication for terminal & execution
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
- **Terminal**: `@xterm/xterm`, `@xterm/addon-fit`, `@xterm/addon-web-links`, `@xterm/addon-search`
- **Testing & QA**: W3C DOM Automation, Hyperion WebDriver, Custom AI Cursor Simulator
- **Styling**: Pure CSS Variables with live multi-theme injection across all components

---

## 📄 License

MIT License — Developed by Google DeepMind Advanced Agentic Coding.
