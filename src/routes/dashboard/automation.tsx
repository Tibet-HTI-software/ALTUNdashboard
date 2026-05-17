import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Automation Center layout route.
 *
 * `/dashboard/automation` itself renders the overview (`automation.index`);
 * the detailed workflow views render as child routes in this Outlet:
 *  - /dashboard/automation/document-completeness
 *  - /dashboard/automation/delay-risk
 *  - /dashboard/automation/email-assistant
 */
export const Route = createFileRoute("/dashboard/automation")({
  component: () => <Outlet />,
});
