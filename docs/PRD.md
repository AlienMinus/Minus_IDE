# Hyperion IDE — Product Requirements Document (PRD)

> **Document Version:** 3.2.0  
> **Status:** Approved / Production Specification  
> **Product Category:** Cloud-Native Web IDE & Autonomous QA Studio  
> **Target Audience:** Engineering Leads, Product Managers, QA Engineers, Core Contributors

---

## 1. Executive Summary & Problem Statement

### 1.1. Problem Statement
The modern software engineering and testing workflow is deeply fragmented. On average, a software developer or QA engineer routinely juggles between 6 to 9 distinct desktop applications during a standard work day:
1. A code editor or heavy IDE (e.g., VS Code, IntelliJ, WebStorm).
2. A separate terminal emulator (PowerShell, Windows Terminal, iTerm2).
3. An API client (Postman, Insomnia) for testing backend microservices.
4. A browser with DevTools for DOM inspection and layout debugging.
5. An automation testing framework (Selenium, Cypress, Playwright) requiring dedicated test harnesses.
6. A security code scanner (Snyk, SonarQube) for vulnerability detection.
7. An architectural modeling tool (Mermaid, Draw.io) for code comprehension.
8. Git client GUI or command-line wrappers.

This fragmentation leads to substantial cognitive friction, high RAM utilization (multiple Electron instances consuming 10GB+ RAM), and fragile environment setup for new team members and students.

### 1.2. The Hyperion Solution
**Hyperion IDE** consolidates this entire toolchain into a unified, high-performance browser interface backed by a modular Python FastAPI backend. It eliminates desktop bloat while delivering:
* Full Monaco editor fidelity with rich language diagnostics.
* Direct native host shell terminal execution with unbuffered real-time SSE streaming.
* An **Autonomous QA Agent** that navigates, tests, and stress-tests live web apps like a human user with a visible AI cursor.
* A built-in Postman-style API client with automated cURL proxying and CORS bypass.
* A Chromium-grade live DOM Element Inspector.
* Real-time 3D Three.js architectural topology and MongoDB ERD generators.
* Full Git source control with AI-assisted commit generation.
* Over 30 visual themes including the signature retro-arcade **Pixelatte** design system.

---

## 2. Target User Personas & Use Cases

```
+--------------------------------------------------------------------------------------------------+
| USER PERSONA MATRIX                                                                              |
+---------------------+-------------------------------+--------------------------------------------+
| Persona             | Core Responsibilities        | Primary Pain Points Solved                 |
+---------------------+-------------------------------+--------------------------------------------+
| Alex (Full-Stack)   | Web apps, APIs, DB schemas    | No context-switching between IDE & Postman |
| Sarah (QA Lead)     | E2E tests, regression checks  | Visual autonomous human-emulating tests    |
| Marcus (Security)   | Code audits, OWASP compliance | Instant SAST security scanning in editor   |
| Priya (Student/Dev) | Learning C, Python, JS, Web   | Zero environment config; 3D architecture   |
+---------------------+-------------------------------+--------------------------------------------+
```

### 2.1. User Persona 1: Full-Stack Developer ("Alex")
* **Needs**: Rapidly develop frontend React and backend FastAPI/Express apps, inspect MongoDB schemas, run native terminals, and test endpoints without leaving the editor.
* **Hyperion Workflow**: Edits code in Monaco, executes dev servers in native host terminals (`npm run dev`), tests API routes in the embedded API Client, and commits changes via Source Control.

### 2.2. User Persona 2: QA & Automation Engineer ("Sarah")
* **Needs**: Run end-to-end tests against live web applications, inspect dynamic DOM elements, capture CSS/XPath locators, verify boundary conditions, and export executive test reports.
* **Hyperion Workflow**: Launches the Autonomous QA Agent in Run & Debug (`Ctrl+Shift+D`), targets elements with the Chromium Inspector (`Ctrl+Shift+C`), and exports `TEST_REPORT.md` with quality scores.

### 2.3. User Persona 3: DevSecOps & Security Specialist ("Marcus")
* **Needs**: Detect hardcoded API secrets, SQL injections, insecure execution calls, and vulnerable dependencies prior to pull requests.
* **Hyperion Workflow**: Runs the Cypher AI Security Sentinel and SAST scanner against the workspace, reviewing categorized CWE/OWASP findings with automated one-click remediation.

### 2.4. User Persona 4: Student & Educator ("Priya")
* **Needs**: Learn programming concepts (Python, C/C++, JavaScript), run interactive console programs requiring user input (`input()`, `scanf()`), and understand software architecture visually.
* **Hyperion Workflow**: Writes code with instant syntax highlighting, inputs data into interactive terminal sessions with unbuffered prompt feedback, and visualizes code execution flow via Three.js 3D diagrams.

---

## 3. Detailed Functional Requirements (FR)

### FR-1: Code Editing & Workspace Management
* **FR-1.1**: The IDE SHALL integrate Monaco Editor with syntax highlighting for 50+ languages (Python, JavaScript, TypeScript, C, C++, HTML, CSS, JSON, Markdown, etc.).
* **FR-1.2**: The editor SHALL support multi-tab management, dirty file indicators (`•`), tab pinning, close actions, and horizontal/vertical split editor layouts.
* **FR-1.3**: The IDE SHALL provide an in-memory Virtual File System (VFS) with drag-and-drop file import, directory creation, file deletion, and native folder opening via the File System Access API.
* **FR-1.4**: The editor SHALL support rich media viewing, including inline Markdown previews, image rendering (PNG, JPG, SVG, WebP), audio playback (MP3, WAV), video playback (MP4), and Jupyter Notebook (`.ipynb`) viewers.

### FR-2: Native Host Execution & Real-Time Terminal Streaming
* **FR-2.1**: The terminal SHALL spawn authentic native host processes (PowerShell on Windows, Command Prompt, or Bash on Linux/macOS) without mock limitations.
* **FR-2.2**: The backend stream engine SHALL utilize unbuffered process pipes (`bufsize=0`) and non-blocking byte reads (`os.read(pipe.fileno(), 4096)`) so that prompts without newlines (`input("Enter: ")`) stream immediately to the frontend.
* **FR-2.3**: Commands for standard tools (`python`, `node`, `gcc`, native binaries) on Windows SHALL route through `cmd.exe /d /s /c` to bypass PowerShell object-pipeline output buffering.
* **FR-2.4**: Keystrokes and line inputs submitted in xterm.js SHALL route via `POST /api/sandbox/stdin` directly to the active process's `stdin` with guaranteed UTF-8 byte flushing.
* **FR-2.5**: The system SHALL provide an Output Console featuring line numbers, a `# Lines` toggle, word wrapping, search filtering, and stream tabs (`All`, `STDOUT`, `STDERR`).

### FR-3: Autonomous QA Agent & Selenium Automation Studio
* **FR-3.1**: The system SHALL feature an Autonomous QA Agent capable of testing live web applications in both headless and headed modes.
* **FR-3.2**: The agent SHALL perform natural mousewheel scrolling to explore below-the-fold content, animations, and return to navigation landmarks.
* **FR-3.3**: The agent SHALL discover and patrol all internal routes (e.g. `/#skills`, `/#projects`, `/#contact`), asserting valid view state transitions without unhandled exceptions.
* **FR-3.4**: The agent SHALL perform form boundary validation: submitting empty forms to verify error state handling without crash, followed by synthetic realistic typing into inputs.
* **FR-3.5**: The agent SHALL render a visual physics-smoothed AI cursor with click ripples, typing indicators, and thought speech bubbles in the live preview.
* **FR-3.6**: The agent SHALL calculate a quantitative Health Score (0-100) and generate downloadable Markdown (`TEST_REPORT.md`), HTML, and JSON audit summaries.

### FR-4: Chromium-Style Element Inspector
* **FR-4.1**: Users SHALL be able to toggle the DOM Element Inspector at any time via `Ctrl+Shift+C` or the crosshair toolbar icon.
* **FR-4.2**: Hovering over elements inside the live preview iframe SHALL display a translucent blue bounding box with a floating DevTools pill indicating tag, `#id`, `.class`, dimensions, and accessibility role.
* **FR-4.3**: Clicking an inspected element SHALL freeze the inspection state and generate clean CSS selectors, XPath expressions, and semantic Testing Library locators (`By.role`, `By.text`).
* **FR-4.4**: The inspector popover SHALL provide one-click actions: "Send Agent Here", "Click Element", "Send Keys", and "Target for Agent".

### FR-5: Integrated API Client & cURL Tester
* **FR-5.1**: The IDE SHALL include an embedded API testing studio supporting `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, and `OPTIONS`.
* **FR-5.2**: The API Client SHALL support environment configurations (`Localhost`, `Production`, `Staging`) with key-value variable interpolation (`{{baseUrl}}`).
* **FR-5.3**: All requests SHALL route through `/api/sandbox/curl-proxy` to bypass browser CORS restrictions and automatically normalize `localhost` to IPv4 `127.0.0.1` to prevent Windows IPv6 connection stalls.
* **FR-5.4**: The API Client SHALL parse raw cURL commands pasted by the user into method, URL, headers, and request body.
* **FR-5.5**: The client SHALL provide an "AI Analyze" security audit button that inspects response payloads against data leak rules and schema anomalies.

### FR-6: Source Control & Git UI
* **FR-6.1**: The IDE SHALL detect Git repositories and render active branch, tracking metrics (ahead/behind), and unstaged/staged change trees.
* **FR-6.2**: The UI SHALL support staging individual files, staging all files, unstaging, discarding modifications, and viewing side-by-side Monaco diffs.
* **FR-6.3**: The commit box SHALL include an "AI Generate Commit" button that inspects active git diffs and drafts conventional commit messages automatically.
* **FR-6.4**: The UI SHALL allow creating new branches, checking out existing branches, and synchronizing with remote repositories.

### FR-7: Cypher AI & SAST Security Sentinel
* **FR-7.1**: The IDE SHALL provide a Static Application Security Testing (SAST) engine that scans workspace files for OWASP Top 10 vulnerabilities, injection flaws, hardcoded credentials, and unsafe system calls.
* **FR-7.2**: Findings SHALL be categorized by severity (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) with code snippets, line numbers, CWE mappings, and remediation guidance.
* **FR-7.3**: The Cypher AI chat assistant SHALL accept editor selections and files as context to generate security explanations and automated refactorings.

### FR-8: 3D Architecture Visualizer & Mongo ERD
* **FR-8.1**: The IDE SHALL feature a Three.js 3D WebGL topology canvas rendering project components, layers, and animated particle execution flows.
* **FR-8.2**: The system SHALL include an AST Mongoose parser that extracts MongoDB entities, field types, primary keys, and relationships (1:1, 1:N, N:M) into an interactive SVG Entity-Relationship Diagram.
* **FR-8.3**: The visualizer SHALL automatically parse backend routes (FastAPI & Express) into a searchable API matrix.

### FR-9: Interactive REPL Engine
* **FR-9.1**: The IDE SHALL provide stateful interactive REPL sessions for Python, Node.js, Shell, and C/C++.
* **FR-9.2**: Sessions SHALL maintain variable scopes and import states across consecutive evaluations.

### FR-10: Multi-Theme Engine & Pixelatte System
* **FR-10.1**: The IDE SHALL provide 30+ persisted visual themes across Featured, Dark, Light, and High Contrast categories.
* **FR-10.2**: The IDE SHALL feature the retro-arcade **Pixelatte** (Dark) and **Pixelatte Light** (Gameboy Cream) themes with 0px sharp radii, hard solid shadows, and pixel typography.
* **FR-10.3**: Theme changes SHALL dynamically propagate across the entire UI, including the Monaco code editor, terminal, scrollbars, and modals without requiring a page reload.

---

## 4. Non-Functional Requirements (NFR)

### NFR-1: Performance & Responsiveness
* **NFR-1.1**: The Monaco Editor SHALL initialize and render the active document within 300ms on standard developer hardware.
* **NFR-1.2**: Native terminal output chunks SHALL stream via SSE with an end-to-end latency of less than 15ms.
* **NFR-1.3**: Interactive terminal input (`stdin`) SHALL unbuffer immediately without holding locks on the child process pipe.

### NFR-2: Security & Sandboxing
* **NFR-2.1**: All backend file paths SHALL be validated to prevent directory traversal attacks (`../` escaping workspace roots).
* **NFR-2.2**: The cURL proxy SHALL strictly ignore ambient system HTTP proxies (`session.trust_env = False`) for loopback and local addresses (`127.0.0.1`, `localhost`).
* **NFR-2.3**: Injected bridge scripts in the live preview proxy SHALL run within sandboxed iframe boundaries with strict origin controls.

### NFR-3: Reliability & Fault Tolerance
* **NFR-3.1**: Subprocess termination requests SHALL cleanly kill child process process trees on both Windows (`taskkill /F /T`) and Unix (`kill -9`).
* **NFR-3.2**: SSE connections that terminate unexpectedly SHALL be handled gracefully without crashing the frontend terminal session.

### NFR-4: Platform Compatibility
* **NFR-4.1**: The frontend client SHALL run seamlessly on modern evergreen browsers: Google Chrome, Mozilla Firefox, Microsoft Edge, and Brave.
* **NFR-4.2**: The backend runtime SHALL run natively on Windows 10/11 (PowerShell & CMD), Ubuntu/Debian Linux, and macOS.

---

## 5. Metrics & Success Criteria

| Metric | Target | Measurement Method |
| :--- | :--- | :--- |
| **Terminal Input Latency** | < 20ms | Keystroke timestamp to child process stdin write |
| **Autonomous QA Form Accuracy**| > 98% | Successful discovery and validation of form inputs |
| **API Client Response Fidelity**| 100% | Byte-for-byte parity with direct native cURL |
| **Theme Switch Transition** | < 50ms | Time from dropdown click to complete CSS token application |
| **Memory Utilization (Browser)**| < 350MB | Chrome Task Manager on a 50-file workspace |
