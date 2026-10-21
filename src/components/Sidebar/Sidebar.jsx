import React, { useState, useRef, useEffect } from "react";
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
import { FaProjectDiagram, FaChevronRight, FaCheck } from "react-icons/fa";
import useEditor from "../../hooks/useEditor";
import useTheme from "../../hooks/useTheme";

function Sidebar({ active = "explorer", onSetActive = () => {} }) {
    const {
        openSettingsTab,
        setIsCommandPaletteOpen,
        openTaskPicker,
        openView
    } = useEditor();

    const { themes, currentThemeId, setTheme } = useTheme();

    const [isManageOpen, setIsManageOpen] = useState(false);
    const [activeSubmenu, setActiveSubmenu] = useState(null); // "themes" | "density"
    const [syncOn, setSyncOn] = useState(true);
    const [density, setDensity] = useState("comfortable");

    const manageMenuRef = useRef(null);
    const gearBtnRef = useRef(null);

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

    return (
        <aside className="sidebar">
            <div className="sidebar-top">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        className={`sidebar-btn ${active === item.id ? "active" : ""}`}
                        title={item.title}
                        onClick={() => onSetActive(item.id)}
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

                    {/* Manage Context Menu matching VS Code / screenshot */}
                    {isManageOpen && (
                        <div
                            ref={manageMenuRef}
                            className="manage-context-menu"
                            onMouseLeave={() => setActiveSubmenu(null)}
                        >
                            <div className="manage-menu-item" onClick={handleOpenCommandPalette}>
                                <span className="manage-item-label">Command Palette...</span>
                                <span className="manage-item-shortcut">Ctrl+Shift+P</span>
                            </div>

                            <div
                                className="manage-menu-item"
                                onClick={() => {
                                    alert("Profile: Default (Hyperion IDE)");
                                    setIsManageOpen(false);
                                }}
                            >
                                <span className="manage-item-label">Profiles</span>
                            </div>

                            <div className="manage-menu-item" onClick={handleOpenSettings}>
                                <span className="manage-item-label">Settings</span>
                                <span className="manage-item-shortcut">Ctrl+,</span>
                            </div>

                            <div className="manage-menu-item" onClick={handleOpenExtensions}>
                                <span className="manage-item-label">Extensions</span>
                                <span className="manage-item-shortcut">Ctrl+Shift+X</span>
                            </div>

                            <div
                                className="manage-menu-item"
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
                                onClick={() => {
                                    alert("User Snippets: Configure code snippets in Settings");
                                    setIsManageOpen(false);
                                }}
                            >
                                <span className="manage-item-label">Snippets</span>
                            </div>

                            <div className="manage-menu-item" onClick={handleOpenTasks}>
                                <span className="manage-item-label">Tasks</span>
                            </div>

                            {/* Themes Submenu */}
                            <div
                                className={`manage-menu-item has-submenu ${activeSubmenu === "themes" ? "active" : ""}`}
                                onMouseEnter={() => setActiveSubmenu("themes")}
                                onClick={() => setActiveSubmenu(activeSubmenu === "themes" ? null : "themes")}
                            >
                                <span className="manage-item-label">Themes</span>
                                <FaChevronRight className="submenu-chevron" />

                                {activeSubmenu === "themes" && (
                                    <div className="manage-submenu themes-submenu">
                                        <div className="submenu-title">Color Themes</div>
                                        {themes.map((t) => (
                                            <div
                                                key={t.id}
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
                                )}
                            </div>

                            {/* Layout Density Submenu */}
                            <div
                                className={`manage-menu-item has-submenu ${activeSubmenu === "density" ? "active" : ""}`}
                                onMouseEnter={() => setActiveSubmenu("density")}
                                onClick={() => setActiveSubmenu(activeSubmenu === "density" ? null : "density")}
                            >
                                <span className="manage-item-label">Layout Density</span>
                                <FaChevronRight className="submenu-chevron" />

                                {activeSubmenu === "density" && (
                                    <div className="manage-submenu">
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
