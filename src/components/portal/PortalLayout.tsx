/**
 * PortalLayout — client-facing chrome for the /portal route group.
 *
 * Intentionally different from DashboardLayout:
 *  • No role switcher — clients have a single, fixed identity.
 *  • No automation CTA — internal tooling hidden from clients.
 *  • No language picker or complex collapsible groups.
 *  • Sidebar is a flat 3-link list — simple, professional, focused.
 *  • Branding signals "Client Portal" not "Operations".
 *
 * Same visual tokens as the dashboard (glass-panel, brand, dark mode) so
 * the company brand identity is consistent across both surfaces.
 */

import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Anchor,
  ArrowLeft,
  FileText,
  Globe2,
  Headset,
  LogOut,
  Menu,
  Moon,
  Ship,
  Sun,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/dashboard/theme";
import { useAuth } from "@/lib/auth/AuthContext";
import { useRole } from "@/lib/dashboard/role";

/* ── Nav definition ──────────────────────────────────────────────────────── */

const PORTAL_NAV = [
  {
    to: "/portal/shipments" as const,
    label: "My Shipments",
    icon: Ship,
  },
  {
    to: "/portal/tracking" as const,
    label: "Live Tracking",
    icon: Globe2,
  },
  {
    to: "/portal/invoices" as const,
    label: "My Invoices",
    icon: FileText,
  },
  {
    to: "/portal/support" as const,
    label: "Support",
    icon: Headset,
  },
] as const;

/* ── Component ───────────────────────────────────────────────────────────── */

interface Props {
  children: ReactNode;
  lockViewport?: boolean;
}

export function PortalLayout({ children, lockViewport = false }: Props) {
  const { theme, toggle } = useTheme();
  const { user, signOut } = useAuth();
  const { setRole } = useRole();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  /** Revert to CEO role and return to the internal dashboard. */
  function handleExitPreview() {
    setRole("ceo");
    navigate({ to: "/dashboard" });
  }

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/login" });
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950 text-foreground">
      <div aria-hidden className="dashboard-bg fixed inset-0 -z-10" />

      {/* Mobile overlay */}
      <div
        className={cn(
          "lg:hidden fixed inset-0 z-30 bg-black/40 backdrop-blur-sm transition-opacity duration-200",
          mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        aria-hidden
        onClick={() => setMobileOpen(false)}
      />

      {/* ── Sidebar ── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col w-64 glass-panel border-r",
          "transition-transform duration-300 ease-out",
          "lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
        aria-label="Portal navigation"
      >
        {/* Brand */}
        <div className="flex items-center justify-between h-[4.25rem] border-b border-border px-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center h-9 w-9 rounded-xl bg-gradient-to-br from-brand/30 to-brand/10 border border-brand/30 shadow-[0_0_18px_-6px_var(--brand)] shrink-0">
              <Anchor className="h-4 w-4 text-brand" />
            </div>
            <div className="leading-tight">
              <div className="font-display font-bold text-[0.9rem] tracking-tight text-foreground">
                Altun Logistics
              </div>
              <div className="text-[0.58rem] uppercase tracking-[0.2em] text-brand/70 font-semibold">
                Client Portal
              </div>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-md hover:bg-foreground/5 transition-colors text-foreground"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Exit preview banner — visible to internal staff previewing the portal */}
        <div className="shrink-0 mx-3 mt-3">
          <button
            type="button"
            onClick={handleExitPreview}
            className={cn(
              "w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-colors",
              "border border-amber-500/30 bg-amber-500/[0.07]",
              "hover:border-amber-500/50 hover:bg-amber-500/[0.12]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50",
            )}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/15 border border-amber-500/25 shrink-0">
              <ArrowLeft className="h-3 w-3 text-amber-600 dark:text-amber-400" />
            </span>
            <div className="min-w-0">
              <p className="text-[0.68rem] font-semibold text-amber-700 dark:text-amber-300 leading-snug">
                Exit Client Preview
              </p>
              <p className="text-[0.58rem] text-amber-600/70 dark:text-amber-400/70 leading-snug">
                Return to internal dashboard
              </p>
            </div>
          </button>
        </div>

        {/* Client identity chip */}
        {user && (
          <div className="shrink-0 mx-3 mt-3 px-3 py-2.5 rounded-xl bg-foreground/[0.04] border border-border">
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60 mb-0.5">
              Signed in as
            </p>
            <p className="text-[0.78rem] font-semibold text-foreground truncate">
              {user.mock ? "Demo Client" : user.email}
            </p>
          </div>
        )}

        {/* Nav links */}
        <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4" aria-label="Portal sections">
          <p className="px-3 mb-2 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground/55">
            Navigation
          </p>
          <ul className="space-y-0.5">
            {PORTAL_NAV.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <Link
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[0.85rem] font-medium",
                    "text-muted-foreground hover:text-foreground transition-colors hover:bg-foreground/[0.04]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                  )}
                  activeProps={{
                    className:
                      "!text-foreground !bg-brand/[0.1] [&>svg]:!text-brand [&_.portal-rail]:!opacity-100",
                  }}
                  activeOptions={{ exact: false }}
                >
                  <span
                    aria-hidden
                    className="portal-rail absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-brand opacity-0 shadow-[0_0_10px_0_var(--brand)] transition-opacity"
                  />
                  <Icon className="h-[1.05rem] w-[1.05rem] shrink-0 text-muted-foreground/70 group-hover:text-foreground transition-colors" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-border px-2 py-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggle}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              aria-label="Toggle theme"
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand"
            >
              {theme === "dark" ? (
                <Moon className="h-[0.9rem] w-[0.9rem] text-brand" />
              ) : (
                <Sun className="h-[0.9rem] w-[0.9rem] text-brand" />
              )}
            </button>
            <div className="flex-1" />
            <button
              type="button"
              onClick={handleSignOut}
              title="Sign out"
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/[0.08] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand"
            >
              <LogOut className="h-[0.9rem] w-[0.9rem]" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Content column ── */}
      <div className="flex flex-col h-screen min-w-0 lg:pl-64">
        {/* Mobile topbar */}
        <header className="lg:hidden shrink-0 flex items-center gap-3 h-[4.25rem] border-b border-border px-4 glass-panel">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-foreground/[0.06] transition-colors text-foreground"
            aria-label="Open navigation"
          >
            <Menu className="h-4.5 w-4.5" />
          </button>
          <div className="flex items-center gap-2">
            <Anchor className="h-4 w-4 text-brand" />
            <span className="font-display font-bold text-[0.9rem] text-foreground">
              Altun Logistics
            </span>
            <span className="text-[0.6rem] uppercase tracking-[0.15em] text-brand/70 font-semibold">
              Portal
            </span>
          </div>
          {/* Exit preview — right side of mobile bar */}
          <button
            type="button"
            onClick={handleExitPreview}
            className={cn(
              "ml-auto flex items-center gap-1.5 h-8 rounded-lg px-2.5 text-[0.72rem] font-semibold transition-colors",
              "border border-amber-500/30 bg-amber-500/[0.07] text-amber-700 dark:text-amber-300",
              "hover:border-amber-500/50 hover:bg-amber-500/[0.13]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50",
            )}
          >
            <ArrowLeft className="h-3 w-3" />
            Exit Preview
          </button>
        </header>

        <main
          className={cn(
            "flex-1 min-h-0 min-w-0 overflow-x-hidden px-4 sm:px-6 lg:px-8",
            lockViewport
              ? "overflow-y-hidden py-5 sm:py-6"
              : "overflow-y-auto scroll-thin py-8 sm:py-10",
          )}
        >
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "mx-auto w-full max-w-[1200px] min-w-0",
              lockViewport && "h-full min-h-0 flex flex-col overflow-hidden",
            )}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
