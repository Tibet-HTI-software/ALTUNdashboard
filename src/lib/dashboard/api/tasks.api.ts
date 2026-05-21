/**
 * Board Tasks API — Supabase-first, mock-fallback.
 *
 * Separate from the legacy `Task` type in types.ts (used by the Team page).
 * `BoardTask` is purpose-built for the personal action board with role
 * filtering, shipment linking, and lowercase snake_case status keys that
 * map cleanly to Supabase enum columns.
 *
 * Table: `board_tasks`
 *   id            text PK
 *   title         text
 *   description   text
 *   status        text  (open | in_progress | done)
 *   priority      text  (high | medium | low)
 *   assigned_role text  (ceo | planner | customs | service)
 *   category      text
 *   shipment_id   text nullable → references shipments(id)
 *   due_date      date
 */

import { simulateRead, delay } from "./client";
import { supabase, withSupabaseFallback } from "./supabase";
import type { Role } from "@/lib/dashboard/role";

/* ── Types ─────────────────────────────────────────────────────────────── */

/** A-to-Z forwarding pipeline stages (also used as Kanban column IDs). */
export type BoardTaskStatus =
  | "order_entry"   // Order Entry & Budgeting
  | "booking"       // Booking & Transport
  | "customs_docs"  // Customs & Docs
  | "invoicing";    // Invoicing

export type BoardTaskPriority = "high" | "medium" | "low";
export type BoardTaskCategory =
  | "D&D"
  | "Documents"
  | "Carrier"
  | "Finance"
  | "Customs"
  | "Comms"
  | "Booking"
  | "VGM"
  | "Operations"
  | "Management";

export interface BoardTask {
  id: string;
  title: string;
  description: string;
  status: BoardTaskStatus;
  priority: BoardTaskPriority;
  assignedRole: Role;
  category: BoardTaskCategory;
  /** Human-readable shipment ref (e.g. "AL-2026-1041"), or null. */
  shipmentId: string | null;
  /** ISO date string (YYYY-MM-DD). */
  dueDate: string;
}

/* ── Mock data ─────────────────────────────────────────────────────────── */

const MOCK_TASKS: BoardTask[] = [
  // ── CEO / OPS MANAGER ────────────────────────────────────────────────
  {
    id: "BT-2026-001",
    title: "Approve Q2 sell rate — Demir Industrial",
    description:
      "Review proposed EUR all-in rate for Rotterdam import lane submitted by sales. Compare against current MSC buy rate (€1,840/40HC) and confirm minimum margin before rate letter goes out.",
    status: "order_entry",
    priority: "high",
    assignedRole: "ceo",
    category: "Management",
    shipmentId: null,
    dueDate: "2026-05-19",
  },
  {
    id: "BT-2026-002",
    title: "Review D&D waiver — Demir Industrial AL-2026-1041",
    description:
      "Demir Industrial disputes 4 days demurrage on AL-2026-1041. Carrier delay documented. Assess waiver eligibility and instruct forwarder on dispute letter.",
    status: "invoicing",
    priority: "high",
    assignedRole: "ops_manager",
    category: "D&D",
    shipmentId: "AL-2026-1041",
    dueDate: "2026-05-19",
  },
  {
    id: "BT-2026-003",
    title: "Sign off May KPI board pack",
    description:
      "Approve May 2026 KPI deck before distribution. Covers shipment volume, on-time rate, D&D exposure, and gross margin per lane.",
    status: "invoicing",
    priority: "medium",
    assignedRole: "ceo",
    category: "Management",
    shipmentId: null,
    dueDate: "2026-05-16",
  },

  // ── FORWARDER — Order Entry & Budgeting ──────────────────────────────
  {
    id: "BT-2026-010",
    title: "Open dossier & build budget — Teknopar 2×40HC",
    description:
      "Create dossier AL-2026-1055 for Teknopar Industrial (CNC machinery, Ambarlı→Rotterdam). Enter buy rates from MSC and set sell rates per approved tariff. Confirm profitability before booking.",
    status: "order_entry",
    priority: "high",
    assignedRole: "forwarder",
    category: "Operations",
    shipmentId: "AL-2026-1055",
    dueDate: "2026-05-20",
  },
  {
    id: "BT-2026-011",
    title: "Verify client invoice vs file budget — Anadolu Steel",
    description:
      "Supplier invoice MSC-2026-RTM-4421 (€4,200 demurrage) does not match budgeted €2,100. Identify discrepancy, check contract free-day clause, and flag for dispute if over-billed.",
    status: "order_entry",
    priority: "high",
    assignedRole: "forwarder",
    category: "Finance",
    shipmentId: "AL-2026-1042",
    dueDate: "2026-05-19",
  },

  // ── FORWARDER — Booking & Transport ─────────────────────────────────
  {
    id: "BT-2026-012",
    title: "Submit VGM before CY closing — MSCU4821033",
    description:
      "VGM cut-off for MSC GÜLSÜN voyage VM226E is today 17:00 Rotterdam time. Confirm shipper VGM declaration received (method 2, gross weight 28,440 kg). Submit via Inttra if not yet done.",
    status: "booking",
    priority: "high",
    assignedRole: "forwarder",
    category: "VGM",
    shipmentId: "AL-2026-1041",
    dueDate: "2026-05-19",
  },
  {
    id: "BT-2026-013",
    title: "Send transport order to carrier — AL-2026-1055",
    description:
      "Issue transport order to Atis Nakliyat for container pickup at Teknopar's Gebze warehouse. Include container number, seal number, CY drop-off address (MSC terminal Ambarlı), and CY closing time.",
    status: "booking",
    priority: "high",
    assignedRole: "forwarder",
    category: "Booking",
    shipmentId: "AL-2026-1055",
    dueDate: "2026-05-20",
  },
  {
    id: "BT-2026-014",
    title: "Approve draft MBL — AL-2026-1038",
    description:
      "Review MSC draft MBL for shipment AL-2026-1038 (EVER GIVEN II, voyage EG226W). Verify shipper/consignee details, HS codes, cargo description, and notify of duty port. Approve or send amendments within 24h of vessel departure.",
    status: "booking",
    priority: "medium",
    assignedRole: "forwarder",
    category: "Documents",
    shipmentId: "AL-2026-1038",
    dueDate: "2026-05-21",
  },
  {
    id: "BT-2026-015",
    title: "Confirm CY closing — Van der Berg export Jun 2nd",
    description:
      "CY closing for Hapag-Lloyd ANTONIA voyage HA227E (Ambarlı) is Jun 2nd 12:00. Confirm empty container pickup, transport order confirmed, and packing list received from shipper. Alert client if any gaps.",
    status: "booking",
    priority: "medium",
    assignedRole: "forwarder",
    category: "Operations",
    shipmentId: null,
    dueDate: "2026-05-28",
  },

  // ── FORWARDER — Customs & Docs ───────────────────────────────────────
  {
    id: "BT-2026-016",
    title: "Submit pre-clearance entry — AL-2026-1042",
    description:
      "File AGS/DMS customs entry for AL-2026-1042 ahead of May 22nd ECT Delta discharge. HS code 8457.10 confirmed. All docs received. Pre-lodge to avoid hold on arrival.",
    status: "customs_docs",
    priority: "high",
    assignedRole: "forwarder",
    category: "Customs",
    shipmentId: "AL-2026-1042",
    dueDate: "2026-05-19",
  },
  {
    id: "BT-2026-017",
    title: "Verify customs docs vs client invoice — AL-2026-1039",
    description:
      "Cross-check Anadolu Steel commercial invoice (declared value €312,000) against customs declaration. Unit prices must match to 2 decimal places. Flag discrepancy to Douane before inspection.",
    status: "customs_docs",
    priority: "high",
    assignedRole: "forwarder",
    category: "Customs",
    shipmentId: "AL-2026-1039",
    dueDate: "2026-05-20",
  },
  {
    id: "BT-2026-018",
    title: "Validate EUR.1 certificate — Anadolu Steel",
    description:
      "Verify EUR.1 Movement Certificate A 4892031 (Istanbul Chamber of Commerce) for AL-2026-1039. Check issue date, official stamps, commodity description vs packing list. Required for preferential duty claim.",
    status: "customs_docs",
    priority: "medium",
    assignedRole: "forwarder",
    category: "Documents",
    shipmentId: "AL-2026-1039",
    dueDate: "2026-05-21",
  },
  {
    id: "BT-2026-019",
    title: "Arrange physical inspection dossier — TCKU3912847",
    description:
      "Douane scheduled physical inspection May 23rd at ECT Gate 8. Prepare complete dossier: MBL, commercial invoice, packing list, EUR.1. Brief terminal on container bay position. Be present or nominate inspection agent.",
    status: "customs_docs",
    priority: "high",
    assignedRole: "forwarder",
    category: "Customs",
    shipmentId: "AL-2026-1042",
    dueDate: "2026-05-22",
  },

  // ── FORWARDER — Invoicing ─────────────────────────────────────────────
  {
    id: "BT-2026-020",
    title: "Issue sales invoice — AL-2026-1035 (Yıldız Makina)",
    description:
      "Dossier AL-2026-1035 closed. Issue final sales invoice to Yıldız Makina per agreed rates. Include: ocean freight €18,400, customs clearance €480, D&D surcharge €3,840. Send with structured reference in subject.",
    status: "invoicing",
    priority: "high",
    assignedRole: "forwarder",
    category: "Finance",
    shipmentId: "AL-2026-1035",
    dueDate: "2026-05-19",
  },
  {
    id: "BT-2026-021",
    title: "Process MSC credit note — AL-2026-1041",
    description:
      "MSC issued credit note CN-2026-1183 (€2,100) following demurrage dispute. Match against original invoice MSC-2026-RTM-4421, update dossier budget, and reflect in AP ledger.",
    status: "invoicing",
    priority: "medium",
    assignedRole: "forwarder",
    category: "Finance",
    shipmentId: "AL-2026-1041",
    dueDate: "2026-05-22",
  },

  // ── INSIDE SALES ──────────────────────────────────────────────────────
  {
    id: "BT-2026-030",
    title: "Send ETA update — Van der Berg AL-2026-1038",
    description:
      "EVER GIVEN II now 14h ahead of schedule. Notify Van der Berg planning team of revised Rotterdam ETA. Include updated packing list deadline and truck booking advice.",
    status: "booking",
    priority: "medium",
    assignedRole: "inside_sales",
    category: "Comms",
    shipmentId: "AL-2026-1038",
    dueDate: "2026-05-20",
  },
  {
    id: "BT-2026-031",
    title: "Issue booking confirmation — Teknopar 2×40HC",
    description:
      "Teknopar confirmed CNC machinery booking (2×40HC, Ambarlı→Rotterdam, dep. Jun 1st). Send formal booking confirmation with vessel name, B/L instructions, VGM cut-off, and CY closing datetime.",
    status: "booking",
    priority: "medium",
    assignedRole: "inside_sales",
    category: "Booking",
    shipmentId: "AL-2026-1055",
    dueDate: "2026-05-22",
  },

  // ── SALES MANAGER ─────────────────────────────────────────────────────
  {
    id: "BT-2026-040",
    title: "Renew carrier rate agreement — MSC Rotterdam",
    description:
      "Current MSC spot agreement expires May 31st. Benchmark against Maersk and CMA CGM market rates before committing. Target: ≤€1,750/40HC FAK Rotterdam.",
    status: "order_entry",
    priority: "medium",
    assignedRole: "sales_manager",
    category: "Carrier",
    shipmentId: null,
    dueDate: "2026-05-26",
  },
];

/* ── Supabase row ──────────────────────────────────────────────────────── */

interface BoardTaskRow {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigned_role: string;
  category: string;
  shipment_id: string | null;
  due_date: string;
}

function rowToTask(row: BoardTaskRow): BoardTask {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status as BoardTaskStatus,
    priority: row.priority as BoardTaskPriority,
    assignedRole: row.assigned_role as Role,
    category: row.category as BoardTaskCategory,
    shipmentId: row.shipment_id,
    dueDate: row.due_date,
  };
}

/* ── API functions ─────────────────────────────────────────────────────── */

/** Fetch all board tasks, newest-due first. */
export async function getBoardTasks(): Promise<BoardTask[]> {
  return withSupabaseFallback(
    "getBoardTasks",
    async () => {
      const { data, error } = await supabase!
        .from("board_tasks")
        .select(
          "id, title, description, status, priority, assigned_role, category, shipment_id, due_date",
        )
        .order("due_date", { ascending: true });

      if (error) throw error;
      return (data as BoardTaskRow[]).map(rowToTask);
    },
    () => simulateRead(() => MOCK_TASKS),
  );
}

/* ── createBoardTask ───────────────────────────────────────────────────── */

export interface CreateBoardTaskInput {
  title: string;
  description: string;
  assignedRole: Role;
  category: BoardTaskCategory;
  priority: BoardTaskPriority;
  /** Optional shipment reference string, e.g. "AL-2026-1045". */
  shipmentId?: string | null;
  /** ISO date string (YYYY-MM-DD). */
  dueDate: string;
  /** Defaults to "open". */
  status?: BoardTaskStatus;
}

/**
 * Create a new board task — either manually (from NewTaskModal) or
 * programmatically (cross-module auto-triggers in customs/warehouse APIs).
 *
 * Mock: pushes into the in-memory MOCK_TASKS array so the Kanban board
 * reflects the new task on the next `getBoardTasks()` call.
 */
export async function createBoardTask(
  input: CreateBoardTaskInput,
): Promise<BoardTask> {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 9000 + 1000));
  const id = `BT-${year}-${seq}`;

  const draft: BoardTask = {
    id,
    title: input.title,
    description: input.description,
    status: input.status ?? "order_entry",
    priority: input.priority,
    assignedRole: input.assignedRole,
    category: input.category,
    shipmentId: input.shipmentId ?? null,
    dueDate: input.dueDate,
  };

  return withSupabaseFallback(
    "createBoardTask",
    async () => {
      const { data, error } = await supabase!
        .from("board_tasks")
        .insert({
          id,
          title: input.title,
          description: input.description,
          status: draft.status,
          priority: input.priority,
          assigned_role: input.assignedRole,
          category: input.category,
          shipment_id: input.shipmentId ?? null,
          due_date: input.dueDate,
        })
        .select(
          "id, title, description, status, priority, assigned_role, category, shipment_id, due_date",
        )
        .single();

      if (error) throw error;
      return rowToTask(data as BoardTaskRow);
    },
    async () => {
      await delay(300);
      // Mutate in-memory mock so getBoardTasks() returns the new task.
      MOCK_TASKS.unshift(draft);
      return draft;
    },
  );
}

/** Move a task to a new status column. Optimistic-safe: UI updates first. */
export async function updateBoardTaskStatus(
  id: string,
  status: BoardTaskStatus,
): Promise<BoardTask> {
  return withSupabaseFallback(
    "updateBoardTaskStatus",
    async () => {
      const { data, error } = await supabase!
        .from("board_tasks")
        .update({ status })
        .eq("id", id)
        .select(
          "id, title, description, status, priority, assigned_role, category, shipment_id, due_date",
        )
        .single();

      if (error) throw error;
      return rowToTask(data as BoardTaskRow);
    },
    async () => {
      await delay(220);
      const task = MOCK_TASKS.find((t) => t.id === id);
      if (!task) throw new Error(`Task ${id} not found`);
      return { ...task, status };
    },
  );
}
