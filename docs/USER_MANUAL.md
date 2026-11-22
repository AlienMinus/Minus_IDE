# Hyperion IDE — Comprehensive User Manual & Operations Guide

> **Document Version:** 3.2.0  
> **Applicable Release:** Hyperion IDE Production v3.2.0+  
> **Target Audience:** Software Developers, QA Engineers, Security Analysts, Students, Instructors

---

## 1. Introduction & Workspace Orientation

Welcome to **Hyperion IDE** — your all-in-one browser-native engineering environment with direct native host execution, automated AI testing, and architectural visualization.

### 1.1. Interface Anatomy

```
+---------------------------------------------------------------------------------------------------+
| 1. Top Navbar: Menus (File, Edit, View, Terminal, Help), Universal Command Bar, Action Controls   |
+----+-----------------------+----------------------------------------------------------------------+
| 2. | 3. Primary Sidebar    | 4. Main Editor Area                                                  |
| A  |                       | +------------------------------------------------------------------+ |
| c  | View Options:         | | Tab Strip: File Tabs, Preview Tabs, Architecture Tabs, Diff Tabs | |
| t  | - Explorer (Files)    | +------------------------------------------------------------------+ |
| i  | - Search & Replace    | | Breadcrumb Path Bar                                              | |
| v  | - Source Control (Git)| +------------------------------------------------------------------+ |
| i  | - Run & Debug (QA)    | | Monaco Code Editor / Split Viewports                             | |
| t  | - Extensions          | |                                                                  | |
| y  | - Architecture        | |                                                                  | |
|    | - API Client (cURL)   | |                                                                  | |
| B  |                       | +------------------------------------------------------------------+ |
| a  |                       | 5. Bottom Panel (Resizable & Maximizable)                           |
| r  |                       | Tabs: [Terminal | Output | Problems | Debug Console | Ports | REPL] |
|    |                       | Active Shell: PowerShell, CMD, Bash, Cypher AI, or REPL            |
+----+-----------------------+----------------------------------------------------------------------+
| 6. Status Bar: Git Branch [main], Sync Status, Problems [0], Cypher AI [Active], Theme Badge      |
+---------------------------------------------------------------------------------------------------+
```

### 1.2. Opening a Local Folder
1. Click **File > Open Folder** or press `Ctrl+O`.
2. When prompted by your browser, select your project directory and grant permission via the **File System Access API**.
3. Hyperion IDE will recursively index your directory, initialize the file explorer, detect any Git repository, and configure language diagnostics.

---

## 2. Working with Code (Monaco Editor & Explorer)

### 2.1. File Explorer Actions
* **Create File**: Click the New File icon (`+`) at the top of the Explorer or right-click any folder.
* **Create Folder**: Click the New Folder icon.
* **Rename / Delete**: Right-click any file or directory in the tree to access the context menu.
* **Drag and Drop**: Drag local files or zip archives directly from your desktop into the Explorer to import them.

### 2.2. Editor Capabilities
Hyperion integrates the desktop-standard **Monaco Editor**:
* **Multi-Cursor**: Hold `Alt` and click anywhere to place multiple cursors, or press `Ctrl+Alt+Up/Down`.
* **Quick Symbol Search**: Press `Ctrl+Shift+O` to search functions and symbols in the active file.
* **Format Document**: Press `Shift+Alt+F` to format with Prettier or built-in language formatters.
* **Split Editor**: Right-click an open tab and select **Split Right** (or press `Ctrl+\`) to edit files side-by-side.

### 2.3. Specialized Document Viewers
* **Markdown**: Open any `.md` file and click the **Open Preview** button in the top-right toolbar for live rendered preview.
* **Jupyter Notebooks**: Open `.ipynb` files to inspect cells, code blocks, outputs, and metadata.
* **Spreadsheets & CSVs**: Open `.csv` or `.xlsx` files to view dynamic data grid tables with sortable columns.
* **Images, Audio & Video**: Inspect images (PNG, JPG, SVG, WebP) with zoom controls, play audio files (MP3, WAV), and play video files (MP4) directly in editor tabs.

---

## 3. Running Code & Native Terminal

Hyperion connects directly to your native operating system host, meaning you have real, unconstrained shell access without mock containers.

### 3.1. Opening & Managing Native Terminals
* **Toggle Terminal**: Press `Ctrl+\`` or `Ctrl+J`.
* **New Terminal**: Click the `+` button in the terminal header or press `Ctrl+Shift+\``.
* **Shell Switching**: Click the shell dropdown to choose between:
  * **PowerShell** (`pwsh`): Native Windows PowerShell.
  * **Command Prompt** (`cmd`): Direct Windows Command Prompt.
  * **Bash**: Git Bash or Linux/macOS shell.
  * **Cypher AI Sentinel**: Interactive security terminal.
  * **REPL**: Multi-language interactive read-eval-print loop.
* **Split Terminal**: Click the Split icon or press `Ctrl+Shift+5` to run two terminals side-by-side.
* **Maximize Panel**: Double-click the panel header or press `Ctrl+Shift+M`.

### 3.2. Running Files Directly (`F5`)
* Press **`F5`** or click the green **Run** button in the top navbar to execute the active file.
* Hyperion automatically detects the language and runs the appropriate compiler or interpreter:
  * Python files (`.py`) execute as `python -u "${fileName}"`.
  * C files (`.c`) compile via `gcc` and run the resulting binary.
  * C++ files (`.cpp`) compile via `g++` and run the binary.
  * Node.js files (`.js`, `.mjs`) execute as `node "${fileName}"`.

### 3.3. Interactive Terminal Programs (`input()`, `scanf()`)
Hyperion features an **unbuffered streaming engine**:
1. When running interactive scripts like `numpySUM.py` with `input("Enter integer value: ")`, the prompt is displayed **instantly** without waiting for a newline.
2. Click inside the terminal, type your input value (e.g. `42`), and press <kbd>Enter</kbd>.
3. Your input is immediately piped to the process's standard input (`stdin`) and execution continues seamlessly.

### 3.4. Output Console Inspection
Click the **OUTPUT** tab in the bottom panel to inspect formatted compiler outputs:
* **`# Lines` Toggle**: Show or hide line-by-line gutter numbers.
* **`Wrap` Toggle**: Toggle word-wrapping for long compiler logs.
* **Search Filter**: Type in the `Find in output...` box to filter lines in real-time.
* **Stream Isolation**: Switch between `All`, `STDOUT`, and `STDERR` to debug warnings and errors independently.

---

## 4. Autonomous QA Testing Studio & Selenium Automation

Hyperion includes a built-in automated QA testing suite in the **Run & Debug** (`Ctrl+Shift+D`) panel.

```
+---------------------------------------------------------------------------------------------------+
| AUTONOMOUS QA TESTING WORKFLOW                                                                    |
|                                                                                                   |
|  [Launch Dev Server] -> [Open Run & Debug] -> [Target URL] -> [Launch Patrol] -> [Export Report]  |
|     (npm run dev)        (Ctrl+Shift+D)       (:5174/local)    (Human Emulation)   (TEST_REPORT)  |
+---------------------------------------------------------------------------------------------------+
```

### 4.1. Launching an Autonomous Test Patrol
1. Start your local web development server (e.g., `npm run dev` in the terminal).
2. Open the **Run & Debug** panel from the left activity bar (`Ctrl+Shift+D`).
3. Enter your target application URL (e.g. `http://localhost:5174`).
4. Select your desired **Execution Speed**:
   * **Slow**: Realistic human pacing (great for live demos and visual verification).
   * **Normal**: Standard testing speed.
   * **Fast / Turbo**: High-speed regression testing.
5. Click **Start Autonomous Test Patrol**.

### 4.2. What the QA Agent Does
The agent tests your live web application like an experienced human user:
* **Smooth Scrolling**: Scrolls down page sections to trigger IntersectionObserver animations and lazy-loaded assets, then scrolls back to top navigation.
* **Route Traversal**: Discovers and clicks internal navigation links (`/#skills`, `/#projects`, `/#contact`), asserting page transitions without errors.
* **Form Boundary Testing**: Tests `<form>` validation by submitting empty inputs first, asserting error messages render without app crash, then injects realistic test data.
* **Resiliency Checks**: Tests accordions, modal dialogues, and theme toggles.
* **Visual AI Cursor**: Renders an animated cursor in the live preview with click ripples and thought bubbles logging its reasoning.

### 4.3. Using the Chromium Element Inspector
1. Press **`Ctrl+Shift+C`** or click the crosshair icon.
2. Hover over any element inside the live preview to see its bounding box, tag, ID, classes, dimensions, and accessibility role.
3. Click the element to freeze inspection.
4. From the popover menu, click **Send Agent Here** to glide the AI cursor to the element, or **Add Test Step** to build custom automated assertions.

### 4.4. Test Reports & Health Scores
Upon completion, the agent computes an **Application Health Score** (0-100) and provides:
* **`TEST_REPORT.md`**: Downloadable Markdown report listing all executed steps, pass/fail statuses, and duration.
* **Console Audit**: Summary of all browser console warnings, network 404/500 errors, and unhandled exceptions.

---

## 5. API Client & cURL Testing Studio

Hyperion IDE includes an integrated API testing workbench located in the **API Client** tab on the left activity bar.

### 5.1. Sending HTTP Requests
1. Click the **API Client** icon in the activity bar.
2. Select an HTTP Method (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`).
3. Enter your target URL (e.g. `http://localhost:8000/api/health`).
   * *Tip*: Use quick preset pills like `:8000 Python`, `:5173 Vite`, or `:3000 Express`.
4. Add custom Headers, Query Parameters, or Request Body (JSON or Form).
5. Click **[Send]**.
6. The request routes through `/api/sandbox/curl-proxy`, bypassing browser CORS limitations and automatically resolving loopback addresses.

### 5.2. Importing cURL Commands
1. Click the **Import cURL** button in the top-right of the API Client.
2. Paste any raw cURL command (e.g. `curl -X POST http://localhost:8000/api/sandbox/stream -H "Content-Type: application/json" -d '{"command":"dir"}'`).
3. Click **Import**: Hyperion automatically parses the method, URL, headers, and body into the form fields.

### 5.3. AI Security Audit on Responses
After receiving an API response, click the **AI Analyze** button above the response pane. Hyperion inspects the response payload to detect:
* Accidental credential leaks (tokens, hashed passwords, private keys).
* Verbose stack traces exposing internal database queries.
* Schema structure inconsistencies.

---

## 6. Source Control & Git Integration

Access the **Source Control** panel via `Ctrl+Shift+G` or the Git branch icon in the left activity bar.

### 6.1. Staging & Committing Changes
1. **Inspect Changes**: View all modified, untracked, and deleted files organized in clean trees.
2. **View Diff**: Click any file to open the side-by-side Monaco Diff Viewer showing exact additions and deletions.
3. **Stage Changes**: Click the `+` icon next to an individual file, or the `+` on the Changes header to stage all files.
4. **AI Generate Commit**: Click the magic wand icon (**AI Generate Commit**) in the commit message box. Cypher AI inspects your git diffs and drafts a structured conventional commit message (e.g., `feat(terminal): unbuffer child process pipes for interactive stdin`).
5. Click **Commit** (or press `Ctrl+Enter`).

### 6.2. Branch Management
* Click the branch badge in the bottom-left status bar or top of the Source Control panel to view all local and remote branches.
* Select an existing branch to check out, or click **Create New Branch** to branch from current HEAD.

---

## 7. 3D Architecture Visualizer & Mongo ERD

Press **`Ctrl+Shift+A`** or click the Architecture icon in the activity bar.

### 7.1. Three.js 3D Execution Flow
* **Orbit Controls**: Left-click and drag to rotate the 3D model; right-click to pan; scroll to zoom.
* **Component Mesh**: Visualizes UI components, Hooks, Contexts, Services, and Backend API routes arranged across layered 3D planes.
* **Particle Trails**: Glowing light particles traverse connections to indicate active execution flows.

### 7.2. MongoDB / Mongoose Schema ERD
* Click the **Mongo Schema ERD** tab.
* Hyperion statically parses all Mongoose models in your codebase and generates an interactive SVG Entity-Relationship Diagram showing model fields, data types, primary keys (`_id`), foreign references (`ref`), and cardinality (1:1, 1:N, N:M).

---

## 8. Themes & Visual Personalization

Hyperion IDE features 30+ persisted visual themes.

### 8.1. Switching Themes
1. Click the **Gear icon** in the bottom-left corner and hover over **Themes >**.
2. Featured themes are displayed at the very top under **★ Featured Themes**:
   * **Pixelatte (Retro 8-Bit Arcade)**: Deep cosmic violet surfaces (`#0f0728`), 8-bit coin yellow (`#ffff00`), 1-Up cyan (`#00f5d4`), arcade gold (`#facc15`), and magenta status bar (`#ff007f`). Features crisp `0px` radius, hard drop shadows, and `Pixelify Sans` arcade typography.
   * **Pixelatte Light (Retro Gameboy Cream)**: Gameboy cartridge cream (`#eae6d9`), retro ink black (`#1f1d16`), brass coin accents (`#f59e0b`), and berry red status bar (`#c90057`).
   * **Dark Themes**: Dark Modern, Dark 2026, Monokai, One Dark, Pro Hacker, Spinel.
   * **Light Themes**: Light Modern, Light 2026, Quiet Light, Solarized Light.
   * **High Contrast**: Dark High Contrast, Light High Contrast.
3. Click any theme to apply it instantly across all editor tabs, terminals, and modals.

---

## 9. Troubleshooting & FAQ

### Q1: My terminal program hangs or doesn't show the prompt for `input()`.
* **Fix**: Ensure your file is executed with unbuffered stdout. In Python, Hyperion automatically runs `python -u "${fileName}"`. If executing manual commands in the terminal, append `-u` (e.g. `python -u script.py`).

### Q2: Port 8000 is reported as already in use (`Errno 10048`).
* **Fix**: Run `Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess | Stop-Process -Force` in PowerShell, or inspect running listeners with `netstat -ano | findstr :8000`.

### Q3: Requests to `http://localhost:8000/api/health` in API Client time out.
* **Fix**: Hyperion's cURL proxy automatically normalizes `localhost` to `127.0.0.1` and disables environment HTTP proxies (`session.trust_env = False`) to prevent Windows IPv6 connection stalls. Ensure your backend server is active on port 8000.
