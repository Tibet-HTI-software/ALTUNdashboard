import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Inbox, Mail, Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CustomerEmail, EmailIntent } from "@/lib/dashboard/api";
import { demoSuccess } from "@/lib/dashboard/demo";

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

/**
 * Customer Service hub — incoming client emails paired with AI-drafted
 * replies pre-filled with live shipment data. Master-detail layout; the
 * detail pane cross-fades (`AnimatePresence`) when a new email is picked.
 */
export function CommunicationHub({ emails }: { emails: CustomerEmail[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(
    emails[0]?.id ?? null,
  );
  const selected = emails.find((e) => e.id === selectedId) ?? null;

  return (
    <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
      {/* Inbox list */}
      <div className="card-premium rounded-xl overflow-hidden">
        <header className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Inbox className="h-4 w-4 text-brand" />
          <h3 className="text-sm font-semibold text-foreground">Inbox</h3>
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
                  onClick={() => setSelectedId(e.id)}
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
                  Customer email
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
                  Linked shipment: {selected.shipmentId}
                </p>
              </article>

              {/* AI draft */}
              <article className="rounded-xl p-4 border border-brand/25 bg-brand/[0.03]">
                <p className="flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-wider text-brand">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI-drafted reply
                </p>
                <p className="mt-2 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                  {selected.aiDraft}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      demoSuccess(
                        "Reply sent",
                        `AI draft sent to ${selected.fromName}.`,
                      )
                    }
                    className="inline-flex items-center gap-1.5 h-9 rounded-lg bg-brand text-white px-3.5 text-sm font-semibold hover:bg-brand-strong transition-colors shadow-[0_4px_16px_-6px_var(--brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <Send className="h-3.5 w-3.5" /> Send reply
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      demoSuccess(
                        "Draft saved",
                        "AI reply moved to drafts for review.",
                      )
                    }
                    className="inline-flex items-center gap-1.5 h-9 rounded-lg border border-border bg-foreground/[0.03] px-3.5 text-sm font-medium text-foreground hover:border-brand/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    Edit draft <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="mt-2 text-[0.65rem] text-muted-foreground">
                  Prototype — pre-filled with live tracking & ETA data.
                </p>
              </article>
            </motion.div>
          ) : (
            <div className="card-premium rounded-xl p-8 text-center text-sm text-muted-foreground">
              Select an email to see the AI-drafted reply.
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
