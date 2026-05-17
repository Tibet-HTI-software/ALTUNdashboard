import { createApiError, simulateRead, simulateSuccess } from "./client";
import { customsFiles } from "@/data/dashboard/customs";
import type { CustomsFile, DocumentStatus } from "@/lib/dashboard/types";
import type { DocumentStatusInput } from "./types";

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
