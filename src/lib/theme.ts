import { useEffect, useState } from "react";

export type AppTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "chegaai:theme";

const THEME_COLORS: Record<AppTheme, string> = {
  light: "#F13A5A",
  dark: "#0D0D0D",
};

export function useAppTheme() {
  const [theme, setThemeState] = useState<AppTheme>(() => getStoredTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function setTheme(nextTheme: AppTheme) {
    setThemeState(nextTheme);
    persistTheme(nextTheme);
    applyTheme(nextTheme);
  }

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  return { theme, isDark: theme === "dark", setTheme, toggleTheme };
}

export function getStoredTheme(): AppTheme {
  if (typeof window === "undefined") return "light";

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === "light" || storedTheme === "dark") return storedTheme;

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: AppTheme) {
  if (typeof document === "undefined") return;

  document.documentElement.classList.toggle("dark", theme === "dark");
  const themeColor = THEME_COLORS[theme];
  let metaThemeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

  if (!metaThemeColor) {
    metaThemeColor = document.createElement("meta");
    metaThemeColor.name = "theme-color";
    document.head.appendChild(metaThemeColor);
  }

  metaThemeColor.content = themeColor;
}

function persistTheme(theme: AppTheme) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}
