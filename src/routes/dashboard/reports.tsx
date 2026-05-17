import { createFileRoute } from "@tanstack/react-router";
import {
  Download,
  TrendingUp,
  Stamp,
  CheckCircle2,
  Wallet,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { KPIStatCard } from "@/components/dashboard/KPIStatCard";
import {
  ChartCard,
  BarChart,
  LineChart,
  ProgressRow,
} from "@/components/dashboard/ChartCard";
import {
  exportReport,
  getReportsOverview,
  useAsyncData,
} from "@/lib/dashboard/api";
import { LoadingState, ErrorState } from "@/components/dashboard/AsyncStates";
import { demoSuccess, demoError } from "@/lib/dashboard/demo";

export const Route = createFileRoute("/dashboard/reports")({
  head: () => ({ meta: [{ title: "Reports — Altun Logistics Operations" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const { data, loading, error, reload } = useAsyncData(getReportsOverview, []);

  async function handleExport() {
    try {
      const result = await exportReport({ format: "pdf" });
      demoSuccess(
        "Report exported",
        `${result.filename} (mock URL ${result.url}).`,
      );
    } catch (err) {
      demoError(
        "Export failed",
        err instanceof Error ? err.message : "Failed to export report.",
      );
    }
  }

  const header = (
    <DashboardPageHeader
      title="Reports"
      description="Operational analytics across shipments, routes, customs, and revenue trend."
      crumbs={[{ label: "Dashboard", to: "/dashboard" }, { label: "Reports" }]}
      actions={
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 h-9 rounded-lg border border-border bg-foreground/[0.04] px-3.5 text-sm font-medium text-foreground hover:border-brand hover:text-brand transition-colors"
        >
          <Download className="h-3.5 w-3.5" /> Export report
        </button>
      }
    />
  );

  if (loading) {
    return (
      <DashboardLayout>
        {header}
        <LoadingState label="Loading reports…" />
      </DashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <DashboardLayout>
        {header}
        <ErrorState
          error={error ?? new Error("Reports unavailable.")}
          onRetry={reload}
        />
      </DashboardLayout>
    );
  }

  const {
    shipmentsByMonth,
    performanceByRoute,
    customsTrend,
    revenuePlaceholder,
  } = data;
  const totalShipmentsYTD = shipmentsByMonth.reduce(
    (s, m) => s + m.shipments,
    0,
  );
  const avgOnTime =
    performanceByRoute.reduce((s, r) => s + r.onTime, 0) /
    performanceByRoute.length;
  const customsCleared = customsTrend.reduce((s, w) => s + w.cleared, 0);

  return (
    <DashboardLayout>
      {header}

      {/* KPI overview */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KPIStatCard
          label="Shipments YTD"
          value={totalShipmentsYTD.toLocaleString()}
          icon={TrendingUp}
          delta={{ value: "+12% YoY", positive: true }}
        />
        <KPIStatCard
          label="On-Time Avg"
          value={`${(avgOnTime * 100).toFixed(0)}%`}
          icon={CheckCircle2}
          hint="Across active lanes"
        />
        <KPIStatCard
          label="Customs Cleared"
          value={customsCleared.toLocaleString()}
          icon={Stamp}
          hint="Last 5 weeks"
        />
        <KPIStatCard
          label="Revenue Trend"
          value="+18%"
          icon={Wallet}
          delta={{ value: "vs prior period", positive: true }}
          hint="Placeholder — pending finance feed"
        />
      </div>

      {/* Charts */}
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <ChartCard title="Shipments by Month" description="Last 7 months">
          <BarChart
            data={shipmentsByMonth.map((m) => ({
              label: m.month,
              value: m.shipments,
            }))}
            height={180}
          />
        </ChartCard>

        <ChartCard
          title="Customs Processing Trend"
          description="Filed vs cleared per week"
        >
          <LineChart
            data={customsTrend.map((w) => ({
              label: w.week,
              value: w.cleared,
            }))}
            height={180}
          />
        </ChartCard>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <ChartCard
          title="Performance by Route"
          description="On-time rate · volume"
        >
          <div className="space-y-3.5">
            {performanceByRoute.map((r) => (
              <ProgressRow
                key={r.route}
                label={r.route}
                value={r.onTime}
                meta={`${(r.onTime * 100).toFixed(0)}% · ${r.volume} ship.`}
                tone={
                  r.onTime > 0.92
                    ? "brand"
                    : r.onTime > 0.85
                      ? "warning"
                      : "danger"
                }
              />
            ))}
          </div>
        </ChartCard>

        <ChartCard
          title="Revenue Trend"
          description="Indexed (placeholder data)"
        >
          <LineChart
            data={revenuePlaceholder.map((m) => ({
              label: m.month,
              value: m.value,
            }))}
            height={180}
            max={1}
          />
          <p className="mt-3 text-[0.7rem] text-muted-foreground">
            Connect finance system to replace placeholder values.
          </p>
        </ChartCard>
      </div>
    </DashboardLayout>
  );
}
