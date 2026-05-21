import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  Anchor,
  ChevronRight,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  dashboardNavGroups,
  filterNavForRole,
  type DashboardNavItem,
} from "@/lib/dashboard/nav";
import { useTheme } from "@/lib/dashboard/theme";
import { LANGUAGES, useLanguage } from "@/lib/dashboard/language";
import { useT } from "@/lib/dashboard/i18n";
import { useAuth } from "@/lib/auth/AuthContext";
import { useRole } from "@/lib/dashboard/role";

interface Props {
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
}

/**
 * Premium glass sidebar — dual-mode, collapsible to an icon-only rail.
 *
 * Hydration strategy (layout-shift-free):
 *   • `roleResolved` starts false; nothing is rendered inside <nav> until the
 *     first useEffect fires and reads the real role from localStorage.
 *   • A `flex-1` sibling keeps the Automation CTA pinned at its fixed position
 *     below the nav — the CTA never moves regardless of how many nav items exist.
 *   • Once resolved, a `motion.div` keyed by `role` slides the correct filtered
 *     items in (opacity 0→1, y 5→0). Role switches also re-animate via the key.
 *   • No CEO items are ever injected then removed for non-CEO users — zero DOM
 *     reflow, zero layout shift, zero Flash of Unrestricted Content.
 */
export function DashboardSidebar({
  open,
  collapsed,
  onClose,
  onToggleCollapse,
}: Props) {
  const { theme, toggle } = useTheme();
  const { language, setLanguage } = useLanguage();
  const t = useT();
  const { signOut } = useAuth();
  const { role } = useRole();
  const navigate = useNavigate();

  /* ── Hydration guard ─────────────────────────────────────────────────────
   * SSR + initial client render both default to role="ceo".  The real role
   * arrives in useRole()'s useEffect.  We gate ALL nav rendering behind this
   * boolean so no CEO items are ever injected for a non-CEO user — eliminating
   * both the visual flash and the structural reflow it causes.
   * ───────────────────────────────────────────────────────────────────────── */
  const [roleResolved, setRoleResolved] = useState(false);
  useEffect(() => { setRoleResolved(true); }, []);

  /* ── Collapsible group state — all open by default ────────────────────── */
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    dashboardNavGroups.forEach((g) => { init[g.id] = true; });
    return init;
  });

  function toggleGroup(id: string) {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/login" });
  }

  /* ── Icon rail items (collapsed mode) — pre-computed ─────────────────── */
  const railItems = dashboardNavGroups
    .flatMap((g) => g.items)
    .filter((item) => !item.allowedRoles || item.allowedRoles.includes(role));

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          "lg:hidden fixed inset-0 z-30 bg-black/40 backdrop-blur-sm transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        aria-hidden
        onClick={onClose}
      />

      {/*
       * aside — fixed full-height flex column.
       * Width transition handled via Tailwind class swap + CSS transition.
       * The aside being `position: fixed` means NO content to its right ever
       * shifts — the layout-shift concern is purely internal.
       */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col w-72",
          collapsed ? "lg:w-[4.75rem]" : "lg:w-[16.5rem]",
          "glass-panel border-r",
          "transition-[transform,width] duration-300 ease-out",
          "lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
        aria-label="Dashboard navigation"
      >

        {/* ── Brand block — always visible, role-agnostic ───────────────────── */}
        <div
          className={cn(
            "flex items-center gap-3 h-[4.25rem] border-b border-border shrink-0",
            collapsed ? "lg:justify-center lg:px-0 px-5" : "justify-between px-5",
          )}
        >
          <Link
            to="/dashboard"
            className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-md"
          >
            <div className="relative flex items-center justify-center h-9 w-9 rounded-xl bg-gradient-to-br from-brand/30 to-brand/10 border border-brand/30 shadow-[0_0_18px_-6px_var(--brand)] shrink-0">
              <Anchor className="h-4 w-4 text-brand" />
            </div>
            <div className={cn("leading-tight", collapsed && "lg:hidden")}>
              <div className="font-display font-bold text-[0.95rem] tracking-tight text-foreground">
                Altun Logistics
              </div>
              <div className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
                Operations
              </div>
            </div>
          </Link>

          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-md hover:bg-foreground/5 transition-colors text-foreground"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>

          <button
            onClick={onToggleCollapse}
            className={cn(
              "hidden lg:inline-flex p-1.5 rounded-md hover:bg-foreground/5 transition-colors text-muted-foreground hover:text-foreground",
              collapsed && "lg:hidden",
            )}
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        {/* Expand button — desktop icon-rail mode only */}
        {collapsed && (
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex items-center justify-center mx-auto mt-3 h-8 w-8 rounded-lg hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}

        {/* ── Scrollable nav region ─────────────────────────────────────────────
         * `min-h-0` is required: without it, a flex child's minimum height is
         * `auto` (its content height), which prevents overflow-y-auto from
         * activating correctly inside a flex column.
         *
         * This region renders NOTHING until roleResolved = true — no DOM nodes
         * to inject and then remove, no reflow, no height snap.
         * ───────────────────────────────────────────────────────────────────── */}
        <nav
          className="flex-1 min-h-0 overflow-y-auto scroll-thin px-3 py-3"
          aria-label="Sections"
        >
          <AnimatePresence mode="wait">
            {roleResolved && (
              <motion.div
                key={role}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* ── Collapsed: icon rail ─────────────────────────────────── */}
                {collapsed && (
                  <ul className="space-y-1">
                    {railItems.map((item) => (
                      <li key={item.to}>
                        <NavItem item={item} collapsed onClose={onClose} />
                      </li>
                    ))}
                  </ul>
                )}

                {/* ── Expanded: collapsible category groups ─────────────────── */}
                {!collapsed && (
                  <div className="space-y-0.5">
                    {dashboardNavGroups.map((group) => {
                      const visible = filterNavForRole(group.items, role);
                      if (visible.length === 0) return null;

                      const isOpen = openGroups[group.id] ?? true;

                      return (
                        <div key={group.id} className="mb-1">
                          <button
                            type="button"
                            onClick={() => toggleGroup(group.id)}
                            className="w-full flex items-center justify-between px-3 py-1.5 mb-0.5 rounded-md hover:bg-foreground/[0.03] transition-colors group/gh"
                          >
                            <span className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground/55 group-hover/gh:text-muted-foreground transition-colors">
                              {t(group.labelKey)}
                            </span>
                            <ChevronRight
                              className={cn(
                                "h-3 w-3 text-muted-foreground/35 transition-transform duration-200 ease-out",
                                isOpen && "rotate-90",
                              )}
                            />
                          </button>

                          {/* CSS grid-rows collapse animation */}
                          <div
                            className={cn(
                              "grid transition-[grid-template-rows] duration-200 ease-out",
                              isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                            )}
                          >
                            <ul className="overflow-hidden space-y-0.5 pb-1">
                              {visible.map((item) => (
                                <li key={item.to}>
                                  <NavItem item={item} collapsed={false} onClose={onClose} />
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        {/* ── Automation CTA — OUTSIDE the scrollable nav ──────────────────────
         * Positioned as its own `shrink-0` flex child so it is ALWAYS at the
         * same vertical position, independent of how many nav items are above it.
         * This is the key structural fix: the CTA can never "jump" during
         * hydration or role switches because nothing above it changes its
         * allocated space.
         * ───────────────────────────────────────────────────────────────────── */}
        <div className="shrink-0 px-3 pb-3 pt-2">
          {!collapsed && (
            <p className="px-3 mb-2 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground/55">
              {t("nav.quickAccess")}
            </p>
          )}
          <Link
            to="/dashboard/automation"
            onClick={onClose}
            title={collapsed ? t("nav.automation") : undefined}
            className={cn(
              "group relative flex items-center rounded-xl font-semibold text-white",
              "bg-gradient-to-br from-brand to-brand-strong",
              "shadow-[0_10px_28px_-10px_var(--brand)] transition-all duration-200",
              "hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-8px_var(--brand)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              collapsed
                ? "lg:justify-center lg:px-0 lg:h-11 h-12 gap-3 px-3"
                : "gap-3 px-3 py-2.5",
            )}
            activeProps={{ className: "ring-2 ring-white/40" }}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 shrink-0">
              <Sparkles className="h-[1.05rem] w-[1.05rem]" />
            </span>
            <span
              className={cn(
                "flex flex-col leading-tight min-w-0",
                collapsed && "lg:hidden",
              )}
            >
              <span className="text-[0.85rem]">{t("nav.automation")}</span>
              <span className="text-[0.65rem] font-medium text-white/70">
                {t("nav.automationSub")}
              </span>
            </span>
          </Link>
        </div>

        {/* ── Ultra-compact footer ─────────────────────────────────────────────
             Expanded:  [🌙] [EN][NL][TR] · · · [⚙] [→]  — single ~44px row
             Collapsed: [🌙] / [⚙] / [→]                  — stacked icon rail
        ─────────────────────────────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-border px-2 py-1.5">

          {/* Expanded: one flat row */}
          {!collapsed && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggle}
                aria-label="Toggle light / dark mode"
                title={theme === "dark" ? t("pref.darkMode") : t("pref.lightMode")}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand shrink-0"
              >
                {theme === "dark" ? (
                  <Moon className="h-[0.9rem] w-[0.9rem] text-brand" />
                ) : (
                  <Sun className="h-[0.9rem] w-[0.9rem] text-brand" />
                )}
              </button>

              <div
                role="group"
                aria-label="Language"
                className="flex gap-0.5 rounded-md bg-foreground/[0.04] p-0.5"
              >
                {LANGUAGES.map((l) => {
                  const active = l.value === language;
                  return (
                    <button
                      key={l.value}
                      type="button"
                      onClick={() => setLanguage(l.value)}
                      aria-pressed={active}
                      title={l.label}
                      className={cn(
                        "h-[1.375rem] w-7 rounded px-0.5 text-[0.58rem] font-bold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand",
                        active
                          ? "bg-brand text-white shadow-[0_1px_6px_-2px_var(--brand)]"
                          : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06]",
                      )}
                    >
                      {l.value}
                    </button>
                  );
                })}
              </div>

              <div className="flex-1" />

              <Link
                to="/dashboard/settings"
                onClick={onClose}
                title={t("pref.settings")}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                activeProps={{ className: "!text-brand !bg-brand/[0.08]" }}
              >
                <Settings className="h-[0.9rem] w-[0.9rem]" />
              </Link>

              <button
                type="button"
                onClick={handleSignOut}
                title={t("auth.signOut")}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/[0.08] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <LogOut className="h-[0.9rem] w-[0.9rem]" />
              </button>
            </div>
          )}

          {/* Collapsed: stacked icon rail */}
          {collapsed && (
            <div className="flex flex-col items-center gap-1 py-0.5">
              <button
                type="button"
                onClick={toggle}
                aria-label="Toggle light / dark mode"
                title={theme === "dark" ? t("pref.darkMode") : t("pref.lightMode")}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                {theme === "dark" ? (
                  <Moon className="h-[0.9rem] w-[0.9rem] text-brand" />
                ) : (
                  <Sun className="h-[0.9rem] w-[0.9rem] text-brand" />
                )}
              </button>

              <Link
                to="/dashboard/settings"
                onClick={onClose}
                title={t("pref.settings")}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                activeProps={{ className: "!text-brand !bg-brand/[0.08]" }}
              >
                <Settings className="h-[0.9rem] w-[0.9rem]" />
              </Link>

              <button
                type="button"
                onClick={handleSignOut}
                title={t("auth.signOut")}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/[0.08] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <LogOut className="h-[0.9rem] w-[0.9rem]" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

/* ── NavItem ─────────────────────────────────────────────────────────────── */

function NavItem({
  item,
  collapsed,
  onClose,
}: {
  item: DashboardNavItem;
  collapsed: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const Icon = item.icon;

  return (
    <Link
      to={item.to}
      onClick={onClose}
      activeOptions={{ exact: item.exact }}
      title={collapsed ? t(item.labelKey) : undefined}
      className={cn(
        "group relative flex items-center rounded-lg text-[0.85rem] font-medium",
        "text-muted-foreground hover:text-foreground transition-colors",
        "hover:bg-foreground/[0.04]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
        collapsed
          ? "lg:justify-center lg:px-0 h-10 gap-3 px-3"
          : "gap-3 px-3 py-2",
      )}
      activeProps={{
        className:
          "!text-foreground !bg-brand/[0.1] " +
          "[&>svg]:!text-brand [&_.nav-rail]:!opacity-100",
      }}
    >
      <span
        aria-hidden
        className="nav-rail absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-brand opacity-0 shadow-[0_0_10px_0_var(--brand)] transition-opacity"
      />
      <Icon className="h-[1.05rem] w-[1.05rem] shrink-0 text-muted-foreground/70 group-hover:text-foreground transition-colors" />
      <span className={cn(collapsed && "lg:hidden")}>{t(item.labelKey)}</span>
    </Link>
  );
}
