/**
 * Ocean Freight service — Supabase-first, mock-fallback.
 *
 * `getOceanShipments()` attempts a live Supabase query; if the env vars
 * are missing or the `ocean_shipments` table is not yet applied, it
 * transparently falls back to the `data/dashboard/oceanFreight.ts` fixtures
 * via `withSupabaseFallback`. The app therefore never crashes, online or off.
 */

import { simulateRead } from "./client";
import { supabase, withSupabaseFallback } from "./supabase";
import {
  buildOceanShipments,
  buildCustomerEmails,
  type OceanShipment,
  type CustomerEmail,
  type ContainerType,
  type ShipmentDirection,
  type ShipmentPhase,
  type CustomsBlockReason,
  type CarrierName,
} from "@/data/dashboard/oceanFreight";

export type {
  OceanShipment,
  CustomerEmail,
  ContainerType,
  ShipmentDirection,
  ShipmentPhase,
  CustomsBlockReason,
  CarrierName,
  EmailIntent,
} from "@/data/dashboard/oceanFreight";

/* ── Demurrage & Detention free-time status ───────────────────────── */

export type FreeTimeRisk = "demurrage" | "critical" | "warning" | "healthy";

export interface FreeTimeStatus {
  risk: FreeTimeRisk;
  /** Whole hours until free time expires — negative once in demurrage. */
  hoursLeft: number;
  /** Whole days until free time expires — negative once in demurrage. */
  daysLeft: number;
  /** Accrued demurrage cost so far (EUR), 0 while still in free time. */
  accruedEur: number;
  label: string;
}

/** Free-time hour thresholds that flip a container to critical / warning. */
export interface RiskThresholds {
  criticalH: number;
  warningH: number;
}

const DEFAULT_RISK_THRESHOLDS: RiskThresholds = { criticalH: 24, warningH: 72 };

/**
 * Computes live D&D free-time status from an absolute expiry timestamp.
 * Pure + synchronous so components can re-run it on a render tick for a
 * ticking countdown without another network round-trip. The risk bands
 * are configurable via the demurrage-threshold store.
 */
export function getFreeTimeStatus(
  shipment: Pick<OceanShipment, "freeTimeExpiresAt" | "demurrageRatePerDay">,
  thresholds: RiskThresholds = DEFAULT_RISK_THRESHOLDS,
): FreeTimeStatus {
  const ms = new Date(shipment.freeTimeExpiresAt).getTime() - Date.now();
  const hoursLeft = Math.floor(ms / 3_600_000);
  const daysLeft = Math.floor(ms / 86_400_000);

  let risk: FreeTimeRisk;
  if (hoursLeft < 0) risk = "demurrage";
  else if (hoursLeft < thresholds.criticalH) risk = "critical";
  else if (hoursLeft < thresholds.warningH) risk = "warning";
  else risk = "healthy";

  const daysOverdue = hoursLeft < 0 ? Math.ceil(-hoursLeft / 24) : 0;
  const accruedEur = daysOverdue * shipment.demurrageRatePerDay;

  const label =
    risk === "demurrage"
      ? `${daysOverdue}d in demurrage`
      : hoursLeft < 48
        ? `${Math.max(hoursLeft, 0)}h free time left`
        : `${daysLeft}d free time left`;

  return { risk, hoursLeft, daysLeft, accruedEur, label };
}

/* ── Supabase row mapping ─────────────────────────────────────────── */

/** Shape of a row from the `shipments` table (snake_case). */
interface ShipmentRow {
  id: string;
  bl_number: string;
  container_number: string;
  container_type: string;
  direction: string;
  carrier: string;
  vessel: string;
  voyage: string;
  pol: string;
  pod: string;
  terminal: string;
  trader: string;
  trader_contact: string | null;
  trader_email: string | null;
  phase: string;
  etd: string | null;
  eta: string | null;
  discharged_at: string | null;
  free_days_total: number;
  free_time_expires_at: string | null;
  demurrage_rate_per_day: number;
  customs_block: string | null;
  teu: number;
  weight_kg: number;
  commodity: string | null;
}

const SHIPMENT_COLUMNS = `
  id, bl_number, container_number, container_type, direction, carrier,
  vessel, voyage, pol, pod, terminal, trader, trader_contact, trader_email,
  phase, etd, eta, discharged_at, free_days_total, free_time_expires_at,
  demurrage_rate_per_day, customs_block, teu, weight_kg, commodity
`;

function rowToShipment(row: ShipmentRow): OceanShipment {
  return {
    id: row.id,
    blNumber: row.bl_number,
    containerNumber: row.container_number,
    containerType: row.container_type as ContainerType,
    direction: row.direction as ShipmentDirection,
    carrier: row.carrier as CarrierName,
    vessel: row.vessel,
    voyage: row.voyage,
    pol: row.pol,
    pod: row.pod,
    terminal: row.terminal,
    trader: row.trader,
    traderType: row.direction === "Export" ? "Exporter" : "Importer",
    traderContact: row.trader_contact ?? "",
    traderEmail: row.trader_email ?? "",
    phase: row.phase as ShipmentPhase,
    etd: row.etd ?? "",
    eta: row.eta ?? "",
    dischargedAt: row.discharged_at,
    freeDaysTotal: row.free_days_total,
    freeTimeExpiresAt: row.free_time_expires_at ?? new Date().toISOString(),
    demurrageRatePerDay: row.demurrage_rate_per_day,
    customsBlock: (row.customs_block as CustomsBlockReason | null) ?? null,
    teu: row.teu,
    weightKg: row.weight_kg,
    commodity: row.commodity ?? "",
  };
}

/* ── Read services ────────────────────────────────────────────────── */

/**
 * All ocean-freight shipments, newest booking first.
 * Live Supabase query when configured; mock fixtures otherwise.
 */
export async function getOceanShipments(): Promise<OceanShipment[]> {
  return withSupabaseFallback(
    "ocean_shipments",
    async () => {
      const { data, error } = await supabase
        .from("ocean_shipments")
        .select(SHIPMENT_COLUMNS)
        .order("id", { ascending: false });
      if (error) throw error;
      return (data as ShipmentRow[]).map(rowToShipment);
    },
    () =>
      simulateRead(() =>
        buildOceanShipments().sort((a, b) => b.id.localeCompare(a.id)),
      ),
  );
}

/* ── Write services ───────────────────────────────────────────────── */

export interface CreateOceanShipmentInput {
  containerNumber: string;
  blNumber: string;
  containerType: ContainerType;
  direction: ShipmentDirection;
  carrier: CarrierName;
  vessel: string;
  voyage: string;
  pol: string;
  pod: string;
  terminal: string;
  trader: string;
  traderContact: string;
  traderEmail: string;
  phase: ShipmentPhase;
  etd: string;
  eta: string;
  freeDaysTotal: number;
  demurrageRatePerDay: number;
  teu: number;
  weightKg: number;
  commodity?: string;
}

/**
 * Insert a new ocean shipment.
 *
 * Live: Supabase INSERT into ocean_shipments — the Realtime channel on
 * `ocean_shipments` fires immediately, pushing the new row into every
 * active `useRealtimeShipments` subscriber without a manual reload.
 *
 * Mock: returns a synthesised OceanShipment so the UI can show a toast
 * confirmation even without a live DB (the list won't auto-update in mock
 * mode since there is no WS subscription to trigger a re-fetch).
 */
export async function createOceanShipment(
  input: CreateOceanShipmentInput,
): Promise<OceanShipment> {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 9000 + 1000));
  const id = `ALT-OF-${year}-${seq}`;

  // Compute absolute free-time expiry from ETA + contractual free days.
  const etaMs = new Date(input.eta).getTime();
  const freeTimeExpiresAt = new Date(
    etaMs + input.freeDaysTotal * 86_400_000,
  ).toISOString();

  const draft: OceanShipment = {
    id,
    blNumber: input.blNumber || `BL${seq}`,
    containerNumber: input.containerNumber,
    containerType: input.containerType,
    direction: input.direction,
    carrier: input.carrier,
    vessel: input.vessel,
    voyage: input.voyage || "—",
    pol: input.pol,
    pod: input.pod,
    terminal: input.terminal || input.pod,
    trader: input.trader,
    traderType: input.direction === "Export" ? "Exporter" : "Importer",
    traderContact: input.traderContact,
    traderEmail: input.traderEmail,
    phase: input.phase,
    etd: input.etd,
    eta: input.eta,
    dischargedAt: null,
    freeDaysTotal: input.freeDaysTotal,
    freeTimeExpiresAt,
    demurrageRatePerDay: input.demurrageRatePerDay,
    customsBlock: null,
    teu: input.teu,
    weightKg: input.weightKg,
    commodity: input.commodity ?? "",
  };

  return withSupabaseFallback(
    "ocean_shipments",
    async () => {
      const row = {
        id,
        bl_number: draft.blNumber,
        container_number: draft.containerNumber,
        container_type: draft.containerType,
        direction: draft.direction,
        carrier: draft.carrier,
        vessel: draft.vessel,
        voyage: draft.voyage,
        pol: draft.pol,
        pod: draft.pod,
        terminal: draft.terminal,
        trader: draft.trader,
        trader_contact: draft.traderContact || null,
        trader_email: draft.traderEmail || null,
        phase: draft.phase,
        etd: draft.etd || null,
        eta: draft.eta,
        free_days_total: draft.freeDaysTotal,
        free_time_expires_at: draft.freeTimeExpiresAt,
        demurrage_rate_per_day: draft.demurrageRatePerDay,
        customs_block: null,
        teu: draft.teu,
        weight_kg: draft.weightKg,
        commodity: draft.commodity || null,
      };
      const { data, error } = await supabase
        .from("ocean_shipments")
        .insert(row)
        .select(SHIPMENT_COLUMNS)
        .single();
      if (error) throw error;
      return rowToShipment(data as ShipmentRow);
    },
    () => Promise.resolve(draft),
  );
}

/** Customer status emails + their AI-drafted replies (mock-only for now). */
export async function getCustomerEmails(): Promise<CustomerEmail[]> {
  return simulateRead(() =>
    buildCustomerEmails().sort(
      (a, b) =>
        new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
    ),
  );
}

export interface CeoSnapshot {
  trend: { day: string; bookings: number; delivered: number }[];
  activeContainers: number;
  onTimePct: number;
  customsHolds: number;
  demurrageExposureEur: number;
  importCount: number;
  exportCount: number;
}

/**
 * Aggregated, high-level metrics for the CEO / Management view. Built on
 * top of `getOceanShipments()`, so it inherits the same dual-mode source.
 */
export async function getCeoSnapshot(): Promise<CeoSnapshot> {
  const ships = await getOceanShipments();
  const active = ships.filter((s) => s.phase !== "Delivered");
  const holds = ships.filter((s) => s.customsBlock !== null);
  const exposure = ships.reduce(
    (sum, s) => sum + getFreeTimeStatus(s).accruedEur,
    0,
  );

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const bookingsSeed = [6, 9, 7, 11, 8, 4, 5];
  const deliveredSeed = [5, 7, 8, 6, 9, 3, 4];
  const trend = days.map((day, i) => ({
    day,
    bookings: bookingsSeed[i],
    delivered: deliveredSeed[i],
  }));

  return {
    trend,
    activeContainers: active.reduce((n, s) => n + s.teu, 0),
    onTimePct: 0.94,
    customsHolds: holds.length,
    demurrageExposureEur: exposure,
    importCount: ships.filter((s) => s.direction === "Import").length,
    exportCount: ships.filter((s) => s.direction === "Export").length,
  };
}
