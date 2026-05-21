/**
 * Barrel for the dashboard mock-API layer.
 *
 * Routes import from `@/lib/dashboard/api`, never directly from
 * `@/data/dashboard/*`. When a real backend lands, swap the body of each
 * service file (e.g. with Supabase or fetch calls) and route code stays
 * exactly the same.
 */

export * from "./client";
export * from "./types";
export * from "./useAsyncData";

export * from "./overview.api";
export * from "./shipments.api";
export * from "./customers.api";
export * from "./quotes.api";
export * from "./customs.api";
export * from "./warehouse.api";
export * from "./team.api";
export * from "./automation.api";
export * from "./reports.api";
export * from "./settings.api";
export * from "./oceanFreight.api";
export * from "./auditLogs.api";
export * from "./communications.api";
export * from "./tasks.api";
export * from "./finance.api";
export * from "./portal.api";
