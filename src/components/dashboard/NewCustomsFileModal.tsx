/**
 * NewCustomsFileModal
 *
 * Glassmorphic centered modal for creating a new customs clearance file.
 * On submit: inserts into `customs_files` + initial `documents` rows via
 * `createCustomsFile()`. Falls back to a simulated response in demo/mock mode.
 *
 * Design tokens used: `glass-panel`, `card-premium`, `scroll-thin`,
 * `--brand`, `--brand-strong`. Framer Motion entrance/exit matches
 * NewShipmentModal (scale + fade, 220ms ease).
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FileCheck2, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createCustomsFile } from "@/lib/dashboard/api";
import type {
  CustomsFile,
  DocumentType,
  Priority,
} from "@/lib/dashboard/types";
import { demoError } from "@/lib/dashboard/demo";

/* ── Static option lists ─────────────────────────────────────────────────── */

const STAGES: CustomsFile["stage"][] = [
  "Pre-clearance",
  "Submitted",
  "Inspection",
  "Released",
];

const PRIORITIES: Priority[] = ["Low", "Normal", "High", "Urgent"];

const ALL_DOCUMENT_TYPES: DocumentType[] = [
  "Commercial Invoice",
  "Packing List",
  "Bill of Lading",
  "CMR",
  "Customs Declaration",
  "Insurance Certificate",
];

/** Document types pre-ticked by default for a new file. */
const DEFAULT_DOCS: DocumentType[] = [
  "Commercial Invoice",
  "Packing List",
  "Bill of Lading",
  "Customs Declaration",
];

/* ── Form state ──────────────────────────────────────────────────────────── */

interface FormState {
  shipmentRef: string;
  customer: string;
  stage: CustomsFile["stage"];
  priority: Priority;
  owner: string;
  dueDate: string;
  documentTypes: Set<DocumentType>;
}

const EMPTY: Omit<FormState, "documentTypes"> & {
  documentTypes: DocumentType[];
} = {
  shipmentRef: "",
  customer: "",
  stage: "Pre-clearance",
  priority: "Normal",
  owner: "Customs",
  dueDate: "",
  documentTypes: DEFAULT_DOCS,
};

type Errors = Partial<
  Record<Exclude<keyof FormState, "documentTypes">, string> & {
    documentTypes: string;
  }
>;

function validate(f: FormState): Errors {
  const e: Errors = {};
  if (!f.shipmentRef.trim()) e.shipmentRef = "Required";
  if (!f.customer.trim()) e.customer = "Required";
  if (!f.owner.trim()) e.owner = "Required";
  if (!f.dueDate) e.dueDate = "Required";
  if (f.documentTypes.size === 0) e.documentTypes = "Select at least one document";
  return e;
}

/* ── Component ───────────────────────────────────────────────────────────── */

export interface NewCustomsFileModalProps {
  open: boolean;
  onClose: () => void;
  /** Called after successful insert so the parent page can reload. */
  onCreated?: () => void;
}

export function NewCustomsFileModal({
  open,
  onClose,
  onCreated,
}: NewCustomsFileModalProps) {
  const [form, setForm] = useState<FormState>({
    ...EMPTY,
    documentTypes: new Set(EMPTY.documentTypes),
  });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);

  /* Reset state on open. */
  useEffect(() => {
    if (!open) return;
    setForm({ ...EMPTY, documentTypes: new Set(EMPTY.documentTypes) });
    setErrors({});
    setSubmitting(false);
    const t = setTimeout(() => firstRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open]);

  /* Escape to close. */
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  function set<K extends keyof Omit<FormState, "documentTypes">>(
    key: K,
    value: FormState[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key as keyof Errors]) {
      setErrors((e) => ({ ...e, [key]: undefined }));
    }
  }

  function toggleDoc(type: DocumentType) {
    setForm((f) => {
      const next = new Set(f.documentTypes);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return { ...f, documentTypes: next };
    });
    if (errors.documentTypes) setErrors((e) => ({ ...e, documentTypes: undefined }));
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    try {
      await createCustomsFile({
        shipmentRef: form.shipmentRef.trim().toUpperCase(),
        customer: form.customer.trim(),
        stage: form.stage,
        priority: form.priority,
        owner: form.owner.trim(),
        dueDate: form.dueDate,
        documentTypes: [...form.documentTypes],
      });

      toast.success("Customs file created", {
        description: `${form.shipmentRef.trim().toUpperCase()} · ${form.documentTypes.size} document(s) added as Pending.`,
      });
      onCreated?.();
      onClose();
    } catch (err) {
      demoError(
        "Create failed",
        err instanceof Error ? err.message : "Could not create customs file.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Style helpers ───────────────────────────────────────────────────── */

  const inputCls = (err?: string) =>
    cn(
      "w-full h-9 rounded-lg border bg-foreground/[0.03] px-3 text-sm text-foreground",
      "placeholder:text-muted-foreground/50",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45 focus-visible:border-brand/40 transition-colors",
      err ? "border-rose-500/60" : "border-border",
    );

  const selectCls = (err?: string) =>
    cn(
      "w-full h-9 rounded-lg border bg-foreground/[0.03] px-3 text-sm text-foreground",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45 transition-colors",
      err ? "border-rose-500/60" : "border-border",
    );

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            key="ncfm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            key="ncfm-panel"
            role="dialog"
            aria-modal="true"
            aria-label="New customs file"
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-lg glass-panel rounded-2xl border shadow-[var(--shadow-elevated)] flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-4 shrink-0">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand/25 to-brand/5 border border-brand/25 shadow-[0_0_14px_-5px_var(--brand)]">
                  <FileCheck2 className="h-4 w-4 text-brand" />
                </span>
                <div>
                  <h2 className="font-display text-base font-semibold text-foreground">
                    New Customs File
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Creates file + document checklist in{" "}
                    <code className="font-mono">customs_files</code>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="p-1.5 rounded-md hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <form
              id="new-customs-file-form"
              onSubmit={handleSubmit}
              noValidate
              className="flex-1 overflow-y-auto scroll-thin px-6 py-5 space-y-6"
            >
              {/* ── File details ── */}
              <FormSection label="File Details">
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Shipment Reference"
                    required
                    error={errors.shipmentRef}
                  >
                    <input
                      ref={firstRef}
                      className={inputCls(errors.shipmentRef)}
                      placeholder="AL-2026-1045"
                      value={form.shipmentRef}
                      onChange={(e) => set("shipmentRef", e.target.value)}
                    />
                  </Field>
                  <Field
                    label="Customer / Company"
                    required
                    error={errors.customer}
                  >
                    <input
                      className={inputCls(errors.customer)}
                      placeholder="Demir Industrial Trading"
                      value={form.customer}
                      onChange={(e) => set("customer", e.target.value)}
                    />
                  </Field>
                  <Field label="Assigned Owner" required error={errors.owner}>
                    <input
                      className={inputCls(errors.owner)}
                      placeholder="Customs"
                      value={form.owner}
                      onChange={(e) => set("owner", e.target.value)}
                    />
                  </Field>
                  <Field label="Due Date" required error={errors.dueDate}>
                    <input
                      type="date"
                      className={inputCls(errors.dueDate)}
                      value={form.dueDate}
                      onChange={(e) => set("dueDate", e.target.value)}
                    />
                  </Field>
                </div>
              </FormSection>

              {/* ── Status ── */}
              <FormSection label="Status">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Stage" required>
                    <select
                      className={selectCls()}
                      value={form.stage}
                      onChange={(e) =>
                        set("stage", e.target.value as CustomsFile["stage"])
                      }
                    >
                      {STAGES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Priority" required>
                    <select
                      className={selectCls()}
                      value={form.priority}
                      onChange={(e) =>
                        set("priority", e.target.value as Priority)
                      }
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              </FormSection>

              {/* ── Document checklist ── */}
              <FormSection label="Initial Document Checklist">
                {errors.documentTypes && (
                  <p className="mb-2 text-[0.65rem] font-medium text-rose-500">
                    {errors.documentTypes}
                  </p>
                )}
                <p className="mb-3 text-xs text-muted-foreground">
                  Selected documents are added with status{" "}
                  <span className="font-semibold text-foreground">Pending</span>.
                  Deselect any not applicable.
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {ALL_DOCUMENT_TYPES.map((type) => {
                    const checked = form.documentTypes.has(type);
                    return (
                      <button
                        key={type}
                        type="button"
                        role="checkbox"
                        aria-checked={checked}
                        onClick={() => toggleDoc(type)}
                        className={cn(
                          "flex items-center gap-3 w-full rounded-xl border px-4 py-2.5 text-sm text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                          checked
                            ? "border-brand/40 bg-brand/[0.06] text-foreground"
                            : "border-border bg-foreground/[0.02] text-muted-foreground hover:border-border/80",
                        )}
                      >
                        {/* Checkbox visual */}
                        <span
                          className={cn(
                            "flex h-4 w-4 shrink-0 rounded border-2 items-center justify-center transition-colors",
                            checked
                              ? "bg-brand border-brand"
                              : "border-muted-foreground/40",
                          )}
                        >
                          {checked && (
                            <svg
                              viewBox="0 0 10 10"
                              className="h-2.5 w-2.5 text-white"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <polyline points="1.5,5 4,7.5 8.5,2.5" />
                            </svg>
                          )}
                        </span>
                        <span className="font-medium">{type}</span>
                      </button>
                    );
                  })}
                </div>
              </FormSection>
            </form>

            {/* Footer */}
            <div className="border-t border-border px-6 py-4 shrink-0 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground tabular-nums">
                  {form.documentTypes.size}
                </span>{" "}
                document{form.documentTypes.size !== 1 ? "s" : ""} selected
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="h-9 rounded-lg border border-border bg-foreground/[0.03] px-4 text-sm font-medium text-foreground hover:border-brand/40 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="new-customs-file-form"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 h-9 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong transition-colors shadow-[0_4px_16px_-6px_var(--brand)] disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {submitting && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  Create File
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ── Shared presentational helpers ──────────────────────────────────────── */

function FormSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="mb-3 text-[0.62rem] font-bold uppercase tracking-widest text-muted-foreground/70 border-b border-border pb-1.5">
        {label}
      </p>
      {children}
    </div>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </p>
      {children}
      {error && (
        <p className="text-[0.65rem] font-medium text-rose-500">{error}</p>
      )}
    </div>
  );
}
