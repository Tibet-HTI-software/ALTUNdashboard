/**
 * Shared types for the internal Altun Logistics operations dashboard.
 *
 * All types are front-end mock-data types. When a real backend is wired up,
 * keep field names in sync (or generate from the API schema) so the UI
 * components don't need to change.
 */

export type TransportMode = "Sea" | "Road" | "Rail";

export type ContainerType =
  | "FCL"
  | "LCL"
  | "Reefer"
  | "Open Top"
  | "Flat-rack"
  | "Tank"
  | "Flexi Tank"
  | "Project Cargo";

export type ShipmentStatus =
  | "Booked"
  | "In Transit"
  | "Customs Clearance"
  | "At Warehouse"
  | "Delivered"
  | "Delayed";

export type Priority = "Low" | "Normal" | "High" | "Urgent";

export interface Shipment {
  id: string;
  customer: string;
  origin: string;
  destination: string;
  mode: TransportMode;
  container: ContainerType;
  status: ShipmentStatus;
  priority: Priority;
  etd: string; // ISO date
  eta: string; // ISO date
  assignedTo: string;
  weightKg: number;
  /** Optional progress 0..1 for the timeline rail. */
  progress?: number;
  notes?: string;
}

export type CustomerStatus = "Active" | "Onboarding" | "Inactive" | "On Hold";

export interface Customer {
  id: string;
  company: string;
  contact: string;
  country: string;
  routeFocus: string;
  activeShipments: number;
  lastActivity: string; // ISO date
  status: CustomerStatus;
}

export type QuoteStatus =
  | "New"
  | "Reviewing"
  | "Sent"
  | "Approved"
  | "Rejected";

export type QuoteDirection = "Import" | "Export";

/**
 * Container catalogue based on the client quote-request document.
 * Grouped UI buckets:
 *   Standard: 20DV, 40DV, 40HC, 45HC
 *   Cooled:   20RF, 40RFHC
 *   Special:  Open Top, Flat Rack, Hard Top, Platform
 */
export type ContainerKind =
  | "20ft Standard (DV)"
  | "40ft Standard (DV)"
  | "40ft High Cube (HC)"
  | "45ft High Cube"
  | "20ft Reefer"
  | "40ft Reefer HC"
  | "Open Top 20ft"
  | "Open Top 40ft"
  | "Flat Rack 20ft"
  | "Flat Rack 40ft"
  | "Hard Top"
  | "Platform";

/** Required only for Open Top / Flat Rack containers. */
export type ContainerGauge = "In Gauge" | "Out of Gauge";

export type Incoterm = "EXW" | "FCA" | "FOB" | "CFR" | "CIF" | "DAP" | "DDP";

export interface Address {
  address: string;
  postalCode: string;
  city: string;
  country: string;
}

export interface Quote {
  id: string;
  customer: string;
  /** Customer-facing contact for the request. */
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;

  direction: QuoteDirection;

  /* Container */
  container: ContainerKind;
  /** Only set when container is Open Top or Flat Rack. */
  gauge?: ContainerGauge;

  /* Goods */
  goodsDescription: string;
  hsCode?: string;
  grossWeightKg: number;
  netWeightKg: number;

  /* Route */
  portOfLoading: string;
  portOfDestination: string;

  /* Terms */
  incoterm: Incoterm;
  insurance: boolean;
  vgmRequired: boolean;

  /* Loading + delivery */
  loading: Address;
  delivery: Address;

  /* Workflow metadata */
  urgency: Priority;
  status: QuoteStatus;
  requestedAt: string; // ISO date
  assignedTo: string;
  notes?: string;

  /* Legacy compatibility — short label used in old summary views. */
  origin: string;
  destination: string;
  service: string;
  cargo: string;
}

/** True when the container kind needs a gauge selection. */
export function containerNeedsGauge(c: ContainerKind): boolean {
  return c.startsWith("Open Top") || c.startsWith("Flat Rack");
}

export type DocumentStatus = "Pending" | "In Review" | "Approved" | "Rejected";

export type DocumentType =
  | "Commercial Invoice"
  | "Packing List"
  | "Bill of Lading"
  | "CMR"
  | "Customs Declaration"
  | "Insurance Certificate";

export interface CustomsFile {
  id: string;
  shipmentId: string;
  customer: string;
  stage: "Pre-clearance" | "Submitted" | "Inspection" | "Released";
  priority: Priority;
  documents: { type: DocumentType; status: DocumentStatus }[];
  owner: string;
  dueDate: string;
}

export interface WarehouseZone {
  id: string;
  name: string;
  capacity: number;
  used: number; // 0..capacity
}

export interface HandlingJob {
  id: string;
  type: "Inbound" | "Outbound" | "Cross-dock" | "Picking";
  shipmentId: string;
  zone: string;
  status: "Scheduled" | "In Progress" | "Completed" | "Delayed";
  staff: string;
  scheduledFor: string;
}

export interface Task {
  id: string;
  title: string;
  owner: string;
  due: string; // ISO date
  priority: Priority;
  related?: string; // shipment id, quote id, etc.
  status: "Open" | "In Progress" | "Done";
}

export interface StaffAvailability {
  name: string;
  role: string;
  department: string;
  workload: number; // 0..1
  shipments: number;
  tasks: number;
  status: "Available" | "Busy" | "Off-shift";
}

export type RouteActivityKey =
  | "Antwerp ↔ Turkey"
  | "Europe-wide"
  | "Cross Trade"
  | "Antwerp ↔ Hamburg"
  | "Antwerp ↔ Milan";

export interface RouteActivity {
  route: RouteActivityKey;
  shipments: number;
  share: number; // 0..1
}

/* ── automation center ────────────────────────────────────────────── */

export type AutomationCategory =
  | "Documents"
  | "Risk"
  | "Quotes"
  | "Communication"
  | "Operations"
  | "Tasks";

export type AutomationStatus = "Active" | "Draft" | "Paused";

export interface AutomationWorkflow {
  id: string;
  name: string;
  category: AutomationCategory;
  description: string;
  inputs: string[];
  outputs: string[];
  status: AutomationStatus;
  /** How many runs in the last 24h (demo number). */
  runsToday: number;
}

export type AutomationEventKind =
  | "document-check"
  | "risk-flag"
  | "quote-prepared"
  | "email-draft"
  | "warehouse-route"
  | "task-created";

export interface AutomationEvent {
  id: string;
  kind: AutomationEventKind;
  message: string;
  detail?: string;
  /** Relative time string for the demo, e.g. "2 min ago". */
  at: string;
  related?: string;
}

export interface AutomationSuggestion {
  id: string;
  priority: Priority;
  title: string;
  reason: string;
  action: "Create task" | "Draft email" | "Review file";
  related: string;
}

export interface AutomationRule {
  id: string;
  trigger: string;
  condition: string;
  action: string;
  owner: string;
  status: AutomationStatus;
}
