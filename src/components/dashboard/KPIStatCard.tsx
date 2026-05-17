import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, ArrowRight } from "lucide-react";
import { motion, animate } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

/**
 * Animated number — counts from 0 up to the parsed numeric part of `value`,
 * preserving any prefix/suffix (e.g. "94%", "$1.2k"). Non-numeric values
 * render unchanged.
 */
function CountUpValue({ value }: { value: string | number }) {
  const raw = typeof value === "number" ? String(value) : value;
  const match = raw.match(/^(\D*)(-?[\d.]+)(.*)$/);
  const [shown, setShown] = useState(0);
  const hasNum = match !== null;
  const target = match ? parseFloat(match[2]) : 0;
  const decimals = match && match[2].includes(".") ? 1 : 0;

  useEffect(() => {
    if (!hasNum) return;
    const controls = animate(0, target, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setShown(v),
    });
    return () => controls.stop();
  }, [hasNum, target]);

  if (!match) return <>{raw}</>;
  return (
    <>
      {match[1]}
      {shown.toFixed(decimals)}
      {match[3]}
    </>
  );
}

interface Props {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  /** Positive = good (up arrow green). Negative = down arrow red. */
  delta?: { value: string; positive: boolean };
  /** Optional 0..1 progress — renders a thin bar at the card foot. */
  progress?: number;
  /** Stagger index for the entrance animation. */
  index?: number;
  /** When set, the whole card becomes a link to this route. */
  to?: string;
}

/**
 * Premium metric card — dual-mode (clean white / glass dark), glowing icon
 * tile, hover lift, optional progress bar. When `to` is set the card is a
 * clickable link with an affordance arrow.
 */
export function KPIStatCard({
  label,
  value,
  hint,
  icon: Icon,
  delta,
  progress,
  index = 0,
  to,
}: Props) {
  const pct =
    progress === undefined ? null : Math.max(0, Math.min(1, progress)) * 100;

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </p>
        {Icon && (
          <div className="h-9 w-9 rounded-xl bg-brand/12 border border-brand/20 flex items-center justify-center shrink-0 shadow-[0_0_18px_-8px_var(--brand)]">
            <Icon className="h-4 w-4 text-brand" aria-hidden />
          </div>
        )}
      </div>

      <div className="mt-3.5 flex items-baseline gap-2 flex-wrap">
        <div className="font-display text-[1.85rem] leading-none font-bold text-foreground tracking-tight tabular-nums">
          <CountUpValue value={value} />
        </div>
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[0.7rem] font-semibold",
              delta.positive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400",
            )}
          >
            {delta.positive ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {delta.value}
          </span>
        )}
      </div>

      {hint && (
        <p className="mt-1.5 text-xs text-muted-foreground/85 flex items-center gap-1">
          {hint}
          {to && (
            <ArrowRight className="h-3 w-3 text-brand opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
          )}
        </p>
      )}

      {pct !== null && (
        <div className="mt-4 h-1 w-full rounded-full bg-foreground/[0.07] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{
              duration: 0.7,
              delay: index * 0.06 + 0.2,
              ease: "easeOut",
            }}
            className="h-full rounded-full bg-gradient-to-r from-brand to-brand-strong"
          />
        </div>
      )}
    </>
  );

  const className = cn(
    "card-premium hover-lift rounded-2xl p-6 overflow-hidden h-full flex flex-col",
    to && "group cursor-pointer",
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.06,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="h-full"
    >
      {to ? (
        <Link to={to} className={className}>
          {body}
        </Link>
      ) : (
        <div className={className}>{body}</div>
      )}
    </motion.div>
  );
}
