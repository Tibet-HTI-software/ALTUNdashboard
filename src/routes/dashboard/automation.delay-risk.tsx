import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Timer } from "lucide-react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { LoadingState, ErrorState } from "@/components/dashboard/AsyncStates";
import { DemurrageRiskBoard } from "@/components/dashboard/DemurrageRiskBoard";
import { getOceanShipments, useAsyncData } from "@/lib/dashboard/api";
import { useT } from "@/lib/dashboard/i18n";

export const Route = createFileRoute("/dashboard/automation/delay-risk")({
  head: () => ({
    meta: [{ title: "Delay Risk Detection — Altun Logistics" }],
  }),
  component: DelayRiskPage,
});

function DelayRiskPage() {
  const { data, loading, error, reload } = useAsyncData(getOceanShipments, []);
  const t = useT();

  const header = (
    <div className="mb-5">
      <Link
        to="/dashboard/automation"
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-brand transition-colors mb-3"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        {t("auto.title")}
      </Link>
      <div className="flex items-center gap-3">
        <motion.span
          layoutId="wf-icon-delay"
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand/25 to-brand/5 border border-brand/25 shadow-[0_0_18px_-6px_var(--brand)]"
        >
          <Timer className="h-5 w-5 text-brand" />
        </motion.span>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">
            {t("auto.wf.delay")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("auto.wf.delay.desc")}
          </p>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <DashboardLayout>
        {header}
        <LoadingState label="Scanning demurrage clocks…" />
      </DashboardLayout>
    );
  }
  if (error || !data) {
    return (
      <DashboardLayout>
        {header}
        <ErrorState
          error={error ?? new Error("Unavailable.")}
          onRetry={reload}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {header}
      <div className="max-h-[calc(100vh-16rem)] overflow-y-auto scroll-thin pr-1">
        <DemurrageRiskBoard shipments={data} />
      </div>
    </DashboardLayout>
  );
}
