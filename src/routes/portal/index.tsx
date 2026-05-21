import { createFileRoute, Navigate } from "@tanstack/react-router";

/**
 * /portal → redirect to the default portal view (My Shipments).
 * A logged-in client landing on /portal always lands on their shipment list.
 */
export const Route = createFileRoute("/portal/")({
  component: () => <Navigate to="/portal/shipments" replace />,
});
