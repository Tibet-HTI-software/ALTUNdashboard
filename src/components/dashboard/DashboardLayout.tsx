import { useEffect, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardTopbar } from "./DashboardTopbar";
import { CommandPalette } from "./CommandPalette";

const COLLAPSE_KEY = "altun-dashboard-sidebar-collapsed";

/**
 * Top-level dashboard chrome. Wrap each /dashboard page component with this.
 *
 * - Sidebar: fixed on lg+, slide-in drawer on mobile, collapsible to an
 *   icon-only rail (preference persisted in localStorage).
 * - Background: dual-mode `.dashboard-bg` gradient.
 * - Hosts the global ⌘K command palette.
 */
export function DashboardLayout({ children }: { children: ReactNode }) {
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
    <div className="relative min-h-screen text-foreground">
      <div aria-hidden className="dashboard-bg fixed inset-0 -z-10" />

      <DashboardSidebar
        open={sidebarOpen}
        collapsed={collapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={toggleCollapse}
      />

      {/* Content column — offset adjusts to sidebar width on lg+ */}
      <div
        className={`flex flex-col min-h-screen transition-[padding] duration-300 ${
          collapsed ? "lg:pl-[4.75rem]" : "lg:pl-[16.5rem]"
        }`}
      >
        <DashboardTopbar onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto w-full max-w-[1440px]"
          >
            {children}
          </motion.div>
        </main>
      </div>

      <CommandPalette />
    </div>
  );
}
