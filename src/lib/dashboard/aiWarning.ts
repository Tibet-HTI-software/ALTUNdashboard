/**
 * AI Warning Email utilities — shared between ShipmentDetailDrawer
 * and DemurrageRiskBoard so both can generate and send the same
 * structured alert without duplicating business logic.
 *
 * Two exports:
 *  - `generateAiDraft(shipment, ft)` → { subject, body }
 *  - `callSendAiWarning(shipment, ft, jwt, supabaseUrl)` → SendWarningResult
 *  - `SendState` / `SendWarningResult` types
 */

import type { OceanShipment } from "@/data/dashboard/oceanFreight";
import type { FreeTimeStatus } from "@/lib/dashboard/api";

/* ── Types ───────────────────────────────────────────────────────────────── */

export type SendState =
  | { status: "idle" }
  | { status: "approving" }
  | { status: "sent"; messageId?: string }
  | { status: "failed"; error: string };

export interface SendWarningResult {
  ok: boolean;
  messageId?: string;
  sentBy?: string;
  error?: string;
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const eur = (n: number) =>
  n.toLocaleString("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });

/* ── Draft generator ─────────────────────────────────────────────────────── */

/**
 * Generates the AI email subject + body for a given shipment context.
 * Matches the exact draft format used in ShipmentDetailDrawer so both
 * send paths produce identical output.
 */
export function generateAiDraft(
  shipment: OceanShipment,
  ft: FreeTimeStatus,
): { subject: string; body: string } {
  const expiry = new Date(shipment.freeTimeExpiresAt).toLocaleDateString(
    "en-GB",
    { day: "numeric", month: "short", year: "numeric" },
  );

  if (shipment.customsBlock) {
    return {
      subject: `URGENT: Customs Hold — ${shipment.containerNumber} / ${shipment.pol} → ${shipment.pod}`,
      body: `Dear ${shipment.traderContact || "Sir/Madam"},

We are writing to urgently notify you that container ${shipment.containerNumber} (${shipment.vessel}, Voyage ${shipment.voyage}) is currently subject to a customs hold at ${shipment.terminal}.

Reason: ${shipment.customsBlock}

To proceed with customs clearance, please provide the required documentation immediately. Each day of delay may incur additional demurrage charges at a rate of ${eur(shipment.demurrageRatePerDay)}/day against the free time expiry of ${expiry}.

Please contact our operations team as soon as possible to resolve this matter.

Best regards,
Altun Logistics Operations`,
    };
  }

  return {
    subject: `URGENT: Demurrage Risk Alert — ${shipment.containerNumber} (${ft.label})`,
    body: `Dear ${shipment.traderContact || "Sir/Madam"},

This is an urgent notification regarding container ${shipment.containerNumber} at ${shipment.terminal} (${shipment.pol} → ${shipment.pod}).

Current Status: ${ft.label}
Free time expires: ${expiry}${ft.risk === "demurrage" ? `\nAccrued demurrage: ${eur(ft.accruedEur)}` : ""}
Daily demurrage rate: ${eur(shipment.demurrageRatePerDay)}/day

Immediate container collection or documentation submission is required to minimise detention and demurrage liability. Please coordinate with our operations team at your earliest convenience.

Best regards,
Altun Logistics Operations`,
  };
}

/* ── Edge-function caller ────────────────────────────────────────────────── */

/**
 * POSTs the drafted warning to the `send-ai-warning` Supabase edge function.
 * Never throws — all errors are returned in the `SendWarningResult` shape.
 */
export async function callSendAiWarning(
  shipment: OceanShipment,
  ft: FreeTimeStatus,
  jwt: string,
  supabaseUrl: string,
): Promise<SendWarningResult> {
  const draft = generateAiDraft(shipment, ft);
  try {
    const res = await fetch(
      `${supabaseUrl}/functions/v1/send-ai-warning`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          to:
            shipment.traderEmail ||
            shipment.traderContact ||
            "ops@altunlogistics.com",
          subject: draft.subject,
          body: draft.body,
          shipmentId: shipment.id,
          aiDraftSnapshot: draft.body,
          containerNumber: shipment.containerNumber,
          costAvoidedEur: ft.accruedEur > 0 ? ft.accruedEur : undefined,
          demurrageRisk: ft.risk,
        }),
      },
    );
    return (await res.json()) as SendWarningResult;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unexpected error.",
    };
  }
}
