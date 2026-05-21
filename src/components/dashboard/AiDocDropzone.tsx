/**
 * AiDocDropzone — AI document-parsing mockup.
 *
 * Simulates a multi-step AI pipeline for parsing shipping PDFs (B/L, packing
 * lists, arrival notices). Three animated processing steps lead to a success
 * card showing mock-extracted shipment data ready to save.
 *
 * Architecture:
 *   AiDocDropzoneFab  — fixed FAB rendered inside DashboardLayout (role-gated)
 *   AiDocDropzoneModal — standalone modal, can also be triggered independently
 *
 * All processing is purely cosmetic — no file is ever uploaded.
 */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  CheckCircle2,
  FileSearch2,
  FileText,
  Sparkles,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { demoAction } from "@/lib/dashboard/demo";

/* ── Types ───────────────────────────────────────────────────────────────── */

/** -1 = idle (waiting for file), 0–2 = active parse steps, 3 = success */
type ParseState = -1 | 0 | 1 | 2 | 3;

interface ParseStep {
  label: string;
  sublabel: string;
  icon: React.ElementType;
  durationMs: number;
}

const PARSE_STEPS: ParseStep[] = [
  {
    label: "Uploading document",
    sublabel: "Transferring file to analysis server…",
    icon: Upload,
    durationMs: 1200,
  },
  {
    label: "AI scanning document",
    sublabel: "Identifying document type and layout…",
    icon: Bot,
    durationMs: 1700,
  },
  {
    label: "Extracting B/L & container data",
    sublabel: "Parsing booking ref, container, route, carrier, dates…",
    icon: FileSearch2,
    durationMs: 1100,
  },
];

/* ── Mock extracted data ─────────────────────────────────────────────────── */

const MOCK_RESULT = {
  blNumber: "MAEU9873041",
  containerNumber: "MSCU8812047",
  containerType: "40ft High-Cube",
  direction: "Import",
  pol: "Ambarlı",
  pod: "Rotterdam",
  carrier: "Maersk",
  vessel: "Maersk Sentosa",
  etd: "2026-06-15",
  eta: "2026-07-28",
  trader: "Van Der Berg International BV",
  commodity: "Industrial Electronics",
  weightKg: 18_420,
  teu: 1,
  confidence: 98,
  fieldsExtracted: 14,
} as const;

const RESULT_ROWS: [string, string][] = [
  ["B/L Number", MOCK_RESULT.blNumber],
  ["Container", MOCK_RESULT.containerNumber],
  ["Type", MOCK_RESULT.containerType],
  ["Direction", MOCK_RESULT.direction],
  ["POL → POD", `${MOCK_RESULT.pol} → ${MOCK_RESULT.pod}`],
  ["Carrier", MOCK_RESULT.carrier],
  ["Vessel", MOCK_RESULT.vessel],
  ["ETD", MOCK_RESULT.etd],
  ["ETA", MOCK_RESULT.eta],
  ["Trader", MOCK_RESULT.trader],
  ["Commodity", MOCK_RESULT.commodity],
  ["Weight", `${MOCK_RESULT.weightKg.toLocaleString()} kg`],
];

/* ── Progress bar sub-component ─────────────────────────────────────────── */

function StepProgressBar({ active }: { active: boolean }) {
  return (
    <div className="mt-2 h-0.5 w-full rounded-full bg-foreground/[0.06] overflow-hidden">
      {active && (
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-brand to-brand-strong"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: PARSE_STEPS[0].durationMs / 1000, ease: "linear" }}
        />
      )}
    </div>
  );
}

/* ── Dropzone idle area ──────────────────────────────────────────────────── */

function DropzoneIdle({
  onFile,
}: {
  onFile: (name: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file.name);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFile(file.name);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload shipping document for AI extraction"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={cn(
        "relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed",
        "py-14 px-8 cursor-pointer transition-all duration-200 select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
        dragOver
          ? "border-brand bg-brand/[0.07] scale-[1.01]"
          : "border-brand/25 bg-foreground/[0.02] hover:border-brand/50 hover:bg-brand/[0.04]",
      )}
    >
      {/* Animated ring behind icon */}
      <span className="relative flex items-center justify-center">
        <span className="absolute h-16 w-16 rounded-full border border-brand/20 animate-ping opacity-30" />
        <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand/20 to-brand/5 border border-brand/25 shadow-[0_0_24px_-8px_var(--brand)]">
          <FileText className="h-6 w-6 text-brand" />
        </span>
      </span>

      <div className="text-center">
        <p className="text-sm font-semibold text-foreground">
          Drop Bill of Lading here for AI extraction
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          PDF, TIF, JPG — up to 25 MB · Supports B/L, Packing List, Arrival Notice
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-brand/25 bg-brand/[0.06] px-4 py-2">
        <Sparkles className="h-3.5 w-3.5 text-brand" />
        <span className="text-xs font-semibold text-brand">
          AI extracts 14+ fields automatically
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.tif,.tiff,.jpg,.jpeg,.png"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}

/* ── Processing steps view ───────────────────────────────────────────────── */

function ProcessingView({
  parseState,
  fileName,
}: {
  parseState: 0 | 1 | 2;
  fileName: string;
}) {
  return (
    <div className="flex flex-col gap-5 py-4">
      {/* File chip */}
      <div className="flex items-center gap-2.5 rounded-xl border border-border bg-foreground/[0.03] px-3.5 py-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 border border-brand/20 shrink-0">
          <FileText className="h-4 w-4 text-brand" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">{fileName}</p>
          <p className="text-[0.65rem] text-muted-foreground">
            Shipping document · PDF
          </p>
        </div>
        <span className="flex h-2 w-2 rounded-full bg-brand animate-pulse shrink-0" />
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {PARSE_STEPS.map((step, i) => {
          const StepIcon = step.icon;
          const done = i < parseState;
          const active = i === parseState;
          const pending = i > parseState;

          return (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: pending ? 0.35 : 1, x: 0 }}
              transition={{ duration: 0.22, delay: i * 0.06 }}
              className="rounded-xl border border-border bg-foreground/[0.02] px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg border shrink-0 transition-colors",
                    done
                      ? "border-emerald-500/30 bg-emerald-500/10"
                      : active
                        ? "border-brand/30 bg-brand/10"
                        : "border-border bg-foreground/[0.03]",
                  )}
                >
                  {done ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <StepIcon
                      className={cn(
                        "h-3.5 w-3.5 transition-colors",
                        active ? "text-brand" : "text-muted-foreground/40",
                      )}
                    />
                  )}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={cn(
                        "text-[0.8rem] font-semibold transition-colors",
                        done
                          ? "text-emerald-600 dark:text-emerald-400"
                          : active
                            ? "text-foreground"
                            : "text-muted-foreground/50",
                      )}
                    >
                      {step.label}
                    </p>
                    {done && (
                      <span className="text-[0.6rem] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 shrink-0">
                        Done
                      </span>
                    )}
                    {active && (
                      <span className="text-[0.6rem] font-semibold uppercase tracking-wider text-brand shrink-0 animate-pulse">
                        Processing…
                      </span>
                    )}
                  </div>
                  {active && (
                    <p className="text-[0.65rem] text-muted-foreground mt-0.5">
                      {step.sublabel}
                    </p>
                  )}
                  {active && (
                    <div className="mt-2 h-0.5 w-full rounded-full bg-foreground/[0.06] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-brand to-brand-strong"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: step.durationMs / 1000, ease: "linear" }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Success result card ─────────────────────────────────────────────────── */

function SuccessView({ fileName }: { fileName: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-4"
    >
      {/* Header */}
      <div className="flex items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] px-4 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/25 shrink-0">
          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[0.82rem] font-bold text-emerald-700 dark:text-emerald-300">
            Extraction complete
          </p>
          <p className="text-[0.65rem] text-muted-foreground truncate">{fileName}</p>
        </div>
        <div className="flex flex-col items-end shrink-0 gap-1">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[0.6rem] font-bold text-emerald-600 dark:text-emerald-400">
            <Zap className="h-2.5 w-2.5" />
            {MOCK_RESULT.confidence}% confidence
          </span>
          <span className="text-[0.6rem] text-muted-foreground">
            {MOCK_RESULT.fieldsExtracted} fields extracted
          </span>
        </div>
      </div>

      {/* Extracted data grid */}
      <div className="rounded-xl border border-border bg-foreground/[0.02] overflow-hidden">
        <p className="px-4 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60 border-b border-border">
          Extracted Fields
        </p>
        <div className="grid grid-cols-2 divide-x divide-y divide-border">
          {RESULT_ROWS.map(([key, val]) => (
            <div key={key} className="px-3.5 py-2">
              <p className="text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground/55">
                {key}
              </p>
              <p className="text-[0.78rem] font-semibold text-foreground mt-0.5 truncate">
                {val}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() =>
            demoAction(
              "Saving extracted shipment data — would open NewShipmentModal pre-filled.",
            )
          }
          className="flex-1 h-10 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-strong transition-colors shadow-[0_4px_16px_-6px_var(--brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          Save as New Shipment
        </button>
        <button
          type="button"
          onClick={() => demoAction("Opening review panel for extracted data.")}
          className="h-10 px-4 rounded-xl border border-border bg-foreground/[0.03] text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-brand/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          Review & Edit
        </button>
      </div>
    </motion.div>
  );
}

/* ── Modal ───────────────────────────────────────────────────────────────── */

interface ModalProps {
  open: boolean;
  onClose: () => void;
}

export function AiDocDropzoneModal({ open, onClose }: ModalProps) {
  const [parseState, setParseState] = useState<ParseState>(-1);
  const [fileName, setFileName] = useState("document.pdf");

  // Reset when modal closes.
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => setParseState(-1), 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Auto-advance through parse steps.
  useEffect(() => {
    if (parseState < 0 || parseState >= 3) return;
    const step = PARSE_STEPS[parseState as 0 | 1 | 2];
    const t = setTimeout(
      () => setParseState((s) => (s + 1) as ParseState),
      step.durationMs,
    );
    return () => clearTimeout(t);
  }, [parseState]);

  function handleFile(name: string) {
    setFileName(name || "document.pdf");
    setParseState(0);
  }

  const title =
    parseState === -1
      ? "AI Document Parser"
      : parseState === 3
        ? "Extraction Complete"
        : "Analysing Document…";

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />

          {/* Panel */}
          <motion.div
            key="panel"
            role="dialog"
            aria-modal
            aria-label="AI Document Parser"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 glass-panel rounded-2xl border shadow-[var(--shadow-elevated)] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand/30 to-brand/10 border border-brand/25">
                  <Sparkles className="h-4 w-4 text-brand" />
                </span>
                <div>
                  <p className="text-sm font-bold text-foreground">{title}</p>
                  <p className="text-[0.62rem] text-muted-foreground">
                    Powered by Altun AI · Demo mode
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-5 max-h-[70vh] overflow-y-auto scroll-thin">
              <AnimatePresence mode="wait">
                {parseState === -1 && (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <DropzoneIdle onFile={handleFile} />
                  </motion.div>
                )}

                {(parseState === 0 ||
                  parseState === 1 ||
                  parseState === 2) && (
                  <motion.div
                    key="processing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <ProcessingView
                      parseState={parseState}
                      fileName={fileName}
                    />
                  </motion.div>
                )}

                {parseState === 3 && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <SuccessView fileName={fileName} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Demo note */}
            {parseState === -1 && (
              <p className="px-5 py-3 text-[0.65rem] text-muted-foreground border-t border-border bg-foreground/[0.02]">
                Demo: click the zone or drop any file to simulate AI parsing. No data is
                uploaded.
              </p>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── FAB — rendered inside DashboardLayout ───────────────────────────────── */

/**
 * Floating action button that opens the AI Document Parser modal.
 * Rendered at the bottom-right of the viewport. Role-gated by caller.
 */
export function AiDocDropzoneFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open AI Document Parser"
        title="AI Document Parser — drop a B/L or packing list"
        initial={{ opacity: 0, scale: 0.5, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 22, delay: 0.5 }}
        whileHover={{ scale: 1.1, y: -2 }}
        whileTap={{ scale: 0.88 }}
        className={cn(
          "fixed bottom-6 right-20 z-40 flex h-12 w-12 items-center justify-center rounded-2xl",
          "bg-gradient-to-br from-brand to-brand-strong text-white",
          "shadow-[0_8px_32px_-8px_var(--brand)] border border-white/10",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
        )}
      >
        <Sparkles className="h-5 w-5" />
        {/* Tooltip label */}
        <span className="absolute right-full mr-3 whitespace-nowrap rounded-lg border border-border bg-popover px-2.5 py-1.5 text-[0.7rem] font-semibold text-foreground shadow-md opacity-0 group-hover:opacity-100 pointer-events-none hidden lg:block">
          AI Doc Parser
        </span>
      </motion.button>

      <AiDocDropzoneModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
