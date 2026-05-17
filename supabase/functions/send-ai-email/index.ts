// ============================================================
// Supabase Edge Function — send-ai-email
//
// Sends an AI-drafted shipment email via the Resend API.
// Runtime: Deno (Supabase Edge Functions). This file is NOT part of the
// Vite/React build — it is deployed separately with:
//   supabase functions deploy send-ai-email
//
// Required secrets (set with `supabase secrets set`):
//   RESEND_API_KEY   — Resend API key
//   FROM_EMAIL       — verified sender, e.g. ops@altun-logistics.com
//   SUPABASE_URL     — provided automatically in the function runtime
//   SUPABASE_ANON_KEY— provided automatically in the function runtime
//
// Auth: the caller's JWT (Authorization: Bearer <token>) is verified
// before any email is sent — only authenticated staff may trigger sends.
// ============================================================

// @ts-nocheck — Deno runtime; type-checked by the Supabase CLI, not Vite.
import { Resend } from "npm:resend@4";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SendPayload {
  shipmentId: string;
  to: string;
  subject: string;
  body: string;
}

function json(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed — use POST." });
  }

  // ── Authorisation — verify the caller's JWT ────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json(401, { error: "Missing Authorization header." });
  }

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
    return json(401, { error: "Invalid or expired session." });
  }

  // ── Parse + validate the payload ───────────────────────────
  let payload: SendPayload;
  try {
    payload = (await req.json()) as SendPayload;
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }

  const { shipmentId, to, subject, body } = payload;
  if (!shipmentId || !to || !subject || !body) {
    return json(400, {
      error: "shipmentId, to, subject and body are all required.",
    });
  }

  // ── Send via Resend ────────────────────────────────────────
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    return json(500, { error: "RESEND_API_KEY is not configured." });
  }

  const resend = new Resend(resendKey);
  const fromEmail =
    Deno.env.get("FROM_EMAIL") ?? "ops@altun-logistics.com";

  try {
    const { data, error } = await resend.emails.send({
      from: `Altun Logistics <${fromEmail}>`,
      to: [to],
      subject,
      text: body,
      headers: { "X-Altun-Shipment": shipmentId },
    });

    if (error) {
      return json(502, { error: `Resend rejected the email: ${error.message}` });
    }

    return json(200, {
      ok: true,
      messageId: data?.id ?? null,
      shipmentId,
      sentBy: user.email,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown send error.";
    return json(500, { error: message });
  }
});
