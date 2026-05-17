import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Root path on the dashboard-only project redirects to /dashboard so
 * users always land on the operations overview.
 */
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});
