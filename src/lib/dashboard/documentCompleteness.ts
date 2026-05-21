/**
 * Document Completeness Engine
 *
 * Evaluates which standard ocean-freight documents are present, at-risk,
 * or missing for a given OceanShipment based on:
 *  1. The shipment phase (Released/Delivered → all clear).
 *  2. The `customsBlock` reason, which maps directly to a specific document.
 *
 * Exported from `@/lib/dashboard/documentCompleteness` — imported by the
 * Document Completeness automation page and any future scoring consumers.
 */

import type {
  OceanShipment,
  CustomsBlockReason,
} from "@/data/dashboard/oceanFreight";

/* ── Types ───────────────────────────────────────────────────────────────── */

export type DocCheckStatus = "present" | "at_risk" | "missing";

export interface RequiredDoc {
  name: string;
  /** Short display code (e.g. "B/L") */
  code: string;
  status: DocCheckStatus;
}

export interface CompletenessResult {
  /**
   * 0–100 score.
   * present docs count 1.0 each, at_risk docs count 0.5 each, missing = 0.
   */
  score: number;
  total: number;
  docs: RequiredDoc[];
  missing: RequiredDoc[];
  atRisk: RequiredDoc[];
  present: RequiredDoc[];
  /** true when score === 100 (no missing, no at_risk) */
  complete: boolean;
}

/* ── Required document catalogue ─────────────────────────────────────────── */

/** Standard required document set for ocean freight clearance. */
const REQUIRED_DOCS: Omit<RequiredDoc, "status">[] = [
  { name: "Bill of Lading", code: "B/L" },
  { name: "Commercial Invoice", code: "CI" },
  { name: "Packing List", code: "PL" },
  { name: "Customs Declaration", code: "CD" },
  { name: "Certificate of Origin", code: "CO" },
];

/**
 * Maps each `CustomsBlockReason` to the document it implicates.
 *
 * `at_risk`  — document is present but has a discrepancy / hold.
 * `missing`  — document has not been submitted.
 */
const BLOCK_TO_DOC: Partial<
  Record<CustomsBlockReason, { code: string; status: DocCheckStatus }>
> = {
  "Missing Commercial Invoice":       { code: "CI",  status: "missing"  },
  "Incomplete Bill of Lading":        { code: "B/L", status: "at_risk"  },
  "Packing List Discrepancy":         { code: "PL",  status: "at_risk"  },
  "Certificate of Origin Hold":       { code: "CO",  status: "at_risk"  },
  "Pending Duty Payment":             { code: "CD",  status: "at_risk"  },
  "Phytosanitary Certificate Missing":{ code: "CO",  status: "missing"  },
};

/* ── Core function ───────────────────────────────────────────────────────── */

/**
 * Evaluates document completeness for a single ocean shipment.
 *
 * Released / Delivered → all documents marked `present` (score 100).
 * Otherwise, the `customsBlock` reason is used to flag the relevant doc.
 * All other required docs are assumed `present` (submitted but not blocked).
 */
export function evaluateDocumentCompleteness(
  shipment: OceanShipment,
): CompletenessResult {
  const { phase, customsBlock } = shipment;

  /* Terminal phases — all docs cleared. */
  if (phase === "Released" || phase === "Delivered") {
    const docs = REQUIRED_DOCS.map<RequiredDoc>((d) => ({
      ...d,
      status: "present",
    }));
    return {
      score: 100,
      total: docs.length,
      docs,
      missing: [],
      atRisk: [],
      present: docs,
      complete: true,
    };
  }

  /* Build per-doc status from block reason. */
  const overrides: Record<string, DocCheckStatus> = {};
  if (customsBlock && BLOCK_TO_DOC[customsBlock]) {
    const { code, status } = BLOCK_TO_DOC[customsBlock]!;
    overrides[code] = status;
  }

  const docs = REQUIRED_DOCS.map<RequiredDoc>((d) => ({
    ...d,
    status: overrides[d.code] ?? "present",
  }));

  const missing = docs.filter((d) => d.status === "missing");
  const atRisk  = docs.filter((d) => d.status === "at_risk");
  const present = docs.filter((d) => d.status === "present");

  const rawScore =
    (present.length + atRisk.length * 0.5) / docs.length;
  const score = Math.round(rawScore * 100);

  return {
    score,
    total: docs.length,
    docs,
    missing,
    atRisk,
    present,
    complete: missing.length === 0 && atRisk.length === 0,
  };
}

/* ── Aggregate helper ────────────────────────────────────────────────────── */

export interface AggregateSummary {
  complete: number;
  atRisk: number;
  incomplete: number;
  totalShipments: number;
  /** Shipments that have at least one missing or at-risk doc (non-terminal). */
  exceptions: OceanShipment[];
}

export function aggregateCompleteness(
  shipments: OceanShipment[],
): AggregateSummary {
  const active = shipments.filter((s) => s.phase !== "Delivered");
  let complete = 0;
  let atRisk = 0;
  let incomplete = 0;
  const exceptions: OceanShipment[] = [];

  for (const s of active) {
    const r = evaluateDocumentCompleteness(s);
    if (r.complete) {
      complete++;
    } else if (r.missing.length > 0) {
      incomplete++;
      exceptions.push(s);
    } else {
      atRisk++;
      exceptions.push(s);
    }
  }

  return { complete, atRisk, incomplete, totalShipments: active.length, exceptions };
}
