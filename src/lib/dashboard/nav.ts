import {
  LayoutDashboard,
  Ship,
  Users,
  FileText,
  Stamp,
  Warehouse,
  UserCog,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import type { I18nKey } from "./i18n";

export interface DashboardNavItem {
  to: string;
  /** English label — fallback + used by the command palette. */
  label: string;
  /** i18n key so the sidebar label follows the language preference. */
  labelKey: I18nKey;
  icon: LucideIcon;
  /** Whether `activeProps` should match exactly (used for the index route). */
  exact?: boolean;
}

export const dashboardNav: DashboardNavItem[] = [
  {
    to: "/dashboard",
    label: "Overview",
    labelKey: "nav.overview",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    to: "/dashboard/shipments",
    label: "Shipments",
    labelKey: "nav.shipments",
    icon: Ship,
  },
  {
    to: "/dashboard/customers",
    label: "Customers",
    labelKey: "nav.customers",
    icon: Users,
  },
  {
    to: "/dashboard/quotes",
    label: "Quotes",
    labelKey: "nav.quotes",
    icon: FileText,
  },
  {
    to: "/dashboard/customs",
    label: "Customs & Documents",
    labelKey: "nav.customs",
    icon: Stamp,
  },
  {
    to: "/dashboard/warehouse",
    label: "Warehouse & Operations",
    labelKey: "nav.warehouse",
    icon: Warehouse,
  },
  {
    to: "/dashboard/team",
    label: "Team",
    labelKey: "nav.team",
    icon: UserCog,
  },
  {
    to: "/dashboard/reports",
    label: "Reports",
    labelKey: "nav.reports",
    icon: BarChart3,
  },
];
