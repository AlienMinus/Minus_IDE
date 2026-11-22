# Hyperion IDE — Product Design Document (PDD)

> **Document Version:** 3.2.0  
> **Status:** Production Specification  
> **Primary Themes:** Pixelatte (Arcade Dark & Gameboy Cream), Modern Dark, Modern Light, High Contrast  
> **Author:** Hyperion Core Design & Engineering Group

---

## 1. Product Vision & Design Philosophy

Hyperion IDE is engineered around a core design philosophy: **The Developer's Cockpit**. Modern software engineers are frequently forced to context-switch across disconnected tools: code editors, API test clients, operating system terminals, browser devtools, architectural whiteboards, and security dashboards.

Hyperion IDE unifies these workflows inside an ultra-responsive, browser-native desktop interface that provides:
1. **Uncompromised Desktop Ergonomics**: True multi-tab layouts, split editors, native host terminal access, and VS Code-standard keybindings.
2. **Visual Intelligence & Empathy**: 3D component topology diagrams, real-time code health telemetry, and an Autonomous QA Agent with visible human cursor interactions.
3. **Distinctive Aesthetic Identity**: Advanced multi-theme engine featuring our signature **Pixelatte** retro-arcade design system alongside polished modern dark, modern light, and accessibility-compliant high-contrast themes.

---

## 2. Design System Architecture & Theme Tokens

Hyperion IDE utilizes an adaptive, CSS-custom-property-driven design system. Every visual element—from Monaco syntax highlighting to activity bar icons, modal windows, and terminal scrollbars—is parameterized through consistent semantic tokens.

### 2.1. Signature Featured Theme: "Pixelatte" (Arcade Dark)

Inspired by classic 16-bit arcade video game consoles and glowing CRT monitors.

* **Design Characteristics**:
  * Deep cosmic violet and arcade indigo surfaces (`#0f0728`, `#170c3d`, `#281566`).
  * High-visibility 8-bit text: Coin Yellow (`#ffff00`), 1-Up Cyan (`#00f5d4`), Bubblegum Pink (`#ff70a6`).
  * High-contrast borders: Arcade Gold (`#facc15`) and Heart Red (`#ff0055`).
  * **Absolute 0px Radius**: Razor-sharp pixel corners across all buttons, tabs, panels, and modals.
  * **Hard Solid Shadows**: Drop shadows with zero blur (`3px 3px 0px #000000`, `5px 5px 0px #000000`).
  * **Tactile Mechanical Buttons**: `translate(-2px, -2px)` on hover with expanding hard shadows; `translate(2px, 2px)` on click.
  * **Typography**: Google Fonts `'Pixelify Sans'` and `'Press Start 2P'` on headers, brand markers, and status badges.

```
+---------------------------------------------------------------------------------------------------+
| PIXELATTE DARK PALETTE TOKENS                                                                     |
| Primary BG: #0f0728   | Surface: #1b0e45    | Border: #facc15       | Text Primary: #ffff00       |
| Secondary:  #170c3d   | Elevated: #281566   | Accent Cyan: #00f5d4  | Status Bar:   #ff007f       |
+---------------------------------------------------------------------------------------------------+
```

### 2.2. Signature Featured Theme: "Pixelatte Light" (Gameboy Cream & Arcade Day)

Directly implemented from the retro Gameboy console and warm day-cartridge aesthetic.

* **Design Characteristics**:
  * Warm Gameboy cartridge cream surfaces (`#eae6d9`, `#ded9c8`, `#f7f4ea`, `#ffffff`).
  * Deep retro ink black text (`#1f1d16`) with Arcade Pine Cyan (`#007769`) and Terracotta (`#a84200`).
  * Solid charcoal drop shadows (`3px 3px 0px #1f1d16`, `5px 5px 0px #1f1d16`).
  * Warm brass cartridge buttons (`#f59e0b`) with ink borders (`3px solid #1f1d16`).
  * Gameboy berry magenta status bar (`#c90057`) with crisp white pixel glyphs.

```
+---------------------------------------------------------------------------------------------------+
| PIXELATTE LIGHT PALETTE TOKENS                                                                    |
| Primary BG: #eae6d9   | Surface: #f7f4ea    | Border: #1f1d16       | Text Primary: #1f1d16       |
| Secondary:  #ded9c8   | Elevated: #ffffff   | Accent Cyan: #007769  | Status Bar:   #c90057       |
+---------------------------------------------------------------------------------------------------+
```

### 2.3. Theme Palette Comparison Matrix

| Theme ID | Category | Primary BG | Text Primary | Accent Color | Border Style | Shadow Style |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `pixelatte` | Featured Arcade | `#0f0728` | `#ffff00` | `#facc15` | `3px solid #facc15` | `4px 4px 0 #000` (Hard) |
| `pixelatte-light` | Featured Arcade | `#eae6d9` | `#1f1d16` | `#f59e0b` | `3px solid #1f1d16` | `4px 4px 0 #1f1d16` (Hard) |
| `dark-modern` | Dark | `#1e1e1e` | `#cccccc` | `#007acc` | `1px solid #2d2d2d` | `0 4px 12px rgba(0,0,0,0.4)` |
| `light-2026` | Light | `#ffffff` | `#1a202c` | `#0066cc` | `1px solid #e2e8f0` | `0 2px 8px rgba(0,0,0,0.06)` |
| `dark-high-contrast`| High Contrast | `#000000` | `#ffffff` | `#00ffff` | `2px solid #6fc3df` | `none` (Sharp Borders) |
| `monokai` | Dark | `#272822` | `#f8f8f2` | `#a6e22e` | `1px solid #3e3d32` | `0 4px 16px rgba(0,0,0,0.5)` |

---

## 3. Workspace Layout & Spatial Geometry

Hyperion IDE enforces an ergonomic visual hierarchy modeled after modern workstation standards with millisecond-fluid CSS resizing.

```
+---------------------------------------------------------------------------------------------------+
| Top Navigation Bar (38px) - Logo, Menus (File, Edit...), Universal Command Search, Action Controls|
+----+-----------------------+----------------------------------------------------------------------+
| A  | Primary Sidebar       | Main Editor Viewport                                                 |
| c  | (240px - 480px)       | +------------------------------------------------------------------+ |
| t  |                       | | Tab Strip (34px) - File Tabs, Dirty Indicators, Pin, Close Icons | |
| i  | - Explorer            | +------------------------------------------------------------------+ |
| v  | - Search              | | Breadcrumb Navigation Bar (22px) - Folder path & symbols         | |
| i  | - Source Control      | +------------------------------------------------------------------+ |
| t  | - Run & Debug (QA)    | | Monaco Code Editor Area / Split Panes / Markdown Preview          | |
| y  | - Extensions          | |                                                                  | |
|    | - Architecture        | |                                                                  | |
| B  | - API Client          | |                                                                  | |
| a  |                       | +------------------------------------------------------------------+ |
| r  |                       | Bottom Panel (Resizable 180px - 600px / Maximizable)                 |
|    |                       | [Terminal | Output | Problems | Debug Console | Ports | REPL]       |
| 48 |                       | [pwsh 1 + v] [Split Pane] [Kill] [Clear]                           |
| px |                       | Line 1: PS D:\Rough\WebIDE> python -u numpySUM.py                  |
+----+-----------------------+----------------------------------------------------------------------+
| Status Bar (24px) - Branch [main], Sync, Problems [0], Cypher AI [Active], Cursor Ln, Col, UTF-8  |
+---------------------------------------------------------------------------------------------------+
```

### 3.1. Layout Densities

Users can adjust interface density in real time via `Settings > Layout Density`:
* **Compact**: Optimized for laptop screens (13"-14"). Tab height: 28px, sidebar padding: 4px, font size: 12px.
* **Default**: Standard desktop ergonomics (15"-27"). Tab height: 34px, sidebar padding: 8px, font size: 13px.
* **Spacious**: Touchpad & 4K monitor friendliness. Tab height: 40px, sidebar padding: 12px, font size: 14px.

---

## 4. Subsystem UX / UI Deep Dive

### 4.1. Monaco Code Editor Subsystem
* **Dynamic Theme Injection**: Monaco editor themes are programmatically synthesized from the active IDE theme.
* **Pixelatte Token Rules**:
  * Keywords: Bubblegum Pink (`#ff70a6`, bold) in Dark / Berry Red (`#c90057`, bold) in Light.
  * Strings: High-Score Green (`#00f076`) in Dark / Forest Green (`#008744`) in Light.
  * Numbers: Arcade Gold (`#ffe600`) in Dark / Terracotta (`#a84200`) in Light.
  * Comments: Deep Purple (`#7b2cbf`) in Dark / Plum (`#7a288a`) in Light.
  * Identifiers: Retro Yellow (`#ffff00`) in Dark / Charcoal Ink (`#1f1d16`) in Light.
* **Gutter & Minimap**: Integrated line numbers, breakpoint dots, and syntax folding controls.

### 4.2. Chromium-Style Element Inspector
* **Activation**: Toggle via `Ctrl+Shift+C` or click the Crosshair icon in the live preview toolbar.
* **Visual States**:
  * **Hover Overlay**: Translucent blue bounding box (`rgba(56, 189, 248, 0.25)`) with an outer 1.5px solid border directly overlaid on the target element.
  * **Inspector Pill**: Floating badge above the element displaying `tag`, `#id`, `.class`, dimensions (`W × H px`), and computed ARIA role.
  * **Click-to-Freeze**: Clicking locks the element without navigating the page or submitting forms.
  * **Action Popover**: Contextual menu offering:
    * 🤖 **Send Agent Here** (Smoothly moves AI cursor to element with speech thought)
    * ⚡ **Click Element** (Dispatches synthetic click with visual ripple)
    * ⌨️ **Send Keys** (Dispatches synthetic typing)
    * 🎯 **Target for Agent** (Marks element as high-priority target for automated patrol)

### 4.3. Autonomous QA Studio & Human Emulation
* **Visual AI Cursor**: A simulated mouse cursor with physics-smoothed cubic-bezier interpolation.
* **Ripple Effects**: Expanding concentric ripple animations on mouse click.
* **Thought Bubble**: Floating pill near the cursor logging the agent's real-time reasoning (e.g., *"Inspecting form validation boundaries..."* or *"Scrolling to discover footer landmarks..."*).
* **Live Health Score Gauge**: Dynamic circular HUD showing application health score (0-100) based on route resiliency, console error audit, and accessibility compliance.

### 4.4. API Client & cURL Testing Studio
* **Layout**: Two-column responsive workbench modeled as a lightweight, zero-latency Postman alternative.
* **Controls**:
  * Method Selector: Color-coded badge dropdown (`GET` green, `POST` blue, `PUT` orange, `DELETE` red).
  * Quick Presets: One-click pills for local servers (`:8000 Python`, `:5173 Vite`, `:3000 Express`, `:5000 Backend`).
  * Body Tabs: `JSON`, `Raw Text`, `Form Data`, `Headers`, `Auth`.
  * Response Inspector: Real-time latency timer (`ms`), byte size indicator, Pretty JSON viewer with search filter, and **AI Security Audit** button.

### 4.5. Source Control Git UI
* **Branch Bar**: Chunky pill badge showing current active Git branch with branch-switching dropdown and sync indicators (`ahead / behind`).
* **Change Tree**: Staged Changes, Changes (Unstaged), and Untracked Files sections with quick action buttons (`+` stage, `-` unstage, `↺` discard).
* **Smart Commit Area**: Multi-line commit message input with **AI Generate Commit** button that automatically writes conventional commit messages from git diffs.

### 4.6. 3D Architectural Topology & Flow Canvas
* **Three.js WebGL Viewport**: Interactive 3D component mesh with orbit controls (pan, zoom, rotate).
* **Layer Hierarchies**: Components categorized into UI Layer, Logic/Hook Layer, State Context Layer, Service Layer, and Backend API Layer.
* **Particle Trails**: Glowing animated light particles traversing lines between nodes to visualize runtime execution flows.

---

## 5. Typography & Font Specifications

| Font Family | Usage | Fallback Stack |
| :--- | :--- | :--- |
| **Pixelify Sans** | Pixelatte headers, logo, brand tags, status bar | `'Press Start 2P', monospace, sans-serif` |
| **Roboto Mono** | Code editor, terminal, inputs, badges, buttons | `'Courier New', monospace` |
| **Plus Jakarta Sans** | Modern theme headings, modal dialog titles | `'Inter', system-ui, sans-serif` |
| **Inter** | Modern theme body text, tree items, labels | `-apple-system, BlinkMacSystemFont, sans-serif` |

---

## 6. Accessibility & Sensory Ergonomics

1. **Color Contrast Compliance**:
   * All themes enforce WCAG 2.1 AA compliant contrast ratios (minimum 4.5:1 for normal text; 7:1 for high contrast mode).
2. **Reduced Motion**:
   * Respects `@media (prefers-reduced-motion: reduce)`, disabling 3D particle animations and synthetic cursor gliding.
3. **Screen Reader Semantic Roles**:
   * Dynamic tabs use `role="tablist"` and `role="tab"`, with `aria-selected` accurately synchronized to editor state.
4. **Keyboard-Only Traversal**:
   * Complete hotkey coverage allowing full navigation, tab switching, file creation, terminal execution, and testing without touching a mouse.
