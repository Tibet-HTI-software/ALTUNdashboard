import { AlertTriangle, Anchor, Check, ShieldCheck, Ship } from "lucide-react";
import { cn } from "@/lib/utils";
import { demoSuccess } from "@/lib/dashboard/demo";

/**
 * Generative-UI shipment tracker.
 *
 * Rendered *inside* an AI Companion chat bubble — the assistant replies
 * with a live interactive component, not just text. Shows the Origin →
 * Ocean → Customs progress, a demurrage-risk badge, and an inline action
 * button.
 */
interface Stage {
  label: string;
  icon: typeof Ship;
  state: "done" | "active" | "pending";
}

export function ShipmentTrackingCard({
  container = "MSCU8492019",
  vessel = "MSC Loreto",
}: {
  container?: string;
  vessel?: string;
}) {
  const stages: Stage[] = [
    { label: "Origin", icon: Anchor, state: "done" },
    { label: "Ocean", icon: Ship, state: "done" },
    { label: "Customs", icon: ShieldCheck, state: "active" },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_0_18px_-8px_rgba(56,189,248,0.45)]">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-xs font-semibold text-foreground">
            {container}
          </p>
          <p className="text-[0.62rem] text-muted-foreground truncate">
            {vessel}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/12 px-2 py-0.5 text-[0.6rem] font-bold text-rose-600 dark:text-rose-400">
          <AlertTriangle className="h-2.5 w-2.5" />
          Demurrage Risk: HIGH
        </span>
      </div>

      {/* Progress — Origin → Ocean → Customs */}
      <div className="mt-3 flex items-center">
        {stages.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full border",
                    s.state === "done" &&
                      "bg-brand border-brand text-white shadow-[0_0_10px_-1px_var(--brand)]",
                    s.state === "active" &&
                      "border-amber-500 text-amber-500 shadow-[0_0_10px_-1px_rgba(245,158,11,0.7)] animate-pulse",
                    s.state === "pending" &&
                      "border-border text-muted-foreground",
                  )}
                >
                  {s.state === "done" ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Icon className="h-3 w-3" />
                  )}
                </span>
                <span className="text-[0.55rem] font-medium text-muted-foreground">
                  {s.label}
                </span>
              </div>
              {i < stages.length - 1 && (
                <span
                  className={cn(
                    "h-0.5 flex-1 mx-1 mb-3.5 rounded-full",
                    stages[i + 1].state !== "pending"
                      ? "bg-brand shadow-[0_0_6px_var(--brand)]"
                      : "bg-border",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Inline action */}
      <button
        type="button"
        onClick={() =>
          demoSuccess(
            "Override approved",
            `Customs document override applied to ${container}.`,
          )
        }
        className="mt-3 w-full inline-flex items-center justify-center gap-1.5 h-8 rounded-lg bg-gradient-to-br from-brand to-brand-strong text-white text-[0.7rem] font-semibold shadow-[0_4px_14px_-6px_var(--brand)] hover:-translate-y-0.5 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <ShieldCheck className="h-3.5 w-3.5" />
        Approve Document Override
      </button>
    </div>
  );
}
