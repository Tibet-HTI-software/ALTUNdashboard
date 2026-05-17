/**
 * Input/result types for the dashboard mock-API layer.
 *
 * Aligned with the existing UI so the move to a real backend later (Supabase
 * or otherwise) is a body-only change inside the service files.
 */

import type {
  ContainerType,
  CustomerStatus,
  Priority,
  QuoteStatus,
  ShipmentStatus,
  TransportMode,
  AutomationCategory,
  AutomationSuggestion,
  ContainerKind,
  ContainerGauge,
  Incoterm,
  QuoteDirection,
  Address,
} from "../types";

/** Generic envelope for results that may want metadata later. Optional. */
export interface ApiResult<T> {
  data: T;
  /** Total in case of pagination — not used in the current mock. */
  total?: number;
}

/* ── shipments ────────────────────────────────────────────────────── */

export interface CreateShipmentInput {
  customer: string;
  origin: string;
  destination: string;
  mode: TransportMode;
  container: ContainerType;
  status?: ShipmentStatus;
  priority?: Priority;
  etd: string;
  eta: string;
  assignedTo: string;
  weightKg: number;
  notes?: string;
}

/* ── customers ────────────────────────────────────────────────────── */

export interface CreateCustomerInput {
  company: string;
  contact: string;
  country: string;
  routeFocus: string;
  status?: CustomerStatus;
}

/* ── quotes ───────────────────────────────────────────────────────── */

export interface CreateQuoteInput {
  customer: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  direction: QuoteDirection;
  container: ContainerKind;
  gauge?: ContainerGauge;
  goodsDescription: string;
  hsCode?: string;
  grossWeightKg: number;
  netWeightKg: number;
  portOfLoading: string;
  portOfDestination: string;
  incoterm: Incoterm;
  insurance: boolean;
  vgmRequired: boolean;
  loading: Address;
  delivery: Address;
  urgency: Priority;
  notes?: string;
}

/* ── customs ──────────────────────────────────────────────────────── */

export type DocumentStatusInput =
  | "Pending"
  | "In Review"
  | "Approved"
  | "Rejected";

/* ── warehouse ────────────────────────────────────────────────────── */

export interface ScheduleHandlingJobInput {
  type: "Inbound" | "Outbound" | "Cross-dock" | "Picking";
  shipmentId: string;
  zone: string;
  staff: string;
  scheduledFor: string;
}

/* ── team / tasks ─────────────────────────────────────────────────── */

export interface CreateTeamTaskInput {
  title: string;
  owner: string;
  due: string;
  priority: Priority;
  related?: string;
  status?: "Open" | "In Progress" | "Done";
}

/* ── automation ───────────────────────────────────────────────────── */

export interface CreateAutomationTaskInput {
  source: "workflow" | "suggestion" | "event";
  /** Source id — workflow id, suggestion id, or event id. */
  sourceId: string;
  title: string;
  owner?: string;
}

export interface AutomationCenterPayload {
  kpis: import("../../../data/dashboard/automation").AutomationKpi[];
  workflows: import("../types").AutomationWorkflow[];
  events: import("../types").AutomationEvent[];
  suggestions: AutomationSuggestion[];
  rules: import("../types").AutomationRule[];
  draftEmail: typeof import("../../../data/dashboard/automation").automationDraftEmail;
}

export type AutomationCategoryFilter = AutomationCategory | "All";

/* ── reports ──────────────────────────────────────────────────────── */

export interface ExportReportInput {
  format?: "pdf" | "csv";
  range?: { from: string; to: string };
}

export interface ExportReportResult {
  format: "pdf" | "csv";
  /** Mock URL — would be a signed download URL in production. */
  url: string;
  /** Generated filename suggestion. */
  filename: string;
}

/* ── settings ─────────────────────────────────────────────────────── */

export interface DashboardSettings {
  notifications: {
    dailyDigest: boolean;
    customsSlaAlerts: boolean;
    etaShift: boolean;
    quotes: boolean;
    quoteApproved: boolean;
    warehouseCapacity: boolean;
  };
  documentWorkflow: {
    blockOnMissingDocs: boolean;
    autoCompletenessCheck: boolean;
    showCrossTradeLane: boolean;
    hideDeliveredShipments: boolean;
  };
  /** Free-form company profile fields used by the Settings card. */
  company: {
    name: string;
    address: string;
    operationsContact: string;
    vatNumber: string;
  };
}

export type DashboardSettingsInput = Partial<DashboardSettings>;
