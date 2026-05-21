import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { Anchor } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary";

/**
 * /portal layout route + auth guard.
 *
 * Access rules:
 *  - Unauthenticated visitors → redirect to /login.
 *  - Authenticated users with role "client" → allowed in.
 *  - Authenticated staff (demo bypass / any role) → allowed in demo mode
 *    so the portal can be previewed during a sales walkthrough without
 *    needing a separate client account.
 *  - In production with real Supabase auth, tighten this guard to:
 *      if (user?.role !== "client") return <Navigate to="/dashboard" />;
 *
 * Data isolation is enforced independently at the API layer (portal.api.ts)
 * regardless of how the user reached /portal.
 */
export const Route = createFileRoute("/portal")({
  component: PortalGuard,
});

function PortalGuard() {
  const { authed, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="grid h-screen w-full place-items-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand/30 to-brand/10 border border-brand/30 shadow-[0_0_24px_-6px_var(--brand)] animate-pulse">
            <Anchor className="h-5 w-5 text-brand" />
          </span>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Loading portal…
          </p>
        </div>
      </div>
    );
  }

  if (!authed) {
    return <Navigate to="/login" />;
  }

  // Production gate: un-comment to restrict portal to client-role users only.
  // if (user?.role !== "client") return <Navigate to="/dashboard" />;
  void user; // used above in production gate

  return (
    <ErrorBoundary>
      <Outlet />
    </ErrorBoundary>
  );
}
