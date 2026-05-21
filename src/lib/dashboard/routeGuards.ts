/**
 * Route-level RBAC helpers for TanStack Router `beforeLoad` hooks.
 *
 * Uses `getStoredRole()` (sync localStorage read) so no async needed.
 * Returns "ceo" on the server — no accidental SSR redirects.
 *
 * Usage in any route file:
 *   import { requireRoles } from "@/lib/dashboard/routeGuards";
 *   export const Route = createFileRoute("/dashboard/finance")({
 *     beforeLoad: () => requireRoles(["ceo"]),
 *     ...
 *   });
 */

import { redirect } from "@tanstack/react-router";
import { getStoredRole, type Role } from "./role";

/**
 * Throws a TanStack Router redirect to `/dashboard` if the current role is
 * not in the `allowed` list. Safe to call synchronously in `beforeLoad`.
 */
export function requireRoles(allowed: Role[]): void {
  const role = getStoredRole();
  if (!allowed.includes(role)) {
    throw redirect({ to: "/dashboard" });
  }
}
