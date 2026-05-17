/**
 * Overview composite endpoint. The Overview page calls a single function and
 * receives every aggregate it needs in one trip — the future real backend
 * should mirror this shape (likely a Postgres view or a `/dashboard/overview`
 * RPC).
 */
import { simulateRead } from "./client";
import {
  shipments,
  weeklyShipmentTrend,
  shipmentsByMode,
  deliveryStatusBreakdown,
  routeActivity,
} from "@/data/dashboard/shipments";
import { tasks } from "@/data/dashboard/tasks";
import { customsFiles } from "@/data/dashboard/customs";
import { warehouseZones } from "@/data/dashboard/warehouse";
import { quotes } from "@/data/dashboard/quotes";
import type {
  CustomsFile,
  Quote,
  Shipment,
  Task,
  WarehouseZone,
} from "@/lib/dashboard/types";

export interface DashboardOverview {
  shipments: Shipment[];
  weeklyShipmentTrend: typeof weeklyShipmentTrend;
  shipmentsByMode: typeof shipmentsByMode;
  deliveryStatusBreakdown: typeof deliveryStatusBreakdown;
  routeActivity: typeof routeActivity;
  tasks: Task[];
  customsFiles: CustomsFile[];
  warehouseZones: WarehouseZone[];
  quotes: Quote[];
}

export async function getDashboardOverview(): Promise<DashboardOverview> {
  return simulateRead(() => ({
    shipments,
    weeklyShipmentTrend,
    shipmentsByMode,
    deliveryStatusBreakdown,
    routeActivity,
    tasks,
    customsFiles,
    warehouseZones,
    quotes,
  }));
}
