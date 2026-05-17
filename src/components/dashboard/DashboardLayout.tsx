import { useEffect, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardTopbar } from "./DashboardTopbar";
import { CommandMenu } from "./CommandMenu";

const COLLAPSE_KEY = "altun-dashboard-sidebar-collapsed";

interface Props {
  children: ReactNode;
  /**
   * Strict single-screen lock. When true, <main> never scrolls — the page
   * is a flex column that fills the viewport exactly and owns its own
   * internal scroll regions. Used by the Overview and Automation cockpits.
   */
  lockViewport?: boolean;
}

/**
 * Top-level dashboard chrome. Wrap each /dashboard page component with this.
 *
 * - Sidebar: fixed on lg+, slide-in drawer on mobile, collapsible to an
 *   icon-only rail (preference persisted in localStorage).
 * - Background: dual-mode `.dashboard-bg` gradient.
 * - Hosts the global ⌘K command palette.
 * - The window itself never scrolls; the outer frame is locked to the
 *   viewport (`h-screen overflow-hidden`).
 */
export function DashboardLayout({ children, lockViewport = false }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Route path drives the page-transition fade — remounting the motion
  // wrapper on every navigation replays the enter animation.
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Restore collapse preference after mount (SSR-safe).
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  function toggleCollapse() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950 text-foreground">
      <div aria-hidden className="dashboard-bg fixed inset-0 -z-10" />

      <DashboardSidebar
        open={sidebarOpen}
        collapsed={collapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={toggleCollapse}
      />

      {/* Content column — offset adjusts to sidebar width on lg+.
          Locked to the viewport height; only <main> scrolls internally so
          the window/chrome never moves (single-screen cockpit). */}
      <div
        className={`flex flex-col h-screen min-w-0 transition-[padding] duration-300 ${
          collapsed ? "lg:pl-[4.75rem]" : "lg:pl-[16.5rem]"
        }`}
      >
        <DashboardTopbar onOpenSidebar={() => setSidebarOpen(true)} />
        <main
          className={cn(
            "flex-1 min-h-0 min-w-0 overflow-x-hidden px-4 sm:px-6 lg:px-8",
            lockViewport
              ? "overflow-y-hidden py-5 sm:py-6"
              : "overflow-y-auto scroll-thin py-8 sm:py-10 lg:py-12",
          )}
        >
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "mx-auto w-full max-w-[1440px] min-w-0",
              lockViewport && "h-full min-h-0 flex flex-col overflow-hidden",
            )}
          >
            {children}
          </motion.div>
        </main>
      </div>

      <CommandMenu />
    </div>
  );
}
