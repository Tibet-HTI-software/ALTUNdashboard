import { simulateRead, simulateSuccess } from "./client";
import {
  warehouseZones,
  inboundOutbound,
  handlingJobs,
  warehouseAlerts,
} from "@/data/dashboard/warehouse";
import type { HandlingJob } from "@/lib/dashboard/types";
import type { ScheduleHandlingJobInput } from "./types";

export interface WarehouseOverview {
  zones: typeof warehouseZones;
  inboundOutbound: typeof inboundOutbound;
  jobs: typeof handlingJobs;
  alerts: typeof warehouseAlerts;
}

export async function getWarehouseOverview(): Promise<WarehouseOverview> {
  return simulateRead(() => ({
    zones: warehouseZones,
    inboundOutbound,
    jobs: handlingJobs,
    alerts: warehouseAlerts,
  }));
}

export async function scheduleHandlingJob(
  input: ScheduleHandlingJobInput,
): Promise<HandlingJob> {
  const id = `JOB-${Math.floor(Math.random() * 9000 + 1000)}`;
  const draft: HandlingJob = {
    id,
    type: input.type,
    shipmentId: input.shipmentId,
    zone: input.zone,
    status: "Scheduled",
    staff: input.staff,
    scheduledFor: input.scheduledFor,
  };
  return simulateSuccess(draft);
}
