import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Inbox,
  Loader2,
  Mail,
  Send,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CustomerEmail, EmailIntent } from "@/lib/dashboard/api";
import { supabase } from "@/lib/supabase";
import { demoSuccess } from "@/lib/dashboard/demo";
import { useUiSounds } from "@/hooks/useUiSounds";
import { useT } from "@/lib/dashboard/i18n";
import { useAuth } from "@/lib/auth/AuthContext";

const INTENT_STYLE: Record<EmailIntent, string> = {
  "Status Update":
    "bg-sky-500/12 text-sky-700 dark:text-sky-300 border-sky-500/25",
  "ETA Request":
    "bg-violet-500/12 text-violet-700 dark:text-violet-300 border-violet-500/25",
  "Document Request":
    "bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/25",
  "Demurrage Query":
    "bg-rose-500/12 text-rose-700 dark:text-rose-300 border-rose-500/25",
};

/** Compact relative time, e.g. "3h ago". */
function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

// ── Send state machine ─────────────────────────────────────────────────────

type SendState =
  | { status: "idle" }
  | { status: "approving" }
  | { status: "sent"; messageId?: string }
  | { status: "failed"; error: string };

interface SendWarningResult {
  ok: boolean;
  messageId?: string;
  sentBy?: string;
  error?: string;
}

/**
 * Customer Service hub — incoming client emails paired with AI-drafted
 * replies pre-filled with live shipment data. Master-detail layout; the
 * detail pane cross-fades (`AnimatePresence`) when a new email is picked.
 *
 * Send flow (real user):
 *   1. Call `send-ai-warning` edge function with JWT — sends via Resend
 *      and writes an immutable audit_logs row server-side.
 *   2. Update `sendState` based on the result.
 *
 * Send flow (demo / mock user):
 *   Simulates 1.5 s network delay, shows success state — no real email
 *   sent and no audit row written (mock users have no real Supabase session).
 */
export function CommunicationHub({ emails }: { emails: CustomerEmail[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(
    emails[0]?.id ?? null,
  );
  const [sendState, setSendState] = useState<SendState>({ status: "idle" });
  const { playSuccess } = useUiSounds();
  const t = useT();
  const { user: authUser } = useAuth();
  const selected = emails.find((e) => e.id === selectedId) ?? null;

  // Reset send state when a different email is selected.
  function selectEmail(id: string) {
    setSelectedId(id);
    setSendState({ status: "idle" });
  }

  async function handleSendReply() {
    if (sendState.status === "approving" || !selected) return;
    setSendState({ status: "approving" });

    // ── Demo / mock bypass — simulate send, skip real API calls ──────────
    if (!authUser || authUser.mock) {
      await new Promise((r) => setTimeout(r, 1500));
      setSendState({ status: "sent" });
      playSuccess();
      demoSuccess(
        t("comm.sentTitle"),
        t("comm.sentDesc", { name: selected.fromName }),
      );
      return;
    }

    // ── Real user — call edge function ────────────────────────────────────
    let result: SendWarningResult = { ok: false, error: "Network error." };

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData?.session?.access_token ?? "";

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const res = await fetch(
        `${supabaseUrl}/functions/v1/send-ai-warning`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({
            to: selected.fromEmail,
            subject: `Re: ${selected.subject}`,
            body: selected.aiDraft,
            shipmentId: selected.shipmentId,
            aiDraftSnapshot: selected.aiDraft,
            demurrageRisk:
              selected.intent === "Demurrage Query" ? "warning" : "none",
          }),
        },
      );
      result = (await res.json()) as SendWarningResult;
    } catch (err) {
      result = {
        ok: false,
        error: err instanceof Error ? err.message : "Unexpected error.",
      };
    }

    if (result.ok) {
      setSendState({ status: "sent", messageId: result.messageId });
      playSuccess();
      demoSuccess(
        t("comm.sentTitle"),
        t("comm.sentDesc", { name: selected.fromName }),
      );
    } else {
      setSendState({ status: "failed", error: result.error ?? "Send failed." });
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
      {/* Inbox list */}
      <div className="card-premium rounded-xl overflow-hidden">
        <header className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Inbox className="h-4 w-4 text-brand" />
          <h3 className="text-sm font-semibold text-foreground">
            {t("comm.inbox")}
          </h3>
          <span className="ml-auto rounded-full bg-brand/12 px-2 py-0.5 text-[0.65rem] font-bold text-brand">
            {emails.length}
          </span>
        </header>
        <ul className="divide-y divide-border max-h-[28rem] overflow-y-auto">
          {emails.map((e) => {
            const active = e.id === selectedId;
            return (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => selectEmail(e.id)}
                  aria-current={active}
                  className={cn(
                    "w-full text-left px-4 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand",
                    active ? "bg-brand/[0.08]" : "hover:bg-foreground/[0.04]",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {e.fromName}
                    </span>
                    <span className="text-[0.65rem] text-muted-foreground shrink-0">
                      {timeAgo(e.receivedAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-foreground/90 truncate">
                    {e.subject}
                  </p>
                  <span
                    className={cn(
                      "mt-1.5 inline-block rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold",
                      INTENT_STYLE[e.intent],
                    )}
                  >
                    {e.intent}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Detail — incoming + AI draft */}
      <div className="min-h-[20rem]">
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="grid gap-4 md:grid-cols-2"
            >
              {/* Incoming */}
              <article className="card-premium rounded-xl p-4">
                <p className="flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  {t("comm.customerEmail")}
                </p>
                <h4 className="mt-2 text-sm font-semibold text-foreground">
                  {selected.subject}
                </h4>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {selected.fromName} · {selected.fromCompany}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                  {selected.body}
                </p>
                <p className="mt-3 inline-flex items-center gap-1 rounded-md bg-foreground/[0.04] px-2 py-1 text-[0.65rem] font-medium text-muted-foreground">
                  {t("comm.linkedShipment", { id: selected.shipmentId })}
                </p>
              </article>

              {/* AI draft */}
              <article className="rounded-xl p-4 border border-brand/25 bg-brand/[0.03]">
                <p className="flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-wider text-brand">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t("comm.aiDraft")}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                  {selected.aiDraft}
                </p>
                {/* ── Send outcome feedback ── */}
                {sendState.status === "sent" && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                      {t("comm.sentTitle")}
                      {sendState.messageId && (
                        <span className="ml-1.5 font-mono opacity-60">
                          {sendState.messageId}
                        </span>
                      )}
                    </span>
                  </div>
                )}
                {sendState.status === "failed" && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-500 mt-0.5" />
                    <p className="text-xs text-rose-700 dark:text-rose-300">
                      {sendState.error}
                    </p>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleSendReply}
                    disabled={
                      sendState.status === "approving" ||
                      sendState.status === "sent"
                    }
                    className={cn(
                      "inline-flex items-center gap-1.5 h-9 rounded-lg px-3.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed",
                      sendState.status === "sent"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 disabled:opacity-100"
                        : "bg-brand text-white hover:bg-brand-strong shadow-[0_4px_16px_-6px_var(--brand)] disabled:opacity-70",
                    )}
                  >
                    {sendState.status === "approving" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : sendState.status === "sent" ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    {sendState.status === "approving"
                      ? t("comm.sending")
                      : sendState.status === "sent"
                        ? t("comm.sentTitle")
                        : sendState.status === "failed"
                          ? t("comm.retrySend")
                          : t("comm.sendReply")}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      demoSuccess(
                        t("comm.draftSaved"),
                        t("comm.draftSavedDesc"),
                      )
                    }
                    className="inline-flex items-center gap-1.5 h-9 rounded-lg border border-border bg-foreground/[0.03] px-3.5 text-sm font-medium text-foreground hover:border-brand/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    {t("comm.editDraft")} <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="mt-2 text-[0.65rem] text-muted-foreground">
                  {t("comm.prototype")}
                </p>
              </article>
            </motion.div>
          ) : (
            <div className="card-premium rounded-xl p-8 text-center text-sm text-muted-foreground">
              {t("comm.selectEmail")}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
