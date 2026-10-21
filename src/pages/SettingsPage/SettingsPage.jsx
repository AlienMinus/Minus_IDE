import React, { useState, useEffect, useMemo } from "react";
import defaultSettings from "../../data/settings.json";
import useTheme from "../../hooks/useTheme";
import {
  FaSearch,
  FaSlidersH,
  FaFileCode,
  FaUndo,
  FaCheck,
  FaCog,
  FaRobot,
  FaTerminal,
  FaFont,
  FaPalette,
  FaMagic
} from "react-icons/fa";
import "./SettingsPage.css";

const CATEGORIES = [
  { id: "commonly-used", label: "Commonly Used", icon: <FaSlidersH /> },
  { id: "editor", label: "Text Editor", icon: <FaFont /> },
  { id: "workbench", label: "Workbench & Themes", icon: <FaPalette /> },
  { id: "selenium", label: "Autonomous QA & Testing", icon: <FaRobot /> },
  { id: "terminal", label: "Terminal", icon: <FaTerminal /> },
  { id: "ai", label: "AI Assistant", icon: <FaMagic /> }
];

export default function SettingsPage() {
  const { themes, currentThemeId, setTheme } = useTheme();

  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("hyperion_settings");
      if (saved) return { ...defaultSettings, ...JSON.parse(saved) };
    } catch {}
    return { ...defaultSettings };
  });

  const [activeCategory, setActiveCategory] = useState("commonly-used");
  const [searchQuery, setSearchQuery] = useState("");
  const [isJsonMode, setIsJsonMode] = useState(false);
  const [jsonString, setJsonString] = useState("");
  const [jsonError, setJsonError] = useState(null);
  const [saveToast, setSaveToast] = useState(false);

  useEffect(() => {
    setJsonString(JSON.stringify(settings, null, 2));
  }, [settings]);

  const updateSetting = (key, value) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    try {
      localStorage.setItem("hyperion_settings", JSON.stringify(updated));
    } catch {}

    // Special handling for theme changes
    if (key === "workbench.colorTheme") {
      setTheme(value);
    }

    window.dispatchEvent(
      new CustomEvent("hyperion:settings-updated", { detail: { key, value, settings: updated } })
    );

    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 1500);
  };

  const resetSetting = (key) => {
    updateSetting(key, defaultSettings[key]);
  };

  const handleJsonSave = () => {
    try {
      const parsed = JSON.parse(jsonString);
      setSettings(parsed);
      localStorage.setItem("hyperion_settings", JSON.stringify(parsed));
      if (parsed["workbench.colorTheme"]) {
        setTheme(parsed["workbench.colorTheme"]);
      }
      setJsonError(null);
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 1500);
    } catch (err) {
      setJsonError(err.message);
    }
  };

  // Setting Definitions metadata
  const SETTING_DEFS = [
    // Commonly Used
    {
      key: "editor.fontSize",
      category: "editor",
      common: true,
      label: "Editor: Font Size",
      desc: "Controls the font size in pixels for the code editor.",
      type: "number",
      min: 10,
      max: 32
    },
    {
      key: "editor.tabSize",
      category: "editor",
      common: true,
      label: "Editor: Tab Size",
      desc: "The number of spaces a tab is equal to.",
      type: "number",
      min: 2,
      max: 8
    },
    {
      key: "editor.wordWrap",
      category: "editor",
      common: true,
      label: "Editor: Word Wrap",
      desc: "Controls how lines should wrap in the editor.",
      type: "select",
      options: [
        { value: "off", label: "off - Lines will never wrap" },
        { value: "on", label: "on - Lines will wrap at the viewport width" },
        { value: "wordWrapColumn", label: "wordWrapColumn - Lines wrap at fixed column" }
      ]
    },
    {
      key: "workbench.colorTheme",
      category: "workbench",
      common: true,
      label: "Workbench: Color Theme",
      desc: "Specifies the visual color theme of the Hyperion IDE interface.",
      type: "select",
      options: themes.map((t) => ({ value: t.id, label: t.name }))
    },
    {
      key: "selenium.defaultSpeed",
      category: "selenium",
      common: true,
      label: "Autonomous QA: Execution Speed",
      desc: "Default step-by-step delay for Selenium and Agentic testing.",
      type: "select",
      options: [
        { value: "slow", label: "Slow (1200ms step delay)" },
        { value: "normal", label: "Normal (450ms step delay)" },
        { value: "fast", label: "Fast (120ms step delay)" },
        { value: "turbo", label: "Turbo (0ms - zero delay)" }
      ]
    },

    // Editor settings
    {
      key: "editor.fontFamily",
      category: "editor",
      label: "Editor: Font Family",
      desc: "Controls the font family list used in code editor views.",
      type: "text"
    },
    {
      key: "editor.lineNumbers",
      category: "editor",
      label: "Editor: Line Numbers",
      desc: "Controls the display of line numbers in the editor margin.",
      type: "select",
      options: [
        { value: "on", label: "on - Always show line numbers" },
        { value: "off", label: "off - Hide line numbers" },
        { value: "relative", label: "relative - Line numbers relative to cursor" }
      ]
    },
    {
      key: "editor.minimap",
      category: "editor",
      label: "Editor: Minimap",
      desc: "Controls whether the code minimap overview is shown.",
      type: "boolean"
    },
    {
      key: "editor.bracketPairColorization",
      category: "editor",
      label: "Editor: Bracket Pair Colorization",
      desc: "Controls whether matching bracket pairs are highlighted with contrasting colors.",
      type: "boolean"
    },
    {
      key: "editor.formatOnSave",
      category: "editor",
      label: "Editor: Format On Save",
      desc: "Format document automatically when pressing Ctrl+S to save.",
      type: "boolean"
    },

    // Workbench settings
    {
      key: "workbench.layoutDensity",
      category: "workbench",
      label: "Workbench: Layout Density",
      desc: "Controls spacing density across sidebars, tabs, and explorer trees.",
      type: "select",
      options: [
        { value: "comfortable", label: "Comfortable (Standard VS Code spacing)" },
        { value: "compact", label: "Compact (High information density)" }
      ]
    },
    {
      key: "workbench.statusBarVisible",
      category: "workbench",
      label: "Workbench: Status Bar Visible",
      desc: "Controls the visibility of the bottom status bar.",
      type: "boolean"
    },
    {
      key: "workbench.zenMode",
      category: "workbench",
      label: "Workbench: Zen Mode Distraction Free",
      desc: "Hides all toolbars and UI panels for full-screen coding immersion.",
      type: "boolean"
    },

    // Autonomous QA settings
    {
      key: "selenium.autoOpenPreview",
      category: "selenium",
      label: "Autonomous QA: Auto-Open Live Browser",
      desc: "Automatically launch or attach live preview browser when starting tests.",
      type: "boolean"
    },
    {
      key: "selenium.autoGenerateTests",
      category: "selenium",
      label: "Autonomous QA: Auto-Generate Test Suites on Load",
      desc: "Automatically inspect previewer DOM on load and formulate test cases.",
      type: "boolean"
    },
    {
      key: "selenium.healthThreshold",
      category: "selenium",
      label: "Autonomous QA: Health Score Warning Threshold",
      desc: "Minimum application quality score (0-100) before raising critical warnings.",
      type: "number",
      min: 50,
      max: 100
    },
    {
      key: "selenium.highlightColor",
      category: "selenium",
      label: "Autonomous QA: Inspect Element Highlight Border",
      desc: "CSS color hex for the Chromium inspect hover box.",
      type: "text"
    },

    // Terminal
    {
      key: "terminal.fontSize",
      category: "terminal",
      label: "Terminal: Integrated Font Size",
      desc: "Font size in pixels of the integrated terminal.",
      type: "number",
      min: 10,
      max: 28
    },
    {
      key: "terminal.cursorStyle",
      category: "terminal",
      label: "Terminal: Integrated Cursor Style",
      desc: "Visual appearance of the command terminal cursor.",
      type: "select",
      options: [
        { value: "line", label: "line - Vertical line cursor" },
        { value: "block", label: "block - Solid block cursor" },
        { value: "underline", label: "underline - Horizontal bar cursor" }
      ]
    },

    // AI
    {
      key: "ai.model",
      category: "ai",
      label: "AI Assistant: Model Engine",
      desc: "Underlying DeepMind Gemini LLM powering code generation & reasoning.",
      type: "select",
      options: [
        { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Ultra-fast real-time reasoning)" },
        { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro (Deep agentic architectural analysis)" }
      ]
    },
    {
      key: "ai.autoContext",
      category: "ai",
      label: "AI Assistant: Auto Context Injection",
      desc: "Automatically include open files and active errors in prompt context.",
      type: "boolean"
    },
    {
      key: "ai.inlineSuggestions",
      category: "ai",
      label: "AI Assistant: Inline Ghost Text Suggestions",
      desc: "Display predictive completion hints as you type in the editor.",
      type: "boolean"
    }
  ];

  const filteredDefs = useMemo(() => {
    return SETTING_DEFS.filter((def) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          def.label.toLowerCase().includes(q) ||
          def.key.toLowerCase().includes(q) ||
          def.desc.toLowerCase().includes(q)
        );
      }
      if (activeCategory === "commonly-used") {
        return !!def.common;
      }
      return def.category === activeCategory;
    });
  }, [searchQuery, activeCategory]);

  return (
    <div className="settings-page-root">
      {/* Settings Top Bar */}
      <div className="settings-header">
        <div className="settings-title-group">
          <FaCog className="settings-title-icon" />
          <h2 className="settings-title">Settings</h2>
          {saveToast && (
            <span className="settings-save-toast">
              <FaCheck /> Saved
            </span>
          )}
        </div>

        <div className="settings-search-box">
          <FaSearch className="settings-search-icon" />
          <input
            type="text"
            className="settings-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search settings (e.g. font, theme, QA speed)..."
          />
        </div>

        <button
          className={`settings-mode-btn ${isJsonMode ? "active" : ""}`}
          onClick={() => setIsJsonMode(!isJsonMode)}
          title="Toggle between Visual UI and settings.json"
        >
          <FaFileCode /> {isJsonMode ? "Visual UI" : "Open settings.json"}
        </button>
      </div>

      {/* Main Settings Body */}
      <div className="settings-body">
        {isJsonMode ? (
          <div className="settings-json-view">
            <div className="json-toolbar">
              <span>settings.json (User Configuration)</span>
              <button className="json-save-btn" onClick={handleJsonSave}>
                Save JSON
              </button>
            </div>
            {jsonError && <div className="json-error-banner">{jsonError}</div>}
            <textarea
              className="json-textarea"
              value={jsonString}
              onChange={(e) => setJsonString(e.target.value)}
              spellCheck={false}
            />
          </div>
        ) : (
          <>
            {/* Category Nav Sidebar */}
            {!searchQuery.trim() && (
              <div className="settings-nav-sidebar">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    className={`settings-cat-btn ${activeCategory === cat.id ? "active" : ""}`}
                    onClick={() => setActiveCategory(cat.id)}
                  >
                    <span className="cat-icon">{cat.icon}</span>
                    <span className="cat-label">{cat.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Settings Controls List */}
            <div className="settings-content-pane">
              {filteredDefs.length === 0 ? (
                <div className="settings-empty">
                  No settings matching "{searchQuery}".
                </div>
              ) : (
                filteredDefs.map((def) => {
                  const val = settings[def.key] ?? defaultSettings[def.key];
                  const isModified = val !== defaultSettings[def.key];

                  return (
                    <div
                      key={def.key}
                      className={`setting-row ${isModified ? "modified" : ""}`}
                    >
                      <div className="setting-info">
                        <label className="setting-label">{def.label}</label>
                        <p className="setting-desc">{def.desc}</p>
                        <span className="setting-key-tag">{def.key}</span>
                      </div>

                      <div className="setting-control-box">
                        {def.type === "boolean" ? (
                          <input
                            type="checkbox"
                            className="setting-checkbox"
                            checked={!!val}
                            onChange={(e) => updateSetting(def.key, e.target.checked)}
                          />
                        ) : def.type === "select" ? (
                          <select
                            className="setting-select"
                            value={val}
                            onChange={(e) => updateSetting(def.key, e.target.value)}
                          >
                            {def.options.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : def.type === "number" ? (
                          <input
                            type="number"
                            className="setting-number-input"
                            value={val}
                            min={def.min}
                            max={def.max}
                            onChange={(e) => updateSetting(def.key, Number(e.target.value))}
                          />
                        ) : (
                          <input
                            type="text"
                            className="setting-text-input"
                            value={val || ""}
                            onChange={(e) => updateSetting(def.key, e.target.value)}
                          />
                        )}

                        {isModified && (
                          <button
                            className="setting-reset-btn"
                            onClick={() => resetSetting(def.key)}
                            title="Reset to default value"
                          >
                            <FaUndo /> Reset
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
