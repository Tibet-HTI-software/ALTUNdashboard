/**
 * CSV / data export utilities for the Reports view.
 *
 * Generates a well-formed RFC 4180 CSV from audit log records and triggers
 * a browser download via the Blob / object-URL trick. No external library.
 */

import type { AuditLogEntry } from "@/lib/dashboard/api";

// ── CSV generation ─────────────────────────────────────────────────────────────

const AUDIT_HEADERS = [
  "Date (UTC)",
  "User Email",
  "User Role",
  "Action",
  "Container #",
  "Shipment ID",
  "Cost Avoided (EUR)",
  "D&D Risk",
  "Email Recipient",
  "Email Subject",
  "Delivery Status",
  "Resend Message ID",
] as const;

/** Escape a cell value per RFC 4180. */
function csvCell(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? "" : String(value);
  // Wrap in quotes if the cell contains a comma, quote, or newline.
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Converts an array of audit log entries to a CSV string.
 * Rows are ordered newest-first (matches the table query ordering).
 */
export function generateAuditCsv(logs: AuditLogEntry[]): string {
  const header = AUDIT_HEADERS.map(csvCell).join(",");

  const rows = logs.map((l) =>
    [
      l.createdAt,
      l.userEmail,
      l.userRole,
      l.actionType,
      l.containerNumber,
      l.shipmentId,
      l.costAvoidedEur,
      l.demurrageRisk,
      l.emailRecipient,
      l.emailSubject,
      l.deliveryStatus,
      l.resendMessageId,
    ]
      .map(csvCell)
      .join(","),
  );

  return [header, ...rows].join("\r\n");
}

/** Summary totals derived from the audit log for the report header. */
export interface AuditSummary {
  totalActions: number;
  totalSent: number;
  totalFailed: number;
  totalCostAvoidedEur: number;
}

export function computeAuditSummary(logs: AuditLogEntry[]): AuditSummary {
  let totalSent = 0;
  let totalFailed = 0;
  let totalCostAvoidedEur = 0;

  for (const l of logs) {
    if (l.deliveryStatus === "sent") totalSent += 1;
    if (l.deliveryStatus === "failed") totalFailed += 1;
    if (l.costAvoidedEur) totalCostAvoidedEur += l.costAvoidedEur;
  }

  return {
    totalActions: logs.length,
    totalSent,
    totalFailed,
    totalCostAvoidedEur,
  };
}

// ── File download ──────────────────────────────────────────────────────────────

/**
 * Triggers a browser file download with the given content.
 * Uses the Blob/object-URL approach — no server round-trip required.
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType = "text/plain;charset=utf-8",
): void {
  if (typeof document === "undefined") return;

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Small delay before revocation so Firefox can pick up the URL.
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
