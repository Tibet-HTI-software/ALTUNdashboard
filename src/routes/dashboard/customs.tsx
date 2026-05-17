import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Plus } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { DocumentChecklist } from "@/components/dashboard/DocumentChecklist";
import { StatusBadge, priorityTone } from "@/components/dashboard/StatusBadge";
import { getCustomsFiles, useAsyncData } from "@/lib/dashboard/api";
import { LoadingState, ErrorState } from "@/components/dashboard/AsyncStates";
import { demoAction } from "@/lib/dashboard/demo";
import type { CustomsFile } from "@/lib/dashboard/types";
import { formatDate, relativeDays } from "@/lib/dashboard/format";

export const Route = createFileRoute("/dashboard/customs")({
  head: () => ({ meta: [{ title: "Customs & Documents — Altun Logistics" }] }),
  component: CustomsPage,
});

function stageTone(stage: CustomsFile["stage"]) {
  switch (stage) {
    case "Pre-clearance":
      return "neutral" as const;
    case "Submitted":
      return "info" as const;
    case "Inspection":
      return "warning" as const;
    case "Released":
      return "success" as const;
  }
}

function CustomsPage() {
  const [openId, setOpenId] = useState<string>("");
  const {
    data: customsFiles,
    loading,
    error,
    reload,
  } = useAsyncData(getCustomsFiles, []);

  // Default-select the first file once data lands.
  const firstId = customsFiles?.[0]?.id;
  if (firstId && openId === "") {
    setOpenId(firstId);
  }

  const open = (customsFiles ?? []).find((c) => c.id === openId);

  return (
    <DashboardLayout>
      <DashboardPageHeader
        title="Customs & Documents"
        description="Pending customs files, document checklists, and clearance progress."
        crumbs={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "Customs" },
        ]}
        actions={
          <button
            type="button"
            onClick={() =>
              demoAction("this would open the new customs file form.")
            }
            className="inline-flex items-center gap-1.5 h-9 rounded-md bg-brand text-white px-3.5 text-sm font-medium hover:bg-brand-strong transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> New file
          </button>
        }
      />

      {loading && <LoadingState label="Loading customs files…" />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {!loading && !error && customsFiles && (
        <div className="grid gap-5 lg:grid-cols-5">
          {/* File list */}
          <section className="lg:col-span-2 card-premium rounded-2xl overflow-hidden">
            <header className="px-5 py-4 border-b border-border">
              <h2 className="font-display font-bold text-navy-deep text-base">
                Pending files
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {customsFiles.filter((c) => c.stage !== "Released").length} open
                · {customsFiles.filter((c) => c.stage === "Released").length}{" "}
                released
              </p>
            </header>
            <ul className="divide-y divide-border max-h-[600px] overflow-y-auto">
              {customsFiles.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(f.id)}
                    className={`w-full text-left px-5 py-4 transition-colors ${
                      openId === f.id
                        ? "bg-brand-soft/40"
                        : "hover:bg-secondary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold text-navy-deep">
                        {f.id}
                      </span>
                      <StatusBadge tone={stageTone(f.stage)} dot>
                        {f.stage}
                      </StatusBadge>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-navy-deep truncate">
                      {f.customer}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Shipment {f.shipmentId} · Due {relativeDays(f.dueDate)}
                    </p>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <StatusBadge tone={priorityTone(f.priority)}>
                        {f.priority}
                      </StatusBadge>
                      <span className="text-[0.65rem] text-muted-foreground">
                        {f.documents.length} documents
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {/* Detail panel */}
          <section className="lg:col-span-3">
            {open ? (
              <div className="card-premium rounded-2xl p-5">
                <header className="flex items-start justify-between gap-3 flex-wrap mb-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-display font-bold text-navy-deep text-lg">
                        {open.id}
                      </h2>
                      <StatusBadge tone={stageTone(open.stage)} dot>
                        {open.stage}
                      </StatusBadge>
                      <StatusBadge tone={priorityTone(open.priority)}>
                        {open.priority}
                      </StatusBadge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Customer:{" "}
                      <span className="font-semibold text-navy-deep">
                        {open.customer}
                      </span>
                    </p>
                  </div>
                  <Link
                    to="/dashboard/shipments/$id"
                    params={{ id: open.shipmentId }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline underline-offset-4"
                  >
                    Open shipment {open.shipmentId}{" "}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </header>

                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                  <div>
                    <dt className="text-[0.65rem] uppercase tracking-widest font-bold text-muted-foreground">
                      Stage
                    </dt>
                    <dd className="text-sm font-semibold text-navy-deep mt-1">
                      {open.stage}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[0.65rem] uppercase tracking-widest font-bold text-muted-foreground">
                      Owner
                    </dt>
                    <dd className="text-sm font-semibold text-navy-deep mt-1">
                      {open.owner}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[0.65rem] uppercase tracking-widest font-bold text-muted-foreground">
                      Due date
                    </dt>
                    <dd className="text-sm font-semibold text-navy-deep mt-1 tabular-nums">
                      {formatDate(open.dueDate)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[0.65rem] uppercase tracking-widest font-bold text-muted-foreground">
                      Documents
                    </dt>
                    <dd className="text-sm font-semibold text-navy-deep mt-1">
                      {
                        open.documents.filter((d) => d.status === "Approved")
                          .length
                      }
                      /{open.documents.length} approved
                    </dd>
                  </div>
                </dl>

                <h3 className="font-display font-bold text-navy-deep text-sm mb-2">
                  Document checklist
                </h3>
                <DocumentChecklist documents={open.documents} />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
                Select a customs file to view its document checklist.
              </div>
            )}
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}
