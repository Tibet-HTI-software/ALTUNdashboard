import { Link, useNavigate } from "@tanstack/react-router";
import {
  Anchor,
  X,
  Sun,
  Moon,
  Sparkles,
  Globe,
  LogOut,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { dashboardNav } from "@/lib/dashboard/nav";
import { useTheme } from "@/lib/dashboard/theme";
import { LANGUAGES, useLanguage } from "@/lib/dashboard/language";
import { useT } from "@/lib/dashboard/i18n";
import { useAuth } from "@/lib/auth/AuthContext";

interface Props {
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
}

/**
 * Premium glass sidebar — dual-mode, collapsible to an icon-only rail.
 * Fixed on desktop, slide-in drawer on mobile. The collapse toggle and
 * mobile drawer never collapse the drawer (collapse is a desktop concept).
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
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/login" });
  }

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
        {/* Brand block */}
        <div
          className={cn(
            "flex items-center gap-3 h-[4.25rem] border-b border-border shrink-0",
            collapsed
              ? "lg:justify-center lg:px-0 px-5"
              : "justify-between px-5",
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

          {/* Mobile close */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-md hover:bg-foreground/5 transition-colors text-foreground"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Desktop collapse toggle */}
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

        {/* Expand button — visible only when collapsed */}
        {collapsed && (
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex items-center justify-center mx-auto mt-3 h-8 w-8 rounded-lg hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Sections">
          {!collapsed && (
            <p className="px-3 mb-2.5 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
              {t("nav.workspace")}
            </p>
          )}
          <ul className="space-y-1">
            {dashboardNav.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.to}>
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
                        : "gap-3 px-3 py-2.5",
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
                    <span className={cn(collapsed && "lg:hidden")}>
                      {t(item.labelKey)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Automation Center — primary CTA section, placed right under the
              workspace nav so it flows as its own section and non-admin staff
              reach it fast. */}
          <div className="mt-6">
            {!collapsed && (
              <p className="px-3 mb-2.5 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
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
        </nav>

        {/* Preferences — appearance + language */}
        <div className="px-3 pt-3 pb-1 border-t border-border shrink-0">
          {!collapsed && (
            <p className="px-3 mb-2 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
              {t("pref.preferences")}
            </p>
          )}

          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggle}
            aria-label="Toggle light / dark mode"
            title={collapsed ? "Toggle theme" : undefined}
            className={cn(
              "w-full flex items-center rounded-lg text-[0.85rem] font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
              collapsed
                ? "lg:justify-center lg:px-0 h-10 justify-between px-3 py-2.5"
                : "justify-between px-3 py-2.5 gap-3",
            )}
          >
            <span className="flex items-center gap-3">
              {theme === "dark" ? (
                <Moon className="h-[1.05rem] w-[1.05rem] text-brand" />
              ) : (
                <Sun className="h-[1.05rem] w-[1.05rem] text-brand" />
              )}
              <span className={cn(collapsed && "lg:hidden")}>
                {theme === "dark" ? t("pref.darkMode") : t("pref.lightMode")}
              </span>
            </span>
            <span
              className={cn(
                "relative h-5 w-9 rounded-full transition-colors shrink-0",
                theme === "dark" ? "bg-brand" : "bg-foreground/15",
                collapsed && "lg:hidden",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all",
                  theme === "dark" ? "left-[1.125rem]" : "left-0.5",
                )}
              />
            </span>
          </button>

          {/* Language — EN / NL / TR segmented control, inline next to the
              label. Visual-only for now; shares the useLanguage() store with
              the Settings page so a change in either place syncs instantly. */}
          <div
            className={cn(
              "mt-1 flex rounded-lg px-3 py-2",
              collapsed
                ? "lg:flex-col lg:items-center lg:gap-1.5 items-center justify-between gap-3"
                : "items-center justify-between gap-3",
            )}
          >
            <span className="flex items-center gap-3 text-[0.85rem] font-medium text-muted-foreground">
              <Globe className="h-[1.05rem] w-[1.05rem] text-brand" />
              <span className={cn(collapsed && "lg:hidden")}>
                {t("pref.language")}
              </span>
            </span>
            <div
              role="group"
              aria-label="Language"
              className={cn(
                "flex gap-1 rounded-lg bg-foreground/[0.04] p-1",
                collapsed && "lg:flex-col",
              )}
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
                      "h-6 min-w-[2rem] flex-1 rounded-md px-1.5 text-[0.65rem] font-bold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                      active
                        ? "bg-brand text-white shadow-[0_2px_8px_-3px_var(--brand)]"
                        : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06]",
                    )}
                  >
                    {l.value}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Settings — pinned bottom-left page link */}
        <div className="px-3 py-3 shrink-0">
          <Link
            to="/dashboard/settings"
            onClick={onClose}
            title={collapsed ? t("pref.settings") : undefined}
            className={cn(
              "group flex items-center rounded-lg text-[0.85rem] font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
              collapsed
                ? "lg:justify-center lg:px-0 h-10 gap-3 px-3 py-2.5"
                : "gap-3 px-3 py-2.5",
            )}
            activeProps={{
              className: "!text-foreground !bg-brand/[0.1] [&>svg]:!text-brand",
            }}
          >
            <Settings className="h-[1.05rem] w-[1.05rem] shrink-0 text-muted-foreground/70 group-hover:text-foreground transition-colors" />
            <span className={cn(collapsed && "lg:hidden")}>
              {t("pref.settings")}
            </span>
          </Link>

          <button
            type="button"
            onClick={handleSignOut}
            title={collapsed ? t("auth.signOut") : undefined}
            className={cn(
              "group w-full flex items-center rounded-lg text-[0.85rem] font-medium text-muted-foreground hover:text-red-500 hover:bg-red-500/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
              collapsed
                ? "lg:justify-center lg:px-0 h-10 gap-3 px-3 py-2.5"
                : "gap-3 px-3 py-2.5",
            )}
          >
            <LogOut className="h-[1.05rem] w-[1.05rem] shrink-0 text-muted-foreground/70 group-hover:text-red-500 transition-colors" />
            <span className={cn(collapsed && "lg:hidden")}>
              {t("auth.signOut")}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
