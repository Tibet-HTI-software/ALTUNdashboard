/**
 * NewHandlingJobModal
 *
 * Glassmorphic centered modal for scheduling a new warehouse handling job.
 * On submit: inserts into `handling_jobs` via `scheduleHandlingJob()`.
 * Falls back to simulated response in demo/mock mode.
 *
 * Design tokens: `glass-panel`, `card-premium`, `scroll-thin`,
 * `--brand`, `--brand-strong`. Framer Motion entrance/exit matches
 * NewCustomsFileModal (scale + fade, 220ms ease).
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, PackageSearch, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { scheduleHandlingJob } from "@/lib/dashboard/api";
import { demoError } from "@/lib/dashboard/demo";
import type { HandlingJob } from "@/lib/dashboard/types";

/* ── Static option lists ─────────────────────────────────────────────────── */

const JOB_TYPES: HandlingJob["type"][] = [
  "Inbound",
  "Outbound",
  "Cross-dock",
  "Picking",
];

const JOB_TYPE_META: Record<
  HandlingJob["type"],
  { description: string; icon: string }
> = {
  Inbound: { description: "Receiving goods from carrier into warehouse", icon: "↓" },
  Outbound: { description: "Dispatching goods from warehouse to client", icon: "↑" },
  "Cross-dock": { description: "Direct transfer between inbound / outbound docks", icon: "⇄" },
  Picking: { description: "Order picking and assembly for fulfilment", icon: "⊡" },
};

const ZONES = [
  "Zone A — Dry Storage",
  "Zone B — Bulk Pallets",
  "Zone C — Reefer",
  "Zone D — Hazmat",
  "Zone E — Cross-dock",
];

/* ── Form state ──────────────────────────────────────────────────────────── */

interface FormState {
  shipmentRef: string;
  client: string;
  scheduledFor: string;
  type: HandlingJob["type"];
  zone: string;
  staff: string;
}

const EMPTY: FormState = {
  shipmentRef: "",
  client: "",
  scheduledFor: "",
  type: "Inbound",
  zone: ZONES[0],
  staff: "Operations",
};

type Errors = Partial<Record<keyof FormState, string>>;

function validate(f: FormState): Errors {
  const e: Errors = {};
  if (!f.shipmentRef.trim()) e.shipmentRef = "Required";
  if (!f.client.trim()) e.client = "Required";
  if (!f.scheduledFor) e.scheduledFor = "Required";
  if (!f.zone.trim()) e.zone = "Required";
  if (!f.staff.trim()) e.staff = "Required";
  return e;
}

/* ── Component ───────────────────────────────────────────────────────────── */

export interface NewHandlingJobModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function NewHandlingJobModal({
  open,
  onClose,
  onCreated,
}: NewHandlingJobModalProps) {
  const [form, setForm] = useState<FormState>({ ...EMPTY });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);

  /* Reset on open. */
  useEffect(() => {
    if (!open) return;
    setForm({ ...EMPTY });
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

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
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
      await scheduleHandlingJob({
        type: form.type,
        shipmentId: form.shipmentRef.trim().toUpperCase(),
        zone: form.zone,
        staff: form.staff.trim(),
        scheduledFor: new Date(form.scheduledFor).toISOString(),
      });

      toast.success("Handling job scheduled", {
        description: `${form.type} · ${form.zone} · ${form.client.trim()}`,
      });
      onCreated?.();
      onClose();
    } catch (err) {
      demoError(
        "Schedule failed",
        err instanceof Error ? err.message : "Could not schedule handling job.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Style helpers ───────────────────────────────────────────────── */

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
            key="nhjm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            key="nhjm-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Schedule handling job"
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
                  <PackageSearch className="h-4 w-4 text-brand" />
                </span>
                <div>
                  <h2 className="font-display text-base font-semibold text-foreground">
                    Schedule Handling Job
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Creates job in{" "}
                    <code className="font-mono">handling_jobs</code>
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
              id="new-handling-job-form"
              onSubmit={handleSubmit}
              noValidate
              className="flex-1 overflow-y-auto scroll-thin px-6 py-5 space-y-6"
            >
              {/* ── Job details ── */}
              <FormSection label="Job Details">
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
                  <Field label="Client / Contact" required error={errors.client}>
                    <input
                      className={inputCls(errors.client)}
                      placeholder="Demir Industrial Trading"
                      value={form.client}
                      onChange={(e) => set("client", e.target.value)}
                    />
                  </Field>
                  <Field
                    label="Scheduled Date & Time"
                    required
                    error={errors.scheduledFor}
                    className="col-span-2"
                  >
                    <input
                      type="datetime-local"
                      className={inputCls(errors.scheduledFor)}
                      value={form.scheduledFor}
                      onChange={(e) => set("scheduledFor", e.target.value)}
                    />
                  </Field>
                </div>
              </FormSection>

              {/* ── Task type ── */}
              <FormSection label="Task Type">
                <div className="grid grid-cols-2 gap-2">
                  {JOB_TYPES.map((type) => {
                    const selected = form.type === type;
                    const meta = JOB_TYPE_META[type];
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => set("type", type)}
                        className={cn(
                          "flex flex-col items-start gap-1 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                          selected
                            ? "border-brand/40 bg-brand/[0.06]"
                            : "border-border bg-foreground/[0.02] hover:border-border/80",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[0.55rem] font-bold transition-colors",
                              selected
                                ? "bg-brand border-brand text-white"
                                : "border-muted-foreground/40 text-muted-foreground",
                            )}
                          >
                            {meta.icon}
                          </span>
                          <span
                            className={cn(
                              "text-sm font-semibold",
                              selected ? "text-foreground" : "text-muted-foreground",
                            )}
                          >
                            {type}
                          </span>
                        </div>
                        <p className="text-[0.65rem] text-muted-foreground leading-relaxed pl-7">
                          {meta.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </FormSection>

              {/* ── Zone allocation ── */}
              <FormSection label="Zone Allocation">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Warehouse Zone" required error={errors.zone}>
                    <select
                      className={selectCls(errors.zone)}
                      value={form.zone}
                      onChange={(e) => set("zone", e.target.value)}
                    >
                      {ZONES.map((z) => (
                        <option key={z}>{z}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Assigned Staff" required error={errors.staff}>
                    <input
                      className={inputCls(errors.staff)}
                      placeholder="Operations"
                      value={form.staff}
                      onChange={(e) => set("staff", e.target.value)}
                    />
                  </Field>
                </div>
              </FormSection>
            </form>

            {/* Footer */}
            <div className="border-t border-border px-6 py-4 shrink-0 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Status set to{" "}
                <span className="font-semibold text-foreground">Scheduled</span>{" "}
                on create
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
                  form="new-handling-job-form"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 h-9 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong transition-colors shadow-[0_4px_16px_-6px_var(--brand)] disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {submitting && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  Schedule Job
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
  className,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
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
