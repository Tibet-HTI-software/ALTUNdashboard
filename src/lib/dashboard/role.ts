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

/**
 * Internal staff roles — used by the Operations Dashboard (/dashboard).
 * `client` is a separate audience — used by the Client Portal (/portal).
 * Both share this union so AuthContext and route guards handle them uniformly.
 */
export type Role =
  | "ceo"
  | "forwarder"
  | "ops_manager"
  | "sales_manager"
  | "inside_sales"
  | "client";

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

/**
 * All previewable roles — used by the dashboard role-switcher.
 * Internal staff roles come first; the `client` entry is appended last
 * so the dropdown can render a visual separator before it.
 */
export const ROLES: RoleMeta[] = [
  {
    value: "ceo",
    label: "CEO / Director",
    short: "Director",
    description: "High-level KPIs, P&L, on-time performance and executive trends.",
    initials: "HA",
    person: "Huseyin Altun",
  },
  {
    value: "forwarder",
    label: "Freight Forwarder",
    short: "Forwarder",
    description: "A-to-Z dossier management: order entry, booking, customs & invoicing.",
    initials: "DP",
    person: "Daan Prins",
  },
  {
    value: "ops_manager",
    label: "Operations Manager",
    short: "Ops Manager",
    description: "Team oversight, exception handling, and SLA compliance monitoring.",
    initials: "FK",
    person: "Fatima Khan",
  },
  {
    value: "sales_manager",
    label: "Sales Manager",
    short: "Sales Mgr",
    description: "External pricing, carrier rate negotiation, and key account management.",
    initials: "RV",
    person: "Roel van Dam",
  },
  {
    value: "inside_sales",
    label: "Inside Sales / CS",
    short: "Inside Sales",
    description: "Quote handling, client communication and booking confirmations.",
    initials: "LV",
    person: "Lotte Visser",
  },
  // ── Client Portal demo entry ───────────────────────────────────────────
  {
    value: "client",
    label: "Client Portal Demo",
    short: "Client",
    description: "Shipment tracker and invoice overview — client-facing portal.",
    initials: "CL",
    person: "Demo Client",
  },
];

export function getRoleMeta(role: Role): RoleMeta {
  return ROLES.find((r) => r.value === role) ?? ROLES[0];
}

function isRole(v: unknown): v is Role {
  return (
    v === "ceo" ||
    v === "forwarder" ||
    v === "ops_manager" ||
    v === "sales_manager" ||
    v === "inside_sales" ||
    v === "client"
  );
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
