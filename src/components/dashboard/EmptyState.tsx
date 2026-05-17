import { Plus } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Premium empty state.
 *
 * A calm, high-end placeholder for zero-data screens — soft SVG mark,
 * heading, supporting line and an optional glowing primary CTA. Dual-mode:
 * crisp on white, gently glowing on dark.
 */
interface Props {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Override the default cargo-box mark. */
  icon?: ReactNode;
}

/** Default mark — an empty cargo container, line-art. */
function CargoBoxMark() {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className="h-14 w-14 text-brand"
      aria-hidden
    >
      {/* open lid flaps */}
      <path
        d="M14 22 L32 14 L50 22"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
        strokeDasharray="3 3"
      />
      {/* box body */}
      <path
        d="M14 22 L32 30 L50 22 L50 44 L32 52 L14 44 Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* centre seam */}
      <path
        d="M32 30 L32 52"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.5"
      />
    </svg>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="relative mb-4">
        {/* soft glow halo */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 rounded-full bg-brand/15 blur-2xl dark:bg-brand/25"
        />
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-foreground/[0.03] dark:bg-white/[0.03] dark:shadow-[0_0_28px_-10px_var(--brand)]">
          {icon ?? <CargoBoxMark />}
        </div>
      </div>

      <h3 className="font-display text-base font-semibold text-foreground tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-1.5 h-10 rounded-xl bg-gradient-to-br from-brand to-brand-strong px-4 text-sm font-semibold text-white shadow-[0_8px_24px_-10px_var(--brand)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:shadow-[0_0_28px_-6px_var(--brand)]"
        >
          <Plus className="h-4 w-4" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
