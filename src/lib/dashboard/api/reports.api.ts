import { simulateRead, simulateSuccess } from "./client";
import {
  shipmentsByMonth,
  performanceByRoute,
  customsTrend,
  revenuePlaceholder,
} from "@/data/dashboard/reports";
import type { ExportReportInput, ExportReportResult } from "./types";

export interface ReportsOverview {
  shipmentsByMonth: typeof shipmentsByMonth;
  performanceByRoute: typeof performanceByRoute;
  customsTrend: typeof customsTrend;
  revenuePlaceholder: typeof revenuePlaceholder;
}

export async function getReportsOverview(): Promise<ReportsOverview> {
  return simulateRead(() => ({
    shipmentsByMonth,
    performanceByRoute,
    customsTrend,
    revenuePlaceholder,
  }));
}

/**
 * Mock export. Real backend would generate a file (server-side or via a
 * worker) and return a signed download URL. For the prototype we produce a
 * fake URL so the UI can pretend a download was prepared.
 */
export async function exportReport(
  input?: ExportReportInput,
): Promise<ExportReportResult> {
  const format = input?.format ?? "pdf";
  const stamp = new Date().toISOString().slice(0, 10);
  return simulateSuccess({
    format,
    url: `mock://reports/${stamp}.${format}`,
    filename: `altun-logistics-report-${stamp}.${format}`,
  });
}
