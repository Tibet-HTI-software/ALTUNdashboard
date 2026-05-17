import { FileText } from "lucide-react";
import type { DocumentStatus, DocumentType } from "@/lib/dashboard/types";
import { StatusBadge, documentStatusTone } from "./StatusBadge";

interface Props {
  documents: { type: DocumentType; status: DocumentStatus }[];
}

export function DocumentChecklist({ documents }: Props) {
  return (
    <ul className="divide-y divide-border rounded-xl border border-border overflow-hidden bg-foreground/[0.02]">
      {documents.map((d) => (
        <li
          key={d.type}
          className="flex items-center gap-3 px-4 py-3 hover:bg-foreground/[0.05] transition-colors"
        >
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-foreground flex-1 truncate">
            {d.type}
          </span>
          <StatusBadge tone={documentStatusTone(d.status)}>
            {d.status}
          </StatusBadge>
        </li>
      ))}
    </ul>
  );
}
