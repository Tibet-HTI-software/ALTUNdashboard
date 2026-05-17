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

export interface DashboardNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Whether `activeProps` should match exactly (used for the index route). */
  exact?: boolean;
}

export const dashboardNav: DashboardNavItem[] = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/shipments", label: "Shipments", icon: Ship },
  { to: "/dashboard/customers", label: "Customers", icon: Users },
  { to: "/dashboard/quotes", label: "Quotes", icon: FileText },
  { to: "/dashboard/customs", label: "Customs & Documents", icon: Stamp },
  {
    to: "/dashboard/warehouse",
    label: "Warehouse & Operations",
    icon: Warehouse,
  },
  { to: "/dashboard/team", label: "Team", icon: UserCog },
  { to: "/dashboard/reports", label: "Reports", icon: BarChart3 },
];
