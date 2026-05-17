/**
 * ShipmentDetailDrawer
 *
 * Premium slide-over panel that opens when an operator selects a container
 * row in the Demurrage Risk Board or Fleet Tracking vessel list.
 *
 * Five internal sections:
 *  0. AI Quick-Actions banner — shown when customsBlock !== null OR D&D
 *     risk is critical/demurrage. Wires to the send-ai-warning edge
 *     function using the same SendState machine as CommunicationHub.
 *  1. Live Status & Telemetry  — phase step-tracker, route, port coordinates.
 *  2. D&D Financial Ledger     — live free-time countdown, accrued EUR calc.
 *  3. Audit History Trail      — AI actions logged in public.audit_logs.
 *  4. Document Vault           — Supabase Storage download (signed URL) for
 *     on-file / cleared docs; click-to-upload for blocked docs; per-doc
 *     loading spinners; local docOverrides flip on upload success.
 *
 * Data sync:
 *  The drawer receives `shipment` as a prop from the parent which holds live
 *  data from useRealtimeShipments(). Any WebSocket event that triggers a
 *  parent re-render automatically flows into the drawer — no separate
 *  subscription needed.
 *
 * Closing: backdrop click, ESC key, or the × button all call `onClose`.
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  Anchor,
  CheckCircle2,
  Clock,
  Download,
  FileCheck,
  FileText,
  FileX,
  History,
  Loader2,
  Mail,
  MapPin,
  Package,
  Ship,
  Sparkles,
  Upload,
  User,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getFreeTimeStatus,
  getAuditLogsByShipment,
  useAsyncData,
  type AuditLogEntry,
  type FreeTimeStatus,
  type OceanShipment,
  type CustomsBlockReason,
  type ShipmentPhase,
} from "@/lib/dashboard/api";
import {
  useDemurrageThresholds,
  type DemurrageThresholds,
} from "@/lib/dashboard/demurrage";
import { portCoord } from "@/data/dashboard/ports";
import { formatDate, formatDateShort } from "@/lib/dashboard/format";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { demoSuccess, demoError } from "@/lib/dashboard/demo";
import { useUiSounds } from "@/hooks/useUiSounds";
import { useAuth } from "@/lib/auth/AuthContext";

// ── Send state machine ─────────────────────────────────────────────────────────

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

type DocStatus = "on_file" | "blocked" | "cleared";

// ── Helpers ────────────────────────────────────────────────────────────────────

const eur = (n: number) =>
  n.toLocaleString("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function generateAiDraft(
  shipment: OceanShipment,
  ft: FreeTimeStatus,
): { subject: string; body: string } {
  if (shipment.customsBlock) {
    return {
      subject: `URGENT: Customs Hold — ${shipment.containerNumber} / ${shipment.pol} → ${shipment.pod}`,
      body: `Dear ${shipment.traderContact || "Sir/Madam"},

We are writing to urgently notify you that container ${shipment.containerNumber} (${shipment.vessel}, Voyage ${shipment.voyage}) is currently subject to a customs hold at ${shipment.terminal}.

Reason: ${shipment.customsBlock}

To proceed with customs clearance, please provide the required documentation immediately. Each day of delay may incur additional demurrage charges at a rate of ${eur(shipment.demurrageRatePerDay)}/day against the free time expiry of ${new Date(shipment.freeTimeExpiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.

Please contact our operations team as soon as possible to resolve this matter.

Best regards,
Altun Logistics Operations`,
    };
  }

  // D&D critical / demurrage
  return {
    subject: `URGENT: Demurrage Risk Alert — ${shipment.containerNumber} (${ft.label})`,
    body: `Dear ${shipment.traderContact || "Sir/Madam"},

This is an urgent notification regarding container ${shipment.containerNumber} at ${shipment.terminal} (${shipment.pol} → ${shipment.pod}).

Current Status: ${ft.label}
Free time expires: ${new Date(shipment.freeTimeExpiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}${ft.risk === "demurrage" ? `\nAccrued demurrage: ${eur(ft.accruedEur)}` : ""}
Daily demurrage rate: ${eur(shipment.demurrageRatePerDay)}/day

Immediate container collection or documentation submission is required to minimise detention and demurrage liability. Please coordinate with our operations team at your earliest convenience.

Best regards,
Altun Logistics Operations`,
  };
}

// ── Phase step-tracker config ──────────────────────────────────────────────────

const PHASE_STEPS: { label: string; phases: ShipmentPhase[] }[] = [
  { label: "Booked",     phases: ["Booked"] },
  { label: "In Transit", phases: ["In Transit"] },
  { label: "Discharged", phases: ["Discharged", "Customs Hold"] },
  { label: "Cleared",    phases: ["Released"] },
  { label: "Delivered",  phases: ["Delivered"] },
];

function activeStep(phase: ShipmentPhase): number {
  const idx = PHASE_STEPS.findIndex((s) =>
    (s.phases as string[]).includes(phase),
  );
  return idx < 0 ? 0 : idx;
}

// ── Document vault config ──────────────────────────────────────────────────────

interface DocConfig {
  name: string;
  /** Display code shown on the chip (e.g. "B/L"). */
  code: string;
  /** Storage-safe filename segment — no slashes or special chars. */
  storageKey: string;
  /** Which customsBlock reason blocks this document. null = never blocks. */
  blockReason: CustomsBlockReason | null;
}

const DOCS: DocConfig[] = [
  {
    name: "Bill of Lading",
    code: "B/L",
    storageKey: "BL",
    blockReason: "Incomplete Bill of Lading",
  },
  {
    name: "Commercial Invoice",
    code: "CI",
    storageKey: "CI",
    blockReason: "Missing Commercial Invoice",
  },
  {
    name: "Packing List",
    code: "PL",
    storageKey: "PL",
    blockReason: "Packing List Discrepancy",
  },
  {
    name: "Certificate of Origin",
    code: "CO",
    storageKey: "CO",
    blockReason: "Certificate of Origin Hold",
  },
  {
    name: "Duty Clearance",
    code: "DC",
    storageKey: "DC",
    blockReason: "Pending Duty Payment",
  },
  {
    name: "Phytosanitary Cert.",
    code: "PC",
    storageKey: "PC",
    blockReason: "Phytosanitary Certificate Missing",
  },
];

function docStatus(
  doc: DocConfig,
  shipment: OceanShipment,
  overrides: Record<string, DocStatus>,
): DocStatus {
  if (overrides[doc.code]) return overrides[doc.code];
  if (
    shipment.customsBlock === doc.blockReason &&
    doc.blockReason !== null
  ) {
    if (
      shipment.phase === "Released" ||
      shipment.phase === "Delivered"
    ) {
      return "cleared";
    }
    return "blocked";
  }
  return "on_file";
}

// ── Action type display map ────────────────────────────────────────────────────

const ACTION_LABEL: Record<string, string> = {
  AI_EMAIL_APPROVED: "AI email approved & sent",
  AI_EMAIL_SEND_FAILED: "AI email send failed",
  AI_EMAIL_REJECTED: "AI email rejected",
};

// ── Section wrapper ────────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  children,
  last,
}: {
  icon: typeof Ship;
  title: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <section
      className={cn(
        "px-5 py-4",
        !last && "border-b border-border/50",
      )}
    >
      <h3 className="flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-3">
        <Icon className="h-3.5 w-3.5 text-brand" />
        {title}
      </h3>
      {children}
    </section>
  );
}

// ── Phase badge ────────────────────────────────────────────────────────────────

function PhaseBadge({ phase }: { phase: ShipmentPhase }) {
  const styles: Record<ShipmentPhase, string> = {
    Booked:
      "bg-sky-500/12 text-sky-700 dark:text-sky-300 border-sky-500/25",
    "In Transit":
      "bg-violet-500/12 text-violet-700 dark:text-violet-300 border-violet-500/25",
    Discharged:
      "bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/25",
    "Customs Hold":
      "bg-rose-500/12 text-rose-600 dark:text-rose-300 border-rose-500/25",
    Released:
      "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
    Delivered:
      "bg-foreground/[0.06] text-muted-foreground border-border",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold",
        styles[phase],
      )}
    >
      {phase}
    </span>
  );
}

// ── 0. AI Quick-Actions banner ─────────────────────────────────────────────────

function QuickActionBanner({
  shipment,
  ft,
  sendState,
  onDraftAndSend,
}: {
  shipment: OceanShipment;
  ft: FreeTimeStatus;
  sendState: SendState;
  onDraftAndSend: () => void;
}) {
  const isCustomsHold = shipment.customsBlock !== null;

  return (
    <div className="mx-5 mt-4 rounded-xl border border-brand/25 bg-gradient-to-br from-brand/[0.08] via-brand/[0.04] to-transparent p-4">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
            isCustomsHold
              ? "bg-rose-500/10 border-rose-500/25"
              : "bg-amber-500/10 border-amber-500/25",
          )}
        >
          <AlertTriangle
            className={cn(
              "h-4 w-4",
              isCustomsHold ? "text-rose-500" : "text-amber-500",
            )}
          />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {isCustomsHold
              ? "Customs hold requires immediate action"
              : `Demurrage clock: ${ft.label}`}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isCustomsHold
              ? `${shipment.customsBlock} — draft a resolution email to the trader.`
              : "Container at risk. Draft an AI resolution email to prevent accrual."}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onDraftAndSend}
          disabled={
            sendState.status === "approving" ||
            sendState.status === "sent"
          }
          className={cn(
            "inline-flex items-center gap-1.5 h-8 rounded-lg px-3 text-xs font-semibold transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 focus-visible:ring-offset-background",
            "disabled:cursor-not-allowed",
            sendState.status === "sent"
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 disabled:opacity-100"
              : "bg-brand text-white hover:bg-brand-strong shadow-[0_4px_12px_-4px_var(--brand)] disabled:opacity-70",
          )}
        >
          {sendState.status === "approving" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : sendState.status === "sent" ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          {sendState.status === "approving"
            ? "Sending…"
            : sendState.status === "sent"
              ? "Email sent"
              : sendState.status === "failed"
                ? "Retry send"
                : "Draft AI Resolution Email"}
        </button>

        {sendState.status === "sent" && sendState.messageId && (
          <span className="font-mono text-[0.62rem] text-muted-foreground">
            {sendState.messageId}
          </span>
        )}

        {sendState.status === "failed" && (
          <div className="flex items-center gap-1 text-[0.65rem] text-rose-600 dark:text-rose-400">
            <AlertCircle className="h-3 w-3 shrink-0" />
            {sendState.error}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 1. Live Status & Telemetry ─────────────────────────────────────────────────

function StatusSection({ shipment }: { shipment: OceanShipment }) {
  const step = activeStep(shipment.phase);
  const isBlocked = shipment.phase === "Customs Hold";
  const polCoord = portCoord(shipment.pol);
  const podCoord = portCoord(shipment.pod);

  return (
    <Section icon={Ship} title="Live Status & Telemetry">
      {/* Phase step-tracker */}
      <div className="relative flex items-center justify-between mb-4">
        <div className="absolute left-0 right-0 top-[0.5625rem] h-px bg-border" aria-hidden />

        {PHASE_STEPS.map((s, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <div
              key={s.label}
              className="relative flex flex-col items-center gap-1.5 z-10"
            >
              <span
                className={cn(
                  "h-[1.125rem] w-[1.125rem] rounded-full border-2 flex items-center justify-center transition-colors",
                  done
                    ? "bg-brand border-brand"
                    : active && isBlocked
                      ? "bg-rose-500/20 border-rose-500 animate-pulse"
                      : active
                        ? "bg-brand/20 border-brand"
                        : "bg-background border-border",
                )}
              >
                {done && (
                  <CheckCircle2
                    className="h-2.5 w-2.5 text-white"
                    aria-hidden
                  />
                )}
                {active && isBlocked && (
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-rose-500"
                    aria-hidden
                  />
                )}
                {active && !isBlocked && (
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-brand"
                    aria-hidden
                  />
                )}
              </span>
              <span
                className={cn(
                  "text-[0.58rem] font-semibold uppercase tracking-wide whitespace-nowrap",
                  done
                    ? "text-brand"
                    : active
                      ? isBlocked
                        ? "text-rose-500"
                        : "text-brand"
                      : "text-muted-foreground/60",
                )}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Customs hold alert */}
      {isBlocked && shipment.customsBlock && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-500 mt-0.5" />
          <div>
            <p className="font-semibold text-rose-600 dark:text-rose-300">
              Customs hold active
            </p>
            <p className="text-rose-600/80 dark:text-rose-300/80 mt-0.5">
              {shipment.customsBlock}
            </p>
          </div>
        </div>
      )}

      {/* Telemetry grid */}
      <dl className="grid grid-cols-2 gap-2">
        <TelemetryField
          icon={<Anchor className="h-3 w-3" />}
          label="Route"
          value={`${shipment.pol} → ${shipment.pod}`}
        />
        <TelemetryField
          icon={<Ship className="h-3 w-3" />}
          label="Carrier"
          value={shipment.carrier}
        />
        <TelemetryField
          icon={<MapPin className="h-3 w-3" />}
          label="POL coords"
          value={`${polCoord.lat.toFixed(2)}° N, ${polCoord.lng.toFixed(2)}° E`}
          mono
        />
        <TelemetryField
          icon={<MapPin className="h-3 w-3" />}
          label="POD coords"
          value={`${podCoord.lat.toFixed(2)}° N, ${podCoord.lng.toFixed(2)}° E`}
          mono
        />
        <TelemetryField label="Terminal" value={shipment.terminal} />
        <TelemetryField
          label="Commodity"
          value={`${shipment.commodity} · ${shipment.weightKg.toLocaleString()} kg`}
        />
        <TelemetryField
          icon={<User className="h-3 w-3" />}
          label="Trader"
          value={`${shipment.trader} (${shipment.traderType})`}
        />
        <TelemetryField
          icon={<Mail className="h-3 w-3" />}
          label="Contact"
          value={shipment.traderEmail || shipment.traderContact || "—"}
          mono={!!shipment.traderEmail}
        />
        {shipment.etd && (
          <TelemetryField label="ETD" value={formatDateShort(shipment.etd)} />
        )}
        {shipment.eta && (
          <TelemetryField label="ETA" value={formatDateShort(shipment.eta)} />
        )}
        {shipment.dischargedAt && (
          <TelemetryField
            label="Discharged"
            value={formatDateShort(shipment.dischargedAt)}
          />
        )}
        <TelemetryField label="B/L Number" value={shipment.blNumber} mono />
      </dl>
    </Section>
  );
}

function TelemetryField({
  icon,
  label,
  value,
  mono,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg bg-foreground/[0.03] border border-border/60 p-2.5 min-w-0">
      <dt className="flex items-center gap-1 text-[0.6rem] uppercase tracking-wider text-muted-foreground/70 mb-0.5">
        {icon}
        {label}
      </dt>
      <dd
        className={cn(
          "text-xs font-medium text-foreground truncate",
          mono && "font-mono",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

// ── 2. D&D Financial Ledger ────────────────────────────────────────────────────

function DdLedger({
  shipment,
  ft,
  thresholds,
}: {
  shipment: OceanShipment;
  ft: FreeTimeStatus;
  thresholds: DemurrageThresholds;
}) {
  const totalH = shipment.freeDaysTotal * 24;
  const usedH = Math.max(0, totalH - Math.max(ft.hoursLeft, 0));
  const consumedPct = Math.min(100, (usedH / totalH) * 100);

  const riskColor =
    ft.risk === "demurrage" || ft.risk === "critical"
      ? "bg-rose-500"
      : ft.risk === "warning"
        ? "bg-amber-500"
        : "bg-emerald-500";

  const riskBadge: Record<typeof ft.risk, string> = {
    demurrage:
      "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30",
    critical:
      "bg-rose-500/12 text-rose-600 dark:text-rose-300 border-rose-500/25",
    warning:
      "bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/25",
    healthy:
      "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
  };

  return (
    <Section icon={Clock} title="D&D Financial Ledger">
      {/* Risk status pill + accrued */}
      <div className="flex items-center justify-between mb-3">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 h-7 text-[0.7rem] font-semibold",
            riskBadge[ft.risk],
          )}
        >
          <Clock className="h-3 w-3" />
          {ft.label}
        </span>
        {ft.risk === "demurrage" && (
          <span className="text-xs font-bold text-rose-500 tabular-nums">
            {eur(ft.accruedEur)} accrued
          </span>
        )}
      </div>

      {/* Free-time progress bar */}
      <div className="mb-1 flex justify-between text-[0.62rem] text-muted-foreground">
        <span>Free time used</span>
        <span>{Math.round(consumedPct)}%</span>
      </div>
      <div className="h-2 rounded-full bg-foreground/[0.08] overflow-hidden mb-4">
        <motion.div
          className={cn("h-full rounded-full", riskColor)}
          initial={{ width: 0 }}
          animate={{ width: `${consumedPct}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      {/* Ledger grid */}
      <dl className="grid grid-cols-2 gap-2">
        <LedgerField
          label="Free days total"
          value={`${shipment.freeDaysTotal} days`}
        />
        <LedgerField
          label="Daily rate"
          value={`${eur(shipment.demurrageRatePerDay)} / day`}
          highlight={ft.risk !== "healthy"}
        />
        <LedgerField
          label="Free time expires"
          value={formatDate(shipment.freeTimeExpiresAt)}
        />
        <LedgerField
          label="Potential liability"
          value={
            ft.hoursLeft < 0
              ? eur(ft.accruedEur)
              : ft.hoursLeft < thresholds.warningH
                ? `Up to ${eur(Math.ceil(-ft.hoursLeft / 24 + 7) * shipment.demurrageRatePerDay)}`
                : "—"
          }
          highlight={ft.risk !== "healthy"}
        />
      </dl>
    </Section>
  );
}

function LedgerField({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg bg-foreground/[0.03] border border-border/60 p-2.5">
      <dt className="text-[0.6rem] uppercase tracking-wider text-muted-foreground/70 mb-0.5">
        {label}
      </dt>
      <dd
        className={cn(
          "text-xs font-semibold tabular-nums",
          highlight ? "text-rose-600 dark:text-rose-400" : "text-foreground",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

// ── 3. Audit History Trail ─────────────────────────────────────────────────────

function AuditTrail({
  logs,
  loading,
}: {
  logs: AuditLogEntry[];
  loading: boolean;
}) {
  return (
    <Section icon={History} title="Audit History Trail">
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <span className="h-3 w-3 rounded-full border-2 border-brand/40 border-t-brand animate-spin" />
          Loading audit trail…
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <History className="h-6 w-6 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground">
            No recorded actions for this shipment yet.
          </p>
          <p className="text-[0.65rem] text-muted-foreground/60">
            AI-approved emails and edits will appear here.
          </p>
        </div>
      ) : (
        <ol className="relative border-l border-border/50 ml-2 space-y-3">
          {logs.map((log) => (
            <li key={log.id} className="pl-4 relative">
              <span
                className={cn(
                  "absolute -left-[0.3125rem] top-1 h-2.5 w-2.5 rounded-full border-2",
                  log.deliveryStatus === "sent"
                    ? "bg-emerald-500 border-emerald-500/50"
                    : log.deliveryStatus === "failed"
                      ? "bg-rose-500 border-rose-500/50"
                      : "bg-brand border-brand/50",
                )}
              />
              <div className="rounded-lg bg-foreground/[0.03] border border-border/60 p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-foreground leading-tight">
                    {ACTION_LABEL[log.actionType] ?? log.actionType}
                  </p>
                  <span className="text-[0.6rem] text-muted-foreground/70 shrink-0 tabular-nums">
                    {timeAgo(log.createdAt)}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.65rem] text-muted-foreground">
                  <span>{log.userEmail}</span>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="capitalize">{log.userRole}</span>
                  {log.costAvoidedEur != null && log.costAvoidedEur > 0 && (
                    <>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        {eur(log.costAvoidedEur)} saved
                      </span>
                    </>
                  )}
                </div>
                {log.emailSubject && (
                  <p className="mt-1 text-[0.65rem] text-muted-foreground/70 truncate">
                    "{log.emailSubject}"
                  </p>
                )}
                <span
                  className={cn(
                    "mt-1.5 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[0.58rem] font-semibold",
                    log.deliveryStatus === "sent"
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25"
                      : log.deliveryStatus === "failed"
                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/25"
                        : "bg-foreground/[0.05] text-muted-foreground border-border",
                  )}
                >
                  {log.deliveryStatus === "sent" && (
                    <CheckCircle2 className="h-2.5 w-2.5" />
                  )}
                  {log.deliveryStatus}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}

// ── 4. Document Vault ──────────────────────────────────────────────────────────

function DocumentVault({
  shipment,
  docOverrides,
  docBusy,
  onDownload,
  onUpload,
}: {
  shipment: OceanShipment;
  docOverrides: Record<string, DocStatus>;
  docBusy: string | null;
  onDownload: (doc: DocConfig) => void;
  onUpload: (doc: DocConfig, file: File) => void;
}) {
  const customsReleased =
    shipment.phase === "Released" || shipment.phase === "Delivered";
  const customsPending = shipment.phase === "Customs Hold";

  return (
    <Section icon={FileText} title="Document Vault" last>
      <ul className="space-y-1.5">
        {DOCS.map((doc) => {
          const status = docStatus(doc, shipment, docOverrides);
          return (
            <li key={doc.code}>
              <DocRow
                doc={doc}
                status={status}
                isBusy={docBusy === doc.code}
                onDownload={() => onDownload(doc)}
                onUpload={(file) => onUpload(doc, file)}
              />
            </li>
          );
        })}

        {/* Customs Release — phase-derived, no Storage interaction */}
        <li>
          <div className="flex items-center gap-2.5 rounded-lg border border-border/60 px-3 py-2">
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md text-[0.58rem] font-bold border shrink-0",
                customsReleased
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                  : customsPending
                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/20"
                    : "bg-foreground/[0.04] text-muted-foreground border-border",
              )}
            >
              CR
            </span>
            <span className="flex-1 text-xs font-medium text-foreground">
              Customs Release
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.62rem] font-semibold",
                customsReleased
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                  : customsPending
                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/20"
                    : "bg-foreground/[0.04] text-muted-foreground border-border",
              )}
            >
              {customsReleased ? (
                <>
                  <FileCheck className="h-2.5 w-2.5" /> Released
                </>
              ) : customsPending ? (
                <>
                  <AlertTriangle className="h-2.5 w-2.5" /> Pending
                </>
              ) : (
                "Not requested"
              )}
            </span>
          </div>
        </li>
      </ul>
    </Section>
  );
}

function DocRow({
  doc,
  status,
  isBusy,
  onDownload,
  onUpload,
}: {
  doc: DocConfig;
  status: DocStatus;
  isBusy: boolean;
  onDownload: () => void;
  onUpload: (file: File) => void;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border/60 px-3 py-2">
      {/* Code chip */}
      <span
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-md text-[0.58rem] font-bold border shrink-0",
          status === "blocked"
            ? "bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/20"
            : status === "cleared"
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
              : "bg-brand/10 text-brand border-brand/20",
        )}
      >
        {doc.code === "B/L" ? "BL" : doc.code}
      </span>

      {/* Name */}
      <span className="flex-1 text-xs font-medium text-foreground truncate">
        {doc.name}
      </span>

      {/* Action button */}
      {status === "blocked" ? (
        // Upload trigger — hidden file input inside a styled label
        <label
          className={cn(
            "inline-flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-[0.62rem] font-semibold transition-colors",
            "bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/20",
            !isBusy && "hover:bg-rose-500/20",
            isBusy && "opacity-70 cursor-not-allowed",
          )}
        >
          {isBusy ? (
            <span className="h-2.5 w-2.5 rounded-full border border-rose-500/40 border-t-rose-500 animate-spin" />
          ) : (
            <Upload className="h-2.5 w-2.5" />
          )}
          {isBusy ? "Uploading…" : "Upload"}
          <input
            type="file"
            accept=".pdf,application/pdf"
            className="sr-only"
            disabled={isBusy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onUpload(file);
                // Reset so same file can be re-selected after a failed upload
                e.target.value = "";
              }
            }}
          />
        </label>
      ) : (
        // Download button — generates signed URL
        <button
          type="button"
          onClick={onDownload}
          disabled={isBusy}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.62rem] font-semibold transition-colors",
            "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
            !isBusy && "hover:bg-emerald-500/20",
            isBusy && "opacity-70 cursor-not-allowed",
          )}
        >
          {isBusy ? (
            <span className="h-2.5 w-2.5 rounded-full border border-emerald-500/40 border-t-emerald-500 animate-spin" />
          ) : (
            <Download className="h-2.5 w-2.5" />
          )}
          {isBusy
            ? "Loading…"
            : status === "cleared"
              ? "Cleared"
              : "On file"}
        </button>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export interface ShipmentDetailDrawerProps {
  /** The selected shipment. null = drawer is closed. */
  shipment: OceanShipment | null;
  onClose: () => void;
}

export function ShipmentDetailDrawer({
  shipment,
  onClose,
}: ShipmentDetailDrawerProps) {
  const isOpen = shipment !== null;

  const { user: authUser } = useAuth();
  const { playSuccess } = useUiSounds();
  const { thresholds } = useDemurrageThresholds();

  // ── State ────────────────────────────────────────────────────────────────────
  const [sendState, setSendState] = useState<SendState>({ status: "idle" });
  const [docOverrides, setDocOverrides] = useState<Record<string, DocStatus>>({});
  const [docBusy, setDocBusy] = useState<string | null>(null);

  // ── Live D&D status (re-computed on every render — tick triggers re-render) ──
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  // ft is intentionally NOT memoized so the tick re-render updates it
  const ft = shipment ? getFreeTimeStatus(shipment, thresholds) : null;

  const showBanner =
    !!shipment &&
    (shipment.customsBlock !== null ||
      ft?.risk === "critical" ||
      ft?.risk === "demurrage");

  // ── Reset all per-shipment state when a different shipment is opened ─────────
  useEffect(() => {
    setSendState({ status: "idle" });
    setDocOverrides({});
    setDocBusy(null);
  }, [shipment?.id]);

  // ── ESC to close ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // ── Audit logs ───────────────────────────────────────────────────────────────
  const { data: auditLogs, loading: auditLoading } = useAsyncData(
    () =>
      shipment
        ? getAuditLogsByShipment(shipment.id, shipment.containerNumber)
        : Promise.resolve([] as AuditLogEntry[]),
    [shipment?.id],
  );

  // ── AI Quick-Action: draft + send ────────────────────────────────────────────
  async function handleDraftAndSend() {
    if (!shipment || !ft || sendState.status === "approving") return;
    setSendState({ status: "approving" });

    const draft = generateAiDraft(shipment, ft);

    // Demo bypass — simulate 1.5 s, show success toast, no real API call
    if (!authUser || authUser.mock) {
      await new Promise((r) => setTimeout(r, 1500));
      setSendState({ status: "sent" });
      playSuccess();
      demoSuccess(
        "AI email sent",
        `Resolution email drafted and sent for ${shipment.containerNumber}.`,
      );
      return;
    }

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
            to:
              shipment.traderEmail ||
              shipment.traderContact ||
              "ops@altunlogistics.com",
            subject: draft.subject,
            body: draft.body,
            shipmentId: shipment.id,
            aiDraftSnapshot: draft.body,
            containerNumber: shipment.containerNumber,
            costAvoidedEur:
              ft.accruedEur > 0 ? ft.accruedEur : undefined,
            demurrageRisk: ft.risk,
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
        "AI email sent",
        `Resolution email sent for ${shipment.containerNumber}.`,
      );
    } else {
      setSendState({
        status: "failed",
        error: result.error ?? "Send failed.",
      });
    }
  }

  // ── Document: download (signed URL) ─────────────────────────────────────────
  async function handleDocDownload(doc: DocConfig) {
    if (docBusy || !shipment) return;
    setDocBusy(doc.code);

    // Demo bypass
    if (!authUser || authUser.mock || !isSupabaseConfigured) {
      await new Promise((r) => setTimeout(r, 800));
      setDocBusy(null);
      demoSuccess(
        "Document ready",
        `${doc.name} would open via a secure signed URL.`,
      );
      return;
    }

    try {
      const path = `${shipment.id}/${doc.storageKey}.pdf`;
      const { data, error } = await supabase.storage
        .from("shipment-documents")
        .createSignedUrl(path, 60); // 60-second expiry

      if (error || !data?.signedUrl) {
        throw error ?? new Error("Failed to generate download URL.");
      }

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      demoError(
        "Download failed",
        err instanceof Error ? err.message : "Unknown error.",
      );
    } finally {
      setDocBusy(null);
    }
  }

  // ── Document: upload ─────────────────────────────────────────────────────────
  async function handleDocUpload(doc: DocConfig, file: File) {
    if (docBusy || !shipment) return;
    setDocBusy(doc.code);

    // Demo bypass
    if (!authUser || authUser.mock || !isSupabaseConfigured) {
      await new Promise((r) => setTimeout(r, 1500));
      setDocOverrides((prev) => ({ ...prev, [doc.code]: "on_file" }));
      setDocBusy(null);
      demoSuccess("Document uploaded", `${doc.name} marked as on file.`);
      return;
    }

    try {
      const path = `${shipment.id}/${doc.storageKey}.pdf`;
      const { error } = await supabase.storage
        .from("shipment-documents")
        .upload(path, file, { upsert: true, contentType: "application/pdf" });

      if (error) throw error;

      setDocOverrides((prev) => ({ ...prev, [doc.code]: "on_file" }));
      demoSuccess("Document uploaded", `${doc.name} has been uploaded.`);
    } catch (err) {
      demoError(
        "Upload failed",
        err instanceof Error ? err.message : "Unknown error.",
      );
    } finally {
      setDocBusy(null);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {isOpen && shipment && ft && (
        <>
          {/* Backdrop */}
          <motion.div
            key="sdd-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
            aria-hidden="true"
            onClick={onClose}
          />

          {/* Slide-over panel */}
          <motion.aside
            key="sdd-panel"
            role="dialog"
            aria-modal="true"
            aria-label={`Shipment detail — ${shipment.containerNumber}`}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-[min(100vw,32rem)] flex flex-col glass-panel border-l border-white/[0.08] shadow-[var(--shadow-elevated)]"
          >
            {/* Header */}
            <header className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-border/50 shrink-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-base font-bold text-foreground">
                    {shipment.containerNumber}
                  </span>
                  <PhaseBadge phase={shipment.phase} />
                  <span className="text-[0.65rem] text-muted-foreground">
                    {shipment.containerType}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground truncate">
                  {shipment.carrier} · {shipment.vessel} · Voy.{" "}
                  {shipment.voyage}
                </p>
                <p className="text-[0.65rem] text-muted-foreground/70">
                  {shipment.pol} → {shipment.pod} · {shipment.direction}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close detail drawer"
                className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            {/* Scrollable body */}
            <div className="flex-1 min-h-0 overflow-y-auto scroll-thin">
              {/* AI Quick-Action banner — visible only when actionable */}
              {showBanner && (
                <QuickActionBanner
                  shipment={shipment}
                  ft={ft}
                  sendState={sendState}
                  onDraftAndSend={handleDraftAndSend}
                />
              )}

              <StatusSection shipment={shipment} />

              <DdLedger
                shipment={shipment}
                ft={ft}
                thresholds={thresholds}
              />

              <AuditTrail logs={auditLogs ?? []} loading={auditLoading} />

              <DocumentVault
                shipment={shipment}
                docOverrides={docOverrides}
                docBusy={docBusy}
                onDownload={handleDocDownload}
                onUpload={handleDocUpload}
              />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
