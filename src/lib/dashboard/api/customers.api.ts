import { createApiError, simulateRead, simulateSuccess } from "./client";
import { customers } from "@/data/dashboard/customers";
import type { Customer, CustomerStatus } from "@/lib/dashboard/types";
import type { CreateCustomerInput } from "./types";
import { supabase, withSupabaseFallback } from "./supabase";

/**
 * Customers service — dual-mode (Supabase live / mock fallback).
 *
 * DB column ↔ frontend mapping:
 *   reference         → id
 *   route_focus       → routeFocus
 *   active_shipments  → activeShipments
 *   last_activity     → lastActivity   (nullable)
 */

interface CustomerRow {
  reference: string;
  company: string;
  contact: string;
  country: string;
  route_focus: string;
  active_shipments: number;
  last_activity: string | null;
  status: CustomerStatus;
}

const COLUMNS =
  "reference, company, contact, country, route_focus, active_shipments, last_activity, status";

function rowToCustomer(row: CustomerRow): Customer {
  return {
    id: row.reference,
    company: row.company,
    contact: row.contact,
    country: row.country,
    routeFocus: row.route_focus,
    activeShipments: row.active_shipments,
    lastActivity: row.last_activity ?? "",
    status: row.status,
  };
}

export async function getCustomers(): Promise<Customer[]> {
  return withSupabaseFallback(
    "customers",
    async () => {
      const { data, error } = await supabase
        .from("customers")
        .select(COLUMNS)
        .order("company", { ascending: true });
      if (error) throw error;
      return (data as CustomerRow[]).map(rowToCustomer);
    },
    () => simulateRead(() => customers),
  );
}

export async function getCustomerById(id: string): Promise<Customer> {
  return withSupabaseFallback(
    "customers",
    async () => {
      const { data, error } = await supabase
        .from("customers")
        .select(COLUMNS)
        .eq("reference", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw createApiError(`Customer ${id} not found.`, "not_found");
      return rowToCustomer(data as CustomerRow);
    },
    () =>
      simulateRead(() => {
        const found = customers.find((c) => c.id === id);
        if (!found) {
          throw createApiError(`Customer ${id} not found.`, "not_found");
        }
        return found;
      }),
  );
}

export async function createCustomer(
  input: CreateCustomerInput,
): Promise<Customer> {
  // Mock-only for now. Wire to Supabase insert in a follow-up PR.
  const id = `CUST-${Math.floor(Math.random() * 9000 + 1000)}`;
  const draft: Customer = {
    id,
    company: input.company,
    contact: input.contact,
    country: input.country,
    routeFocus: input.routeFocus,
    activeShipments: 0,
    lastActivity: new Date().toISOString().slice(0, 10),
    status: input.status ?? "Onboarding",
  };
  return simulateSuccess(draft);
}
