/**
 * Co2FootprintWidget — ESG carbon footprint tracker.
 *
 * Shows MT CO2e emitted vs quarterly target via an SVG area chart.
 * Includes a green reduction badge and KPI summary strip — ready for
 * ESG / sustainability reporting slides.
 *
 * Two display modes:
 *   compact  — smaller card for portal sidebar usage
 *   default  — full chart card for CEO dashboard
 */

import { motion } from "framer-motion";
import { Leaf, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Mock data ───────────────────────────────────────────────────────────── */

const QUARTERS = [
  { q: "Q1 '25", actual: 847, target: 900 },
  { q: "Q2 '25", actual: 831, target: 880 },
  { q: "Q3 '25", actual: 798, target: 860 },
  { q: "Q4 '25", actual: 812, target: 840 },
  { q: "Q1 '26", actual: 714, target: 820 },
];

/** % reduction from previous quarter → current. */
const REDUCTION_PCT = Math.round(
  ((QUARTERS[3].actual - QUARTERS[4].actual) / QUARTERS[3].actual) * 100,
);

/** Annual budget (sum of targets). */
const ANNUAL_TARGET = QUARTERS.reduce((s, d) => s + d.target, 0);
/** YTD actual (last two quarters in view = 2026 so far + 2025 total). */
const YTD_ACTUAL = QUARTERS.reduce((s, d) => s + d.actual, 0);

/* ── SVG chart helpers ───────────────────────────────────────────────────── */

const SVG_W = 480;
const SVG_H = 110;
const PAD = { top: 12, right: 12, bottom: 28, left: 0 };

const chartW = SVG_W - PAD.left - PAD.right;
const chartH = SVG_H - PAD.top - PAD.bottom;

const Y_MIN = 670;
const Y_MAX = 920;

function scaleX(i: number) {
  return PAD.left + (i / (QUARTERS.length - 1)) * chartW;
}
function scaleY(v: number) {
  return PAD.top + chartH * (1 - (v - Y_MIN) / (Y_MAX - Y_MIN));
}

const actualPts = QUARTERS.map((d, i) => `${scaleX(i)},${scaleY(d.actual)}`);
const targetPts = QUARTERS.map((d, i) => `${scaleX(i)},${scaleY(d.target)}`);

const actualLinePath = `M${actualPts.join(" L")}`;
const targetLinePath = `M${targetPts.join(" L")}`;
const actualAreaPath =
  `M${actualPts.join(" L")}` +
  ` L${scaleX(QUARTERS.length - 1)},${SVG_H - PAD.bottom}` +
  ` L${scaleX(0)},${SVG_H - PAD.bottom} Z`;

/* ── Component ───────────────────────────────────────────────────────────── */

interface Props {
  /** Compact layout for client portal — removes some chart chrome. */
  compact?: boolean;
  className?: string;
}

export function Co2FootprintWidget({ compact = false, className }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className={cn("card-premium rounded-2xl border border-border p-5", className)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 shrink-0">
            <Leaf className="h-3.5 w-3.5 text-emerald-500" />
          </span>
          <div>
            <p className="text-sm font-bold text-foreground leading-snug">
              {compact ? "Carbon Footprint" : "CO₂ Emissions vs Target"}
            </p>
            <p className="text-[0.62rem] text-muted-foreground">
              MT CO₂e · Scope 3 ocean freight
            </p>
          </div>
        </div>

        {/* Reduction badge */}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[0.68rem] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
          <TrendingDown className="h-3 w-3" />
          −{REDUCTION_PCT}% vs Q4 '25
        </span>
      </div>

      {/* SVG chart */}
      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full"
          aria-label="CO2 emissions chart"
          role="img"
        >
          <defs>
            {/* Actual area gradient */}
            <linearGradient id="co2-actual-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Horizontal grid lines (subtle) */}
          {[Y_MIN + 100, Y_MIN + 150, Y_MIN + 200].map((v) => (
            <line
              key={v}
              x1={PAD.left}
              y1={scaleY(v)}
              x2={SVG_W - PAD.right}
              y2={scaleY(v)}
              stroke="currentColor"
              strokeOpacity={0.06}
              strokeWidth={1}
            />
          ))}

          {/* Target line (dashed amber) */}
          <path
            d={targetLinePath}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={1.5}
            strokeDasharray="5,4"
            opacity={0.7}
          />

          {/* Actual area fill */}
          <path d={actualAreaPath} fill="url(#co2-actual-grad)" />

          {/* Actual line */}
          <path
            d={actualLinePath}
            fill="none"
            stroke="#10b981"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data dots on actual line */}
          {QUARTERS.map((d, i) => (
            <circle
              key={d.q}
              cx={scaleX(i)}
              cy={scaleY(d.actual)}
              r={i === QUARTERS.length - 1 ? 4 : 2.5}
              fill={i === QUARTERS.length - 1 ? "#10b981" : "#10b981"}
              stroke={i === QUARTERS.length - 1 ? "white" : "transparent"}
              strokeWidth={1.5}
              opacity={i === QUARTERS.length - 1 ? 1 : 0.7}
            />
          ))}

          {/* Q labels */}
          {QUARTERS.map((d, i) => (
            <text
              key={`lbl-${d.q}`}
              x={scaleX(i)}
              y={SVG_H - 4}
              textAnchor="middle"
              fontSize={9}
              fill="currentColor"
              opacity={0.45}
              className="font-sans"
            >
              {d.q}
            </text>
          ))}

          {/* Latest value callout */}
          <text
            x={scaleX(QUARTERS.length - 1) + 6}
            y={scaleY(QUARTERS[QUARTERS.length - 1].actual) - 6}
            fontSize={9.5}
            fontWeight="700"
            fill="#10b981"
            textAnchor="start"
          >
            {QUARTERS[QUARTERS.length - 1].actual} MT
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-1 mb-4">
        <span className="inline-flex items-center gap-1.5 text-[0.65rem] text-muted-foreground">
          <span className="h-[2px] w-5 rounded bg-emerald-500" />
          Actual
        </span>
        <span className="inline-flex items-center gap-1.5 text-[0.65rem] text-muted-foreground">
          <span
            className="h-[1.5px] w-5 rounded bg-amber-400"
            style={{ backgroundImage: "repeating-linear-gradient(to right, #f59e0b 0 5px, transparent 5px 9px)" }}
          />
          Target
        </span>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/60">
        <div>
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
            Q1 '26 Actual
          </p>
          <p className="text-lg font-display font-bold text-foreground tabular-nums mt-0.5">
            714
            <span className="text-[0.6rem] font-normal text-muted-foreground ml-1">
              MT CO₂e
            </span>
          </p>
        </div>
        <div>
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
            Q1 '26 Target
          </p>
          <p className="text-lg font-display font-bold text-amber-600 dark:text-amber-400 tabular-nums mt-0.5">
            820
            <span className="text-[0.6rem] font-normal text-muted-foreground ml-1">
              MT CO₂e
            </span>
          </p>
        </div>
        <div>
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
            vs Budget
          </p>
          <p className="text-lg font-display font-bold text-emerald-500 tabular-nums mt-0.5">
            −{820 - 714}
            <span className="text-[0.6rem] font-normal text-muted-foreground ml-1">
              MT saved
            </span>
          </p>
        </div>
      </div>

      {!compact && (
        <p className="mt-3 text-[0.62rem] text-muted-foreground/60 leading-relaxed">
          Scope 3 Category 4 — upstream transportation & distribution. Data
          sourced from carrier emission factors (GLEC Framework v3). Verified
          quarterly.
        </p>
      )}
    </motion.div>
  );
}
