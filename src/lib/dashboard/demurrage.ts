/**
 * Demurrage risk-alert threshold store.
 *
 * Lets the operator tune when the Demurrage Risk Board flips a container to
 * "critical" (red) or "warning" (amber), measured in hours of free time
 * left. Persisted in localStorage; synced in-tab via a custom event and
 * across tabs via `storage`. Mirrors `theme.ts` / `language.ts`.
 */

import { useEffect, useState } from "react";

export interface DemurrageThresholds {
  /** Hours of free time at/under which a container is "critical" (red). */
  criticalH: number;
  /** Hours of free time at/under which a container is "warning" (amber). */
  warningH: number;
}

export const DEFAULT_THRESHOLDS: DemurrageThresholds = {
  criticalH: 24,
  warningH: 72,
};

export const DEMURRAGE_KEY = "altun-dashboard-demurrage-thresholds";

const DEMURRAGE_EVENT = "altun-demurrage-change";

function clampThresholds(t: DemurrageThresholds): DemurrageThresholds {
  const criticalH = Math.min(Math.max(Math.round(t.criticalH), 6), 96);
  const warningH = Math.min(
    Math.max(Math.round(t.warningH), criticalH + 6),
    168,
  );
  return { criticalH, warningH };
}

export function getStoredThresholds(): DemurrageThresholds {
  if (typeof window === "undefined") return DEFAULT_THRESHOLDS;
  try {
    const raw = localStorage.getItem(DEMURRAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DemurrageThresholds>;
      if (
        typeof parsed.criticalH === "number" &&
        typeof parsed.warningH === "number"
      ) {
        return clampThresholds({
          criticalH: parsed.criticalH,
          warningH: parsed.warningH,
        });
      }
    }
  } catch {
    /* ignore parse / storage errors */
  }
  return DEFAULT_THRESHOLDS;
}

export function setStoredThresholds(t: DemurrageThresholds) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DEMURRAGE_KEY, JSON.stringify(t));
  } catch {
    /* ignore quota / disabled storage */
  }
}

/** Returns the thresholds plus a setter that persists + broadcasts. */
export function useDemurrageThresholds(): {
  thresholds: DemurrageThresholds;
  setThresholds: (next: DemurrageThresholds) => void;
} {
  const [thresholds, setState] =
    useState<DemurrageThresholds>(DEFAULT_THRESHOLDS);

  useEffect(() => {
    setState(getStoredThresholds());

    function onStorage(e: StorageEvent) {
      if (e.key === DEMURRAGE_KEY) setState(getStoredThresholds());
    }
    function onCustom(e: Event) {
      setState((e as CustomEvent<DemurrageThresholds>).detail);
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener(DEMURRAGE_EVENT, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(DEMURRAGE_EVENT, onCustom);
    };
  }, []);

  function setThresholds(next: DemurrageThresholds) {
    const clamped = clampThresholds(next);
    setState(clamped);
    setStoredThresholds(clamped);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(DEMURRAGE_EVENT, { detail: clamped }),
      );
    }
  }

  return { thresholds, setThresholds };
}
