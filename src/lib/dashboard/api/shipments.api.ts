import { createApiError, simulateRead, simulateSuccess } from "./client";
import { shipments } from "@/data/dashboard/shipments";
import type {
  ContainerType,
  Priority,
  Shipment,
  ShipmentStatus,
  TransportMode,
} from "@/lib/dashboard/types";
import type { CreateShipmentInput } from "./types";
import { supabase, withSupabaseFallback } from "./supabase";

/**
 * Shipments service — dual-mode (Supabase live / mock fallback).
 *
 * Customer reference is joined so the frontend can display the customer
 * label without a second round-trip. We select `customers(reference,
 * company)` and pluck `company` as the human-friendly name.
 */

interface ShipmentRow {
  reference: string;
  origin: string;
  destination: string;
  mode: TransportMode;
  container: ContainerType;
  status: ShipmentStatus;
  priority: Priority;
  etd: string | null;
  eta: string | null;
  weight_kg: number;
  progress: number | null;
  notes: string | null;
  customers: { company: string } | null;
}

const COLUMNS =
  "reference, origin, destination, mode, container, status, priority, etd, eta, weight_kg, progress, notes, customers(company)";

function rowToShipment(row: ShipmentRow): Shipment {
  return {
    id: row.reference,
    customer: row.customers?.company ?? "—",
    origin: row.origin,
    destination: row.destination,
    mode: row.mode,
    container: row.container,
    status: row.status,
    priority: row.priority,
    etd: row.etd ?? "",
    eta: row.eta ?? "",
    assignedTo: "—",
    weightKg: row.weight_kg,
    progress: row.progress ?? undefined,
    notes: row.notes ?? undefined,
  };
}

export async function getShipments(): Promise<Shipment[]> {
  return withSupabaseFallback(
    "shipments",
    async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select(COLUMNS)
        .order("eta", { ascending: true });
      if (error) throw error;
      return (data as unknown as ShipmentRow[]).map(rowToShipment);
    },
    () => simulateRead(() => shipments),
  );
}

export async function getShipmentById(id: string): Promise<Shipment> {
  return withSupabaseFallback(
    "shipments",
    async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select(COLUMNS)
        .eq("reference", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw createApiError(`Shipment ${id} not found.`, "not_found");
      return rowToShipment(data as unknown as ShipmentRow);
    },
    () =>
      simulateRead(() => {
        const found = shipments.find((s) => s.id === id);
        if (!found) {
          throw createApiError(`Shipment ${id} not found.`, "not_found");
        }
        return found;
      }),
  );
}

export async function updateShipmentStatus(
  id: string,
  status: ShipmentStatus,
): Promise<Shipment> {
  return simulateSuccess({
    ...shipments.find((s) => s.id === id),
    id,
    status,
  } as Shipment);
}

export async function createShipment(
  input: CreateShipmentInput,
): Promise<Shipment> {
  const id = `AL-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;
  const draft: Shipment = {
    id,
    customer: input.customer,
    origin: input.origin,
    destination: input.destination,
    mode: input.mode,
    container: input.container,
    status: input.status ?? "Booked",
    priority: input.priority ?? "Normal",
    etd: input.etd,
    eta: input.eta,
    assignedTo: input.assignedTo,
    weightKg: input.weightKg,
    notes: input.notes,
  };
  return simulateSuccess(draft);
}
