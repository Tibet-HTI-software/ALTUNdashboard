import { simulateRead } from "./client";
import {
  warehouseZones,
  inboundOutbound,
  handlingJobs,
  warehouseAlerts,
} from "@/data/dashboard/warehouse";
import type { HandlingJob } from "@/lib/dashboard/types";
import type { ScheduleHandlingJobInput } from "./types";
import { supabase, withSupabaseFallback } from "./supabase";
import { createBoardTask } from "./tasks.api";
import { TASK_TRIGGER_ROLES } from "@/lib/dashboard/roles.config";

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

  const result = await withSupabaseFallback(
    "handling_jobs",
    async () => {
      const { error } = await supabase.from("handling_jobs").insert({
        reference: id,
        type: input.type.toLowerCase().replace(/-/g, "_"),
        shipment_ref: input.shipmentId,
        zone: input.zone,
        status: "scheduled",
        staff: input.staff,
        scheduled_for: input.scheduledFor,
      });
      if (error) throw error;
      return draft;
    },
    () => Promise.resolve(draft),
  );

  // Auto-spawn a board task for the planner — fire-and-forget,
  // never blocks or fails the job scheduling.
  const due = input.scheduledFor.slice(0, 10); // ISO date from scheduledFor
  createBoardTask({
    title: `Monitor warehouse job ${id}`,
    description: `${input.type} job scheduled for zone ${input.zone}${input.shipmentId ? ` (shipment ${input.shipmentId})` : ""}. Verify completion and update shipment status.`,
    assignedRole: TASK_TRIGGER_ROLES.warehouseJob,
    category: "Operations",
    priority: "medium",
    shipmentId: input.shipmentId ?? null,
    dueDate: due,
  }).catch(() => {
    // Non-fatal — handling job was scheduled successfully.
  });

  return result;
}
