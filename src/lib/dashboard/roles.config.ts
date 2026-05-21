/**
 * Central RBAC configuration — single source of truth for all permissions.
 *
 * Route guards, nav items, and API task-trigger defaults all import from
 * this file. To change who can access a section, update one constant here
 * and every consumer updates automatically — no hunting through 8+ files.
 *
 * Import pattern:
 *   Route files:   import { ROUTE_ROLES } from "@/lib/dashboard/roles.config";
 *   Nav file:      import { ROUTE_ROLES } from "@/lib/dashboard/roles.config";
 *   API triggers:  import { TASK_TRIGGER_ROLES } from "@/lib/dashboard/roles.config";
 */

import type { Role } from "./role";

// ── Route / nav access ────────────────────────────────────────────────────

/**
 * Roles permitted to access each named dashboard section.
 *
 * Keys match the route segment (e.g. "finance" → /dashboard/finance).
 * Sections not listed here are accessible to all roles (Workspace items).
 *
 * Used by:
 *  - `requireRoles(ROUTE_ROLES.xxx)` calls in route `beforeLoad` hooks
 *  - `allowedRoles: ROUTE_ROLES.xxx` in nav item definitions
 */
export const ROUTE_ROLES: Record<string, Role[]> = {
  // ── Operations ───────────────────────────────────────────────────────
  shipments: ["ceo", "ops_manager", "forwarder", "inside_sales"],
  customs:   ["ceo", "ops_manager", "forwarder"],
  warehouse: ["ceo", "ops_manager", "forwarder"],

  // ── Commercial ───────────────────────────────────────────────────────
  customers: ["ceo", "ops_manager", "sales_manager", "inside_sales"],
  quotes:    ["ceo", "sales_manager", "inside_sales"],

  // ── Management ───────────────────────────────────────────────────────
  reports:   ["ceo", "ops_manager"],
  team:      ["ceo", "ops_manager"],
  finance:   ["ceo", "ops_manager", "forwarder"],
};

// ── Client Portal permissions ─────────────────────────────────────────────

/**
 * Granular permission flags for the `client` role.
 *
 * Used by:
 *  - Portal route guards (`requireClientPermission`)
 *  - Component-level feature flags (`useClientPermission`)
 *  - Documentation / audit trail
 *
 * Clients NEVER receive any internal staff permissions (ROUTE_ROLES).
 * The permission boundary is enforced at both the route guard level and
 * the API data-scoping level (see portal.api.ts).
 */
export const CLIENT_PERMISSIONS = [
  "viewOwnShipments",
  "viewOwnInvoices",
  "contactSupport",
] as const;

export type ClientPermission = (typeof CLIENT_PERMISSIONS)[number];

// ── Task auto-trigger defaults ────────────────────────────────────────────

/**
 * Default `assignedRole` for board tasks automatically created by
 * cross-module triggers (e.g. when a customs file is opened or a
 * warehouse job is scheduled).
 *
 * Import in API service files — never hardcode role strings in business logic.
 */
export const TASK_TRIGGER_ROLES: Record<string, Role> = {
  /** Spawned when `createCustomsFile()` completes. */
  customsFile:  "forwarder",
  /** Spawned when `scheduleHandlingJob()` completes. */
  warehouseJob: "forwarder",
};
