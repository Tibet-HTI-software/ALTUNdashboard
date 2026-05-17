import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { Anchor } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary";

/**
 * Dashboard layout + auth guard.
 *
 * Every `/dashboard/*` route renders inside this Outlet. Unauthenticated
 * visitors are redirected to `/login`; the demo bypass counts as
 * authenticated. While the session is resolving a calm splash is shown so
 * there is no protected-content flash.
 */
export const Route = createFileRoute("/dashboard")({
  component: DashboardGuard,
});

function DashboardGuard() {
  const { authed, loading } = useAuth();

  if (loading) {
    return (
      <div className="grid h-screen w-full place-items-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand/30 to-brand/10 border border-brand/30 shadow-[0_0_24px_-6px_var(--brand)] animate-pulse">
            <Anchor className="h-5 w-5 text-brand" />
          </span>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Loading workspace…
          </p>
        </div>
      </div>
    );
  }

  if (!authed) {
    return <Navigate to="/login" />;
  }

  return (
    <ErrorBoundary>
      <Outlet />
    </ErrorBoundary>
  );
}
