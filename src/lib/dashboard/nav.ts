/**
 * Dashboard navigation — grouped structure with per-item RBAC.
 *
 * `dashboardNavGroups`  — primary export used by DashboardSidebar.
 * `dashboardNav`        — backward-compat flat array (used by CommandPalette).
 * `filterNavForRole`    — utility to filter items by the active role.
 */

import {
  LayoutDashboard,
  Ship,
  Users,
  FileText,
  Stamp,
  Warehouse,
  UserCog,
  BarChart3,
  Inbox,
  Banknote,
  ListTodo,
  type LucideIcon,
} from "lucide-react";
import type { I18nKey } from "./i18n";
import type { Role } from "./role";
import { ROUTE_ROLES } from "./roles.config";

export interface DashboardNavItem {
  to: string;
  /** English label — used by CommandPalette as fallback. */
  label: string;
  /** i18n key so the sidebar label follows the language preference. */
  labelKey: I18nKey;
  icon: LucideIcon;
  /** Whether `activeProps` should match exactly (used for the index route). */
  exact?: boolean;
  /**
   * Roles permitted to see this item.
   * Undefined means the item is visible to all roles.
   */
  allowedRoles?: Role[];
}

export interface DashboardNavGroup {
  /** Stable identifier — used as React key and collapse state key. */
  id: string;
  /** English label — fallback. */
  label: string;
  /** i18n key for the group header. */
  labelKey: I18nKey;
  items: DashboardNavItem[];
}

/* ── RBAC matrix ──────────────────────────────────────────────────────────
 *
 *  CEO      — all items
 *  Planner  — Workspace (all), Operations (Shipments + Warehouse),
 *              Commercial (Quotes only)
 *  Customs  — Workspace (all), Operations (Customs only)
 *  Service  — Workspace (all), Operations (Shipments),
 *              Commercial (Customers + Quotes)
 *
 * Management category (Reports, Team, Finance) is CEO-only.
 * ─────────────────────────────────────────────────────────────────────── */

export const dashboardNavGroups: DashboardNavGroup[] = [
  {
    id: "workspace",
    label: "My Workspace",
    labelKey: "nav.group.workspace",
    items: [
      {
        to: "/dashboard",
        label: "Overview",
        labelKey: "nav.overview",
        icon: LayoutDashboard,
        exact: true,
      },
      {
        to: "/dashboard/inbox",
        label: "Inbox & Comms",
        labelKey: "nav.inbox",
        icon: Inbox,
      },
      {
        to: "/dashboard/my-tasks",
        label: "My Tasks",
        labelKey: "nav.myTasks",
        icon: ListTodo,
      },
    ],
  },

  {
    id: "operations",
    label: "Operations",
    labelKey: "nav.group.operations",
    items: [
      {
        to: "/dashboard/shipments",
        label: "Shipments",
        labelKey: "nav.shipments",
        icon: Ship,
        allowedRoles: ROUTE_ROLES.shipments,
      },
      {
        to: "/dashboard/customs",
        label: "Customs & Documents",
        labelKey: "nav.customs",
        icon: Stamp,
        allowedRoles: ROUTE_ROLES.customs,
      },
      {
        to: "/dashboard/warehouse",
        label: "Warehouse & Operations",
        labelKey: "nav.warehouse",
        icon: Warehouse,
        allowedRoles: ROUTE_ROLES.warehouse,
      },
    ],
  },

  {
    id: "commercial",
    label: "Commercial",
    labelKey: "nav.group.commercial",
    items: [
      {
        to: "/dashboard/customers",
        label: "Customers",
        labelKey: "nav.customers",
        icon: Users,
        allowedRoles: ROUTE_ROLES.customers,
      },
      {
        to: "/dashboard/quotes",
        label: "Quotes",
        labelKey: "nav.quotes",
        icon: FileText,
        allowedRoles: ROUTE_ROLES.quotes,
      },
    ],
  },

  {
    id: "management",
    label: "Management",
    labelKey: "nav.group.management",
    items: [
      {
        to: "/dashboard/reports",
        label: "Reports",
        labelKey: "nav.reports",
        icon: BarChart3,
        allowedRoles: ROUTE_ROLES.reports,
      },
      {
        to: "/dashboard/team",
        label: "Team",
        labelKey: "nav.team",
        icon: UserCog,
        allowedRoles: ROUTE_ROLES.team,
      },
      {
        to: "/dashboard/finance",
        label: "Finance & Invoicing",
        labelKey: "nav.finance",
        icon: Banknote,
        allowedRoles: ROUTE_ROLES.finance,
      },
    ],
  },
];

/**
 * Flat array of every nav item — kept for CommandPalette backward compat.
 * Includes items from all roles; callers that need RBAC filtering should use
 * `filterNavForRole` or iterate `dashboardNavGroups` directly.
 */
export const dashboardNav: DashboardNavItem[] = dashboardNavGroups.flatMap(
  (g) => g.items,
);

/**
 * Return only the items in `items` that are visible for the given role.
 */
export function filterNavForRole(
  items: DashboardNavItem[],
  role: Role,
): DashboardNavItem[] {
  return items.filter(
    (item) => !item.allowedRoles || item.allowedRoles.includes(role),
  );
}
