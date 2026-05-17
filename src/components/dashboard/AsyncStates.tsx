import { AlertTriangle, Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { useT } from "@/lib/dashboard/i18n";

/**
 * Shared loading / error / empty states for dashboard routes that fetch
 * from the mock API. LoadingState renders a premium shimmer skeleton that
 * roughly mirrors a typical page (KPI row + content block).
 */

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function LoadingState({ label }: { label?: string }) {
  const t = useT();
  const resolvedLabel = label ?? t("state.loading");
  return (
    <div role="status" aria-live="polite" aria-label={resolvedLabel}>
      <span className="sr-only">{resolvedLabel}</span>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card-premium rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <SkeletonBlock className="h-3 w-20" />
              <SkeletonBlock className="h-9 w-9 rounded-xl" />
            </div>
            <SkeletonBlock className="mt-4 h-7 w-24" />
            <SkeletonBlock className="mt-2 h-3 w-28" />
          </div>
        ))}
      </div>

      {/* Content block */}
      <div className="mt-6 card-premium rounded-2xl p-5">
        <SkeletonBlock className="h-4 w-40" />
        <SkeletonBlock className="mt-2 h-3 w-56" />
        <div className="mt-5 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <SkeletonBlock className="h-9 w-9 rounded-xl" />
              <SkeletonBlock className="h-3.5 flex-1" />
              <SkeletonBlock className="h-3.5 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
}: {
  error: Error;
  onRetry?: () => void;
}) {
  const t = useT();
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-2xl border border-rose-300/40 bg-rose-500/[0.07] px-5 py-4 text-sm text-rose-600 dark:text-rose-300"
    >
      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{t("state.error")}</p>
        <p className="mt-0.5 text-xs opacity-90">{error.message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 inline-flex items-center gap-1.5 h-8 rounded-lg border border-rose-300/50 bg-foreground/[0.04] px-3 text-xs font-medium hover:bg-foreground/[0.08] transition-colors"
          >
            {t("state.retry")}
          </button>
        )}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  const t = useT();
  return (
    <div className="card-premium rounded-2xl flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div className="h-11 w-11 rounded-xl bg-brand/12 border border-brand/20 flex items-center justify-center">
        <Inbox className="h-5 w-5 text-brand" />
      </div>
      <p className="mt-1 text-sm font-semibold text-foreground">
        {title ?? t("state.empty")}
      </p>
      {description && (
        <p className="text-xs text-muted-foreground max-w-sm">{description}</p>
      )}
      {action}
    </div>
  );
}
