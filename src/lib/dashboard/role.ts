/**
 * Role-preview store.
 *
 * The dashboard ships a "Role Switcher" so the client can preview how the
 * same data surfaces for each job function. This is a *preview* control,
 * not real authorization — it only changes which sections and emphasis a
 * page renders.
 *
 * Mirrors `theme.ts` / `language.ts`: a hook backed by localStorage, kept
 * in sync across tabs via the `storage` event and within the current tab
 * via a custom event (so the switcher in the topbar and any page reading
 * the role update together instantly).
 */

import { useEffect, useState } from "react";

export type Role = "ceo" | "planner" | "customs" | "service";

export const ROLE_KEY = "altun-dashboard-role";

const ROLE_EVENT = "altun-role-change";

export interface RoleMeta {
  value: Role;
  /** Full job title. */
  label: string;
  /** Short chip label. */
  short: string;
  /** One-line description of what this view emphasises. */
  description: string;
  /** Initials for the avatar chip. */
  initials: string;
  /** Representative person for the preview. */
  person: string;
}

export const ROLES: RoleMeta[] = [
  {
    value: "ceo",
    label: "CEO / Management",
    short: "Management",
    description: "High-level KPIs, on-time performance and weekly trends.",
    initials: "HA",
    person: "Huseyin Altun",
  },
  {
    value: "planner",
    label: "Ocean Freight Planner",
    short: "Planner",
    description: "Port operations and the Demurrage & Detention risk board.",
    initials: "DP",
    person: "Daan Prins",
  },
  {
    value: "customs",
    label: "Customs Declarant",
    short: "Customs",
    description: "Resolve blocked declarations in the Customs Action Center.",
    initials: "FK",
    person: "Fatima Khan",
  },
  {
    value: "service",
    label: "Customer Service",
    short: "Service",
    description: "Answer client emails with AI-drafted, data-filled replies.",
    initials: "LV",
    person: "Lotte Visser",
  },
];

export function getRoleMeta(role: Role): RoleMeta {
  return ROLES.find((r) => r.value === role) ?? ROLES[0];
}

function isRole(v: unknown): v is Role {
  return v === "ceo" || v === "planner" || v === "customs" || v === "service";
}

/** SSR-safe read. Returns "ceo" on the server. */
export function getStoredRole(): Role {
  if (typeof window === "undefined") return "ceo";
  try {
    const v = localStorage.getItem(ROLE_KEY);
    if (isRole(v)) return v;
  } catch {
    /* ignore quota / disabled storage */
  }
  return "ceo";
}

export function setStoredRole(value: Role) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ROLE_KEY, value);
  } catch {
    /* ignore quota / disabled storage */
  }
}

/**
 * Returns `{ role, setRole }`. Reads localStorage once on mount, then stays
 * in sync across tabs (`storage` event) and within the tab (custom event).
 */
export function useRole(): { role: Role; setRole: (next: Role) => void } {
  const [role, setRoleState] = useState<Role>("ceo");

  useEffect(() => {
    setRoleState(getStoredRole());

    function onStorage(e: StorageEvent) {
      if (e.key === ROLE_KEY && isRole(e.newValue)) setRoleState(e.newValue);
    }
    function onCustom(e: Event) {
      const next = (e as CustomEvent<Role>).detail;
      if (isRole(next)) setRoleState(next);
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener(ROLE_EVENT, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(ROLE_EVENT, onCustom);
    };
  }, []);

  function setRole(next: Role) {
    setRoleState(next);
    setStoredRole(next);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(ROLE_EVENT, { detail: next }));
    }
  }

  return { role, setRole };
}
