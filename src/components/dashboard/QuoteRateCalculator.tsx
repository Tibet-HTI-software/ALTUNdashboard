/**
 * QuoteRateCalculator — interactive ocean-freight rate estimator.
 *
 * Standalone card. Accepts origin/destination/container/commodity inputs,
 * simulates a 2-second "route calculation" animation, then reveals a mock
 * pricing breakdown and a "Generate PDF Proposal" CTA.
 */

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Calculator,
  CheckCircle2,
  ChevronDown,
  Download,
  Loader2,
  Ship,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CONTAINER_GROUPS } from "@/lib/dashboard/quoteOptions";

/* ── Mock data ───────────────────────────────────────────────────────────── */

const ORIGINS = [
  "Istanbul (TRIST)",
  "Ambarlı (TRAMS)",
  "Mersin (TRMER)",
  "Izmir (TRIZM)",
  "Gemlik (TRGEM)",
];

const DESTINATIONS = [
  "Rotterdam (NLRTM)",
  "Amsterdam (NLAMS)",
  "Antwerp (BEANR)",
  "Hamburg (DEHAM)",
  "Felixstowe (GBFXT)",
];

interface RateBreakdown {
  oceanFreight: number;
  originHandling: number;
  destinationHandling: number;
  customsClearance: number;
  profitMargin: number;
}

/** Deterministic mock rates based on input string hash. */
function computeRates(origin: string, dest: string, container: string): RateBreakdown {
  let h = 0;
  for (const c of origin + dest + container) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const base = 900 + (h % 1400);
  const is40 = container.includes("40") || container.includes("45");
  const mul = is40 ? 1.62 : 1;
  return {
    oceanFreight: Math.round(base * mul),
    originHandling: Math.round(120 + (h % 80)),
    destinationHandling: Math.round(185 + (h % 110)),
    customsClearance: Math.round(180 + (h % 70)),
    profitMargin: Math.round(95 + (h % 120)),
  };
}

const eur = (n: number) =>
  n.toLocaleString("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

/* ── Sub-components ──────────────────────────────────────────────────────── */

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
      {children}
    </label>
  );
}

function SelectField({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full appearance-none rounded-xl border border-border bg-foreground/[0.03]",
          "px-3.5 py-2.5 pr-9 text-sm font-medium text-foreground",
          "focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent",
          "transition-colors hover:border-brand/40",
          !value && "text-muted-foreground",
        )}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
    </div>
  );
}

function ContainerSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full appearance-none rounded-xl border border-border bg-foreground/[0.03]",
          "px-3.5 py-2.5 pr-9 text-sm font-medium text-foreground",
          "focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent",
          "transition-colors hover:border-brand/40",
          !value && "text-muted-foreground",
        )}
      >
        <option value="" disabled>
          Select container type
        </option>
        {CONTAINER_GROUPS.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
    </div>
  );
}

/* ── Processing overlay ──────────────────────────────────────────────────── */

const CALC_STEPS = [
  "Querying live carrier rates…",
  "Analysing trade lane margins…",
  "Applying port surcharges…",
  "Calculating customs duties…",
];

function ProcessingView() {
  const [step, setStep] = useState(0);

  useState(() => {
    const intervals = CALC_STEPS.map((_, i) =>
      setTimeout(() => setStep(i), i * 520),
    );
    return () => intervals.forEach(clearTimeout);
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center gap-5 py-10"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-brand/30 border-t-brand"
      >
        <Ship className="h-6 w-6 text-brand" />
      </motion.div>
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold text-foreground">Calculating route & rates</p>
        <AnimatePresence mode="wait">
          <motion.p
            key={step}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="text-xs text-muted-foreground"
          >
            {CALC_STEPS[step]}
          </motion.p>
        </AnimatePresence>
      </div>
      <div className="flex gap-1.5">
        {CALC_STEPS.map((_, i) => (
          <motion.span
            key={i}
            animate={{ opacity: i <= step ? 1 : 0.2 }}
            className="h-1.5 w-5 rounded-full bg-brand"
          />
        ))}
      </div>
    </motion.div>
  );
}

/* ── Rate breakdown result ───────────────────────────────────────────────── */

function RateBreakdownView({
  origin,
  destination,
  container,
  commodity,
  rates,
  onReset,
}: {
  origin: string;
  destination: string;
  container: string;
  commodity: string;
  rates: RateBreakdown;
  onReset: () => void;
}) {
  const total =
    rates.oceanFreight +
    rates.originHandling +
    rates.destinationHandling +
    rates.customsClearance +
    rates.profitMargin;

  const lines: { label: string; amount: number; sub?: string; highlight?: boolean }[] = [
    {
      label: "Ocean Freight",
      amount: rates.oceanFreight,
      sub: "Base rate · Turkey–NL lane",
    },
    {
      label: "Origin Port Handling",
      amount: rates.originHandling,
      sub: origin.split(" ")[0],
    },
    {
      label: "Destination Port Handling",
      amount: rates.destinationHandling,
      sub: destination.split(" ")[0],
    },
    {
      label: "Customs Clearance",
      amount: rates.customsClearance,
      sub: "Douane declaration + filing",
    },
    {
      label: "Profit Margin",
      amount: rates.profitMargin,
      sub: `${((rates.profitMargin / total) * 100).toFixed(1)}% of total`,
      highlight: true,
    },
  ];

  function handleGeneratePdf() {
    toast.success("PDF Proposal generated", {
      description: `${container} · ${origin.split(" ")[0]} → ${destination.split(" ")[0]} · ${eur(total)} — sent to your inbox.`,
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-4"
    >
      {/* Route summary chip */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand/[0.06] px-3 py-1 text-[0.72rem] font-semibold text-brand">
          <Ship className="h-3 w-3" />
          {origin.split(" ")[0]}
          <ArrowRight className="h-3 w-3 opacity-60" />
          {destination.split(" ")[0]}
        </span>
        <span className="inline-flex items-center rounded-full border border-border bg-foreground/[0.04] px-3 py-1 text-[0.72rem] font-medium text-muted-foreground">
          {container}
        </span>
        {commodity && (
          <span className="inline-flex items-center rounded-full border border-border bg-foreground/[0.04] px-3 py-1 text-[0.72rem] font-medium text-muted-foreground">
            {commodity}
          </span>
        )}
      </div>

      {/* Breakdown lines */}
      <div className="rounded-2xl border border-border overflow-hidden">
        {lines.map((line, i) => (
          <motion.div
            key={line.label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.22, delay: i * 0.06 }}
            className={cn(
              "flex items-center justify-between gap-3 px-4 py-3",
              i < lines.length - 1 && "border-b border-border",
              line.highlight && "bg-brand/[0.03]",
            )}
          >
            <div className="min-w-0">
              <p className={cn("text-sm font-semibold", line.highlight ? "text-brand" : "text-foreground")}>
                {line.label}
              </p>
              {line.sub && (
                <p className="text-[0.65rem] text-muted-foreground mt-0.5">{line.sub}</p>
              )}
            </div>
            <span className={cn("font-display text-base font-bold tabular-nums shrink-0", line.highlight ? "text-brand" : "text-foreground")}>
              {eur(line.amount)}
            </span>
          </motion.div>
        ))}

        {/* Total */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.36 }}
          className="flex items-center justify-between gap-3 px-4 py-3.5 bg-foreground/[0.03] border-t border-border"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <p className="text-sm font-bold text-foreground">Total Estimated Cost</p>
          </div>
          <span className="font-display text-xl font-bold text-foreground tabular-nums">
            {eur(total)}
          </span>
        </motion.div>
      </div>

      {/* Transit note */}
      <p className="text-[0.68rem] text-muted-foreground text-center">
        Estimated transit: 18–22 days · CIF Rotterdam · rates valid 7 days
      </p>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleGeneratePdf}
          className={cn(
            "flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-xl",
            "bg-brand text-white text-sm font-semibold",
            "hover:bg-brand-strong transition-colors",
            "shadow-[0_6px_18px_-8px_var(--brand)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
          )}
        >
          <Download className="h-4 w-4" />
          Generate PDF Proposal
        </button>
        <button
          type="button"
          onClick={onReset}
          className="h-10 rounded-xl border border-border bg-foreground/[0.03] px-4 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          Recalculate
        </button>
      </div>
    </motion.div>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */

type CalcState = "idle" | "loading" | "result";

export function QuoteRateCalculator() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [container, setContainer] = useState("");
  const [commodity, setCommodity] = useState("");
  const [state, setState] = useState<CalcState>("idle");
  const [rates, setRates] = useState<RateBreakdown | null>(null);

  const canCalculate = origin && destination && container;

  function handleCalculate() {
    if (!canCalculate) return;
    setState("loading");
    setTimeout(() => {
      setRates(computeRates(origin, destination, container));
      setState("result");
    }, 2400);
  }

  function handleReset() {
    setState("idle");
    setRates(null);
  }

  return (
    <div className="card-premium rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 border border-brand/20">
          <Calculator className="h-4 w-4 text-brand" />
        </span>
        <div>
          <h2 className="font-display text-base font-bold text-foreground tracking-tight">
            Rate Calculator
          </h2>
          <p className="text-[0.68rem] text-muted-foreground">
            Turkey–Europe ocean freight estimation
          </p>
        </div>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-violet-500/25 bg-violet-500/[0.07] px-2 py-0.5 text-[0.6rem] font-semibold text-violet-600 dark:text-violet-400">
          <Sparkles className="h-2.5 w-2.5" />
          AI-assisted
        </span>
      </div>

      <AnimatePresence mode="wait">
        {state === "idle" && (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Origin Port</FieldLabel>
                <SelectField
                  value={origin}
                  onChange={setOrigin}
                  options={ORIGINS}
                  placeholder="Select origin…"
                />
              </div>
              <div>
                <FieldLabel>Destination Port</FieldLabel>
                <SelectField
                  value={destination}
                  onChange={setDestination}
                  options={DESTINATIONS}
                  placeholder="Select destination…"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Container Type</FieldLabel>
                <ContainerSelect value={container} onChange={setContainer} />
              </div>
              <div>
                <FieldLabel>Commodity (optional)</FieldLabel>
                <input
                  type="text"
                  value={commodity}
                  onChange={(e) => setCommodity(e.target.value)}
                  placeholder="e.g. Textile, Electronics, Auto Parts"
                  className={cn(
                    "w-full rounded-xl border border-border bg-foreground/[0.03]",
                    "px-3.5 py-2.5 text-sm font-medium text-foreground placeholder:text-muted-foreground/60",
                    "focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent",
                    "transition-colors hover:border-brand/40",
                  )}
                />
              </div>
            </div>
            <motion.button
              type="button"
              onClick={handleCalculate}
              disabled={!canCalculate}
              whileTap={{ scale: canCalculate ? 0.97 : 1 }}
              className={cn(
                "w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                canCalculate
                  ? "bg-brand text-white hover:bg-brand-strong shadow-[0_6px_18px_-8px_var(--brand)]"
                  : "bg-foreground/[0.05] text-muted-foreground cursor-not-allowed",
              )}
            >
              <Calculator className="h-4 w-4" />
              Calculate Route &amp; Rate
            </motion.button>
          </motion.div>
        )}

        {state === "loading" && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ProcessingView />
          </motion.div>
        )}

        {state === "result" && rates && (
          <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <RateBreakdownView
              origin={origin}
              destination={destination}
              container={container}
              commodity={commodity}
              rates={rates}
              onReset={handleReset}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
