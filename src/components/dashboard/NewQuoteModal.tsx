/**
 * NewQuoteModal
 *
 * Premium glassmorphic modal for creating a new quote request. On submit it
 * calls `createQuote()` which performs a live Supabase INSERT when configured
 * or falls back to an in-memory simulation. On success `onCreated` is invoked
 * so the parent page can call its `reload()` to refresh the quote list.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createQuote } from "@/lib/dashboard/api";
import type {
  ContainerKind,
  Incoterm,
  Priority,
  QuoteDirection,
} from "@/lib/dashboard/types";
import { demoError } from "@/lib/dashboard/demo";

/* ── Option lists ────────────────────────────────────────────────────────── */

const CONTAINER_KINDS: ContainerKind[] = [
  "20ft Standard (DV)",
  "40ft Standard (DV)",
  "40ft High Cube (HC)",
  "45ft High Cube",
  "20ft Reefer",
  "40ft Reefer HC",
  "Open Top 20ft",
  "Open Top 40ft",
  "Flat Rack 20ft",
  "Flat Rack 40ft",
];

const INCOTERMS: Incoterm[] = [
  "EXW",
  "FCA",
  "FOB",
  "CFR",
  "CIF",
  "DAP",
  "DDP",
];

const URGENCY_OPTIONS: Priority[] = ["Low", "Normal", "High", "Urgent"];

/* ── Form state ──────────────────────────────────────────────────────────── */

interface FormState {
  customer: string;
  contactName: string;
  contactEmail: string;
  direction: QuoteDirection;
  container: ContainerKind;
  portOfLoading: string;
  portOfDestination: string;
  goodsDescription: string;
  grossWeightKg: string;
  netWeightKg: string;
  incoterm: Incoterm;
  insurance: boolean;
  urgency: Priority;
  loadingCity: string;
  loadingCountry: string;
  deliveryCity: string;
  deliveryCountry: string;
  notes: string;
}

const EMPTY: FormState = {
  customer: "",
  contactName: "",
  contactEmail: "",
  direction: "Import",
  container: "40ft Standard (DV)",
  portOfLoading: "",
  portOfDestination: "",
  goodsDescription: "",
  grossWeightKg: "",
  netWeightKg: "",
  incoterm: "FOB",
  insurance: false,
  urgency: "Normal",
  loadingCity: "",
  loadingCountry: "",
  deliveryCity: "",
  deliveryCountry: "",
  notes: "",
};

type Errors = Partial<Record<keyof FormState, string>>;

function validate(f: FormState): Errors {
  const e: Errors = {};
  if (!f.customer.trim()) e.customer = "Required";
  if (!f.portOfLoading.trim()) e.portOfLoading = "Required";
  if (!f.portOfDestination.trim()) e.portOfDestination = "Required";
  if (!f.goodsDescription.trim()) e.goodsDescription = "Required";
  const gw = parseFloat(f.grossWeightKg);
  if (isNaN(gw) || gw <= 0) e.grossWeightKg = "Must be > 0";
  if (!f.loadingCity.trim()) e.loadingCity = "Required";
  if (!f.loadingCountry.trim()) e.loadingCountry = "Required";
  if (!f.deliveryCity.trim()) e.deliveryCity = "Required";
  if (!f.deliveryCountry.trim()) e.deliveryCountry = "Required";
  if (
    f.contactEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.contactEmail)
  ) {
    e.contactEmail = "Invalid email address";
  }
  return e;
}

/* ── Component ───────────────────────────────────────────────────────────── */

export interface NewQuoteModalProps {
  open: boolean;
  onClose: () => void;
  /** Called after a successful insert so the parent page can reload. */
  onCreated?: () => void;
}

export function NewQuoteModal({ open, onClose, onCreated }: NewQuoteModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY);
    setErrors({});
    setSubmitting(false);
    const t = setTimeout(() => firstRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open]);

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
      const nw = parseFloat(form.netWeightKg);
      const gw = parseFloat(form.grossWeightKg);
      await createQuote({
        customer: form.customer.trim(),
        contactName: form.contactName.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        direction: form.direction,
        container: form.container,
        goodsDescription: form.goodsDescription.trim(),
        grossWeightKg: gw,
        netWeightKg: isNaN(nw) ? gw * 0.95 : nw,
        portOfLoading: form.portOfLoading.trim(),
        portOfDestination: form.portOfDestination.trim(),
        incoterm: form.incoterm,
        insurance: form.insurance,
        vgmRequired: false,
        loading: {
          address: "",
          postalCode: "",
          city: form.loadingCity.trim(),
          country: form.loadingCountry.trim(),
        },
        delivery: {
          address: "",
          postalCode: "",
          city: form.deliveryCity.trim(),
          country: form.deliveryCountry.trim(),
        },
        urgency: form.urgency,
        notes: form.notes.trim() || undefined,
      });

      toast.success("Quote created", {
        description: `New quote for ${form.customer.trim()} added — status: New.`,
      });
      onCreated?.();
      onClose();
    } catch (err) {
      demoError(
        "Create failed",
        err instanceof Error ? err.message : "Could not create quote.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Styled helpers ──────────────────────────────────────────────────── */

  const inputCls = (err?: string) =>
    cn(
      "w-full h-9 rounded-lg border bg-foreground/[0.03] px-3 text-sm text-foreground placeholder:text-muted-foreground/50",
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
            key="nqm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal panel */}
          <motion.div
            key="nqm-panel"
            role="dialog"
            aria-modal="true"
            aria-label="New quote request"
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-xl glass-panel rounded-2xl border shadow-[var(--shadow-elevated)] flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-4 shrink-0">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand/25 to-brand/5 border border-brand/25 shadow-[0_0_14px_-5px_var(--brand)]">
                  <FileText className="h-4 w-4 text-brand" />
                </span>
                <div>
                  <h2 className="font-display text-base font-semibold text-foreground">
                    New Quote Request
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Inserts into{" "}
                    <code className="font-mono">quotes</code> with status{" "}
                    <span className="font-semibold">New</span>
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

            {/* Form */}
            <form
              id="new-quote-form"
              onSubmit={handleSubmit}
              noValidate
              className="flex-1 overflow-y-auto scroll-thin px-6 py-5 space-y-6"
            >
              {/* ── Customer ── */}
              <FormSection label="Customer">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Company Name" required error={errors.customer}>
                    <input
                      ref={firstRef}
                      className={inputCls(errors.customer)}
                      placeholder="Demir Industrial Trading"
                      value={form.customer}
                      onChange={(e) => set("customer", e.target.value)}
                    />
                  </Field>
                  <Field label="Contact Name" error={errors.contactName}>
                    <input
                      className={inputCls()}
                      placeholder="Ali Demir"
                      value={form.contactName}
                      onChange={(e) => set("contactName", e.target.value)}
                    />
                  </Field>
                  <div className="col-span-2">
                    <Field label="Contact Email" error={errors.contactEmail}>
                      <input
                        type="email"
                        className={inputCls(errors.contactEmail)}
                        placeholder="ali@demir.com"
                        value={form.contactEmail}
                        onChange={(e) => set("contactEmail", e.target.value)}
                      />
                    </Field>
                  </div>
                </div>
              </FormSection>

              {/* ── Shipment details ── */}
              <FormSection label="Shipment Details">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Direction" required>
                    <div className="flex gap-2">
                      {(["Import", "Export"] as QuoteDirection[]).map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => set("direction", d)}
                          className={cn(
                            "flex-1 h-9 rounded-lg border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                            form.direction === d
                              ? "bg-brand text-white border-brand shadow-[0_2px_8px_-3px_var(--brand)]"
                              : "border-border bg-foreground/[0.03] text-foreground hover:border-brand/40",
                          )}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Container Type" required>
                    <select
                      className={selectCls()}
                      value={form.container}
                      onChange={(e) =>
                        set("container", e.target.value as ContainerKind)
                      }
                    >
                      {CONTAINER_KINDS.map((k) => (
                        <option key={k}>{k}</option>
                      ))}
                    </select>
                  </Field>
                  <Field
                    label="Port of Loading"
                    required
                    error={errors.portOfLoading}
                  >
                    <input
                      className={inputCls(errors.portOfLoading)}
                      placeholder="Shanghai"
                      value={form.portOfLoading}
                      onChange={(e) => set("portOfLoading", e.target.value)}
                    />
                  </Field>
                  <Field
                    label="Port of Destination"
                    required
                    error={errors.portOfDestination}
                  >
                    <input
                      className={inputCls(errors.portOfDestination)}
                      placeholder="Rotterdam"
                      value={form.portOfDestination}
                      onChange={(e) =>
                        set("portOfDestination", e.target.value)
                      }
                    />
                  </Field>
                </div>
              </FormSection>

              {/* ── Cargo ── */}
              <FormSection label="Cargo">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Field
                      label="Goods Description"
                      required
                      error={errors.goodsDescription}
                    >
                      <input
                        className={inputCls(errors.goodsDescription)}
                        placeholder="Automotive parts — 12 pallets"
                        value={form.goodsDescription}
                        onChange={(e) =>
                          set("goodsDescription", e.target.value)
                        }
                      />
                    </Field>
                  </div>
                  <Field
                    label="Gross Weight (kg)"
                    required
                    error={errors.grossWeightKg}
                  >
                    <input
                      type="number"
                      min={1}
                      className={inputCls(errors.grossWeightKg)}
                      placeholder="18000"
                      value={form.grossWeightKg}
                      onChange={(e) => set("grossWeightKg", e.target.value)}
                    />
                  </Field>
                  <Field label="Net Weight (kg)" error={errors.netWeightKg}>
                    <input
                      type="number"
                      min={1}
                      className={inputCls()}
                      placeholder="16500"
                      value={form.netWeightKg}
                      onChange={(e) => set("netWeightKg", e.target.value)}
                    />
                  </Field>
                </div>
              </FormSection>

              {/* ── Terms ── */}
              <FormSection label="Terms & Priority">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Incoterm" required>
                    <select
                      className={selectCls()}
                      value={form.incoterm}
                      onChange={(e) =>
                        set("incoterm", e.target.value as Incoterm)
                      }
                    >
                      {INCOTERMS.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Urgency" required>
                    <select
                      className={selectCls()}
                      value={form.urgency}
                      onChange={(e) =>
                        set("urgency", e.target.value as Priority)
                      }
                    >
                      {URGENCY_OPTIONS.map((u) => (
                        <option key={u}>{u}</option>
                      ))}
                    </select>
                  </Field>
                  <div className="col-span-2 flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={form.insurance}
                      onClick={() => set("insurance", !form.insurance)}
                      className={cn(
                        "h-5 w-5 rounded border-2 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                        form.insurance
                          ? "bg-brand border-brand"
                          : "border-border",
                      )}
                    >
                      {form.insurance && (
                        <svg
                          viewBox="0 0 10 10"
                          className="h-3 w-3 text-white"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={1.8}
                        >
                          <polyline points="1.5,5 4,7.5 8.5,2.5" />
                        </svg>
                      )}
                    </button>
                    <span className="text-sm text-foreground">
                      Cargo insurance required
                    </span>
                  </div>
                </div>
              </FormSection>

              {/* ── Addresses ── */}
              <FormSection label="Loading & Delivery">
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Loading City"
                    required
                    error={errors.loadingCity}
                  >
                    <input
                      className={inputCls(errors.loadingCity)}
                      placeholder="Shanghai"
                      value={form.loadingCity}
                      onChange={(e) => set("loadingCity", e.target.value)}
                    />
                  </Field>
                  <Field
                    label="Loading Country"
                    required
                    error={errors.loadingCountry}
                  >
                    <input
                      className={inputCls(errors.loadingCountry)}
                      placeholder="China"
                      value={form.loadingCountry}
                      onChange={(e) => set("loadingCountry", e.target.value)}
                    />
                  </Field>
                  <Field
                    label="Delivery City"
                    required
                    error={errors.deliveryCity}
                  >
                    <input
                      className={inputCls(errors.deliveryCity)}
                      placeholder="Rotterdam"
                      value={form.deliveryCity}
                      onChange={(e) => set("deliveryCity", e.target.value)}
                    />
                  </Field>
                  <Field
                    label="Delivery Country"
                    required
                    error={errors.deliveryCountry}
                  >
                    <input
                      className={inputCls(errors.deliveryCountry)}
                      placeholder="Netherlands"
                      value={form.deliveryCountry}
                      onChange={(e) =>
                        set("deliveryCountry", e.target.value)
                      }
                    />
                  </Field>
                </div>
              </FormSection>

              {/* ── Notes ── */}
              <FormSection label="Notes">
                <textarea
                  rows={3}
                  className={cn(
                    inputCls(),
                    "h-auto py-2.5 resize-none",
                  )}
                  placeholder="Special instructions, hazmat, temperature requirements…"
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </FormSection>
            </form>

            {/* Footer */}
            <div className="border-t border-border px-6 py-4 shrink-0 flex items-center justify-end gap-3">
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
                form="new-quote-form"
                disabled={submitting}
                className="inline-flex items-center gap-2 h-9 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong transition-colors shadow-[0_4px_16px_-6px_var(--brand)] disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {submitting && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                Submit Quote
              </button>
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
