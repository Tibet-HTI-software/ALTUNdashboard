/**
 * Mock data for the Automation Center prototype page.
 *
 * Everything here is front-end fixture data so the UI can be reviewed without
 * a backend. When real automation is wired up:
 *   - workflow definitions should come from a config service or DB,
 *   - events should stream from the automation runtime,
 *   - suggestions should be produced by a scoring service or LLM call,
 *   - rules should be persisted and evaluated server-side.
 */

import type {
  AutomationEvent,
  AutomationRule,
  AutomationSuggestion,
  AutomationWorkflow,
} from "@/lib/dashboard/types";

export interface AutomationKpi {
  label: string;
  value: string | number;
  hint: string;
}

export const automationKpis: AutomationKpi[] = [
  {
    label: "Active Automations",
    value: 3,
    hint: "Workflows running across operations",
  },
  {
    label: "Documents Checked Today",
    value: 142,
    hint: "Customs files scanned for completeness",
  },
  {
    label: "High-Risk Shipments",
    value: 4,
    hint: "Flagged for delay risk in last 24h",
  },
  {
    label: "Draft Messages Ready",
    value: 11,
    hint: "Emails waiting for staff review",
  },
];

export const automationWorkflows: AutomationWorkflow[] = [
  {
    id: "wf-doc-check",
    name: "Document Completeness Check",
    category: "Documents",
    description:
      "Reviews customs files and highlights missing or incomplete documents before submission.",
    inputs: ["Shipment", "Customer", "Document checklist"],
    outputs: ["Missing documents", "Risk level", "Suggested next action"],
    status: "Active",
    runsToday: 38,
  },
  {
    id: "wf-delay-risk",
    name: "Delay Risk Detection",
    category: "Risk",
    description:
      "Flags shipments that may miss ETA based on customs stage, warehouse status, carrier updates, and priority.",
    inputs: ["Shipment status", "ETA", "Customs stage", "Warehouse alerts"],
    outputs: ["Delay risk score", "Reason", "Recommended action"],
    status: "Active",
    runsToday: 24,
  },
  {
    id: "wf-quote-prep",
    name: "Quote Preparation Assistant",
    category: "Quotes",
    description:
      "Prepares quote responses from the request: import/export direction, container type, goods, port pair, and Incoterm.",
    inputs: [
      "Direction (Import/Export)",
      "Container type + gauge",
      "Goods + HS code",
      "Port of loading / destination",
      "Incoterm",
      "Insurance + VGM",
    ],
    outputs: [
      "Suggested service",
      "Required documents per Incoterm",
      "Internal checklist",
    ],
    status: "Active",
    runsToday: 9,
  },
  {
    id: "wf-email-draft",
    name: "Email Response Assistant",
    category: "Communication",
    description:
      "Summarizes incoming customer emails and prepares a professional reply draft for staff review before sending.",
    inputs: [
      "Incoming email",
      "Sender",
      "Subject",
      "Shipment / quote reference",
      "Tone / urgency",
    ],
    outputs: ["Email summary", "Suggested reply", "Recommended next action"],
    status: "Active",
    runsToday: 17,
  },
  {
    id: "wf-daily-summary",
    name: "Daily Operations Summary",
    category: "Operations",
    description:
      "Creates a morning summary of delayed shipments, urgent customs files, warehouse warnings, and open quotes.",
    inputs: ["Shipments", "Customs files", "Warehouse alerts", "Tasks"],
    outputs: ["Daily action list for operations team"],
    status: "Active",
    runsToday: 1,
  },
  {
    id: "wf-task-rules",
    name: "Task Automation Rules",
    category: "Tasks",
    description:
      "Turns operational events into staff tasks automatically — missing documents, delays, approved quotes, capacity alerts.",
    inputs: ["Operational events", "Rule conditions", "Owner mapping"],
    outputs: ["Created tasks", "Routed notifications"],
    status: "Active",
    runsToday: 22,
  },
];

export const automationEvents: AutomationEvent[] = [
  {
    id: "ev-1",
    kind: "document-check",
    message: "Customs file CF-2026-0231 checked",
    detail: "1 document still pending — Insurance Certificate",
    at: "2 min ago",
    related: "CF-2026-0231",
  },
  {
    id: "ev-2",
    kind: "risk-flag",
    message: "Shipment AL-2026-1048 flagged as delay risk",
    detail: "Customs inspection extended past SLA window",
    at: "14 min ago",
    related: "AL-2026-1048",
  },
  {
    id: "ev-3",
    kind: "quote-prepared",
    message: "Quote Q-2026-0512 prepared for review",
    detail:
      "Export · 40HC · FOB · Antwerp → Istanbul Ambarli · Insurance: Yes · VGM: Yes",
    at: "31 min ago",
    related: "Q-2026-0512",
  },
  {
    id: "ev-4",
    kind: "email-draft",
    message: "Incoming email summarized and reply draft prepared",
    detail: "Demir Industrial Trading — ETA update request for AL-2026-1048",
    at: "48 min ago",
    related: "AL-2026-1048",
  },
  {
    id: "ev-5",
    kind: "warehouse-route",
    message: "Warehouse Zone C capacity warning routed",
    detail: "Routed to Operations — 92% occupancy",
    at: "1 h ago",
    related: "Zone C",
  },
  {
    id: "ev-6",
    kind: "task-created",
    message: "Task created for Customs",
    detail: "Follow up on CMR document for AL-2026-1041",
    at: "1 h ago",
    related: "AL-2026-1041",
  },
];

export const automationSuggestions: AutomationSuggestion[] = [
  {
    id: "sg-1",
    priority: "Urgent",
    title: "Request missing Insurance Certificate for AL-2026-1045",
    reason:
      "Customs clearance cannot proceed without the Insurance Certificate. Vessel cut-off in 36 hours.",
    action: "Draft email",
    related: "AL-2026-1045",
  },
  {
    id: "sg-2",
    priority: "High",
    title: "Prepare customer reply for delayed shipment JOB-7825",
    reason:
      "Inbound truck arrival shifted by 6 hours. Email Response Assistant can draft a delay-notification reply for staff review before the cross-dock window closes.",
    action: "Draft email",
    related: "JOB-7825",
  },
  {
    id: "sg-3",
    priority: "High",
    title: "Review urgent quote Q-2026-0512 before end of day",
    reason:
      "Export · 40HC · FOB · Antwerp → Istanbul Ambarli. Marked High urgency 4 hours ago. SLA target is 6 working hours.",
    action: "Review file",
    related: "Q-2026-0512",
  },
];

export const automationRules: AutomationRule[] = [
  {
    id: "rl-1",
    trigger: "Customs document missing",
    condition: "Due within 24h",
    action: "Create Customs task",
    owner: "Customs",
    status: "Active",
  },
  {
    id: "rl-2",
    trigger: "Shipment delayed",
    condition: "ETA moved by 24h+",
    action: "Draft customer update",
    owner: "Operations",
    status: "Active",
  },
  {
    id: "rl-3",
    trigger: "Quote approved",
    condition: "Status becomes approved",
    action: "Create shipment draft",
    owner: "Freight Forwarding",
    status: "Draft",
  },
  {
    id: "rl-4",
    trigger: "Warehouse capacity",
    condition: "Zone above 90%",
    action: "Alert Operations",
    owner: "Operations",
    status: "Active",
  },
];

export const automationDraftEmail = {
  subject: "Re: ETA update — shipment AL-2026-1048",
  to: "ops@demirindustrial.example",
  customer: "Demir Industrial Trading",
  /*
   * Generated by the Email Response Assistant workflow:
   *  1. Reads the incoming customer email asking for an ETA update.
   *  2. Summarizes the request internally for the operations owner.
   *  3. Drafts a professional reply confirming the delay and the
   *     expected next-update window — staff review required before send.
   */
  body: `Dear Demir Industrial Trading team,

Thank you for your message regarding shipment AL-2026-1048.

We can confirm that the shipment is currently held in customs inspection, which has extended the original ETA. Based on the latest update from the carrier, we expect to share a revised arrival window within the next 4 hours.

We will send a follow-up notification as soon as customs releases the container. If you need anything in the meantime, please reply to this email and our team will respond promptly.

Kind regards,
Altun Logistics Operations`,
};
