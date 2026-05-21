/**
 * Finance API — Supabase-first, mock-fallback.
 *
 * Covers the accounts-receivable (client billing) and accounts-payable
 * (carrier invoices) ledgers. The same `invoices` table stores both types,
 * distinguished by the `type` column.
 *
 * Table: `invoices`
 *   id                    text PK              e.g. "ALT-INV-2026-0441"
 *   shipment_id           text nullable        → references shipments(id)
 *   type                  text                 receivable | payable
 *   amount                numeric
 *   currency              text                 EUR | USD
 *   status                text                 pending | overdue | paid
 *   client_carrier_name   text
 *   description           text
 *   issued_date           date
 *   due_date              date
 *   paid_date             date nullable
 */

import { simulateRead, delay, createApiError } from "./client";
import { supabase, withSupabaseFallback } from "./supabase";

/* ── Types ─────────────────────────────────────────────────────────────── */

export type InvoiceType = "receivable" | "payable";
export type InvoiceCurrency = "EUR" | "USD";
export type InvoiceStatus = "pending" | "overdue" | "paid";

export interface Invoice {
  id: string;
  shipmentId: string | null;
  type: InvoiceType;
  amount: number;
  currency: InvoiceCurrency;
  status: InvoiceStatus;
  /** Customer name (receivable) or carrier name (payable). */
  clientOrCarrierName: string;
  /** One-line description of the billed service. */
  description: string;
  issuedDate: string; // ISO date
  dueDate: string;    // ISO date
  /** Set only when status is "paid". */
  paidDate?: string;  // ISO date
  /**
   * Invoice discrepancy — present when the carrier's amount doesn't match
   * the file budget. The forwarder must review and dispute or approve.
   */
  discrepancy?: {
    /** Amount budgeted in the file (EUR). */
    budgeted: number;
    /** Amount actually invoiced by the carrier (EUR). */
    actual: number;
    /** Short reason for the discrepancy. */
    reason: string;
  };
}

/** Fixed ECB-proxy rate used for KPI aggregation. */
export const USD_TO_EUR = 0.92;

export function toEur(amount: number, currency: InvoiceCurrency): number {
  return currency === "USD" ? Math.round(amount * USD_TO_EUR) : amount;
}

/* ── Mock data ─────────────────────────────────────────────────────────── */

const MOCK_INVOICES: Invoice[] = [
  /* ── Accounts Receivable — client billing ─────────────────────────── */
  {
    id: "ALT-INV-2026-0441",
    shipmentId: "AL-2026-1041",
    type: "receivable",
    amount: 28_450,
    currency: "EUR",
    status: "pending",
    clientOrCarrierName: "Demir Industrial Trading",
    description: "Ocean freight + D&D surcharge — 2× 40'HC Rotterdam",
    issuedDate: "2026-05-01",
    dueDate: "2026-05-29",
  },
  {
    id: "ALT-INV-2026-0442",
    shipmentId: "AL-2026-1038",
    type: "receivable",
    amount: 19_200,
    currency: "EUR",
    status: "pending",
    clientOrCarrierName: "Van der Berg Logistics BV",
    description: "FCL import service + customs coordination fee",
    issuedDate: "2026-05-04",
    dueDate: "2026-06-02",
  },
  {
    id: "ALT-INV-2026-0443",
    shipmentId: "AL-2026-1035",
    type: "receivable",
    amount: 34_600,
    currency: "EUR",
    status: "overdue",
    clientOrCarrierName: "Yıldız Makina A.Ş.",
    description: "Ocean freight + inland delivery + customs clearance",
    issuedDate: "2026-04-12",
    dueDate: "2026-05-09",
  },
  {
    id: "ALT-INV-2026-0444",
    shipmentId: "AL-2026-1039",
    type: "receivable",
    amount: 48_400,
    currency: "USD",
    status: "pending",
    clientOrCarrierName: "Teknopar Industrial",
    description: "CIF Rotterdam — 2× 40'HC CNC machinery, Ambarlı",
    issuedDate: "2026-05-08",
    dueDate: "2026-06-05",
  },
  {
    id: "ALT-INV-2026-0445",
    shipmentId: "AL-2026-1042",
    type: "receivable",
    amount: 22_850,
    currency: "EUR",
    status: "pending",
    clientOrCarrierName: "Anadolu Çelik Endüstrisi",
    description: "FCL import + inspection support + EUR.1 processing",
    issuedDate: "2026-05-10",
    dueDate: "2026-06-08",
  },
  {
    id: "ALT-INV-2026-0446",
    shipmentId: null,
    type: "receivable",
    amount: 31_200,
    currency: "EUR",
    status: "paid",
    clientOrCarrierName: "Demir Industrial Trading",
    description: "Ocean freight — quarterly contract Q1 settlement",
    issuedDate: "2026-04-18",
    dueDate: "2026-05-09",
    paidDate: "2026-05-06",
  },
  {
    id: "ALT-INV-2026-0447",
    shipmentId: "AL-2026-1035",
    type: "receivable",
    amount: 3_840,
    currency: "EUR",
    status: "overdue",
    clientOrCarrierName: "Yıldız Makina A.Ş.",
    description: "Demurrage surcharge — 4 days × €960/day (disputed)",
    issuedDate: "2026-04-14",
    dueDate: "2026-05-07",
  },
  {
    id: "ALT-INV-2026-0448",
    shipmentId: "AL-2026-1041",
    type: "receivable",
    amount: 24_100,
    currency: "EUR",
    status: "paid",
    clientOrCarrierName: "Van der Berg Logistics BV",
    description: "Import handling + storage + delivery coordination",
    issuedDate: "2026-04-24",
    dueDate: "2026-05-16",
    paidDate: "2026-05-13",
  },
  {
    id: "ALT-INV-2026-0449",
    shipmentId: null,
    type: "receivable",
    amount: 16_500,
    currency: "EUR",
    status: "pending",
    clientOrCarrierName: "Ekol Lojistik B.V.",
    description: "Multimodal transport coordination — May batch",
    issuedDate: "2026-05-12",
    dueDate: "2026-06-11",
  },
  {
    id: "ALT-INV-2026-0450",
    shipmentId: null,
    type: "receivable",
    amount: 41_750,
    currency: "EUR",
    status: "paid",
    clientOrCarrierName: "METRO International Trading",
    description: "Full-service import programme — April closing",
    issuedDate: "2026-04-22",
    dueDate: "2026-05-13",
    paidDate: "2026-05-10",
  },

  /* ── Accounts Payable — carrier & port billing ────────────────────── */
  {
    id: "MSC-2026-RTM-4421",
    shipmentId: "AL-2026-1041",
    type: "payable",
    amount: 4_200,
    currency: "EUR",
    status: "pending",
    clientOrCarrierName: "MSC Mediterranean Shipping",
    description: "Demurrage — container MSCU4821033, 4 days × €1,050",
    issuedDate: "2026-05-02",
    dueDate: "2026-05-26",
    discrepancy: {
      budgeted: 3_150,
      actual: 4_200,
      reason: "MSC billed 4 demurrage days; file budget covered 3 days",
    },
  },
  {
    id: "MAEU-INV-2026-1103",
    shipmentId: "AL-2026-1038",
    type: "payable",
    amount: 6_800,
    currency: "EUR",
    status: "paid",
    clientOrCarrierName: "Maersk Line",
    description: "Ocean freight — EVER GIVEN II, Voy. AX2614E",
    issuedDate: "2026-04-15",
    dueDate: "2026-05-11",
    paidDate: "2026-05-08",
  },
  {
    id: "CMDU-INV-2026-0412",
    shipmentId: "AL-2026-1039",
    type: "payable",
    amount: 8_400,
    currency: "USD",
    status: "pending",
    clientOrCarrierName: "CMA CGM",
    description: "FCL freight — Ambarlı → Rotterdam, 2× 40'HC",
    issuedDate: "2026-05-06",
    dueDate: "2026-05-29",
  },
  {
    id: "MSC-2026-RTM-4398",
    shipmentId: "AL-2026-1035",
    type: "payable",
    amount: 3_600,
    currency: "EUR",
    status: "overdue",
    clientOrCarrierName: "MSC Mediterranean Shipping",
    description: "Detention charges — MSCU7710231, 6 days × €600",
    issuedDate: "2026-04-10",
    dueDate: "2026-05-08",
    discrepancy: {
      budgeted: 2_400,
      actual: 3_600,
      reason: "MSC billed 6 detention days; only 4 days agreed in SLA",
    },
  },
  {
    id: "EVER-2026-RTM-0241",
    shipmentId: "AL-2026-1042",
    type: "payable",
    amount: 5_100,
    currency: "EUR",
    status: "pending",
    clientOrCarrierName: "Evergreen Line",
    description: "Ocean freight — Evergreen Ever ACE, Voy. 0241E",
    issuedDate: "2026-05-10",
    dueDate: "2026-06-03",
  },
  {
    id: "HLCU-INV-2026-0821",
    shipmentId: null,
    type: "payable",
    amount: 2_950,
    currency: "EUR",
    status: "paid",
    clientOrCarrierName: "Hapag-Lloyd",
    description: "Documentation fee + B/L amendment charge",
    issuedDate: "2026-04-20",
    dueDate: "2026-05-15",
    paidDate: "2026-05-11",
  },
];

/* ── Supabase row ──────────────────────────────────────────────────────── */

interface InvoiceRow {
  id: string;
  shipment_id: string | null;
  type: string;
  amount: number;
  currency: string;
  status: string;
  client_carrier_name: string;
  description: string;
  issued_date: string;
  due_date: string;
  paid_date: string | null;
}

const INVOICE_COLUMNS =
  "id, shipment_id, type, amount, currency, status, client_carrier_name, description, issued_date, due_date, paid_date";

function rowToInvoice(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    shipmentId: row.shipment_id,
    type: row.type as InvoiceType,
    amount: row.amount,
    currency: row.currency as InvoiceCurrency,
    status: row.status as InvoiceStatus,
    clientOrCarrierName: row.client_carrier_name,
    description: row.description,
    issuedDate: row.issued_date,
    dueDate: row.due_date,
    paidDate: row.paid_date ?? undefined,
  };
}

/* ── API functions ─────────────────────────────────────────────────────── */

/** Fetch all invoices ordered by due date ascending. */
export async function getInvoices(): Promise<Invoice[]> {
  return withSupabaseFallback(
    "getInvoices",
    async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(INVOICE_COLUMNS)
        .order("due_date", { ascending: true });

      if (error) throw error;
      return (data as InvoiceRow[]).map(rowToInvoice);
    },
    () => simulateRead(() => MOCK_INVOICES),
  );
}

/** Mark an invoice as paid, recording today as the payment date. */
export async function markInvoicePaid(id: string): Promise<Invoice> {
  const paidDate = new Date().toISOString().slice(0, 10);

  return withSupabaseFallback(
    "markInvoicePaid",
    async () => {
      const { data, error } = await supabase
        .from("invoices")
        .update({ status: "paid", paid_date: paidDate })
        .eq("id", id)
        .select(INVOICE_COLUMNS)
        .single();

      if (error) throw error;
      return rowToInvoice(data as InvoiceRow);
    },
    async () => {
      await delay(280);
      const inv = MOCK_INVOICES.find((i) => i.id === id);
      if (!inv) throw createApiError(`Invoice ${id} not found`, "not_found");
      return { ...inv, status: "paid" as InvoiceStatus, paidDate };
    },
  );
}
