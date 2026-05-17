import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";

interface TrendPoint {
  day: string;
  bookings: number;
  delivered: number;
}

const BRAND = "oklch(0.52 0.18 254)";
const ACCENT = "oklch(0.68 0.13 195)";

/** Premium glass tooltip for the trend chart. */
function ChartTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg glass-panel border px-3 py-2 shadow-[var(--shadow-elevated)]">
      <p className="text-[0.7rem] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <ul className="mt-1 space-y-0.5">
        {payload.map((p) => (
          <li key={p.dataKey} className="flex items-center gap-2 text-xs">
            <span
              aria-hidden
              className="h-2 w-2 rounded-sm"
              style={{ background: p.color }}
            />
            <span className="capitalize text-muted-foreground">
              {p.dataKey}
            </span>
            <span className="ml-auto font-semibold text-foreground tabular-nums">
              {p.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Weekly booking-vs-delivery trend — gradient area chart (Recharts) with a
 * premium hover tooltip. Drop inside a ChartCard.
 */
export function CeoTrendChart({
  data,
  height = 240,
}: {
  data: TrendPoint[];
  height?: number;
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, bottom: 0, left: -18 }}
        >
          <defs>
            <linearGradient id="ceo-bookings" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BRAND} stopOpacity={0.35} />
              <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="ceo-delivered" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACCENT} stopOpacity={0.3} />
              <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            className="text-border"
            vertical={false}
          />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "currentColor" }}
            className="text-muted-foreground"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={36}
            tick={{ fontSize: 11, fill: "currentColor" }}
            className="text-muted-foreground"
            allowDecimals={false}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: BRAND, strokeOpacity: 0.25 }}
          />
          <Area
            type="monotone"
            dataKey="delivered"
            stroke={ACCENT}
            strokeWidth={2}
            fill="url(#ceo-delivered)"
            animationDuration={700}
          />
          <Area
            type="monotone"
            dataKey="bookings"
            stroke={BRAND}
            strokeWidth={2.5}
            fill="url(#ceo-bookings)"
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
