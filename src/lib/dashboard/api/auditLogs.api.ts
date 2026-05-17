/**
 * Audit Logs service — Supabase-first, empty-fallback.
 *
 * Reads from public.audit_logs (migration 0006). Mock mode returns an empty
 * array — no fixture data exists for audit records since they're generated
 * exclusively by real user actions via the send-ai-warning edge function.
 *
 * RLS: authenticated users can SELECT all rows; anon role has no grant.
 * The drawer calls this only when Supabase is configured and a session exists.
 */

import { simulateRead } from "./client";
import { supabase, withSupabaseFallback } from "./supabase";

// ── Public types ──────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  createdAt: string;         // ISO timestamptz
  userEmail: string;
  userRole: string;
  actionType: string;        // 'AI_EMAIL_APPROVED' | 'AI_EMAIL_SEND_FAILED' | …
  shipmentId: string | null;
  containerNumber: string | null;
  costAvoidedEur: number | null;
  demurrageRisk: string | null;
  emailRecipient: string | null;
  emailSubject: string | null;
  deliveryStatus: string;    // 'pending' | 'sent' | 'failed'
  resendMessageId: string | null;
}

// ── DB row shape (snake_case from PostgREST) ──────────────────────────────────

interface AuditLogRow {
  id: string;
  created_at: string;
  user_email: string;
  user_role: string;
  action_type: string;
  shipment_id: string | null;
  container_number: string | null;
  cost_avoided_eur: number | null;
  demurrage_risk: string | null;
  email_recipient: string | null;
  email_subject: string | null;
  delivery_status: string;
  resend_message_id: string | null;
}

const AUDIT_COLUMNS = `
  id, created_at, user_email, user_role, action_type,
  shipment_id, container_number, cost_avoided_eur, demurrage_risk,
  email_recipient, email_subject, delivery_status, resend_message_id
`;

function rowToEntry(row: AuditLogRow): AuditLogEntry {
  return {
    id: row.id,
    createdAt: row.created_at,
    userEmail: row.user_email,
    userRole: row.user_role,
    actionType: row.action_type,
    shipmentId: row.shipment_id,
    containerNumber: row.container_number,
    costAvoidedEur: row.cost_avoided_eur,
    demurrageRisk: row.demurrage_risk,
    emailRecipient: row.email_recipient,
    emailSubject: row.email_subject,
    deliveryStatus: row.delivery_status,
    resendMessageId: row.resend_message_id,
  };
}

// ── Service ───────────────────────────────────────────────────────────────────

/**
 * Fetches audit log entries for a specific shipment, ordered newest-first.
 * Filters by shipment_id OR container_number so records written before the
 * container_number was denormalised are still surfaced.
 *
 * Returns an empty array in mock/unconfigured mode or when both IDs are null.
 */
export async function getAuditLogsByShipment(
  shipmentId: string | null,
  containerNumber: string | null,
): Promise<AuditLogEntry[]> {
  if (!shipmentId && !containerNumber) return [];

  return withSupabaseFallback(
    "audit_logs",
    async () => {
      let query = supabase
        .from("audit_logs")
        .select(AUDIT_COLUMNS)
        .order("created_at", { ascending: false })
        .limit(50);

      if (shipmentId && containerNumber) {
        // Match either field — covers rows created before de-normalisation
        query = query.or(
          `shipment_id.eq.${shipmentId},container_number.eq.${containerNumber}`,
        );
      } else if (shipmentId) {
        query = query.eq("shipment_id", shipmentId);
      } else {
        query = query.eq("container_number", containerNumber);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as AuditLogRow[]).map(rowToEntry);
    },
    // Mock mode: audit records only exist from real user actions — return empty.
    () => simulateRead(() => [] as AuditLogEntry[], 0),
  );
}
