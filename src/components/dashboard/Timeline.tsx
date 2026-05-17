import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TimelineStep {
  label: string;
  detail?: string;
  date?: string;
  status: "done" | "current" | "upcoming";
}

interface Props {
  steps: TimelineStep[];
}

export function Timeline({ steps }: Props) {
  return (
    <ol className="relative">
      {steps.map((s, i) => {
        const isLast = i === steps.length - 1;
        return (
          <li key={s.label} className="relative pl-8 pb-5 last:pb-0">
            {!isLast && (
              <span
                className={cn(
                  "absolute left-3 top-3 -translate-x-1/2 w-px h-full",
                  s.status === "done" ? "bg-brand/40" : "bg-foreground/[0.08]",
                )}
                aria-hidden
              />
            )}
            <span
              className={cn(
                "absolute left-0 top-0.5 h-6 w-6 rounded-full flex items-center justify-center text-[0.65rem] font-bold",
                s.status === "done" &&
                  "bg-brand text-white shadow-[0_0_12px_-2px_var(--brand)]",
                s.status === "current" &&
                  "bg-card border-2 border-brand text-brand ring-4 ring-brand/15",
                s.status === "upcoming" &&
                  "bg-foreground/[0.05] border border-border text-muted-foreground",
              )}
              aria-hidden
            >
              {s.status === "done" ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <p
                className={cn(
                  "text-sm font-semibold",
                  s.status === "upcoming"
                    ? "text-muted-foreground"
                    : "text-foreground",
                )}
              >
                {s.label}
              </p>
              {s.date && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {s.date}
                </span>
              )}
            </div>
            {s.detail && (
              <p className="mt-0.5 text-xs text-muted-foreground">{s.detail}</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
