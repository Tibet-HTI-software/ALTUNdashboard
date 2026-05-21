import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Anchor,
  Truck,
  Train,
  Building2,
  FolderOpen,
  Mail,
  ShieldCheck,
  Pencil,
  CheckCircle2,
  FileEdit,
} from "lucide-react";
import { motion } from "framer-motion";
import { DocumentVault } from "@/components/dashboard/DocumentVault";
import { ShipmentComms } from "@/components/dashboard/ShipmentComms";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { Timeline, type TimelineStep } from "@/components/dashboard/Timeline";
import { DocumentChecklist } from "@/components/dashboard/DocumentChecklist";
import { ActivityLog } from "@/components/dashboard/ActivityLog";
import {
  StatusBadge,
  shipmentStatusTone,
  priorityTone,
} from "@/components/dashboard/StatusBadge";
import { ProgressRow } from "@/components/dashboard/ChartCard";
import {
  getCustomsFiles,
  getShipmentById,
  useAsyncData,
} from "@/lib/dashboard/api";
import { LoadingState, ErrorState } from "@/components/dashboard/AsyncStates";
import { formatDate } from "@/lib/dashboard/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/shipments/$id")({
  head: ({ params }) => ({
    meta: [{ title: `${params.id} — Shipment · Altun Logistics` }],
  }),
  component: ShipmentDetailPage,
});

type DetailTab = "vault" | "comms";

function ShipmentDetailPage() {
  const { id } = Route.useParams();
  const [activeTab, setActiveTab] = useState<DetailTab>("vault");
  const shipment = useAsyncData(() => getShipmentById(id), [id]);
  const customsAll = useAsyncData(getCustomsFiles, []);

  const baseCrumbs = [
    { label: "Dashboard", to: "/dashboard" as const },
    { label: "Shipments", to: "/dashboard/shipments" as const },
    { label: id },
  ];

  if (shipment.loading || customsAll.loading) {
    return (
      <DashboardLayout>
        <DashboardPageHeader title={id} crumbs={baseCrumbs} />
        <LoadingState label="Loading shipment…" />
      </DashboardLayout>
    );
  }

  if (shipment.error || !shipment.data) {
    return (
      <DashboardLayout>
        <DashboardPageHeader
          title="Shipment not found"
          description={`No record matches ${id}.`}
          crumbs={baseCrumbs}
        />
        <Link
          to="/dashboard/shipments"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline underline-offset-4"
        >
          ← Back to shipments
        </Link>
      </DashboardLayout>
    );
  }

  if (customsAll.error || !customsAll.data) {
    return (
      <DashboardLayout>
        <DashboardPageHeader title={id} crumbs={baseCrumbs} />
        <ErrorState
          error={customsAll.error ?? new Error("Customs data unavailable.")}
          onRetry={customsAll.reload}
        />
      </DashboardLayout>
    );
  }

  const s = shipment.data;
  const customsFiles = customsAll.data;

  const customs = customsFiles.find((c) => c.shipmentId === s.id);

  // Build timeline based on status
  const order: TimelineStep["status"][] = (() => {
    const steps = [
      "Booked",
      "In Transit",
      "Customs Clearance",
      "At Warehouse",
      "Delivered",
    ];
    const idx = steps.indexOf(s.status);
    if (s.status === "Delayed")
      return ["done", "current", "upcoming", "upcoming", "upcoming"];
    return steps.map((_, i) =>
      i < idx ? "done" : i === idx ? "current" : "upcoming",
    ) as TimelineStep["status"][];
  })();

  const timeline: TimelineStep[] = [
    { label: "Booking confirmed", date: formatDate(s.etd), status: order[0] },
    { label: "Picked up at origin", detail: s.origin, status: order[1] },
    {
      label: "Customs clearance",
      detail: customs ? `File ${customs.id}` : undefined,
      status: order[2],
    },
    {
      label: "At warehouse",
      detail: "Cross-dock or storage",
      status: order[3],
    },
    {
      label: "Delivered",
      date: formatDate(s.eta),
      detail: s.destination,
      status: order[4],
    },
  ];

  const ModeIcon =
    s.mode === "Sea" ? Anchor : s.mode === "Rail" ? Train : Truck;

  return (
    <DashboardLayout>
      <DashboardPageHeader
        title={s.id}
        description={`${s.customer} · ${s.origin} → ${s.destination}`}
        crumbs={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "Shipments", to: "/dashboard/shipments" },
          { label: s.id },
        ]}
        actions={
          <>
            <Link
              to="/dashboard/shipments"
              className="inline-flex items-center gap-1.5 h-9 rounded-md border border-border bg-foreground/[0.04] px-3.5 text-sm font-medium text-white hover:border-brand hover:text-brand transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Link>
            <button className="inline-flex items-center gap-1.5 h-9 rounded-md bg-brand text-white px-3.5 text-sm font-medium hover:bg-brand-strong transition-colors">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
          </>
        }
      />

      {/* Summary strip */}
      <section className="card-premium rounded-2xl p-5">
        <div className="flex flex-wrap items-start gap-4 justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-brand-soft text-brand flex items-center justify-center">
              <ModeIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge tone={shipmentStatusTone(s.status)} dot>
                  {s.status}
                </StatusBadge>
                <StatusBadge tone={priorityTone(s.priority)}>
                  Priority: {s.priority}
                </StatusBadge>
              </div>
              <p className="mt-1 text-sm font-semibold text-navy-deep">
                {s.mode} · {s.container} · {s.weightKg.toLocaleString()} kg
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <div>
              <div className="text-[0.65rem] uppercase tracking-widest text-muted-foreground font-bold">
                ETD
              </div>
              <div className="font-semibold text-navy-deep tabular-nums">
                {formatDate(s.etd)}
              </div>
            </div>
            <div>
              <div className="text-[0.65rem] uppercase tracking-widest text-muted-foreground font-bold">
                ETA
              </div>
              <div className="font-semibold text-navy-deep tabular-nums">
                {formatDate(s.eta)}
              </div>
            </div>
            <div>
              <div className="text-[0.65rem] uppercase tracking-widest text-muted-foreground font-bold">
                Assigned
              </div>
              <div className="font-semibold text-navy-deep">{s.assignedTo}</div>
            </div>
          </div>
        </div>

        {typeof s.progress === "number" && (
          <div className="mt-5">
            <ProgressRow label="Tracking" value={s.progress} tone="brand" />
          </div>
        )}
      </section>

      {/* Two-col detail grid */}
      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {/* Left col */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tracking timeline */}
          <section className="card-premium rounded-2xl p-5">
            <h2 className="font-display font-bold text-navy-deep text-base mb-4">
              Tracking timeline
            </h2>
            <Timeline steps={timeline} />
          </section>

          {/* Customs / documents */}
          <section className="card-premium rounded-2xl p-5">
            <header className="flex items-center justify-between mb-3 gap-3 flex-wrap">
              <h2 className="font-display font-bold text-navy-deep text-base">
                Customs &amp; Documents
              </h2>
              {customs && (
                <Link
                  to="/dashboard/customs"
                  className="text-xs font-semibold text-brand hover:underline underline-offset-4"
                >
                  Open file {customs.id} →
                </Link>
              )}
            </header>
            {customs ? (
              <DocumentChecklist documents={customs.documents} />
            ) : (
              <p className="text-sm text-muted-foreground">
                No customs file linked yet.
              </p>
            )}
          </section>

          {/* Activity log */}
          <section className="card-premium rounded-2xl p-5">
            <h2 className="font-display font-bold text-navy-deep text-base mb-4">
              Internal activity
            </h2>
            <ActivityLog
              entries={[
                {
                  who: "Operations",
                  action: "moved shipment to customs queue",
                  when: "2h ago",
                },
                {
                  who: "Customs",
                  action: `created file ${customs?.id ?? "—"}`,
                  when: "yesterday",
                  icon: FileEdit,
                },
                {
                  who: "Sales",
                  action: "confirmed booking with customer",
                  when: formatDate(s.etd),
                  icon: CheckCircle2,
                },
              ]}
            />
            {s.notes && (
              <p className="mt-4 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
                <strong className="font-semibold">Internal note:</strong>{" "}
                {s.notes}
              </p>
            )}
          </section>
        </div>

        {/* Right col */}
        <aside className="space-y-4">
          <section className="card-premium rounded-2xl p-5">
            <h2 className="font-display font-bold text-navy-deep text-sm mb-3">
              Customer
            </h2>
            <p className="text-sm font-semibold text-navy-deep">{s.customer}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Account · pinned to lane
            </p>
            <Link
              to="/dashboard/customers"
              className="mt-3 inline-flex text-xs font-semibold text-brand hover:underline underline-offset-4"
            >
              Open customer record →
            </Link>
          </section>

          <section className="card-premium rounded-2xl p-5">
            <h2 className="font-display font-bold text-navy-deep text-sm mb-3">
              Route
            </h2>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-start gap-2">
                <Building2 className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-navy-deep">{s.origin}</div>
                  <div className="text-xs text-muted-foreground">Origin</div>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Building2 className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-navy-deep">
                    {s.destination}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Destination
                  </div>
                </div>
              </li>
            </ul>
          </section>

          <section className="card-premium rounded-2xl p-5">
            <h2 className="font-display font-bold text-navy-deep text-sm mb-3">
              Cargo
            </h2>
            <dl className="text-sm space-y-2">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Container</dt>
                <dd className="font-semibold text-navy-deep">{s.container}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Mode</dt>
                <dd className="font-semibold text-navy-deep">{s.mode}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Weight</dt>
                <dd className="font-semibold text-navy-deep tabular-nums">
                  {s.weightKg.toLocaleString()} kg
                </dd>
              </div>
            </dl>
          </section>

          <section className="card-premium rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <h2 className="font-display font-bold text-navy-deep text-sm">
                Insurance
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Cargo insurance certificate on file. Valid until ETA + 14 days.
            </p>
          </section>

        </aside>
      </div>

      {/* ── Full-width tabbed panel: Document Vault | Communications ─── */}
      <div className="mt-5 card-premium rounded-2xl overflow-hidden">
        {/* Tab bar */}
        <div className="flex items-center gap-0 border-b border-border bg-foreground/[0.02] px-4">
          {(
            [
              {
                key: "vault" as DetailTab,
                icon: <FolderOpen className="h-3.5 w-3.5" />,
                label: "Document Vault",
              },
              {
                key: "comms" as DetailTab,
                icon: <Mail className="h-3.5 w-3.5" />,
                label: "Communications",
                badge: 3,
              },
            ] satisfies { key: DetailTab; icon: React.ReactNode; label: string; badge?: number }[]
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-3 text-[0.78rem] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-brand",
                activeTab === tab.key
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.badge != null && (
                <span
                  className={cn(
                    "inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[0.55rem] font-bold",
                    activeTab === tab.key
                      ? "bg-brand text-white"
                      : "bg-foreground/10 text-muted-foreground",
                  )}
                >
                  {tab.badge}
                </span>
              )}
              {/* Active underline */}
              {activeTab === tab.key && (
                <motion.span
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand rounded-full"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab panel */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="p-5"
        >
          {activeTab === "vault" ? (
            <DocumentVault shipmentId={s.id} />
          ) : (
            <ShipmentComms shipmentId={s.id} />
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
