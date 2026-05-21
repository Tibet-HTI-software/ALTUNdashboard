/**
 * ExceptionAlertCenter — Management-by-Exception risk widget.
 *
 * Filters live OceanShipment data down to only shipments with actionable flags
 * and surfaces them as an alert strip. Designed to be the first thing a
 * Freight Forwarder or Ops Manager sees on their dashboard.
 *
 * Exception types (sorted by urgency):
 *
 *  Export triggers:
 *   1. cy-closing       — ETD < 72 h (CY gate closing imminent)        → critical/red
 *   2. vgm-closing      — ETD 72–168 h (VGM submission deadline)       → high/amber
 *
 *  Import triggers:
 *   3. customs-hold     — customsBlock !== null                         → critical/red
 *   4. demurrage-fire   — free time already expired                     → critical/red
 *   5. arrival-missing  — Discharged > 24 h, no customs action yet      → high/rose
 *   6. demurrage-crit   — free time expires < 24 h                      → high/amber
 *   7. eta-changed      — In Transit but ETA already passed             → medium/amber
 *   8. demurrage-warn   — free time expires 24–72 h                     → medium/amber
 */

import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Anchor,
  ChevronDown,
  ChevronUp,
  Clock,
  Container,
  FileWarning,
  Flame,
  RefreshCw,
  ShieldAlert,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OceanShipment } from "@/lib/dashboard/api";
import { getFreeTimeStatus } from "@/lib/dashboard/api";

/* ── Exception model ─────────────────────────────────────────────────────── */

type ExceptionKind =
  | "cy-closing"
  | "vgm-closing"
  | "customs-hold"
  | "demurrage-fire"
  | "arrival-missing"
  | "demurrage-crit"
  | "eta-changed"
  | "demurrage-warn";

type Urgency = "critical" | "high" | "medium";

interface ShipmentException {
  kind: ExceptionKind;
  urgency: Urgency;
  shipment: OceanShipment;
  /** Human-readable detail line. */
  detail: string;
}

const URGENCY_ORDER: Record<Urgency, number> = {
  critical: 0,
  high: 1,
  medium: 2,
};

/* ── Exception computation ───────────────────────────────────────────────── */

/** Hours until a future ISO date string (negative = past). */
function hoursUntil(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / 3_600_000;
}

function computeExceptions(shipments: OceanShipment[]): ShipmentException[] {
  const out: ShipmentException[] = [];

  for (const s of shipments) {
    /* ── Export: deadline triggers ────────────────────────────────── */
    if (s.direction === "Export" && (s.phase === "Booked" || s.phase === "In Transit")) {
      const hUntilEtd = hoursUntil(s.etd);

      if (hUntilEtd > 0 && hUntilEtd <= 72) {
        // CY gate closing in < 3 days — critical
        const days = Math.ceil(hUntilEtd / 24);
        out.push({
          kind: "cy-closing",
          urgency: "critical",
          shipment: s,
          detail: `CY gate closes in ${days}d — ETD ${new Date(s.etd).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
        });
        continue;
      }

      if (hUntilEtd > 72 && hUntilEtd <= 168) {
        // VGM submission deadline within 7 days
        const days = Math.ceil(hUntilEtd / 24);
        out.push({
          kind: "vgm-closing",
          urgency: "high",
          shipment: s,
          detail: `VGM deadline approx. ${days - 2}d · ETD ${new Date(s.etd).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
        });
        continue;
      }
    }

    /* ── Import: customs hold ─────────────────────────────────────── */
    if (s.customsBlock !== null) {
      out.push({
        kind: "customs-hold",
        urgency: "critical",
        shipment: s,
        detail: s.customsBlock,
      });
      continue;
    }

    /* ── Import: demurrage & terminal exceptions ─────────────────── */
    if (s.phase === "Discharged" || s.phase === "Released") {
      const fts = getFreeTimeStatus(s);

      if (fts.risk === "demurrage") {
        out.push({
          kind: "demurrage-fire",
          urgency: "critical",
          shipment: s,
          detail: `Demurrage accruing · ${fts.label} · €${fts.accruedEur.toFixed(0)}/day`,
        });
        continue;
      }

      // Arrival notice missing: discharged > 24h, free time still ok
      if (
        s.phase === "Discharged" &&
        s.dischargedAt !== null &&
        -hoursUntil(s.dischargedAt) > 24
      ) {
        out.push({
          kind: "arrival-missing",
          urgency: "high",
          shipment: s,
          detail: `Discharged ${Math.floor(-hoursUntil(s.dischargedAt) / 24)}d ago — arrival notice required`,
        });
        // don't `continue` — may also surface demurrage warning below
      }

      if (fts.risk === "critical") {
        out.push({
          kind: "demurrage-crit",
          urgency: "high",
          shipment: s,
          detail: `Free time expires in ${fts.label} — demurrage imminent`,
        });
      } else if (fts.risk === "warning") {
        out.push({
          kind: "demurrage-warn",
          urgency: "medium",
          shipment: s,
          detail: `Demurrage risk in ${fts.label} — arrange collection`,
        });
      }

      continue;
    }

    /* ── Import: ETA passed but still In Transit ─────────────────── */
    if (
      s.direction === "Import" &&
      s.phase === "In Transit" &&
      hoursUntil(s.eta) < -24
    ) {
      const daysLate = Math.floor(-hoursUntil(s.eta) / 24);
      out.push({
        kind: "eta-changed",
        urgency: "medium",
        shipment: s,
        detail: `Vessel ${daysLate}d late — ETA was ${new Date(s.eta).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · awaiting update`,
      });
    }
  }

  return out
    .sort((a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency])
    .slice(0, 8); // cap at 8 for readability
}

/* ── Visual config per exception kind ───────────────────────────────────── */

interface KindConfig {
  Icon: React.ElementType;
  label: string;
  badgeCls: string;
  rowCls: string;
  iconCls: string;
  actionLabel: string;
  actionTo: "/dashboard/shipments" | "/dashboard/customs";
  actionCls: string;
}

const KIND_CONFIG: Record<ExceptionKind, KindConfig> = {
  "cy-closing": {
    Icon: Container,
    label: "CY Closing",
    badgeCls:
      "border-rose-500/35 bg-rose-500/10 text-rose-600 dark:text-rose-400",
    rowCls: "border-rose-500/20 bg-rose-500/[0.03]",
    iconCls: "border-rose-500/25 bg-rose-500/10 text-rose-500",
    actionLabel: "Submit Booking",
    actionTo: "/dashboard/shipments",
    actionCls: "bg-rose-500 text-white hover:bg-rose-600",
  },
  "vgm-closing": {
    Icon: Anchor,
    label: "VGM Deadline",
    badgeCls:
      "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    rowCls: "border-amber-500/20 bg-amber-500/[0.03]",
    iconCls: "border-amber-500/25 bg-amber-500/10 text-amber-500",
    actionLabel: "Submit VGM",
    actionTo: "/dashboard/shipments",
    actionCls:
      "border border-amber-500/40 bg-amber-500/[0.08] text-amber-700 dark:text-amber-300 hover:bg-amber-500/[0.15]",
  },
  "customs-hold": {
    Icon: FileWarning,
    label: "Customs Hold",
    badgeCls:
      "border-rose-500/35 bg-rose-500/10 text-rose-600 dark:text-rose-400",
    rowCls: "border-rose-500/20 bg-rose-500/[0.03]",
    iconCls: "border-rose-500/25 bg-rose-500/10 text-rose-500",
    actionLabel: "Resolve",
    actionTo: "/dashboard/customs",
    actionCls: "bg-rose-500 text-white hover:bg-rose-600",
  },
  "demurrage-fire": {
    Icon: Flame,
    label: "Demurrage Active",
    badgeCls:
      "border-rose-600/35 bg-rose-600/10 text-rose-700 dark:text-rose-300",
    rowCls: "border-rose-600/20 bg-rose-600/[0.03]",
    iconCls: "border-rose-600/25 bg-rose-600/10 text-rose-600",
    actionLabel: "Track",
    actionTo: "/dashboard/shipments",
    actionCls:
      "border border-rose-500/30 bg-rose-500/[0.06] text-rose-700 dark:text-rose-300 hover:bg-rose-500/[0.12]",
  },
  "arrival-missing": {
    Icon: AlertTriangle,
    label: "Arrival Notice Missing",
    badgeCls:
      "border-rose-400/35 bg-rose-400/10 text-rose-600 dark:text-rose-300",
    rowCls: "border-rose-400/15 bg-rose-400/[0.02]",
    iconCls: "border-rose-400/25 bg-rose-400/[0.08] text-rose-500",
    actionLabel: "Request Notice",
    actionTo: "/dashboard/shipments",
    actionCls:
      "border border-rose-400/30 bg-rose-400/[0.06] text-rose-600 dark:text-rose-300 hover:bg-rose-400/[0.12]",
  },
  "demurrage-crit": {
    Icon: Timer,
    label: "D&D Critical",
    badgeCls:
      "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    rowCls: "border-amber-500/20 bg-amber-500/[0.03]",
    iconCls: "border-amber-500/25 bg-amber-500/10 text-amber-500",
    actionLabel: "Track",
    actionTo: "/dashboard/shipments",
    actionCls:
      "border border-amber-500/30 bg-amber-500/[0.06] text-amber-700 dark:text-amber-300 hover:bg-amber-500/[0.12]",
  },
  "eta-changed": {
    Icon: RefreshCw,
    label: "ETA Updated",
    badgeCls:
      "border-sky-500/30 bg-sky-500/[0.08] text-sky-600 dark:text-sky-400",
    rowCls: "border-sky-500/15 bg-sky-500/[0.02]",
    iconCls: "border-sky-500/20 bg-sky-500/[0.08] text-sky-500",
    actionLabel: "Track",
    actionTo: "/dashboard/shipments",
    actionCls:
      "border border-sky-500/30 bg-sky-500/[0.06] text-sky-700 dark:text-sky-300 hover:bg-sky-500/[0.12]",
  },
  "demurrage-warn": {
    Icon: Clock,
    label: "D&D Warning",
    badgeCls:
      "border-amber-400/30 bg-amber-400/[0.08] text-amber-600 dark:text-amber-400",
    rowCls: "border-amber-400/15 bg-amber-400/[0.02]",
    iconCls: "border-amber-400/20 bg-amber-400/[0.08] text-amber-500",
    actionLabel: "Track",
    actionTo: "/dashboard/shipments",
    actionCls:
      "border border-amber-400/25 bg-amber-400/[0.04] text-amber-600 dark:text-amber-400 hover:bg-amber-400/[0.10]",
  },
};

/* ── Single exception row ────────────────────────────────────────────────── */

function ExceptionRow({ ex }: { ex: ShipmentException }) {
  const cfg = KIND_CONFIG[ex.kind];
  const { shipment: s } = ex;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 6 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "flex items-center gap-3 rounded-xl border px-4 py-3",
        cfg.rowCls,
      )}
    >
      {/* Icon */}
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg border shrink-0",
          cfg.iconCls,
        )}
      >
        <cfg.Icon className="h-3.5 w-3.5" />
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[0.82rem] font-bold text-foreground">
            {s.id}
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold",
              cfg.badgeCls,
            )}
          >
            {cfg.label}
          </span>
          <span className="text-[0.6rem] font-medium text-muted-foreground/60 uppercase tracking-wide">
            {s.direction}
          </span>
        </div>
        <p className="text-[0.7rem] text-muted-foreground mt-0.5 truncate">
          <span className="font-medium text-foreground/70">{s.trader}</span>
          {" · "}
          {s.pol} → {s.pod}
          {" · "}
          {ex.detail}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <Link
          to={cfg.actionTo}
          className={cn(
            "inline-flex h-7 items-center px-3 rounded-lg text-[0.72rem] font-semibold transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
            cfg.actionCls,
          )}
        >
          {cfg.actionLabel}
        </Link>
        <Link
          to="/dashboard/shipments"
          className={cn(
            "h-7 px-3 rounded-lg text-[0.72rem] font-semibold transition-colors border inline-flex items-center",
            "border-border bg-foreground/[0.03] text-muted-foreground",
            "hover:text-foreground hover:border-brand/30",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
          )}
        >
          Details
        </Link>
      </div>
    </motion.div>
  );
}

/* ── Main widget ─────────────────────────────────────────────────────────── */

interface Props {
  shipments: OceanShipment[];
  className?: string;
}

export function ExceptionAlertCenter({ shipments, className }: Props) {
  const exceptions = useMemo(
    () => computeExceptions(shipments),
    [shipments],
  );

  const [expanded, setExpanded] = useState(true);

  const criticalCount = exceptions.filter((e) => e.urgency === "critical").length;
  const highCount = exceptions.filter((e) => e.urgency === "high").length;

  if (exceptions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "rounded-2xl border border-rose-500/20 bg-rose-500/[0.02] overflow-hidden",
        className,
      )}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-foreground/[0.02] transition-colors focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-brand"
        aria-expanded={expanded}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10 border border-rose-500/20 shrink-0">
          <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
        </span>

        <div className="flex-1 min-w-0 flex items-center gap-3 flex-wrap">
          <p className="text-sm font-bold text-foreground">
            Exception Alert Center
          </p>
          <div className="flex items-center gap-1.5">
            {criticalCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[0.6rem] font-bold text-rose-600 dark:text-rose-400">
                <AlertTriangle className="h-2.5 w-2.5" />
                {criticalCount} critical
              </span>
            )}
            {highCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[0.6rem] font-bold text-amber-600 dark:text-amber-400">
                {highCount} high
              </span>
            )}
            <span className="text-[0.65rem] text-muted-foreground">
              {exceptions.length} exception{exceptions.length !== 1 ? "s" : ""} require attention
            </span>
          </div>
        </div>

        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {/* Rows */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="rows"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2">
              <AnimatePresence>
                {exceptions.map((ex) => (
                  <ExceptionRow
                    key={`${ex.kind}-${ex.shipment.id}`}
                    ex={ex}
                  />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
