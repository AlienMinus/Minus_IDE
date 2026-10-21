import { useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";

export default function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      currentTheme: null,
      currentThemeId: "dark-modern",
      themes: [],
      setTheme: () => {},
      isDark: true
    };
  }
  return context;
}
