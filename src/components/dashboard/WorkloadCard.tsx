import type { StaffAvailability } from "@/lib/dashboard/types";
import { StatusBadge, type StatusTone } from "./StatusBadge";
import { ProgressRow } from "./ChartCard";

const statusTone: Record<StaffAvailability["status"], StatusTone> = {
  Available: "success",
  Busy: "warning",
  "Off-shift": "neutral",
};

interface Props {
  member: StaffAvailability;
}

export function WorkloadCard({ member }: Props) {
  /*
   * Derive avatar initials.
   * - If we have a real name (anything other than the placeholder
   *   "Team Member"), use first letters of given + family name.
   * - Otherwise fall back to the role's word initials so each placeholder
   *   card is visually distinct (e.g. "FF", "CD", "OC").
   */
  const initials = (() => {
    const wordInitials = (s: string) =>
      s
        .replace(/[^A-Za-z\s]/g, " ")
        .split(/\s+/)
        .map((p) => p[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase();

    if (member.name && member.name.trim() !== "Team Member") {
      return wordInitials(member.name);
    }
    return wordInitials(member.role);
  })();

  /*
   * When a real name is not yet set ("Team Member" placeholder), promote the
   * role to the primary title and surface "Name pending" as a clear secondary
   * label. Real entries (e.g. CEO) keep the standard name → role hierarchy.
   */
  const placeholder = !member.name || member.name.trim() === "Team Member";
  const primary = placeholder ? member.role : member.name;
  const secondary = placeholder ? "Name pending" : member.role;

  return (
    <article className="card-premium hover-lift rounded-2xl p-5">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand/40 to-brand/15 border border-brand/30 text-white flex items-center justify-center font-display font-bold text-xs shrink-0 shadow-[0_0_16px_-6px_var(--brand)]">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-bold text-foreground text-sm leading-tight truncate">
            {primary}
          </h3>
          <p
            className={`text-xs font-semibold truncate ${
              placeholder ? "text-muted-foreground italic" : "text-brand"
            }`}
          >
            {secondary}
          </p>
          <p className="text-[0.7rem] text-muted-foreground">
            {member.department}
          </p>
        </div>
        <StatusBadge tone={statusTone[member.status]} dot>
          {member.status}
        </StatusBadge>
      </div>

      <div className="mt-4">
        <ProgressRow
          label="Workload"
          value={member.workload}
          tone={
            member.workload > 0.8
              ? "danger"
              : member.workload > 0.6
                ? "warning"
                : "brand"
          }
        />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-center">
        <div className="rounded-xl border border-border bg-foreground/[0.03] py-2.5">
          <dt className="text-[0.62rem] uppercase tracking-widest text-muted-foreground">
            Shipments
          </dt>
          <dd className="font-display font-bold text-foreground tabular-nums">
            {member.shipments}
          </dd>
        </div>
        <div className="rounded-xl border border-border bg-foreground/[0.03] py-2.5">
          <dt className="text-[0.62rem] uppercase tracking-widest text-muted-foreground">
            Tasks
          </dt>
          <dd className="font-display font-bold text-foreground tabular-nums">
            {member.tasks}
          </dd>
        </div>
      </dl>
    </article>
  );
}
