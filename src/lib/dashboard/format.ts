/** Tiny formatting helpers shared across dashboard pages. */

export function formatDate(
  iso: string,
  opts?: Intl.DateTimeFormatOptions,
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(
    "en-GB",
    opts ?? { day: "2-digit", month: "short", year: "numeric" },
  );
}

export function formatDateShort(iso: string): string {
  return formatDate(iso, { day: "2-digit", month: "short" });
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-GB").format(n);
}

export function formatPercent(n: number, digits = 0): string {
  return `${(n * 100).toFixed(digits)}%`;
}

export function relativeDays(iso: string): string {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return "";
  const now = Date.now();
  const diffDays = Math.round((d - now) / 86_400_000);
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  if (diffDays === -1) return "yesterday";
  if (diffDays > 0) return `in ${diffDays} days`;
  return `${Math.abs(diffDays)} days ago`;
}
