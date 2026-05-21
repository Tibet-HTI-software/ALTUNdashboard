/**
 * ShipmentComms — Email thread panel for a shipment dossier.
 *
 * Shows an AI-auto-routed email thread tied to the dossier via smart subject
 * line tagging: [Dossier: {id}] [TKT-{n}]. Replaces the legacy "Alaska"
 * disconnected ticket system.
 *
 * Thread mock:
 *   1. Outbound — Altun ops notifies client of ETA delay (AI-generated)
 *   2. Inbound  — Client replies requesting clarification
 *   3. Outbound — Altun follows up with revised ETA + D&D warning
 */

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  ChevronDown,
  ChevronUp,
  Clock,
  Cpu,
  ExternalLink,
  Hash,
  Inbox,
  Mail,
  MailOpen,
  Paperclip,
  PenLine,
  Reply,
  Send,
  Sparkles,
  Tag,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ── Thread data model ───────────────────────────────────────────────────── */

type EmailDirection = "outbound" | "inbound";

interface ThreadEmail {
  id: string;
  direction: EmailDirection;
  fromName: string;
  fromEmail: string;
  toName: string;
  toEmail: string;
  subject: string;
  bodyHtml: string;
  timestamp: string;
  /** Whether this message was routed by the AI dossier-tag system. */
  autoRouted: boolean;
  attachments?: { name: string; size: string }[];
}

/* ── Mock thread builder ─────────────────────────────────────────────────── */

function buildThread(shipmentId: string): ThreadEmail[] {
  const tkt = "TKT-8992";
  const subject = `Delay Notice | [Dossier: ${shipmentId}] [${tkt}]`;

  return [
    {
      id: "msg-001",
      direction: "outbound",
      fromName: "Daan Prins — Altun Logistics",
      fromEmail: "d.prins@altun-logistics.com",
      toName: "Procurement Team",
      toEmail: "procurement@demir-industrial.com",
      subject,
      bodyHtml: `
Dear Demir Industrial Procurement Team,

I am writing to inform you of a revised ETA for your shipment on dossier <strong>${shipmentId}</strong>.

<strong>Situation:</strong><br/>
Container MSCU4821033 (40'HC, Rotterdam import) has experienced a <strong>vessel delay of 3 days</strong> due to port congestion at the Suez Canal transit. The vessel MV EVER ACCORD is now estimated to arrive at ECT Delta on <strong>24 May 2026</strong> (revised from 21 May 2026).

<strong>Impact on your cargo:</strong>
<ul>
  <li>ETA update: 21 May → 24 May 2026</li>
  <li>Free time at terminal: 7 days from discharge date (contractual)</li>
  <li>Recommended collection window: <strong>25–26 May 2026</strong></li>
</ul>

<strong>⚠️ D&D Advisory:</strong><br/>
Please arrange inland transport before <strong>31 May 2026</strong> to avoid demurrage charges (€1,050/day). We will notify you immediately upon vessel arrival.

Customs clearance pre-lodgement is already in progress. No action required from your side at this time.

Kind regards,<br/>
<strong>Daan Prins</strong><br/>
Freight Forwarder · Altun Logistics B.V.<br/>
📞 +31 (0)10 412 8800
      `.trim(),
      timestamp: "2026-05-19T09:14:00Z",
      autoRouted: true,
      attachments: [
        { name: "Revised_ETA_Notice_MSCU4821033.pdf", size: "84 KB" },
      ],
    },
    {
      id: "msg-002",
      direction: "inbound",
      fromName: "Lars van Dijk — Demir Industrial",
      fromEmail: "l.vandijk@demir-industrial.com",
      toName: "Daan Prins",
      toEmail: "d.prins@altun-logistics.com",
      subject: `Re: ${subject}`,
      bodyHtml: `
Hi Daan,

Thank you for the prompt update.

A few questions:
<ol>
  <li>Is the 3-day delay confirmed, or could it extend further? We have a production deadline on <strong>28 May</strong>.</li>
  <li>Can you confirm whether the preferential duty (EUR.1 certificate) is in order? Our finance team flagged this last week.</li>
  <li>Regarding the D&D exposure — our budget covered <strong>3 days</strong> max. Is there any way to file a port delay dispute with MSC?</li>
</ol>

Please keep us posted. We are available for a call this afternoon if needed.

Best regards,<br/>
<strong>Lars van Dijk</strong><br/>
Senior Procurement Manager · Demir Industrial Trading
      `.trim(),
      timestamp: "2026-05-19T11:37:00Z",
      autoRouted: true,
    },
    {
      id: "msg-003",
      direction: "outbound",
      fromName: "Daan Prins — Altun Logistics",
      fromEmail: "d.prins@altun-logistics.com",
      toName: "Lars van Dijk",
      toEmail: "l.vandijk@demir-industrial.com",
      subject: `Re: ${subject}`,
      bodyHtml: `
Hi Lars,

Thanks for the quick reply. Addressing each point:

<strong>1. Delay duration:</strong><br/>
The 3-day delay is confirmed by the vessel operator. No further extensions are expected — the vessel is currently transiting normally. I'll send a live ETA update the moment the pilot boards.

<strong>2. EUR.1 Certificate:</strong><br/>
✅ EUR.1 certificate is on file and validated. Preferential duty (0% under EU–Turkey Customs Union) will apply. No action needed.

<strong>3. Port delay dispute:</strong><br/>
Yes — I've already flagged this with MSC. Congestion at Suez qualifies as a force majeure event under your service contract. I'm preparing the Port Incident Report; if approved, D&D charges for the delay period will be waived. I'll keep you informed.

I'll send a production impact summary by EOD. Happy to jump on a call — my afternoon is open from 14:00 CET.

Best,<br/>
<strong>Daan Prins</strong><br/>
Altun Logistics B.V.
      `.trim(),
      timestamp: "2026-05-19T14:02:00Z",
      autoRouted: true,
      attachments: [
        { name: "EUR1_Certificate_AL-2026-1041.pdf", size: "121 KB" },
        { name: "Port_Incident_Report_DRAFT.pdf", size: "56 KB" },
      ],
    },
  ];
}

/* ── Subcomponents ───────────────────────────────────────────────────────── */

function AutoRoutedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/[0.08] px-2 py-0.5 text-[0.58rem] font-semibold text-violet-500 dark:text-violet-400 shrink-0">
      <Cpu className="h-2.5 w-2.5" />
      AI Auto-Routed via Dossier Tag
    </span>
  );
}

function EmailBubble({
  email,
  defaultOpen,
}: {
  email: ThreadEmail;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const isOut = email.direction === "outbound";

  const ts = new Date(email.timestamp).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "rounded-xl border overflow-hidden",
        isOut
          ? "border-brand/20 bg-brand/[0.03]"
          : "border-border/70 bg-foreground/[0.015]",
        open && (isOut ? "border-brand/35" : "border-border"),
      )}
    >
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-foreground/[0.025] transition-colors focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-brand"
      >
        {/* Avatar */}
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[0.62rem] font-bold mt-0.5",
            isOut
              ? "bg-brand/15 border border-brand/25 text-brand"
              : "bg-foreground/10 border border-border text-muted-foreground",
          )}
        >
          {isOut ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
        </span>

        {/* Meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[0.78rem] font-semibold text-foreground truncate">
              {email.fromName}
            </span>
            {isOut && (
              <span className="text-[0.6rem] font-medium text-brand bg-brand/[0.06] border border-brand/20 px-1.5 py-0.5 rounded-full shrink-0">
                Sent
              </span>
            )}
            {email.autoRouted && <AutoRoutedBadge />}
          </div>

          <p className="text-[0.68rem] text-muted-foreground mt-0.5 truncate">
            <span className="font-medium text-foreground/60">
              {email.subject}
            </span>
          </p>
        </div>

        {/* Timestamp + chevron */}
        <div className="flex items-center gap-2 shrink-0">
          {email.attachments?.length ? (
            <Paperclip className="h-3 w-3 text-muted-foreground/60" />
          ) : null}
          <span className="text-[0.62rem] text-muted-foreground tabular-nums whitespace-nowrap">
            {ts}
          </span>
          {open ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded body */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            {/* To/From meta strip */}
            <div className="px-4 py-2 border-t border-border/50 bg-foreground/[0.015] flex flex-wrap gap-x-6 gap-y-1 text-[0.65rem] text-muted-foreground">
              <span>
                <span className="font-semibold text-foreground/60">From:</span>{" "}
                {email.fromName} &lt;{email.fromEmail}&gt;
              </span>
              <span>
                <span className="font-semibold text-foreground/60">To:</span>{" "}
                {email.toName} &lt;{email.toEmail}&gt;
              </span>
            </div>

            {/* Subject line with tags highlighted */}
            <div className="px-4 pt-3 pb-1 flex items-start gap-2 flex-wrap">
              <Mail className="h-3.5 w-3.5 text-muted-foreground/50 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <SubjectLine raw={email.subject} />
              </div>
            </div>

            {/* Body */}
            <div
              className="px-4 py-3 text-[0.78rem] text-foreground/85 leading-relaxed prose-sm max-w-none border-t border-border/30 mt-2"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: controlled mock HTML
              dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
            />

            {/* Attachments */}
            {email.attachments?.length ? (
              <div className="px-4 pb-3 flex flex-wrap gap-2 border-t border-border/30 pt-3">
                {email.attachments.map((att) => (
                  <button
                    key={att.name}
                    type="button"
                    onClick={() =>
                      toast.info("Demo mode", {
                        description: `${att.name} would download in a live environment.`,
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-foreground/[0.03] px-2.5 py-1.5 text-[0.65rem] font-medium text-foreground hover:border-brand/40 hover:text-brand transition-colors"
                  >
                    <Paperclip className="h-2.5 w-2.5" />
                    {att.name}
                    <span className="text-muted-foreground">{att.size}</span>
                    <ExternalLink className="h-2 w-2 opacity-40" />
                  </button>
                ))}
              </div>
            ) : null}

            {/* Quick reply stub */}
            <div className="px-4 pb-3 flex items-center gap-2 border-t border-border/20 pt-3">
              <button
                type="button"
                onClick={() =>
                  toast.info("Reply", {
                    description: "Quick reply opened — AI can pre-fill context from dossier.",
                  })
                }
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-foreground/[0.03] px-2.5 py-1 text-[0.65rem] font-semibold text-muted-foreground hover:text-foreground hover:border-brand/30 transition-colors"
              >
                <Reply className="h-3 w-3" />
                Reply
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * Renders the subject line with [Dossier: …] and [TKT-…] tags highlighted
 * as coloured chips so the routing mechanic is immediately visible.
 */
function SubjectLine({ raw }: { raw: string }) {
  // Parse out bracketed tags
  const dossierMatch = raw.match(/\[Dossier:\s*([^\]]+)\]/);
  const tktMatch = raw.match(/\[(TKT-\d+)\]/);
  const prefix = raw.split("|")[0]?.trim() ?? raw;

  return (
    <p className="text-[0.72rem] font-semibold text-foreground leading-snug flex flex-wrap items-center gap-1.5">
      <span className="text-foreground/70">{prefix}</span>
      {dossierMatch && (
        <span className="inline-flex items-center gap-1 rounded-md border border-brand/30 bg-brand/[0.08] px-2 py-0.5 text-[0.6rem] font-bold text-brand">
          <Tag className="h-2.5 w-2.5" />
          Dossier: {dossierMatch[1]}
        </span>
      )}
      {tktMatch && (
        <span className="inline-flex items-center gap-1 rounded-md border border-violet-500/30 bg-violet-500/[0.07] px-2 py-0.5 text-[0.6rem] font-bold text-violet-500 dark:text-violet-400">
          <Hash className="h-2.5 w-2.5" />
          {tktMatch[1]}
        </span>
      )}
    </p>
  );
}

/* ── Main export ─────────────────────────────────────────────────────────── */

interface Props {
  shipmentId: string;
}

export function ShipmentComms({ shipmentId }: Props) {
  const thread = buildThread(shipmentId);

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          {/* Thread stats */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-foreground/[0.03] px-3 py-1 text-[0.68rem] font-medium text-muted-foreground">
              <Inbox className="h-3 w-3" />
              {thread.length} messages
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/[0.06] px-3 py-1 text-[0.68rem] font-semibold text-violet-500 dark:text-violet-400">
              <Sparkles className="h-3 w-3" />
              Smart Threading active
            </span>
          </div>
        </div>

        {/* Compose CTA */}
        <button
          type="button"
          onClick={() =>
            toast.success("AI Email composer opened", {
              description:
                "Subject line pre-filled with dossier tag and ticket ID for auto-routing.",
              icon: <Sparkles className="h-4 w-4 text-violet-500" />,
            })
          }
          className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-brand text-white text-[0.78rem] font-semibold hover:opacity-90 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 shrink-0"
        >
          <PenLine className="h-3.5 w-3.5" />
          Compose New Email (AI Assisted)
        </button>
      </div>

      {/* Routing explanation banner */}
      <div className="flex items-start gap-3 rounded-xl border border-violet-500/20 bg-violet-500/[0.04] px-4 py-3">
        <Cpu className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-[0.72rem] font-semibold text-violet-500 dark:text-violet-400">
            AI Auto-Routing enabled for dossier {shipmentId}
          </p>
          <p className="text-[0.67rem] text-muted-foreground mt-0.5 leading-relaxed">
            Every email in this thread includes{" "}
            <code className="text-[0.62rem] bg-foreground/[0.06] px-1 rounded">
              [Dossier: {shipmentId}]
            </code>{" "}
            and a unique{" "}
            <code className="text-[0.62rem] bg-foreground/[0.06] px-1 rounded">
              [TKT-n]
            </code>{" "}
            in the subject line. Replies are parsed and automatically filed to
            this dossier — no manual routing needed. Replaces the disconnected
            email tickets in legacy Alaska.
          </p>
        </div>
      </div>

      {/* Thread header row */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-border/50" />
        <span className="flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-wider text-muted-foreground">
          <Clock className="h-3 w-3" />
          Thread · {thread.length} messages · {new Date(thread[0].timestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        </span>
        <div className="h-px flex-1 bg-border/50" />
      </div>

      {/* Email bubbles */}
      <div className="space-y-2">
        {thread.map((email, i) => (
          <EmailBubble
            key={email.id}
            email={email}
            // Open the last message by default (most recent)
            defaultOpen={i === thread.length - 1}
          />
        ))}
      </div>

      {/* Compose footer stub */}
      <div className="rounded-xl border border-dashed border-border/60 bg-foreground/[0.01] px-4 py-3 flex items-center gap-3">
        <div className="h-7 w-7 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0">
          <Bot className="h-3.5 w-3.5 text-brand" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[0.7rem] text-muted-foreground">
            <span className="font-semibold text-foreground/70">AI Co-Pilot ready.</span>{" "}
            Ask it to draft a reply, summarise this thread, or flag an escalation.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            toast.info("AI composing…", {
              description: "Co-Pilot will draft a reply pre-loaded with dossier context.",
            })
          }
          className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg border border-brand/30 bg-brand/[0.06] text-[0.65rem] font-semibold text-brand hover:bg-brand/[0.12] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand shrink-0"
        >
          <Send className="h-3 w-3" />
          AI Draft
        </button>
      </div>

      {/* Unread indicator at bottom */}
      <div className="flex items-center justify-center">
        <span className="inline-flex items-center gap-1 text-[0.62rem] text-muted-foreground">
          <MailOpen className="h-3 w-3" />
          All messages read · Auto-sync every 5 min
        </span>
      </div>
    </div>
  );
}
