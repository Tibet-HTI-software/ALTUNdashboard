/**
 * DocumentVault — shipment document archiving widget.
 *
 * Displays beautifully styled document cards for standard logistics paperwork.
 * Includes a drag-styled upload area (purely cosmetic, no actual upload).
 *
 * Used on the Shipment Detail page (/dashboard/shipments/:id).
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Download,
  Eye,
  FileText,
  Lock,
  Plus,
  Upload,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { demoSuccess } from "@/lib/dashboard/demo";

/* ── Mock document data ──────────────────────────────────────────────────── */

export interface VaultDocument {
  id: string;
  name: string;
  category: "Transport" | "Commercial" | "Customs" | "Insurance" | "Financial";
  format: "PDF" | "XLSX" | "DOCX";
  uploadedAt: string;
  uploadedBy: string;
  fileSizeKb: number;
  verified: boolean;
}

/** Generate mock document list for any shipment ID. */
export function getMockDocuments(shipmentId: string): VaultDocument[] {
  return [
    {
      id: `${shipmentId}-mbl`,
      name: "Master Bill of Lading",
      category: "Transport",
      format: "PDF",
      uploadedAt: "2026-04-18",
      uploadedBy: "Operations",
      fileSizeKb: 284,
      verified: true,
    },
    {
      id: `${shipmentId}-ci`,
      name: "Commercial Invoice",
      category: "Commercial",
      format: "PDF",
      uploadedAt: "2026-04-16",
      uploadedBy: "Sales",
      fileSizeKb: 192,
      verified: true,
    },
    {
      id: `${shipmentId}-pl`,
      name: "Packing List",
      category: "Commercial",
      format: "PDF",
      uploadedAt: "2026-04-16",
      uploadedBy: "Sales",
      fileSizeKb: 115,
      verified: true,
    },
    {
      id: `${shipmentId}-cr`,
      name: "Customs Release Certificate",
      category: "Customs",
      format: "PDF",
      uploadedAt: "2026-05-02",
      uploadedBy: "Customs Dept.",
      fileSizeKb: 98,
      verified: true,
    },
    {
      id: `${shipmentId}-ins`,
      name: "Cargo Insurance Certificate",
      category: "Insurance",
      format: "PDF",
      uploadedAt: "2026-04-15",
      uploadedBy: "Finance",
      fileSizeKb: 203,
      verified: true,
    },
    {
      id: `${shipmentId}-eur1`,
      name: "EUR.1 Certificate of Origin",
      category: "Customs",
      format: "PDF",
      uploadedAt: "2026-04-17",
      uploadedBy: "Customs Dept.",
      fileSizeKb: 76,
      verified: false,
    },
  ];
}

/* ── Visual config ───────────────────────────────────────────────────────── */

const CATEGORY_CLS: Record<VaultDocument["category"], string> = {
  Transport: "border-sky-500/25 bg-sky-500/[0.07] text-sky-600 dark:text-sky-400",
  Commercial: "border-brand/25 bg-brand/[0.07] text-brand",
  Customs: "border-amber-500/25 bg-amber-500/[0.07] text-amber-700 dark:text-amber-400",
  Insurance: "border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-700 dark:text-emerald-400",
  Financial: "border-violet-500/25 bg-violet-500/[0.07] text-violet-700 dark:text-violet-400",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatSize(kb: number): string {
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/* ── Document card ───────────────────────────────────────────────────────── */

function DocCard({ doc, index }: { doc: VaultDocument; index: number }) {
  function handleView() {
    demoSuccess("Document viewer", `Opening ${doc.name} in the document viewer.`);
  }
  function handleDownload() {
    toast.success("Download started", {
      description: `${doc.name} · ${formatSize(doc.fileSizeKb)}`,
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: index * 0.05 }}
      className="group flex items-start gap-3 rounded-xl border border-border bg-foreground/[0.02] p-3.5 hover:border-brand/30 hover:bg-brand/[0.02] transition-colors"
    >
      {/* PDF icon */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-rose-500/25 bg-rose-500/[0.07]">
        <FileText className="h-4 w-4 text-rose-500" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <p className="text-[0.8rem] font-semibold text-foreground truncate leading-tight">
              {doc.name}
            </p>
            <p className="text-[0.65rem] text-muted-foreground mt-0.5">
              {formatDate(doc.uploadedAt)} · {doc.uploadedBy} · {formatSize(doc.fileSizeKb)}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {doc.verified && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/[0.07] px-1.5 py-0.5 text-[0.58rem] font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-2.5 w-2.5" />
                Verified
              </span>
            )}
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[0.58rem] font-bold",
                CATEGORY_CLS[doc.category],
              )}
            >
              {doc.category}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-2.5 flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleView}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-foreground/[0.03] px-2.5 py-1 text-[0.68rem] font-semibold text-foreground hover:border-brand/40 hover:text-brand transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand"
          >
            <Eye className="h-3 w-3" />
            View
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-foreground/[0.03] px-2.5 py-1 text-[0.68rem] font-semibold text-foreground hover:border-brand/40 hover:text-brand transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand"
          >
            <Download className="h-3 w-3" />
            Download
          </button>
          <span className="ml-1 inline-flex items-center gap-1 text-[0.62rem] text-muted-foreground/50">
            <Lock className="h-2.5 w-2.5" />
            {doc.format}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Upload zone ─────────────────────────────────────────────────────────── */

function UploadZone() {
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    demoSuccess("Upload received", "Document queued for verification and indexing.");
  }

  return (
    <motion.div
      animate={{ borderColor: dragging ? "var(--brand)" : undefined }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 transition-colors cursor-pointer",
        dragging
          ? "border-brand bg-brand/[0.05]"
          : "border-border bg-foreground/[0.01] hover:border-brand/40 hover:bg-brand/[0.02]",
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 border border-brand/20">
        <Upload className="h-4 w-4 text-brand" />
      </div>
      <div className="text-center">
        <p className="text-[0.75rem] font-semibold text-foreground">
          Drop document here
        </p>
        <p className="text-[0.65rem] text-muted-foreground mt-0.5">
          PDF, XLSX, DOCX — max 25 MB
        </p>
      </div>
      <button
        type="button"
        onClick={() => demoSuccess("File picker", "This would open the system file picker.")}
        className="inline-flex items-center gap-1.5 h-7 rounded-lg border border-brand/30 bg-brand/[0.06] px-3 text-[0.7rem] font-semibold text-brand hover:bg-brand/[0.12] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand"
      >
        <Plus className="h-3 w-3" />
        Browse files
      </button>
    </motion.div>
  );
}

/* ── Main export ─────────────────────────────────────────────────────────── */

interface Props {
  shipmentId: string;
}

export function DocumentVault({ shipmentId }: Props) {
  const docs = getMockDocuments(shipmentId);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[0.65rem] uppercase tracking-wider font-bold text-muted-foreground">
            {docs.length} documents
          </p>
        </div>
        <span className="text-[0.62rem] text-muted-foreground/50">
          {docs.filter((d) => d.verified).length} verified
        </span>
      </div>

      {/* Document grid */}
      <div className="space-y-2">
        {docs.map((doc, i) => (
          <DocCard key={doc.id} doc={doc} index={i} />
        ))}
      </div>

      {/* Upload zone */}
      <UploadZone />
    </div>
  );
}
