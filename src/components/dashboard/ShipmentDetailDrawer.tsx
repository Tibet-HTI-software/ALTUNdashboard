/**
 * ShipmentDetailDrawer
 *
 * Premium slide-over panel that opens when an operator selects a container
 * row in the Demurrage Risk Board or Fleet Tracking vessel list.
 *
 * Four internal sections:
 *  1. Live Status & Telemetry  — phase step-tracker, route, port coordinates.
 *  2. D&D Financial Ledger     — live free-time countdown, accrued EUR calc.
 *  3. Audit History Trail      — AI actions logged in public.audit_logs.
 *  4. Document Vault           — customs doc status derived from customsBlock.
 *
 * Data sync:
 *  The drawer receives `shipment` as a prop from the parent which holds live
 *  data from useRealtimeShipments(). Any WebSocket event that triggers a
 *  parent re-render automatically flows into the drawer — no separate
 *  subscription needed.
 *
 * Closing: backdrop click, ESC key, or the × button all call `onClose`.
 */

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Anchor,
  CheckCircle2,
  Clock,
  FileCheck,
  FileText,
  FileX,
  History,
  Mail,
  MapPin,
  Package,
  Ship,
  User,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getFreeTimeStatus,
  getAuditLogsByShipment,
  useAsyncData,
  type AuditLogEntry,
  type OceanShipment,
  type CustomsBlockReason,
  type ShipmentPhase,
} from "@/lib/dashboard/api";
import { useDemurrageThresholds } from "@/lib/dashboard/demurrage";
import { portCoord } from "@/data/dashboard/ports";
import { formatDate, formatDateShort } from "@/lib/dashboard/format";

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Phase step-tracker config ─────────────────────────────────────────────────

const PHASE_STEPS: { label: string; phases: ShipmentPhase[] }[] = [
  { label: "Booked",      phases: ["Booked"] },
  { label: "In Transit",  phases: ["In Transit"] },
  { label: "Discharged",  phases: ["Discharged", "Customs Hold"] },
  { label: "Cleared",     phases: ["Released"] },
  { label: "Delivered",   phases: ["Delivered"] },
];

/** Returns the index of the currently active step (0-based). */
function activeStep(phase: ShipmentPhase): number {
  const idx = PHASE_STEPS.findIndex((s) =>
    (s.phases as string[]).includes(phase),
  );
  return idx < 0 ? 0 : idx;
}

// ── Document vault config ─────────────────────────────────────────────────────

interface DocConfig {
  name: string;
  code: string;
  /** Which customsBlock reason blocks this document. null = never blocks. */
  blockReason: CustomsBlockReason | null;
}

const DOCS: DocConfig[] = [
  {
    name: "Bill of Lading",
    code: "B/L",
    blockReason: "Incomplete Bill of Lading",
  },
  {
    name: "Commercial Invoice",
    code: "CI",
    blockReason: "Missing Commercial Invoice",
  },
  {
    name: "Packing List",
    code: "PL",
    blockReason: "Packing List Discrepancy",
  },
  {
    name: "Certificate of Origin",
    code: "CO",
    blockReason: "Certificate of Origin Hold",
  },
  {
    name: "Duty Clearance",
    code: "DC",
    blockReason: "Pending Duty Payment",
  },
  {
    name: "Phytosanitary Cert.",
    code: "PC",
    blockReason: "Phytosanitary Certificate Missing",
  },
];

type DocStatus = "on_file" | "blocked" | "cleared";

function docStatus(doc: DocConfig, shipment: OceanShipment): DocStatus {
  if (
    shipment.customsBlock === doc.blockReason &&
    doc.blockReason !== null
  ) {
    // If the shipment has since been released the block is resolved
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

// ── Action type display map ───────────────────────────────────────────────────

const ACTION_LABEL: Record<string, string> = {
  AI_EMAIL_APPROVED: "AI email approved & sent",
  AI_EMAIL_SEND_FAILED: "AI email send failed",
  AI_EMAIL_REJECTED: "AI email rejected",
};

// ── Section wrapper ───────────────────────────────────────────────────────────

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

// ── Phase badge ───────────────────────────────────────────────────────────────

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

// ── 1. Live Status & Telemetry ────────────────────────────────────────────────

function StatusSection({ shipment }: { shipment: OceanShipment }) {
  const step = activeStep(shipment.phase);
  const isBlocked = shipment.phase === "Customs Hold";
  const polCoord = portCoord(shipment.pol);
  const podCoord = portCoord(shipment.pod);

  return (
    <Section icon={Ship} title="Live Status & Telemetry">
      {/* Phase step-tracker */}
      <div className="relative flex items-center justify-between mb-4">
        {/* Connector line behind the dots */}
        <div className="absolute left-0 right-0 top-[0.5625rem] h-px bg-border" aria-hidden />

        {PHASE_STEPS.map((s, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <div key={s.label} className="relative flex flex-col items-center gap-1.5 z-10">
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
                  <CheckCircle2 className="h-2.5 w-2.5 text-white" aria-hidden />
                )}
                {active && isBlocked && (
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" aria-hidden />
                )}
                {active && !isBlocked && (
                  <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
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
        <TelemetryField
          label="B/L Number"
          value={shipment.blNumber}
          mono
        />
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

// ── 2. D&D Financial Ledger ───────────────────────────────────────────────────

function DdLedger({ shipment }: { shipment: OceanShipment }) {
  const { thresholds } = useDemurrageThresholds();

  // Re-render every 60 s so the countdown stays live inside the open drawer.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const ft = useMemo(
    () => getFreeTimeStatus(shipment, thresholds),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shipment, thresholds, /* tick */],
  );

  // Free-time consumption: percentage of total free days already elapsed.
  const totalH = shipment.freeDaysTotal * 24;
  const usedH = Math.max(0, totalH - Math.max(ft.hoursLeft, 0));
  const consumedPct = Math.min(100, (usedH / totalH) * 100);

  const riskColor =
    ft.risk === "demurrage" || ft.risk === "critical"
      ? "bg-rose-500"
      : ft.risk === "warning"
        ? "bg-amber-500"
        : "bg-emerald-500";

  const riskBadge: Record<
    typeof ft.risk,
    string
  > = {
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
      {/* Risk status pill + countdown */}
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

// ── 3. Audit History Trail ────────────────────────────────────────────────────

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
              {/* Timeline dot */}
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
                {/* Delivery status chip */}
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

// ── 4. Document Vault ─────────────────────────────────────────────────────────

function DocumentVault({ shipment }: { shipment: OceanShipment }) {
  // Customs release is derived from phase rather than a specific doc block
  const customsReleased =
    shipment.phase === "Released" || shipment.phase === "Delivered";
  const customsPending = shipment.phase === "Customs Hold";

  return (
    <Section icon={FileText} title="Document Vault" last>
      <ul className="space-y-1.5">
        {DOCS.map((doc) => {
          const status = docStatus(doc, shipment);
          return (
            <li key={doc.code}>
              <DocRow doc={doc} status={status} />
            </li>
          );
        })}

        {/* Customs Release — phase-derived */}
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
}: {
  doc: DocConfig;
  status: DocStatus;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border/60 px-3 py-2">
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
        {doc.code}
      </span>
      <span className="flex-1 text-xs font-medium text-foreground truncate">
        {doc.name}
      </span>
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.62rem] font-semibold",
          status === "blocked"
            ? "bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/20"
            : status === "cleared"
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
        )}
      >
        {status === "blocked" ? (
          <>
            <FileX className="h-2.5 w-2.5" /> Blocked
          </>
        ) : status === "cleared" ? (
          <>
            <FileCheck className="h-2.5 w-2.5" /> Cleared
          </>
        ) : (
          <>
            <FileCheck className="h-2.5 w-2.5" /> On file
          </>
        )}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

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

  // ESC key — must reference the latest onClose without re-subscribing.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Audit logs — re-fetches when the selected shipment changes.
  const { data: auditLogs, loading: auditLoading } = useAsyncData(
    () =>
      shipment
        ? getAuditLogsByShipment(shipment.id, shipment.containerNumber)
        : Promise.resolve([] as AuditLogEntry[]),
    [shipment?.id],
  );

  return (
    <AnimatePresence>
      {isOpen && shipment && (
        <>
          {/* ── Backdrop ────────────────────────────────────────── */}
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

          {/* ── Slide-over panel ────────────────────────────────── */}
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
            {/* ── Header ──────────────────────────────────────── */}
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

            {/* ── Scrollable body ──────────────────────────────── */}
            <div className="flex-1 min-h-0 overflow-y-auto scroll-thin">
              <StatusSection shipment={shipment} />
              <DdLedger shipment={shipment} />
              <AuditTrail
                logs={auditLogs ?? []}
                loading={auditLoading}
              />
              <DocumentVault shipment={shipment} />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
