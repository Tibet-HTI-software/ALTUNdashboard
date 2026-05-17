/**
 * Lightweight language-preference store.
 *
 * UI-only for now — picking a language updates state and persists to
 * localStorage so the segmented control remembers the choice across
 * reloads. Real interface translations land in a later release alongside
 * the public-website i18n pass.
 *
 * Mirrors the shape of `theme.ts` so the future i18n implementation can
 * swap the body of `useLanguage()` for a real translation provider with
 * minimal churn at call sites.
 */

import { useEffect, useState } from "react";

export type LanguagePref = "en" | "nl" | "tr";

export const LANGUAGE_KEY = "altun-dashboard-language-pref";

/**
 * Same-tab broadcast channel. The `storage` event only fires in *other*
 * tabs, so a custom event keeps every `useLanguage()` consumer inside the
 * current tab (e.g. sidebar + Settings page) in sync the moment one of
 * them changes the preference.
 */
const LANGUAGE_EVENT = "altun-language-change";

export const LANGUAGES: { value: LanguagePref; label: string }[] = [
  { value: "en", label: "English" },
  { value: "nl", label: "Nederlands" },
  { value: "tr", label: "Türkçe" },
];

/** SSR-safe read. Returns "en" on the server. */
export function getStoredLanguage(): LanguagePref {
  if (typeof window === "undefined") return "en";
  try {
    const v = localStorage.getItem(LANGUAGE_KEY);
    if (v === "nl" || v === "tr") return v;
  } catch {
    /* ignore quota / disabled storage */
  }
  return "en";
}

export function setStoredLanguage(value: LanguagePref) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LANGUAGE_KEY, value);
  } catch {
    /* ignore quota / disabled storage */
  }
}

/**
 * Returns `{ language, setLanguage }`. Reads localStorage once on mount,
 * stays in sync across browser tabs via the `storage` event so a change in
 * one tab updates the others without a manual reload.
 */
export function useLanguage(): {
  language: LanguagePref;
  setLanguage: (next: LanguagePref) => void;
} {
  const [language, setLanguageState] = useState<LanguagePref>("en");

  useEffect(() => {
    setLanguageState(getStoredLanguage());

    function onStorage(e: StorageEvent) {
      if (e.key !== LANGUAGE_KEY) return;
      const next = e.newValue;
      if (next === "en" || next === "nl" || next === "tr") {
        setLanguageState(next);
      }
    }
    function onCustom(e: Event) {
      const next = (e as CustomEvent<LanguagePref>).detail;
      if (next === "en" || next === "nl" || next === "tr") {
        setLanguageState(next);
      }
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener(LANGUAGE_EVENT, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(LANGUAGE_EVENT, onCustom);
    };
  }, []);

  function setLanguage(next: LanguagePref) {
    setLanguageState(next);
    setStoredLanguage(next);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(LANGUAGE_EVENT, { detail: next }));
    }
  }

  return { language, setLanguage };
}
