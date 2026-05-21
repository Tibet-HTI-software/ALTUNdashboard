import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { requireRoles } from "@/lib/dashboard/routeGuards";
import { ROUTE_ROLES } from "@/lib/dashboard/roles.config";
import { Plus } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { WorkloadCard } from "@/components/dashboard/WorkloadCard";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { ChartCard, ProgressRow } from "@/components/dashboard/ChartCard";
import { StatusBadge, priorityTone } from "@/components/dashboard/StatusBadge";
import {
  getTeamMembers,
  getTeamTasks,
  useAsyncData,
} from "@/lib/dashboard/api";
import { LoadingState, ErrorState } from "@/components/dashboard/AsyncStates";
import { InviteMemberModal } from "@/components/dashboard/InviteMemberModal";
import type { Task } from "@/lib/dashboard/types";
import { formatDate, relativeDays } from "@/lib/dashboard/format";

export const Route = createFileRoute("/dashboard/team")({
  beforeLoad: () => requireRoles(ROUTE_ROLES.team),
  head: () => ({ meta: [{ title: "Team — Altun Logistics Operations" }] }),
  component: TeamPage,
});

function TeamPage() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const members = useAsyncData(getTeamMembers, []);
  const taskList = useAsyncData(getTeamTasks, []);
  const loading = members.loading || taskList.loading;
  const error = members.error ?? taskList.error;
  const reload = () => {
    members.reload();
    taskList.reload();
  };
  const staffWorkload = members.data ?? [];
  const tasks = taskList.data ?? [];

  const taskColumns: Column<Task>[] = [
    {
      key: "id",
      header: "Task",
      cell: (t) => (
        <div>
          <div className="font-semibold text-navy-deep text-sm">{t.title}</div>
          <div className="font-mono text-[0.7rem] text-muted-foreground mt-0.5">
            {t.id}
          </div>
        </div>
      ),
    },
    {
      key: "owner",
      header: "Owner",
      hideOn: "sm",
      cell: (t) => <span className="text-sm">{t.owner}</span>,
    },
    {
      key: "priority",
      header: "Priority",
      cell: (t) => (
        <StatusBadge tone={priorityTone(t.priority)} dot>
          {t.priority}
        </StatusBadge>
      ),
    },
    {
      key: "due",
      header: "Due",
      cell: (t) => (
        <div className="text-xs">
          <div className="font-semibold text-navy-deep tabular-nums">
            {formatDate(t.due)}
          </div>
          <div className="text-muted-foreground">{relativeDays(t.due)}</div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      hideOn: "md",
      cell: (t) => {
        const tone =
          t.status === "Done"
            ? "success"
            : t.status === "In Progress"
              ? "brand"
              : "neutral";
        return <StatusBadge tone={tone}>{t.status}</StatusBadge>;
      },
    },
  ];

  return (
    <DashboardLayout>
      <DashboardPageHeader
        title="Team & Workload"
        description="Internal staff overview, current workload, and assigned tasks."
        crumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Team" }]}
        actions={
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="inline-flex items-center gap-1.5 h-9 rounded-md bg-brand text-white px-3.5 text-sm font-medium hover:bg-brand-strong transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Invite member
          </button>
        }
      />

      {loading && <LoadingState label="Loading team workload…" />}
      {error && <ErrorState error={error} onRetry={reload} />}

      {/* Staff cards */}
      {!loading && !error && (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {staffWorkload.map((m) => (
            <WorkloadCard key={`${m.name}-${m.role}`} member={m} />
          ))}
        </div>
      )}

      {/* Workload distribution chart */}
      {!loading && !error && (
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          <ChartCard
            title="Workload Distribution"
            description="Capacity used per department"
            className="lg:col-span-1"
          >
            <div className="space-y-3.5">
              {staffWorkload.map((m) => (
                <ProgressRow
                  key={`${m.name}-${m.role}-load`}
                  label={m.department}
                  value={m.workload}
                  tone={
                    m.workload > 0.8
                      ? "danger"
                      : m.workload > 0.6
                        ? "warning"
                        : "brand"
                  }
                />
              ))}
            </div>
          </ChartCard>

          <section className="lg:col-span-2">
            <h2 className="font-display font-bold text-navy-deep text-base mb-3">
              Open tasks
            </h2>
            <DataTable
              rows={tasks}
              columns={taskColumns}
              rowKey={(t) => t.id}
            />
          </section>
        </div>
      )}

      <InviteMemberModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onCreated={members.reload}
      />
    </DashboardLayout>
  );
}
