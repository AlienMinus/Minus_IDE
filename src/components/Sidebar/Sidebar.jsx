import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import "./Sidebar.css";
import {
    VscFiles,
    VscSearch,
    VscSourceControl,
    VscDebugAlt,
    VscExtensions,
    VscAccount,
    VscSettingsGear
} from "react-icons/vsc";
import { FaProjectDiagram, FaChevronRight, FaCheck, FaTimes } from "react-icons/fa";
import { GiCurledTentacle } from "react-icons/gi";
import useEditor from "../../hooks/useEditor";
import useTheme from "../../hooks/useTheme";

function Sidebar({ active = "explorer", onSetActive = () => {} }) {
    const {
        openSettingsTab,
        setIsCommandPaletteOpen,
        openTaskPicker,
        openView,
        openApiClientTab
    } = useEditor();

    const { themes, currentThemeId, setTheme } = useTheme();

    const [isManageOpen, setIsManageOpen] = useState(false);
    const [activeSubmenu, setActiveSubmenu] = useState(null); // "themes" | "density"
    const [syncOn, setSyncOn] = useState(true);
    const [density, setDensity] = useState("comfortable");

    const [submenuPos, setSubmenuPos] = useState({ top: 0, left: 0, maxHeight: 480, width: 300 });
    const [themeSearchQuery, setThemeSearchQuery] = useState("");

    const manageMenuRef = useRef(null);
    const gearBtnRef = useRef(null);
    const themeItemRef = useRef(null);
    const densityItemRef = useRef(null);
    const selectedThemeRef = useRef(null);
    const themeSearchInputRef = useRef(null);

    // Responsive positioning calculation for submenus
    const updateSubmenuPosition = (type) => {
        const triggerEl = type === "themes" ? themeItemRef.current : densityItemRef.current;
        if (!triggerEl) return;

        const rect = triggerEl.getBoundingClientRect();
        const vh = window.innerHeight;
        const vw = window.innerWidth;

        const desiredWidth = type === "themes" ? Math.min(300, vw - 16) : 220;
        const desiredHeight = type === "themes" ? Math.min(480, vh - 24) : 120;
        const maxHeight = Math.min(desiredHeight, vh - 24);

        // Horizontal positioning:
        // Try right side of menu first with 2px overlap
        let left = rect.right - 2;
        // If overflowing right window boundary:
        if (left + desiredWidth > vw - 8) {
            // Try left side of the manage menu
            if (rect.left - desiredWidth > 8) {
                left = rect.left - desiredWidth + 2;
            } else {
                // Screen is narrow; clamp safely within viewport
                left = Math.max(8, vw - desiredWidth - 8);
            }
        }

        // Vertical positioning:
        // Start by aligning top with the trigger item
        let top = rect.top - 4;
        // If it overflows the bottom edge of the viewport:
        if (top + maxHeight > vh - 12) {
            // Shift up so bottom rests at vh - 12 (safely above status bar)
            top = Math.max(12, vh - maxHeight - 12);
        }

        setSubmenuPos({
            top: Math.round(top),
            left: Math.round(left),
            maxHeight: Math.round(maxHeight),
            width: Math.round(desiredWidth)
        });
    };

    // Keep submenu positioned on resize, scroll, or submenu toggle
    useEffect(() => {
        if (activeSubmenu) {
            updateSubmenuPosition(activeSubmenu);
            const handleRecalculate = () => updateSubmenuPosition(activeSubmenu);
            window.addEventListener("resize", handleRecalculate);
            window.addEventListener("scroll", handleRecalculate, true);
            return () => {
                window.removeEventListener("resize", handleRecalculate);
                window.removeEventListener("scroll", handleRecalculate, true);
            };
        }
    }, [activeSubmenu]);

    // When theme submenu opens: reset search and scroll selected theme into view
    useEffect(() => {
        if (activeSubmenu === "themes") {
            setThemeSearchQuery("");
            const timer = setTimeout(() => {
                if (selectedThemeRef.current) {
                    selectedThemeRef.current.scrollIntoView({
                        block: "nearest",
                        behavior: "smooth"
                    });
                }
            }, 60);
            return () => clearTimeout(timer);
        }
    }, [activeSubmenu]);

    // Global listener to trigger theme picker from command palette or shortcut
    useEffect(() => {
        const handleOpenThemePicker = () => {
            setIsManageOpen(true);
            setActiveSubmenu("themes");
        };
        window.addEventListener("hyperion:open-theme-picker", handleOpenThemePicker);
        return () => {
            window.removeEventListener("hyperion:open-theme-picker", handleOpenThemePicker);
        };
    }, []);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                manageMenuRef.current &&
                !manageMenuRef.current.contains(e.target) &&
                gearBtnRef.current &&
                !gearBtnRef.current.contains(e.target)
            ) {
                setIsManageOpen(false);
                setActiveSubmenu(null);
            }
        };

        if (isManageOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isManageOpen]);

    const menuItems = [
        {
            id: "explorer",
            icon: <VscFiles />,
            title: "Explorer (Ctrl+Shift+E)"
        },
        {
            id: "search",
            icon: <VscSearch />,
            title: "Search (Ctrl+Shift+F)"
        },
        {
            id: "git",
            icon: <VscSourceControl />,
            title: "Source Control (Ctrl+Shift+G)"
        },
        {
            id: "run",
            icon: <VscDebugAlt />,
            title: "Run and Debug (Ctrl+Shift+D)"
        },
        {
            id: "extensions",
            icon: <VscExtensions />,
            title: "Extensions (Ctrl+Shift+X)"
        },
        {
            id: "architecture",
            icon: <FaProjectDiagram />,
            title: "Architecture & Codebase Diagram (Ctrl+Shift+A)"
        },
        {
            id: "api-client",
            icon: <GiCurledTentacle />,
            title: "API Client (cURL & Localhost Tester)"
        }
    ];

    const handleSelectTheme = (themeId) => {
        setTheme(themeId);
        setIsManageOpen(false);
        setActiveSubmenu(null);
    };

    const handleOpenSettings = () => {
        openSettingsTab();
        setIsManageOpen(false);
        setActiveSubmenu(null);
    };

    const handleOpenCommandPalette = () => {
        setIsCommandPaletteOpen(true);
        setIsManageOpen(false);
        setActiveSubmenu(null);
    };

    const handleOpenExtensions = () => {
        onSetActive("extensions");
        setIsManageOpen(false);
        setActiveSubmenu(null);
    };

    const handleOpenTasks = () => {
        openTaskPicker?.();
        setIsManageOpen(false);
        setActiveSubmenu(null);
    };

    const filteredThemes = themeSearchQuery.trim()
        ? themes.filter(
            (t) =>
                t.name.toLowerCase().includes(themeSearchQuery.toLowerCase().trim()) ||
                (t.category && t.category.toLowerCase().includes(themeSearchQuery.toLowerCase().trim())) ||
                (t.type && t.type.toLowerCase().includes(themeSearchQuery.toLowerCase().trim()))
        )
        : null;

    return (
        <aside className="sidebar">
            <div className="sidebar-top">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        className={`sidebar-btn ${active === item.id ? "active" : ""}`}
                        title={item.title}
                        onClick={() => {
                            if (item.id === "api-client") {
                                openApiClientTab?.();
                            } else {
                                onSetActive(item.id);
                            }
                        }}
                    >
                        <span className="sidebar-btn-inner">
                            {item.icon}
                        </span>
                    </button>
                ))}
            </div>

            <div className="sidebar-bottom">
                <button
                    className="sidebar-btn"
                    title="Accounts"
                    onClick={() => {
                        window.dispatchEvent(new CustomEvent("hyperion:show-help-modal", { detail: { topic: "about" } }));
                    }}
                >
                    <span className="sidebar-btn-inner">
                        <VscAccount />
                    </span>
                </button>

                <div className="manage-btn-container">
                    <button
                        ref={gearBtnRef}
                        className={`sidebar-btn ${isManageOpen ? "active" : ""}`}
                        title="Manage"
                        onClick={() => setIsManageOpen(!isManageOpen)}
                    >
                        <span className="sidebar-btn-inner">
                            <VscSettingsGear />
                        </span>
                    </button>

                    {/* Manage Context Menu matching Hyperion IDE / screenshot */}
                    {isManageOpen && (
                        <div
                            ref={manageMenuRef}
                            className="manage-context-menu"
                            onMouseLeave={() => setActiveSubmenu(null)}
                        >
                            <div
                                className="manage-menu-item"
                                onMouseEnter={() => setActiveSubmenu(null)}
                                onClick={handleOpenCommandPalette}
                            >
                                <span className="manage-item-label">Command Palette...</span>
                                <span className="manage-item-shortcut">Ctrl+Shift+P</span>
                            </div>

                            <div
                                className="manage-menu-item"
                                onMouseEnter={() => setActiveSubmenu(null)}
                                onClick={() => {
                                    alert("Profile: Default (Hyperion IDE)");
                                    setIsManageOpen(false);
                                }}
                            >
                                <span className="manage-item-label">Profiles</span>
                            </div>

                            <div
                                className="manage-menu-item"
                                onMouseEnter={() => setActiveSubmenu(null)}
                                onClick={handleOpenSettings}
                            >
                                <span className="manage-item-label">Settings</span>
                                <span className="manage-item-shortcut">Ctrl+,</span>
                            </div>

                            <div
                                className="manage-menu-item"
                                onMouseEnter={() => setActiveSubmenu(null)}
                                onClick={handleOpenExtensions}
                            >
                                <span className="manage-item-label">Extensions</span>
                                <span className="manage-item-shortcut">Ctrl+Shift+X</span>
                            </div>

                            <div
                                className="manage-menu-item"
                                onMouseEnter={() => setActiveSubmenu(null)}
                                onClick={() => {
                                    window.dispatchEvent(new CustomEvent("hyperion:show-help-modal", { detail: { topic: "keyboardShortcuts" } }));
                                    setIsManageOpen(false);
                                }}
                            >
                                <span className="manage-item-label">Keyboard Shortcuts</span>
                                <span className="manage-item-shortcut">Ctrl+K Ctrl+S</span>
                            </div>

                            <div
                                className="manage-menu-item"
                                onMouseEnter={() => setActiveSubmenu(null)}
                                onClick={() => {
                                    alert("User Snippets: Configure code snippets in Settings");
                                    setIsManageOpen(false);
                                }}
                            >
                                <span className="manage-item-label">Snippets</span>
                            </div>

                            <div
                                className="manage-menu-item"
                                onMouseEnter={() => setActiveSubmenu(null)}
                                onClick={handleOpenTasks}
                            >
                                <span className="manage-item-label">Tasks</span>
                            </div>

                            {/* Themes Submenu */}
                            <div
                                ref={themeItemRef}
                                className={`manage-menu-item has-submenu ${activeSubmenu === "themes" ? "active" : ""}`}
                                onMouseEnter={() => {
                                    setActiveSubmenu("themes");
                                    updateSubmenuPosition("themes");
                                }}
                                onClick={() => {
                                    const next = activeSubmenu === "themes" ? null : "themes";
                                    setActiveSubmenu(next);
                                    if (next) updateSubmenuPosition("themes");
                                }}
                            >
                                <span className="manage-item-label">Themes</span>
                                <FaChevronRight className="submenu-chevron" />

                                {activeSubmenu === "themes" && (
                                    <div
                                        className="manage-submenu themes-submenu"
                                        style={{
                                            position: "fixed",
                                            top: `${submenuPos.top}px`,
                                            left: `${submenuPos.left}px`,
                                            maxHeight: `${submenuPos.maxHeight}px`,
                                            width: `${submenuPos.width}px`
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="themes-filter-bar">
                                            <VscSearch className="themes-filter-icon" />
                                            <input
                                                ref={themeSearchInputRef}
                                                type="text"
                                                className="themes-filter-input"
                                                placeholder="Search 29 themes..."
                                                value={themeSearchQuery}
                                                onChange={(e) => setThemeSearchQuery(e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                autoFocus
                                            />
                                            {themeSearchQuery && (
                                                <button
                                                    className="themes-filter-clear"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setThemeSearchQuery("");
                                                    }}
                                                    title="Clear search"
                                                >
                                                    <FaTimes />
                                                </button>
                                            )}
                                        </div>

                                        <div className="themes-list-scroll">
                                            {filteredThemes !== null ? (
                                                filteredThemes.length > 0 ? (
                                                    <div className="submenu-category-group">
                                                        <div className="submenu-title">
                                                            <span>Matching Themes</span>
                                                            <span className="submenu-count-badge">{filteredThemes.length}</span>
                                                        </div>
                                                        {filteredThemes.map((t) => (
                                                            <div
                                                                key={t.id}
                                                                ref={currentThemeId === t.id ? selectedThemeRef : null}
                                                                className={`submenu-item ${currentThemeId === t.id ? "selected" : ""}`}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleSelectTheme(t.id);
                                                                }}
                                                            >
                                                                <span className="check-placeholder">
                                                                    {currentThemeId === t.id && <FaCheck className="theme-check" />}
                                                                </span>
                                                                <span className="submenu-item-label">{t.name}</span>
                                                                <span className="submenu-item-category">{t.category || t.type}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="submenu-empty-state">
                                                        No themes matching "{themeSearchQuery}"
                                                    </div>
                                                )
                                            ) : (
                                                ["light", "dark", "high-contrast"].map((cat) => {
                                                    const catThemes = themes.filter((t) => (t.category || t.type) === cat);
                                                    if (catThemes.length === 0) return null;
                                                    const title = cat === "light" ? "light themes" : cat === "dark" ? "dark themes" : "high contrast themes";
                                                    return (
                                                        <div key={cat} className="submenu-category-group">
                                                            <div className="submenu-title">
                                                                <span>{title}</span>
                                                                <span className="submenu-count-badge">{catThemes.length}</span>
                                                            </div>
                                                            {catThemes.map((t) => (
                                                                <div
                                                                    key={t.id}
                                                                    ref={currentThemeId === t.id ? selectedThemeRef : null}
                                                                    className={`submenu-item ${currentThemeId === t.id ? "selected" : ""}`}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleSelectTheme(t.id);
                                                                    }}
                                                                >
                                                                    <span className="check-placeholder">
                                                                        {currentThemeId === t.id && <FaCheck className="theme-check" />}
                                                                    </span>
                                                                    <span className="submenu-item-label">{t.name}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Layout Density Submenu */}
                            <div
                                ref={densityItemRef}
                                className={`manage-menu-item has-submenu ${activeSubmenu === "density" ? "active" : ""}`}
                                onMouseEnter={() => {
                                    setActiveSubmenu("density");
                                    updateSubmenuPosition("density");
                                }}
                                onClick={() => {
                                    const next = activeSubmenu === "density" ? null : "density";
                                    setActiveSubmenu(next);
                                    if (next) updateSubmenuPosition("density");
                                }}
                            >
                                <span className="manage-item-label">Layout Density</span>
                                <FaChevronRight className="submenu-chevron" />

                                {activeSubmenu === "density" && (
                                    <div
                                        className="manage-submenu density-submenu"
                                        style={{
                                            position: "fixed",
                                            top: `${submenuPos.top}px`,
                                            left: `${submenuPos.left}px`,
                                            maxHeight: `${submenuPos.maxHeight}px`,
                                            width: `${submenuPos.width}px`
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div
                                            className={`submenu-item ${density === "comfortable" ? "selected" : ""}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDensity("comfortable");
                                                setIsManageOpen(false);
                                            }}
                                        >
                                            <span className="check-placeholder">
                                                {density === "comfortable" && <FaCheck className="theme-check" />}
                                            </span>
                                            <span className="submenu-item-label">Comfortable</span>
                                        </div>
                                        <div
                                            className={`submenu-item ${density === "compact" ? "selected" : ""}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDensity("compact");
                                                setIsManageOpen(false);
                                            }}
                                        >
                                            <span className="check-placeholder">
                                                {density === "compact" && <FaCheck className="theme-check" />}
                                            </span>
                                            <span className="submenu-item-label">Compact</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="manage-separator" />

                            <div
                                className="manage-menu-item"
                                onClick={() => setSyncOn(!syncOn)}
                            >
                                <span className="check-placeholder">
                                    {syncOn && <FaCheck className="theme-check" />}
                                </span>
                                <span className="manage-item-label">Settings Sync is On</span>
                            </div>

                            <div className="manage-separator" />

                            <div
                                className="manage-menu-item"
                                onClick={() => {
                                    window.dispatchEvent(new CustomEvent("hyperion:show-help-modal", { detail: { topic: "releaseNotes" } }));
                                    setIsManageOpen(false);
                                }}
                            >
                                <span className="manage-item-label">Show Update Release Notes</span>
                            </div>

                            <div
                                className="manage-menu-item"
                                onClick={() => {
                                    alert("Restarting Hyperion IDE with latest updates applied...");
                                    window.location.reload();
                                }}
                            >
                                <span className="manage-item-label">Restart to Update (1)</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}

export default Sidebar;
