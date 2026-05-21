import { createApiError, simulateRead, simulateSuccess } from "./client";
import { customsFiles } from "@/data/dashboard/customs";
import type {
  CustomsFile,
  DocumentStatus,
  DocumentType,
  Priority,
} from "@/lib/dashboard/types";
import type { DocumentStatusInput } from "./types";
import { supabase, withSupabaseFallback } from "./supabase";
import { createBoardTask } from "./tasks.api";
import { TASK_TRIGGER_ROLES } from "@/lib/dashboard/roles.config";

/* ── Write ────────────────────────────────────────────────────────── */

export interface CreateCustomsFileInput {
  /** Shipment reference string, e.g. "AL-2026-1045". */
  shipmentRef: string;
  customer: string;
  stage: CustomsFile["stage"];
  priority: Priority;
  owner: string;
  dueDate: string; // ISO date string YYYY-MM-DD
  /** Document types to pre-populate as "Pending". */
  documentTypes: DocumentType[];
}

/**
 * Insert a new customs file + its initial document rows.
 *
 * Live: looks up the shipment UUID by reference, inserts into
 * `customs_files`, then bulk-inserts into `documents`.
 * Mock: synthesises a CustomsFile and returns it immediately.
 */
export async function createCustomsFile(
  input: CreateCustomsFileInput,
): Promise<CustomsFile> {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 9000 + 1000));
  const reference = `CF-${year}-${seq}`;

  const draft: CustomsFile = {
    id: reference,
    shipmentId: input.shipmentRef,
    customer: input.customer,
    stage: input.stage,
    priority: input.priority,
    owner: input.owner,
    dueDate: input.dueDate,
    documents: input.documentTypes.map((type) => ({
      type,
      status: "Pending" as DocumentStatus,
    })),
  };

  const result = await withSupabaseFallback(
    "customs_files",
    async () => {
      // Resolve the shipment UUID from its human-readable reference.
      const { data: ship, error: shipErr } = await supabase
        .from("shipments")
        .select("id")
        .eq("reference", input.shipmentRef)
        .maybeSingle();
      if (shipErr) throw shipErr;

      const { data: file, error: fileErr } = await supabase
        .from("customs_files")
        .insert({
          reference,
          shipment_id: ship?.id ?? null,
          stage: input.stage.toLowerCase().replace(/-/g, "_"),
          priority: input.priority.toLowerCase(),
        })
        .select("id")
        .single();
      if (fileErr) throw fileErr;

      if (input.documentTypes.length > 0) {
        const docRows = input.documentTypes.map((t) => ({
          customs_file_id: (file as { id: string }).id,
          type: t
            .toLowerCase()
            .replace(/ /g, "_")
            .replace(/\//g, "_"),
          status: "pending",
        }));
        const { error: docErr } = await supabase
          .from("documents")
          .insert(docRows);
        if (docErr) throw docErr;
      }

      return draft;
    },
    () => Promise.resolve(draft),
  );

  // Auto-spawn a board task for the customs team — fire-and-forget,
  // never blocks or fails the customs file creation.
  const taskPriority =
    input.priority === "Urgent" || input.priority === "High"
      ? "high"
      : input.priority === "Low"
        ? "low"
        : "medium";

  createBoardTask({
    title: `Clearance needed for ${input.shipmentRef}`,
    description: `New customs file ${reference} opened for ${input.customer}. Review documents and initiate the clearance process.`,
    assignedRole: TASK_TRIGGER_ROLES.customsFile,
    category: "Customs",
    priority: taskPriority,
    shipmentId: input.shipmentRef,
    dueDate: input.dueDate,
  }).catch(() => {
    // Non-fatal — customs file was created successfully.
  });

  return result;
}

/* ── Read ─────────────────────────────────────────────────────────── */

export async function getCustomsFiles(): Promise<CustomsFile[]> {
  return simulateRead(() => customsFiles);
}

export async function getCustomsFileById(id: string): Promise<CustomsFile> {
  return simulateRead(() => {
    const found = customsFiles.find((c) => c.id === id);
    if (!found) {
      throw createApiError(`Customs file ${id} not found.`, "not_found");
    }
    return found;
  });
}

/**
 * Update a single document's status inside a customs file.
 *
 * `documentId` is currently the document `type` (e.g. "Bill of Lading")
 * because the mock schema does not store per-document ids. The real backend
 * should expose stable document ids and this signature can stay the same.
 */
export async function updateDocumentStatus(
  fileId: string,
  documentId: string,
  status: DocumentStatusInput,
): Promise<CustomsFile> {
  const found = customsFiles.find((c) => c.id === fileId);
  if (!found) {
    throw createApiError(`Customs file ${fileId} not found.`, "not_found");
  }
  const updated: CustomsFile = {
    ...found,
    documents: found.documents.map((d) =>
      d.type === documentId ? { ...d, status: status as DocumentStatus } : d,
    ),
  };
  return simulateSuccess(updated);
}
