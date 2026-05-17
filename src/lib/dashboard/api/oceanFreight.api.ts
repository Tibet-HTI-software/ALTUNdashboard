/**
 * Ocean Freight service — dual-mode mock API.
 *
 * Routes/components import from `@/lib/dashboard/api` and never touch the
 * raw fixtures. The mock fixtures live in `data/dashboard/oceanFreight.ts`;
 * swapping to Supabase later only changes the bodies below.
 */

import { simulateRead } from "./client";
import {
  buildOceanShipments,
  buildCustomerEmails,
  type OceanShipment,
  type CustomerEmail,
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

/* ── Read services ────────────────────────────────────────────────── */

/** All ocean-freight shipments, newest booking first. */
export async function getOceanShipments(): Promise<OceanShipment[]> {
  return simulateRead(() =>
    buildOceanShipments().sort((a, b) => b.id.localeCompare(a.id)),
  );
}

/** Customer status emails + their AI-drafted replies. */
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

/** Aggregated, high-level metrics for the CEO / Management view. */
export async function getCeoSnapshot(): Promise<CeoSnapshot> {
  return simulateRead(() => {
    const ships = buildOceanShipments();
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
  });
}
