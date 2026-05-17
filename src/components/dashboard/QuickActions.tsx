import type { LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";

export interface QuickAction {
  icon: LucideIcon;
  label: string;
  to: string;
  description?: string;
}

interface Props {
  actions: QuickAction[];
}

export function QuickActions({ actions }: Props) {
  return (
    <ul className="grid grid-cols-2 gap-2.5">
      {actions.map((a) => {
        const Icon = a.icon;
        return (
          <li key={a.label}>
            <Link
              to={a.to}
              className="group flex items-center gap-3 rounded-xl border border-border bg-foreground/[0.03] p-3 hover:border-brand/40 hover:bg-foreground/[0.05] transition-colors"
            >
              <div className="h-9 w-9 rounded-xl bg-brand/12 border border-brand/20 text-brand flex items-center justify-center shrink-0 group-hover:bg-brand group-hover:text-white group-hover:border-brand transition-colors">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">
                  {a.label}
                </div>
                {a.description && (
                  <div className="text-[0.7rem] text-muted-foreground truncate">
                    {a.description}
                  </div>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
