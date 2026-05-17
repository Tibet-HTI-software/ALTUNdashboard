/**
 * ingest-terminal-data
 *
 * Enterprise-grade webhook receiver for live container status payloads
 * from port community platforms such as:
 *   • Portbase Rotterdam (PortBase Connect / HCN2 REST feed)
 *   • NxtPort Antwerp (Container Milestone API)
 *
 * ── Endpoint ──────────────────────────────────────────────────────────────────
 *   POST /functions/v1/ingest-terminal-data
 *   Authorization: Bearer <INGEST_API_KEY>   (pre-shared secret, not JWT)
 *
 * ── Payload schema (normalised union) ────────────────────────────────────────
 *   {
 *     "source":           "portbase" | "nxtport" | "generic",
 *     "events": [
 *       {
 *         "referenceNumber":  string,       // terminal / booking reference
 *         "containerNumber":  string,       // ISO 6346 (e.g. "MSCU1234567")
 *         "blNumber":         string,       // Bill of Lading number
 *         "vessel":           string,       // vessel name
 *         "voyage":           string,       // voyage number
 *         "pol":              string,       // UN/LOCODE port of loading
 *         "pod":              string,       // UN/LOCODE port of discharge
 *         "carrier":          string,       // carrier SCAC or full name
 *         "terminal":         string,       // terminal name
 *         "phase":            string,       // see PHASE_MAP below
 *         "etd":              string?,      // ISO 8601 date
 *         "eta":              string?,      // ISO 8601 date
 *         "dischargedAt":     string?,      // ISO 8601 datetime
 *         "customsStatus":    "CLEARED" | "HOLD" | "PENDING" | null,
 *         "customsHoldReason": string?,     // free-text from terminal system
 *         "containerType":    string?,      // e.g. "40ft Dry"
 *         "weightKg":         number?,
 *         "teu":              number?,
 *         "commodity":        string?,
 *         "direction":        "Import" | "Export",
 *         "trader":           string?,      // consignee / shipper name
 *         "traderEmail":      string?,
 *         "freeDaysTotal":    number?,
 *         "freeTimeExpiresAt": string?,     // ISO 8601 datetime
 *         "demurrageRatePerDay": number?
 *       }
 *     ]
 *   }
 *
 * ── Upsert target ─────────────────────────────────────────────────────────────
 *   public.ocean_shipments — keyed on `id` (our booking reference derived
 *   from `referenceNumber`). Unknown fields are ignored.
 *
 * ── Security ──────────────────────────────────────────────────────────────────
 *   Requests must supply the `INGEST_API_KEY` environment variable as a
 *   Bearer token. Use a long random secret (≥ 32 chars). Store it in:
 *     supabase secrets set INGEST_API_KEY=<secret>
 *
 * ── Error handling ────────────────────────────────────────────────────────────
 *   Individual event parse failures are logged + skipped; the batch continues.
 *   Returns a detailed JSON result: { accepted, rejected, errors[] }.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Types ──────────────────────────────────────────────────────────────────────

type EventSource = "portbase" | "nxtport" | "generic";

interface RawTerminalEvent {
  referenceNumber: string;
  containerNumber: string;
  blNumber: string;
  vessel: string;
  voyage: string;
  pol: string;
  pod: string;
  carrier?: string;
  terminal?: string;
  phase?: string;
  etd?: string;
  eta?: string;
  dischargedAt?: string;
  customsStatus?: "CLEARED" | "HOLD" | "PENDING" | null;
  customsHoldReason?: string;
  containerType?: string;
  weightKg?: number;
  teu?: number;
  commodity?: string;
  direction?: "Import" | "Export";
  trader?: string;
  traderEmail?: string;
  freeDaysTotal?: number;
  freeTimeExpiresAt?: string;
  demurrageRatePerDay?: number;
}

interface IngestPayload {
  source: EventSource;
  events: RawTerminalEvent[];
}

interface EventError {
  index: number;
  referenceNumber?: string;
  reason: string;
}

interface IngestResult {
  accepted: number;
  rejected: number;
  errors: EventError[];
}

// ── Phase mapping ──────────────────────────────────────────────────────────────
// Maps raw terminal status strings to our internal shipment_phase enum values.

const PHASE_MAP: Record<string, string> = {
  // Portbase / generic
  BOOKED: "Booked",
  PLANNED: "Booked",
  "IN TRANSIT": "In Transit",
  SAILING: "In Transit",
  ARRIVED: "Discharged",
  DISCHARGED: "Discharged",
  "AT TERMINAL": "Discharged",
  "CUSTOMS HOLD": "Customs Hold",
  HOLD: "Customs Hold",
  RELEASED: "Released",
  "CUSTOMS RELEASED": "Released",
  DELIVERED: "Delivered",
  "GATE OUT": "Delivered",
  // NxtPort
  ARRIVAL_IN_PORT: "Discharged",
  VESSEL_DEPARTED: "In Transit",
  CONTAINER_DISCHARGED: "Discharged",
  CUSTOMS_RELEASED: "Released",
  TERMINAL_DEPARTURE: "Delivered",
};

function mapPhase(raw: string | undefined): string {
  if (!raw) return "In Transit";
  return PHASE_MAP[raw.toUpperCase()] ?? "In Transit";
}

// ── Customs block mapping ──────────────────────────────────────────────────────

function mapCustomsBlock(
  status: RawTerminalEvent["customsStatus"],
  reason?: string,
): string | null {
  if (status !== "HOLD") return null;
  // Map free-text reasons to our known enum values where possible.
  if (!reason) return "Incomplete Bill of Lading"; // default fallback
  const r = reason.toLowerCase();
  if (r.includes("invoice")) return "Missing Commercial Invoice";
  if (r.includes("packing") || r.includes("list")) return "Packing List Discrepancy";
  if (r.includes("origin") || r.includes("certificate")) return "Certificate of Origin Hold";
  if (r.includes("duty") || r.includes("payment")) return "Pending Duty Payment";
  if (r.includes("phyto") || r.includes("sanitary")) return "Phytosanitary Certificate Missing";
  return "Incomplete Bill of Lading";
}

// ── Row builder ────────────────────────────────────────────────────────────────

function buildRow(
  ev: RawTerminalEvent,
  source: EventSource,
): Record<string, unknown> {
  // Derive a stable internal ID from the reference number.
  const id = `${source.toUpperCase().slice(0, 3)}-${ev.referenceNumber}`;

  return {
    id,
    bl_number: ev.blNumber,
    container_number: ev.containerNumber,
    container_type: ev.containerType ?? "40ft Dry",
    direction: ev.direction ?? "Import",
    carrier: ev.carrier ?? "Unknown",
    vessel: ev.vessel,
    voyage: ev.voyage,
    pol: ev.pol,
    pod: ev.pod,
    terminal: ev.terminal ?? ev.pod,
    trader: ev.trader ?? "Unknown",
    trader_email: ev.traderEmail ?? null,
    phase: mapPhase(ev.phase),
    etd: ev.etd ?? null,
    eta: ev.eta ?? null,
    discharged_at: ev.dischargedAt ?? null,
    free_days_total: ev.freeDaysTotal ?? 5,
    free_time_expires_at: ev.freeTimeExpiresAt ?? null,
    demurrage_rate_per_day: ev.demurrageRatePerDay ?? 0,
    customs_block: mapCustomsBlock(ev.customsStatus, ev.customsHoldReason),
    teu: ev.teu ?? 1,
    weight_kg: ev.weightKg ?? 0,
    commodity: ev.commodity ?? null,
    updated_at: new Date().toISOString(),
  };
}

// ── Validation ─────────────────────────────────────────────────────────────────

function validateEvent(ev: unknown, index: number): RawTerminalEvent {
  if (typeof ev !== "object" || ev === null) {
    throw new Error(`Event ${index}: not an object`);
  }
  const e = ev as Record<string, unknown>;
  const required: (keyof RawTerminalEvent)[] = [
    "referenceNumber",
    "containerNumber",
    "blNumber",
    "vessel",
    "voyage",
    "pol",
    "pod",
  ];
  for (const field of required) {
    if (typeof e[field] !== "string" || !(e[field] as string).trim()) {
      throw new Error(`Event ${index}: missing required field "${field}"`);
    }
  }
  return e as unknown as RawTerminalEvent;
}

// ── Handler ────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  // ── CORS pre-flight ─────────────────────────────────────────────────────────
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── Auth — shared-secret Bearer token ──────────────────────────────────────
  const apiKey = Deno.env.get("INGEST_API_KEY") ?? "";
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!apiKey || token !== apiKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: IngestPayload;
  try {
    body = (await req.json()) as IngestPayload;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!Array.isArray(body.events) || body.events.length === 0) {
    return new Response(
      JSON.stringify({ error: "Payload must contain a non-empty 'events' array" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // ── Supabase client (service role — bypasses RLS for ingestion) ────────────
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  // ── Process events ─────────────────────────────────────────────────────────
  const result: IngestResult = { accepted: 0, rejected: 0, errors: [] };
  const rows: Record<string, unknown>[] = [];

  for (let i = 0; i < body.events.length; i++) {
    try {
      const ev = validateEvent(body.events[i], i);
      rows.push(buildRow(ev, body.source ?? "generic"));
    } catch (err) {
      result.rejected += 1;
      result.errors.push({
        index: i,
        referenceNumber: (body.events[i] as Record<string, unknown>)
          ?.referenceNumber as string | undefined,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ── Upsert valid rows ──────────────────────────────────────────────────────
  if (rows.length > 0) {
    const { error } = await supabase
      .from("ocean_shipments")
      .upsert(rows, {
        onConflict: "id",          // update matching booking references
        ignoreDuplicates: false,   // always overwrite — latest terminal data wins
      });

    if (error) {
      console.error("[ingest-terminal-data] upsert error:", error);
      return new Response(
        JSON.stringify({
          error: "Database upsert failed",
          detail: error.message,
          partialResult: result,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    result.accepted = rows.length;
    console.info(
      `[ingest-terminal-data] accepted=${result.accepted} rejected=${result.rejected} ` +
        `source=${body.source}`,
    );
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
