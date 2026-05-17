import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Anchor, Clock, Container, Ship } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getFreeTimeStatus,
  type FreeTimeRisk,
  type OceanShipment,
} from "@/lib/dashboard/api";
import { useDemurrageThresholds } from "@/lib/dashboard/demurrage";

const RISK_STYLE: Record<
  FreeTimeRisk,
  { ring: string; chip: string; dot: string; label: string }
> = {
  demurrage: {
    ring: "border-rose-500/40 bg-rose-500/[0.04]",
    chip: "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30",
    dot: "bg-rose-500",
    label: "In demurrage",
  },
  critical: {
    ring: "border-rose-500/30 bg-rose-500/[0.03]",
    chip: "bg-rose-500/12 text-rose-600 dark:text-rose-300 border-rose-500/25",
    dot: "bg-rose-500",
    label: "Critical · <24h",
  },
  warning: {
    ring: "border-amber-500/30 bg-amber-500/[0.03]",
    chip: "bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/25",
    dot: "bg-amber-500",
    label: "Warning · <72h",
  },
  healthy: {
    ring: "border-border",
    chip: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
    dot: "bg-emerald-500",
    label: "Healthy",
  },
};

const eur = (n: number) =>
  n.toLocaleString("en-GB", { style: "currency", currency: "EUR" });

type Filter = "all" | "atrisk";

/**
 * Ocean Freight Planner board — containers ranked by remaining terminal
 * free time, colour-coded by D&D risk. Cards glide (`layout`) when the
 * filter changes so the planner can focus on what is burning down.
 */
export function DemurrageRiskBoard({
  shipments,
}: {
  shipments: OceanShipment[];
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const { thresholds } = useDemurrageThresholds();

  // Re-render every 60s so the free-time countdown stays live.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const ranked = useMemo(() => {
    return shipments
      .filter((s) => s.phase !== "Delivered")
      .map((s) => ({ s, ft: getFreeTimeStatus(s, thresholds) }))
      .sort((a, b) => a.ft.hoursLeft - b.ft.hoursLeft);
  }, [shipments, thresholds]);

  const counts = useMemo(() => {
    const c = { demurrage: 0, critical: 0, warning: 0, healthy: 0 };
    for (const r of ranked) c[r.ft.risk] += 1;
    return c;
  }, [ranked]);

  const totalExposure = useMemo(
    () => ranked.reduce((sum, r) => sum + r.ft.accruedEur, 0),
    [ranked],
  );

  const visible = ranked.filter((r) =>
    filter === "all" ? true : r.ft.risk !== "healthy",
  );

  return (
    <div className="space-y-4">
      {/* Risk summary strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryStat
          tone="rose"
          label="In demurrage"
          value={counts.demurrage}
          hint={
            totalExposure > 0 ? `${eur(totalExposure)} accrued` : "No fines"
          }
        />
        <SummaryStat
          tone="rose"
          label={`Critical (<${thresholds.criticalH}h)`}
          value={counts.critical}
          hint="Free time almost gone"
        />
        <SummaryStat
          tone="amber"
          label={`Warning (<${thresholds.warningH}h)`}
          value={counts.warning}
          hint="Plan collection now"
        />
        <SummaryStat
          tone="emerald"
          label="Healthy"
          value={counts.healthy}
          hint="Comfortable free time"
        />
      </div>

      {/* Filter */}
      <div
        role="group"
        aria-label="Risk filter"
        className="inline-flex gap-1 rounded-lg bg-foreground/[0.04] p-1"
      >
        {(["all", "atrisk"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={cn(
              "h-8 rounded-md px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
              filter === f
                ? "bg-brand text-white shadow-[0_2px_8px_-3px_var(--brand)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {f === "all" ? "All containers" : "At risk only"}
          </button>
        ))}
      </div>

      {/* Container cards */}
      <motion.ul layout className="grid gap-3 lg:grid-cols-2">
        <AnimatePresence mode="popLayout">
          {visible.map(({ s, ft }) => {
            const style = RISK_STYLE[ft.risk];
            return (
              <motion.li
                key={s.id}
                layout
                layoutId={`dd-${s.id}`}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className={cn("rounded-xl border p-4 card-premium", style.ring)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Container className="h-4 w-4 text-brand shrink-0" />
                      <span className="font-mono text-sm font-semibold text-foreground">
                        {s.containerNumber}
                      </span>
                      <span className="text-[0.65rem] font-medium text-muted-foreground">
                        {s.containerType}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground truncate">
                      {s.trader} · {s.commodity}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 h-7 text-[0.7rem] font-semibold shrink-0",
                      style.chip,
                    )}
                  >
                    <Clock className="h-3 w-3" />
                    {ft.label}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <Field
                    icon={<Ship className="h-3 w-3" />}
                    label="Vessel"
                    value={`${s.vessel} · ${s.voyage}`}
                  />
                  <Field
                    icon={<Anchor className="h-3 w-3" />}
                    label="Route"
                    value={`${s.pol} → ${s.pod}`}
                  />
                  <Field label="Terminal" value={s.terminal} />
                  <Field
                    label="Demurrage rate"
                    value={`${eur(s.demurrageRatePerDay)}/day`}
                  />
                </div>

                {ft.risk === "demurrage" && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/25 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-300">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {eur(ft.accruedEur)} in demurrage fines already accrued.
                  </div>
                )}
              </motion.li>
            );
          })}
        </AnimatePresence>
      </motion.ul>
    </div>
  );
}

function SummaryStat({
  tone,
  label,
  value,
  hint,
}: {
  tone: "rose" | "amber" | "emerald";
  label: string;
  value: number;
  hint: string;
}) {
  const dot =
    tone === "rose"
      ? "bg-rose-500"
      : tone === "amber"
        ? "bg-amber-500"
        : "bg-emerald-500";
  return (
    <div className="card-premium rounded-xl p-4">
      <div className="flex items-center gap-2">
        <span className={cn("h-2 w-2 rounded-full", dot)} aria-hidden />
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="mt-2 font-display text-2xl font-bold text-foreground tabular-nums">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function Field({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 text-[0.62rem] uppercase tracking-wider text-muted-foreground/80">
        {icon}
        {label}
      </p>
      <p className="text-foreground font-medium truncate">{value}</p>
    </div>
  );
}
