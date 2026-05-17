import type { LucideIcon } from "lucide-react";
import { Activity } from "lucide-react";

export interface ActivityEntry {
  icon?: LucideIcon;
  who: string;
  action: string;
  when: string;
}

interface Props {
  entries: ActivityEntry[];
}

export function ActivityLog({ entries }: Props) {
  return (
    <ul className="space-y-3">
      {entries.map((e, i) => {
        const Icon = e.icon ?? Activity;
        return (
          <li key={i} className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-xl bg-brand/12 border border-brand/20 text-brand flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">
                <span className="font-semibold">{e.who}</span>
                <span className="text-muted-foreground"> {e.action}</span>
              </p>
              <p className="text-xs text-muted-foreground">{e.when}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
