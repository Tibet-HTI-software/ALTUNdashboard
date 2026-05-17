/**
 * Lightweight theme system for the standalone dashboard.
 *
 * - Two modes: "light" (default) and "dark".
 * - Persisted in localStorage under THEME_KEY.
 * - Applied by toggling the "dark" class on <html>, which Tailwind v4 picks
 *   up via `@custom-variant dark (&:is(.dark *))` in styles.css.
 * - A tiny inline script injected from the root shell applies the stored
 *   theme before paint to avoid a flash of light content.
 */

import { useEffect, useState } from "react";

export type Theme = "light" | "dark";
export const THEME_KEY = "altun-dashboard-theme";

/**
 * Inline init script. Runs synchronously in <head> on first paint so the
 * dark class is on <html> before any component renders. Catches errors so
 * SSR / private-browsing storage failures cannot break boot.
 */
export const THEME_INIT_SCRIPT = `(() => {
  try {
    var stored = localStorage.getItem(${JSON.stringify(THEME_KEY)});
    if (stored === "dark") document.documentElement.classList.add("dark");
  } catch (e) {}
})();`;

/** SSR-safe read. Returns "light" on the server. */
export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function setStoredTheme(theme: Theme) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore quota / disabled storage */
  }
}

/**
 * Subscribes to the theme. Reads localStorage once on mount and reflects
 * subsequent updates from other tabs via the `storage` event so multi-tab
 * sessions stay in sync.
 */
export function useTheme(): {
  theme: Theme;
  setTheme: (next: Theme) => void;
  toggle: () => void;
} {
  const [theme, setThemeState] = useState<Theme>("light");

  // Read stored value after mount to avoid SSR mismatch.
  useEffect(() => {
    const initial = getStoredTheme();
    setThemeState(initial);
    applyTheme(initial);

    function onStorage(e: StorageEvent) {
      if (e.key !== THEME_KEY) return;
      const next: Theme = e.newValue === "dark" ? "dark" : "light";
      setThemeState(next);
      applyTheme(next);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function setTheme(next: Theme) {
    setThemeState(next);
    applyTheme(next);
    setStoredTheme(next);
  }

  return {
    theme,
    setTheme,
    toggle: () => setTheme(theme === "dark" ? "light" : "dark"),
  };
}
