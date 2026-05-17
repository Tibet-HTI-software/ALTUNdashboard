import type { HandlingJob, WarehouseZone } from "@/lib/dashboard/types";

export const warehouseZones: WarehouseZone[] = [
  { id: "Z-A", name: "Zone A — Dry Storage", capacity: 480, used: 392 },
  { id: "Z-B", name: "Zone B — Bulk Pallets", capacity: 720, used: 510 },
  { id: "Z-C", name: "Zone C — Reefer", capacity: 120, used: 96 },
  { id: "Z-D", name: "Zone D — Hazmat", capacity: 80, used: 24 },
  { id: "Z-E", name: "Zone E — Cross-dock", capacity: 200, used: 142 },
];

export const inboundOutbound = [
  { day: "Mon", inbound: 12, outbound: 9 },
  { day: "Tue", inbound: 14, outbound: 11 },
  { day: "Wed", inbound: 17, outbound: 13 },
  { day: "Thu", inbound: 11, outbound: 12 },
  { day: "Fri", inbound: 19, outbound: 16 },
];

export const handlingJobs: HandlingJob[] = [
  {
    id: "JOB-7821",
    type: "Inbound",
    shipmentId: "AL-2026-1044",
    zone: "Zone C — Reefer",
    status: "In Progress",
    staff: "Operations",
    scheduledFor: "2026-05-08T09:30:00Z",
  },
  {
    id: "JOB-7822",
    type: "Outbound",
    shipmentId: "AL-2026-1043",
    zone: "Zone A — Dry Storage",
    status: "Scheduled",
    staff: "Operations",
    scheduledFor: "2026-05-09T07:00:00Z",
  },
  {
    id: "JOB-7823",
    type: "Cross-dock",
    shipmentId: "AL-2026-1044",
    zone: "Zone E — Cross-dock",
    status: "Scheduled",
    staff: "Operations",
    scheduledFor: "2026-05-08T15:00:00Z",
  },
  {
    id: "JOB-7824",
    type: "Picking",
    shipmentId: "AL-2026-1049",
    zone: "Zone A — Dry Storage",
    status: "Completed",
    staff: "Operations",
    scheduledFor: "2026-05-07T11:00:00Z",
  },
  {
    id: "JOB-7825",
    type: "Inbound",
    shipmentId: "AL-2026-1046",
    zone: "Zone B — Bulk Pallets",
    status: "Delayed",
    staff: "Operations",
    scheduledFor: "2026-05-08T13:00:00Z",
  },
];

export const warehouseAlerts = [
  {
    severity: "warning" as const,
    title: "Reefer zone above 80% capacity",
    detail: "Schedule outbound for AL-2026-1044 by end of shift.",
  },
  {
    severity: "danger" as const,
    title: "JOB-7825 inbound delayed",
    detail: "Truck ETA pushed by 90 minutes — notify customer.",
  },
  {
    severity: "info" as const,
    title: "Zone D restock window open",
    detail: "Hazmat-trained staff available 13:00–17:00.",
  },
];
