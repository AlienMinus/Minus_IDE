# Hyperion IDE — Documentation Portal & Quickstart Guide

Welcome to the official technical documentation suite for **Hyperion IDE** — the next-generation autonomous AI Web IDE, native host development workspace, and automated QA testing studio.

---

## 📚 Documentation Index

The `docs/` directory contains complete, production-grade architectural and operational specifications:

| Document | Primary Audience | Description |
| :--- | :--- | :--- |
| 🗄️ [**DATABASE_SCHEMA_DATAFLOW.md**](./DATABASE_SCHEMA_DATAFLOW.md) | Backend Devs, DBAs, Architects | Storage hierarchy, Pydantic backend models, in-memory VFS, Mongoose AST schema parser, and Mermaid sequence dataflow diagrams. |
| 🎨 [**PDD.md**](./PDD.md) | UI/UX Designers, Frontend Devs | Product Design Document detailing design tokens, spatial layout, component UX deep dives, and the signature **Pixelatte** retro-arcade design system. |
| 📋 [**PRD.md**](./PRD.md) | Product Managers, QA Leads, Devs | Product Requirements Document outlining target personas, detailed functional requirements (FR-1 to FR-10), non-functional requirements, and success metrics. |
| 📐 [**PROJECT_OVERVIEW.md**](./PROJECT_OVERVIEW.md) | All Engineers & Stakeholders | High-level system architecture, subsystem breakdowns, technology stack matrix, and repository file map. |
| 📖 [**USER_MANUAL.md**](./USER_MANUAL.md) | End Users, Developers, Testers | Practical step-by-step user manual covering code editing, native terminal runs, autonomous QA testing, API testing, Git, and theme customization. |

---

## ⚡ Quickstart Guide

### 1. Prerequisites
Ensure the following are installed on your host machine:
* **Node.js**: v18.0.0 or higher (v20+ recommended)
* **Python**: v3.10 or higher
* **Git**: v2.30+
* **Browser**: Google Chrome, Microsoft Edge, or Mozilla Firefox

### 2. Installation & Setup

Clone the repository and install both frontend and backend dependencies:

```bash
# Clone the repository
git clone https://github.com/your-username/WebIDE.git
cd WebIDE

# Install Frontend Dependencies
npm install

# Setup Python Backend Virtual Environment
cd backend
python -m venv venv

# Activate Virtual Environment (Windows PowerShell)
.\venv\Scripts\Activate.ps1
# Or on Linux / macOS:
# source venv/bin/activate

# Install Python Requirements
pip install -r requirements.txt
cd ..
```

### 3. Launching Hyperion IDE

Run both the FastAPI backend and Vite frontend dev servers concurrently:

```bash
# Terminal 1: Launch FastAPI Backend Server (Port 8000)
npm run backend:start

# Terminal 2: Launch Vite Frontend Dev Server (Port 5173)
npm run dev
```

Open your browser and navigate to **`http://localhost:5173`**.

---

## ⚙️ Environment Configuration (`backend/.env`)

Create a `.env` file in `backend/` or the root workspace to configure optional AI and browser automation settings:

```ini
# Server Binding
BACKEND_HOST=127.0.0.1
PORT=8000
FASTAPI_ENV=production

# Hugging Face AI Router (Optional for cloud LLM reasoning)
HF_TOKEN=your_huggingface_api_token_here

# Local AI Engine (Optional CPU-based code assistant)
QWEN_MODEL_ID=Qwen/Qwen2.5-Coder-0.5B-Instruct

# Selenium Autonomous QA Engine Defaults
SELENIUM_BROWSER=chrome
SELENIUM_HEADLESS=true
SELENIUM_WIDTH=1280
SELENIUM_HEIGHT=800
SELENIUM_TIMEOUT=10
```

---

## ⌨️ Essential Keyboard Shortcuts

| Shortcut | Description |
| :--- | :--- |
| `Ctrl+Shift+P` | Open Command Palette / Quick File Open |
| `Ctrl+,` | Open Visual Settings & Theme Configuration |
| `Ctrl+Shift+C` | Toggle Chromium-Style Inspect & Select Element |
| `Ctrl+Shift+D` | Open Run & Debug / Autonomous QA Studio |
| `Ctrl+Shift+G` | Open Source Control & Git Manager |
| `Ctrl+Shift+A` | Open 3D Architecture Visualizer & Mongo ERD |
| `Ctrl+B` | Toggle Primary Side Bar |
| `Ctrl+J` | Toggle Bottom Panel |
| `Ctrl+\`` | Toggle Integrated Native Host Terminal |
| `F5` | Run Active File in Terminal |
| `Ctrl+Shift+B` | Run Configured Build Task |

---

## 📄 License & Attribution

Hyperion IDE is open-source software licensed under the **MIT License**.
Developed with advanced agentic engineering standards.
