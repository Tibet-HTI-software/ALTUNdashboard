// ============================================================
// Supabase Edge Function — send-ai-warning
//
// Sends an AI-drafted demurrage / shipment warning email via Resend,
// then writes an immutable audit log entry to public.audit_logs.
//
// Runtime: Deno (Supabase Edge Functions). Deploy with:
//   supabase functions deploy send-ai-warning
//
// Required secrets (supabase secrets set KEY=value):
//   RESEND_API_KEY     — Resend API key
//   FROM_EMAIL         — verified sender, e.g. ops@altun-logistics.com
//
// Auto-injected by the runtime (no need to set manually):
//   SUPABASE_URL
//   SUPABASE_ANON_KEY
//
// Auth: caller must pass a valid Supabase JWT (Authorization: Bearer <token>).
// The same JWT is used for the audit_logs insert — RLS ensures users can only
// log actions attributed to themselves (user_id = auth.uid()).
// ============================================================

// @ts-nocheck — Deno runtime; type-checked by the Supabase CLI, not Vite.
import { Resend } from "npm:resend@4";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Payload shape sent by the frontend ────────────────────────────────────

interface SendWarningPayload {
  /** Recipient email address */
  to: string;
  /** Email subject line */
  subject: string;
  /** Plain-text body (AI draft, possibly edited by user) */
  body: string;
  /** Linked ocean shipment ID */
  shipmentId: string;
  /** Optional — container number for the audit record */
  containerNumber?: string;
  /** Optional — cost saving in EUR for the audit record */
  costAvoidedEur?: number;
  /** Demurrage risk level for the audit record */
  demurrageRisk?: "critical" | "warning" | "none";
  /** The original AI draft (before any user edits) — stored verbatim in audit */
  aiDraftSnapshot: string;
}

// ── Response shape returned to the frontend ───────────────────────────────

interface SendWarningResult {
  ok: boolean;
  messageId?: string;
  sentBy?: string;
  error?: string;
}

// ── Helper ────────────────────────────────────────────────────────────────

function json(status: number, payload: SendWarningResult): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// ── Entry point ───────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json(405, { ok: false, error: "Method not allowed — use POST." });
  }

  // ── 1. Verify caller JWT ─────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json(401, { ok: false, error: "Missing Authorization header." });
  }

  // Create a client scoped to the caller's JWT — RLS will run as this user.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return json(401, { ok: false, error: "Invalid or expired session." });
  }

  // ── 2. Parse + validate payload ──────────────────────────────────────────
  let payload: SendWarningPayload;
  try {
    payload = (await req.json()) as SendWarningPayload;
  } catch {
    return json(400, { ok: false, error: "Invalid JSON body." });
  }

  const { to, subject, body, shipmentId, aiDraftSnapshot } = payload;
  if (!to || !subject || !body || !shipmentId || !aiDraftSnapshot) {
    return json(400, {
      ok: false,
      error: "Required fields: to, subject, body, shipmentId, aiDraftSnapshot.",
    });
  }

  // ── 3. Send via Resend ───────────────────────────────────────────────────
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    return json(500, { ok: false, error: "RESEND_API_KEY is not configured." });
  }

  const resend = new Resend(resendKey);
  const fromEmail =
    Deno.env.get("FROM_EMAIL") ?? "ops@altun-logistics.com";

  let messageId: string | null = null;
  let deliveryStatus: "sent" | "failed" = "failed";
  let sendError: string | null = null;
  let resendResponse: unknown = null;

  try {
    const { data, error: resendErr } = await resend.emails.send({
      from: `Altun Logistics <${fromEmail}>`,
      to: [to],
      subject,
      text: body,
      headers: { "X-Altun-Shipment": shipmentId },
    });

    if (resendErr) {
      sendError = `Resend rejected: ${resendErr.message}`;
      resendResponse = resendErr;
    } else {
      messageId = data?.id ?? null;
      deliveryStatus = "sent";
      resendResponse = data;
    }
  } catch (err) {
    sendError = err instanceof Error ? err.message : "Unknown send error.";
    resendResponse = { caught: sendError };
  }

  // ── 4. Write immutable audit log ─────────────────────────────────────────
  // Using the user's JWT client — auth.uid() satisfies the RLS insert policy.
  // If the audit write fails we log to stderr but do NOT surface it to the
  // frontend (silent failure per agreed partial-failure strategy).
  const userRole =
    (user.user_metadata?.user_role as string | undefined) ?? "unknown";

  const { error: auditErr } = await supabase.from("audit_logs").insert({
    user_id:           user.id,
    user_email:        user.email ?? "",
    user_role:         userRole,
    action_type:       deliveryStatus === "sent"
                         ? "AI_EMAIL_APPROVED"
                         : "AI_EMAIL_SEND_FAILED",
    shipment_id:       shipmentId,
    container_number:  payload.containerNumber ?? null,
    cost_avoided_eur:  payload.costAvoidedEur ?? null,
    demurrage_risk:    payload.demurrageRisk ?? "none",
    email_recipient:   to,
    email_subject:     subject,
    ai_draft_snapshot: aiDraftSnapshot,
    final_body:        body,
    edge_fn_response:  resendResponse as Record<string, unknown>,
    delivery_status:   deliveryStatus,
    resend_message_id: messageId,
  });

  if (auditErr) {
    // Silent — don't block the response, but leave a trace for debugging.
    console.error("[send-ai-warning] audit_logs insert failed:", auditErr.message);
  }

  // ── 5. Return result ─────────────────────────────────────────────────────
  if (deliveryStatus === "sent") {
    return json(200, { ok: true, messageId: messageId ?? undefined, sentBy: user.email });
  } else {
    return json(502, { ok: false, error: sendError ?? "Send failed." });
  }
});
