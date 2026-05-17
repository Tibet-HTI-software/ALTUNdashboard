import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Container for all dashboard charts/visuals. Same shell, different content. */
export function ChartCard({
  title,
  description,
  action,
  className,
  children,
}: Props) {
  return (
    <section
      className={cn(
        "card-premium rounded-2xl h-full flex flex-col",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3 px-6 pt-6 pb-4">
        <div className="min-w-0">
          <h3 className="font-display font-semibold text-foreground text-base tracking-tight">
            {title}
          </h3>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground/85">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className="px-6 pb-6 flex-1">{children}</div>
    </section>
  );
}

/* ── small inline chart primitives (CSS / SVG, no extra deps) ─────── */

/** Vertical bar chart for trend data. */
interface BarChartProps {
  data: { label: string; value: number }[];
  /** Optional max — defaults to dataset max. */
  max?: number;
  height?: number;
}

export function BarChart({ data, max, height = 140 }: BarChartProps) {
  const ceiling = max ?? Math.max(...data.map((d) => d.value), 1);
  return (
    <div
      className="flex items-end gap-2 sm:gap-3"
      style={{ height }}
      role="img"
    >
      {data.map((d) => {
        const h = (d.value / ceiling) * 100;
        return (
          <div
            key={d.label}
            className="flex-1 flex flex-col items-center gap-1.5"
          >
            <div
              className="w-full rounded-t-sm bg-brand/15 relative overflow-hidden"
              style={{ height: `${h}%` }}
              title={`${d.label}: ${d.value}`}
            >
              <div className="absolute inset-x-0 bottom-0 bg-brand h-full" />
            </div>
            <div className="text-[0.65rem] font-medium text-muted-foreground">
              {d.label}
            </div>
            <div className="text-[0.65rem] font-semibold text-navy-deep">
              {d.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Horizontal stacked progress for share-of-total visuals. */
interface StackedBarProps {
  data: { label: string; value: number; tone: "brand" | "info" | "navy" }[];
}

export function StackedBar({ data }: StackedBarProps) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const toneBg: Record<string, string> = {
    brand: "bg-brand",
    info: "bg-sky-400",
    navy: "bg-navy-deep",
  };
  return (
    <div>
      <div className="h-3 w-full rounded-full bg-secondary overflow-hidden flex">
        {data.map((d) => (
          <div
            key={d.label}
            className={toneBg[d.tone]}
            style={{ width: `${(d.value / total) * 100}%` }}
            title={`${d.label}: ${d.value}`}
          />
        ))}
      </div>
      {/*
        Flex-wrap legend: items size to content, reflow cleanly on narrow
        cards (Overview shows 3 modes, Warehouse shows 5 zones — same
        component, different cardinality, so a fixed grid does not work).
      */}
      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs">
        {data.map((d) => (
          <li key={d.label} className="inline-flex items-center gap-2 min-w-0">
            <span
              className={cn("h-2 w-2 rounded-sm shrink-0", toneBg[d.tone])}
              aria-hidden
            />
            <span className="text-muted-foreground truncate">{d.label}</span>
            <span className="font-semibold text-navy-deep tabular-nums">
              {d.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Horizontal progress row used in route/zone breakdowns. */
interface ProgressRowProps {
  label: string;
  value: number; // 0..1
  meta?: string;
  tone?: "brand" | "navy" | "warning" | "danger";
}

export function ProgressRow({
  label,
  value,
  meta,
  tone = "brand",
}: ProgressRowProps) {
  const toneBg: Record<string, string> = {
    brand: "bg-brand",
    navy: "bg-navy-deep",
    warning: "bg-amber-500",
    danger: "bg-rose-500",
  };
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="font-medium text-navy-deep">{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {meta ?? `${pct.toFixed(0)}%`}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-[width]", toneBg[tone])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** Simple area-style line chart drawn with SVG path. */
interface LineChartProps {
  data: { label: string; value: number }[];
  height?: number;
  max?: number;
}

export function LineChart({ data, height = 140, max }: LineChartProps) {
  const w = 600;
  const h = height;
  const padX = 8;
  const padY = 8;
  const ceiling = max ?? Math.max(...data.map((d) => d.value), 1);
  const stepX = (w - padX * 2) / Math.max(data.length - 1, 1);
  const points = data.map((d, i) => {
    const x = padX + i * stepX;
    const y = padY + (1 - d.value / ceiling) * (h - padY * 2);
    return { x, y, ...d };
  });
  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const areaPath =
    `M ${points[0].x.toFixed(1)} ${(h - padY).toFixed(1)} ` +
    points.map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") +
    ` L ${points[points.length - 1].x.toFixed(1)} ${(h - padY).toFixed(1)} Z`;

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" role="img">
        <defs>
          <linearGradient id="lc-fill" x1="0" x2="0" y1="0" y2="1">
            <stop
              offset="0"
              stopColor="oklch(0.55 0.18 254)"
              stopOpacity="0.25"
            />
            <stop offset="1" stopColor="oklch(0.55 0.18 254)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#lc-fill)" />
        <path
          d={linePath}
          fill="none"
          stroke="oklch(0.52 0.18 254)"
          strokeWidth="2"
        />
        {points.map((p) => (
          <circle
            key={p.label}
            cx={p.x}
            cy={p.y}
            r="3"
            fill="oklch(0.52 0.18 254)"
          />
        ))}
      </svg>
      <div className="mt-2 grid grid-cols-7 gap-1 text-[0.65rem] text-muted-foreground">
        {data.map((d) => (
          <div key={d.label} className="text-center">
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}
