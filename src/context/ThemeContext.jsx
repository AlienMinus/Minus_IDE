import React, { createContext, useState, useEffect, useContext } from "react";
import themesList from "../data/themes.json";

export const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [currentThemeId, setCurrentThemeId] = useState(() => {
    try {
      return localStorage.getItem("hyperion_theme") || "dark-modern";
    } catch {
      return "dark-modern";
    }
  });

  const activeTheme = themesList.find((t) => t.id === currentThemeId) || themesList[0];

  useEffect(() => {
    if (!activeTheme || !activeTheme.ui) return;
    const root = document.documentElement;
    const { ui } = activeTheme;

    root.style.setProperty("--bg-primary", ui.bgPrimary);
    root.style.setProperty("--bg-secondary", ui.bgSecondary);
    root.style.setProperty("--bg-tertiary", ui.bgTertiary);
    root.style.setProperty("--text-primary", ui.textPrimary);
    root.style.setProperty("--text-secondary", ui.textSecondary);
    root.style.setProperty("--accent-color", ui.accentColor);
    root.style.setProperty("--border-color", ui.borderColor);
    root.style.setProperty("--tab-active-bg", ui.tabActiveBg);
    root.style.setProperty("--editor-bg", ui.editorBg);
    root.style.setProperty("--sidebar-bg", ui.sidebarBg);
    root.style.setProperty("--activity-bar-bg", ui.activityBarBg);
    root.style.setProperty("--status-bar-bg", ui.statusBarBg);

    root.setAttribute("data-theme-type", activeTheme.type);
    root.setAttribute("data-theme-id", activeTheme.id);

    try {
      localStorage.setItem("hyperion_theme", currentThemeId);
    } catch {}

    window.dispatchEvent(
      new CustomEvent("hyperion:theme-changed", { detail: { theme: activeTheme } })
    );
  }, [currentThemeId, activeTheme]);

  const setTheme = (themeId) => {
    const found = themesList.find((t) => t.id === themeId);
    if (found) {
      setCurrentThemeId(themeId);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        currentTheme: activeTheme,
        currentThemeId,
        themes: themesList,
        setTheme,
        isDark: activeTheme?.type !== "light"
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
