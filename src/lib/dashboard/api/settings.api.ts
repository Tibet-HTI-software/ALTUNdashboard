import { simulateRead, simulateSuccess } from "./client";
import type { DashboardSettings, DashboardSettingsInput } from "./types";

/**
 * Default settings shape. Once a real backend is wired up these would be
 * stored in a `dashboard_settings` table per organisation/user and edits
 * would persist via PATCH/PUT. For now everything is held in memory only.
 */
const DEFAULT_SETTINGS: DashboardSettings = {
  notifications: {
    dailyDigest: true,
    customsSlaAlerts: true,
    etaShift: true,
    quotes: true,
    quoteApproved: true,
    warehouseCapacity: false,
  },
  documentWorkflow: {
    blockOnMissingDocs: true,
    autoCompletenessCheck: true,
    showCrossTradeLane: true,
    hideDeliveredShipments: false,
  },
  company: {
    name: "Altun Logistics NV",
    address: "Paul Smekensplein 4 bus 301, 2000 Antwerpen, Belgium",
    operationsContact: "info@altunlogistics.be",
    vatNumber: "",
  },
};

/* In-memory store. Resets on reload — by design for the prototype. */
let currentSettings: DashboardSettings = structuredClone(DEFAULT_SETTINGS);

export async function getDashboardSettings(): Promise<DashboardSettings> {
  return simulateRead(() => currentSettings);
}

export async function updateDashboardSettings(
  input: DashboardSettingsInput,
): Promise<DashboardSettings> {
  currentSettings = {
    notifications: {
      ...currentSettings.notifications,
      ...(input.notifications ?? {}),
    },
    documentWorkflow: {
      ...currentSettings.documentWorkflow,
      ...(input.documentWorkflow ?? {}),
    },
    company: { ...currentSettings.company, ...(input.company ?? {}) },
  };
  return simulateSuccess(currentSettings);
}
