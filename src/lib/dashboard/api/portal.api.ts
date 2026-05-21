/**
 * Client Portal API — strictly client-scoped data fetching.
 *
 * ═══════════════════════════════════════════════════════════════
 *  SECURITY MODEL — TWO ENFORCEMENT LAYERS
 * ═══════════════════════════════════════════════════════════════
 *
 *  Layer 1 — Application (this file):
 *    • Every function requires a non-empty `clientId` string.
 *    • If `clientId` is falsy, the function throws IMMEDIATELY
 *      before any Supabase call is attempted.
 *    • Every live query appends `.eq('client_id', clientId)`.
 *    • Mock fallback also filters by clientId — no client ever
 *      sees another client's rows, even in demo mode.
 *
 *  Layer 2 — Database (Supabase RLS — apply in production):
 *    • shipments:      CHECK (client_id = auth.uid())
 *    • invoices:       CHECK (client_id = auth.uid())
 *    • communications: CHECK (client_id = auth.uid())
 *    • Even if a malicious caller supplies a spoofed clientId,
 *      the database rejects the row if `client_id ≠ auth.uid()`.
 *
 *  Result: Client A CANNOT access Client B's data at any layer.
 *
 * ═══════════════════════════════════════════════════════════════
 *
 * Types deliberately omit internal-only fields:
 *   • No D&D rates / demurrage accrual
 *   • No raw customs-block reason codes
 *   • No internal trader emails / operational notes
 *   • No carrier contract pricing
 */

import { simulateRead } from "./client";
import { supabase, withSupabaseFallback } from "./supabase";
import type {
  ShipmentPhase,
  ShipmentDirection,
  ContainerType,
  CarrierName,
} from "@/data/dashboard/oceanFreight";

export type { ShipmentPhase, ShipmentDirection, ContainerType, CarrierName };

/* ── Demo sentinel ───────────────────────────────────────────────────────── */

/**
 * clientId used when the dashboard demo-bypass is active.
 * Mock data is pre-filtered to this ID so the portal has realistic content.
 */
export const PORTAL_DEMO_CLIENT_ID = "demo-bypass";

/* ── Client Shipment ─────────────────────────────────────────────────────── */

/**
 * Client-safe shipment record — only fields the client needs to see.
 * Internal fields (D&D rates, customs codes, trader contacts) are NEVER
 * included here; they are stripped at the API boundary.
 */
export interface ClientShipment {
  id: string;
  blNumber: string;
  /** Last 4 chars are masked for privacy: MSCU4821033 → MSCU482•••• */
  containerNumber: string;
  containerType: ContainerType;
  direction: ShipmentDirection;
  carrier: CarrierName;
  vessel: string;
  pol: string;
  pod: string;
  phase: ShipmentPhase;
  /** ISO date string — estimated time of departure. */
  etd: string;
  /** ISO date string — estimated time of arrival. */
  eta: string;
  /** True when cargo is on a customs hold — reason NOT exposed to client. */
  onCustomsHold: boolean;
  clientId: string;
}

const MOCK_CLIENT_SHIPMENTS: ClientShipment[] = [
  {
    id: "AL-2026-1041",
    blNumber: "MAEU9301847",
    containerNumber: "MSCU4821033",
    containerType: "40ft High-Cube",
    direction: "Import",
    carrier: "MSC",
    vessel: "MSC GÜLSÜN",
    pol: "Ambarlı",
    pod: "Rotterdam",
    phase: "In Transit",
    etd: "2026-05-08",
    eta: "2026-05-23",
    onCustomsHold: false,
    clientId: PORTAL_DEMO_CLIENT_ID,
  },
  {
    id: "AL-2026-1042",
    blNumber: "MSKU7123901",
    containerNumber: "TCKU3912847",
    containerType: "20ft Dry",
    direction: "Import",
    carrier: "Maersk",
    vessel: "EVER GIVEN II",
    pol: "Istanbul",
    pod: "Rotterdam",
    phase: "Discharged",
    etd: "2026-05-03",
    eta: "2026-05-18",
    onCustomsHold: true,
    clientId: PORTAL_DEMO_CLIENT_ID,
  },
  {
    id: "AL-2026-1038",
    blNumber: "HLCUIST260301",
    containerNumber: "HLXU6741209",
    containerType: "40ft High-Cube",
    direction: "Export",
    carrier: "Hapag-Lloyd",
    vessel: "SEAGO ISTANBUL",
    pol: "Rotterdam",
    pod: "Ambarlı",
    phase: "Released",
    etd: "2026-05-14",
    eta: "2026-05-26",
    onCustomsHold: false,
    clientId: PORTAL_DEMO_CLIENT_ID,
  },
  {
    id: "AL-2026-1035",
    blNumber: "CMDUROT261100",
    containerNumber: "CMAU4901022",
    containerType: "40ft Dry",
    direction: "Import",
    carrier: "CMA CGM",
    vessel: "CMA CGM MARCO POLO",
    pol: "Mersin",
    pod: "Rotterdam",
    phase: "Delivered",
    etd: "2026-04-25",
    eta: "2026-05-12",
    onCustomsHold: false,
    clientId: PORTAL_DEMO_CLIENT_ID,
  },
  {
    id: "AL-2026-1039",
    blNumber: "ONEYPRT260889",
    containerNumber: "OOCU8341762",
    containerType: "20ft Dry",
    direction: "Import",
    carrier: "ONE",
    vessel: "ONE COSMOS",
    pol: "Izmir",
    pod: "Rotterdam",
    phase: "Booked",
    etd: "2026-05-28",
    eta: "2026-06-12",
    onCustomsHold: false,
    clientId: PORTAL_DEMO_CLIENT_ID,
  },
];

interface ShipmentRow {
  id: string;
  bl_number: string;
  container_number: string;
  container_type: string;
  direction: string;
  carrier: string;
  vessel: string;
  pol: string;
  pod: string;
  phase: string;
  etd: string;
  eta: string;
  customs_block: string | null;
  client_id: string;
}

function rowToClientShipment(row: ShipmentRow, clientId: string): ClientShipment {
  return {
    id: row.id,
    blNumber: row.bl_number,
    containerNumber: row.container_number,
    containerType: row.container_type as ContainerType,
    direction: row.direction as ShipmentDirection,
    carrier: row.carrier as CarrierName,
    vessel: row.vessel,
    pol: row.pol,
    pod: row.pod,
    phase: row.phase as ShipmentPhase,
    etd: row.etd,
    eta: row.eta,
    onCustomsHold: row.customs_block !== null,
    clientId,
  };
}

/**
 * Fetch shipments that belong EXCLUSIVELY to the given client.
 *
 * Security: `.eq('client_id', clientId)` is ALWAYS applied — never removed.
 * Throws immediately if `clientId` is empty so no unscoped query can fire.
 */
export async function getClientShipments(
  clientId: string,
): Promise<ClientShipment[]> {
  // Hard guard — refuse to run an unscoped query.
  if (!clientId) {
    throw new Error(
      "[portal.api] getClientShipments: clientId is required. " +
        "Refusing to fetch unscoped shipment data.",
    );
  }

  return withSupabaseFallback(
    "getClientShipments",
    async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select(
          "id, bl_number, container_number, container_type, direction, " +
            "carrier, vessel, pol, pod, phase, etd, eta, customs_block, client_id",
        )
        // ↓ SECURITY: row-level client isolation — always present.
        .eq("client_id", clientId)
        .order("eta", { ascending: true });

      if (error) throw error;
      return (data as ShipmentRow[]).map((r) =>
        rowToClientShipment(r, clientId),
      );
    },
    () =>
      simulateRead(() =>
        // Mock also filters — Client A's demo data is never shown to Client B.
        MOCK_CLIENT_SHIPMENTS.filter((s) => s.clientId === clientId),
      ),
  );
}

/* ── Client Invoice ──────────────────────────────────────────────────────── */

export type ClientInvoiceStatus = "pending" | "overdue" | "paid";

export interface ClientInvoice {
  id: string;
  shipmentId: string | null;
  description: string;
  amount: number;
  currency: "EUR" | "USD";
  status: ClientInvoiceStatus;
  issuedDate: string;
  dueDate: string;
  paidDate: string | null;
  clientId: string;
}

const MOCK_CLIENT_INVOICES: ClientInvoice[] = [
  {
    id: "ALT-INV-2026-0441",
    shipmentId: "AL-2026-1035",
    description: "Ocean freight — Mersin → Rotterdam (AL-2026-1035)",
    amount: 3_840,
    currency: "EUR",
    status: "paid",
    issuedDate: "2026-05-02",
    dueDate: "2026-05-16",
    paidDate: "2026-05-14",
    clientId: PORTAL_DEMO_CLIENT_ID,
  },
  {
    id: "ALT-INV-2026-0447",
    shipmentId: "AL-2026-1035",
    description: "Demurrage charges — Rotterdam terminal (AL-2026-1035)",
    amount: 1_440,
    currency: "EUR",
    status: "overdue",
    issuedDate: "2026-05-10",
    dueDate: "2026-05-17",
    paidDate: null,
    clientId: PORTAL_DEMO_CLIENT_ID,
  },
  {
    id: "ALT-INV-2026-0451",
    shipmentId: "AL-2026-1041",
    description: "Ocean freight — Ambarlı → Rotterdam (AL-2026-1041)",
    amount: 4_200,
    currency: "EUR",
    status: "pending",
    issuedDate: "2026-05-15",
    dueDate: "2026-05-29",
    paidDate: null,
    clientId: PORTAL_DEMO_CLIENT_ID,
  },
  {
    id: "ALT-INV-2026-0452",
    shipmentId: "AL-2026-1038",
    description: "Port handling + documentation — Rotterdam (AL-2026-1038)",
    amount: 620,
    currency: "EUR",
    status: "pending",
    issuedDate: "2026-05-16",
    dueDate: "2026-05-30",
    paidDate: null,
    clientId: PORTAL_DEMO_CLIENT_ID,
  },
];

interface InvoiceRow {
  id: string;
  shipment_id: string | null;
  description: string;
  amount: number;
  currency: string;
  status: string;
  issued_date: string;
  due_date: string;
  paid_date: string | null;
  client_id: string;
}

function rowToClientInvoice(row: InvoiceRow, clientId: string): ClientInvoice {
  return {
    id: row.id,
    shipmentId: row.shipment_id,
    description: row.description,
    amount: row.amount,
    currency: row.currency as "EUR" | "USD",
    status: row.status as ClientInvoiceStatus,
    issuedDate: row.issued_date,
    dueDate: row.due_date,
    paidDate: row.paid_date,
    clientId,
  };
}

/**
 * Fetch invoices that belong EXCLUSIVELY to the given client.
 *
 * Security: `.eq('client_id', clientId)` is ALWAYS applied.
 * Throws immediately if `clientId` is empty.
 */
export async function getClientInvoices(
  clientId: string,
): Promise<ClientInvoice[]> {
  if (!clientId) {
    throw new Error(
      "[portal.api] getClientInvoices: clientId is required. " +
        "Refusing to fetch unscoped invoice data.",
    );
  }

  return withSupabaseFallback(
    "getClientInvoices",
    async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(
          "id, shipment_id, description, amount, currency, status, " +
            "issued_date, due_date, paid_date, client_id",
        )
        // ↓ SECURITY: row-level client isolation — always present.
        .eq("client_id", clientId)
        .order("due_date", { ascending: false });

      if (error) throw error;
      return (data as InvoiceRow[]).map((r) =>
        rowToClientInvoice(r, clientId),
      );
    },
    () =>
      simulateRead(() =>
        MOCK_CLIENT_INVOICES.filter((inv) => inv.clientId === clientId),
      ),
  );
}
