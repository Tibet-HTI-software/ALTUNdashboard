/**
 * NewShipmentModal
 *
 * Premium glassmorphic centered modal for inserting a new row into
 * `ocean_shipments`. On success the Supabase Realtime channel fires
 * automatically, pushing the new shipment into all active
 * `useRealtimeShipments` subscribers without any manual reload.
 *
 * In mock/demo mode the insert is simulated and a success toast is shown;
 * the live list does not auto-update (no WS in mock mode).
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Ship, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  createOceanShipment,
  type CarrierName,
  type ContainerType as OceanContainerType,
  type ShipmentDirection,
  type ShipmentPhase,
} from "@/lib/dashboard/api";
import { demoError } from "@/lib/dashboard/demo";

/* ── Static option lists ─────────────────────────────────────────────────── */

const CARRIERS: CarrierName[] = [
  "Maersk",
  "MSC",
  "CMA CGM",
  "Hapag-Lloyd",
  "ONE",
  "Evergreen",
];

const CONTAINER_TYPES: OceanContainerType[] = [
  "20ft Dry",
  "40ft Dry",
  "40ft High-Cube",
  "20ft Reefer",
  "40ft Reefer",
];

const PHASES: ShipmentPhase[] = [
  "Booked",
  "In Transit",
  "Discharged",
  "Released",
];

/* ── Form state ──────────────────────────────────────────────────────────── */

interface FormState {
  containerNumber: string;
  blNumber: string;
  containerType: OceanContainerType;
  direction: ShipmentDirection;
  carrier: CarrierName;
  vessel: string;
  voyage: string;
  pol: string;
  pod: string;
  terminal: string;
  trader: string;
  traderContact: string;
  traderEmail: string;
  phase: ShipmentPhase;
  etd: string;
  eta: string;
  freeDaysTotal: string;
  demurrageRatePerDay: string;
  teu: string;
  weightKg: string;
  commodity: string;
}

const EMPTY: FormState = {
  containerNumber: "",
  blNumber: "",
  containerType: "40ft Dry",
  direction: "Import",
  carrier: "Maersk",
  vessel: "",
  voyage: "",
  pol: "",
  pod: "",
  terminal: "",
  trader: "",
  traderContact: "",
  traderEmail: "",
  phase: "Booked",
  etd: "",
  eta: "",
  freeDaysTotal: "7",
  demurrageRatePerDay: "150",
  teu: "1",
  weightKg: "",
  commodity: "",
};

type Errors = Partial<Record<keyof FormState, string>>;

function validate(f: FormState): Errors {
  const e: Errors = {};
  if (!f.containerNumber.trim()) e.containerNumber = "Required";
  else if (f.containerNumber.trim().length < 4) e.containerNumber = "At least 4 characters";
  if (!f.carrier) e.carrier = "Required";
  if (!f.vessel.trim()) e.vessel = "Required";
  if (!f.pol.trim()) e.pol = "Required";
  if (!f.pod.trim()) e.pod = "Required";
  if (!f.trader.trim()) e.trader = "Required";
  if (!f.eta) e.eta = "Required";
  const fdt = parseInt(f.freeDaysTotal, 10);
  if (isNaN(fdt) || fdt < 1) e.freeDaysTotal = "Minimum 1 day";
  const drd = parseFloat(f.demurrageRatePerDay);
  if (isNaN(drd) || drd < 0) e.demurrageRatePerDay = "Must be ≥ 0";
  if (f.traderEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.traderEmail)) {
    e.traderEmail = "Invalid email address";
  }
  return e;
}

/* ── Component ───────────────────────────────────────────────────────────── */

export interface NewShipmentModalProps {
  open: boolean;
  onClose: () => void;
  /** Called after a successful insert so parent pages can refresh their data. */
  onCreated?: () => void;
}

export function NewShipmentModal({
  open,
  onClose,
  onCreated,
}: NewShipmentModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);

  /* Reset whenever the modal opens. */
  useEffect(() => {
    if (!open) return;
    setForm(EMPTY);
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
      await createOceanShipment({
        containerNumber: form.containerNumber.trim().toUpperCase(),
        blNumber: form.blNumber.trim() || `BL${Date.now().toString().slice(-6)}`,
        containerType: form.containerType,
        direction: form.direction,
        carrier: form.carrier,
        vessel: form.vessel.trim(),
        voyage: form.voyage.trim() || "—",
        pol: form.pol.trim(),
        pod: form.pod.trim(),
        terminal: form.terminal.trim() || form.pod.trim(),
        trader: form.trader.trim(),
        traderContact: form.traderContact.trim(),
        traderEmail: form.traderEmail.trim(),
        phase: form.phase,
        etd: form.etd,
        eta: form.eta,
        freeDaysTotal: parseInt(form.freeDaysTotal, 10),
        demurrageRatePerDay: parseFloat(form.demurrageRatePerDay),
        teu: Math.max(1, parseInt(form.teu, 10) || 1),
        weightKg: parseFloat(form.weightKg) || 0,
        commodity: form.commodity.trim() || undefined,
      });

      toast.success("Shipment created", {
        description: `${form.containerNumber.trim().toUpperCase()} booked into ocean_shipments.`,
      });
      onCreated?.();
      onClose();
    } catch (err) {
      demoError(
        "Create failed",
        err instanceof Error ? err.message : "Could not create shipment.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Styled sub-components ───────────────────────────────────────────── */

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
            key="nsm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal panel */}
          <motion.div
            key="nsm-panel"
            role="dialog"
            aria-modal="true"
            aria-label="New ocean shipment"
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-2xl glass-panel rounded-2xl border shadow-[var(--shadow-elevated)] flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-4 shrink-0">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand/25 to-brand/5 border border-brand/25 shadow-[0_0_14px_-5px_var(--brand)]">
                  <Ship className="h-4 w-4 text-brand" />
                </span>
                <div>
                  <h2 className="font-display text-base font-semibold text-foreground">
                    New Ocean Shipment
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Inserts live into{" "}
                    <code className="font-mono">ocean_shipments</code> — realtime
                    pushes to all subscribers
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="p-1.5 rounded-md hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable form body */}
            <form
              id="new-shipment-form"
              onSubmit={handleSubmit}
              noValidate
              className="flex-1 overflow-y-auto scroll-thin px-6 py-5 space-y-6"
            >
              {/* ── Container identity ── */}
              <FormSection label="Container Identity">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Container Number" required error={errors.containerNumber}>
                    <input
                      ref={firstRef}
                      className={inputCls(errors.containerNumber)}
                      placeholder="MSCU1234567"
                      value={form.containerNumber}
                      onChange={(e) => set("containerNumber", e.target.value)}
                    />
                  </Field>
                  <Field label="B/L Number" error={errors.blNumber}>
                    <input
                      className={inputCls()}
                      placeholder="MAEU1234567890"
                      value={form.blNumber}
                      onChange={(e) => set("blNumber", e.target.value)}
                    />
                  </Field>
                  <Field label="Container Type" required>
                    <select
                      className={selectCls()}
                      value={form.containerType}
                      onChange={(e) => set("containerType", e.target.value as OceanContainerType)}
                    >
                      {CONTAINER_TYPES.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Direction" required>
                    <div className="flex gap-2 h-9 items-center">
                      {(["Import", "Export"] as ShipmentDirection[]).map((d) => (
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
                </div>
              </FormSection>

              {/* ── Route & carrier ── */}
              <FormSection label="Route & Carrier">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Carrier" required error={errors.carrier}>
                    <select
                      className={selectCls(errors.carrier)}
                      value={form.carrier}
                      onChange={(e) => set("carrier", e.target.value as CarrierName)}
                    >
                      {CARRIERS.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Vessel" required error={errors.vessel}>
                    <input
                      className={inputCls(errors.vessel)}
                      placeholder="MSC Isabella"
                      value={form.vessel}
                      onChange={(e) => set("vessel", e.target.value)}
                    />
                  </Field>
                  <Field label="Voyage" error={errors.voyage}>
                    <input
                      className={inputCls()}
                      placeholder="0QA8NE1MA"
                      value={form.voyage}
                      onChange={(e) => set("voyage", e.target.value)}
                    />
                  </Field>
                  <Field label="Terminal" error={errors.terminal}>
                    <input
                      className={inputCls()}
                      placeholder="Maasvlakte II"
                      value={form.terminal}
                      onChange={(e) => set("terminal", e.target.value)}
                    />
                  </Field>
                  <Field label="Port of Loading (POL)" required error={errors.pol}>
                    <input
                      className={inputCls(errors.pol)}
                      placeholder="Shanghai"
                      value={form.pol}
                      onChange={(e) => set("pol", e.target.value)}
                    />
                  </Field>
                  <Field label="Port of Discharge (POD)" required error={errors.pod}>
                    <input
                      className={inputCls(errors.pod)}
                      placeholder="Rotterdam"
                      value={form.pod}
                      onChange={(e) => set("pod", e.target.value)}
                    />
                  </Field>
                </div>
              </FormSection>

              {/* ── Trader ── */}
              <FormSection label="Trader">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Company / Trader" required error={errors.trader}>
                    <input
                      className={inputCls(errors.trader)}
                      placeholder="Demir Industrial Trading"
                      value={form.trader}
                      onChange={(e) => set("trader", e.target.value)}
                    />
                  </Field>
                  <Field label="Contact Name" error={errors.traderContact}>
                    <input
                      className={inputCls()}
                      placeholder="Ali Demir"
                      value={form.traderContact}
                      onChange={(e) => set("traderContact", e.target.value)}
                    />
                  </Field>
                  <Field label="Contact Email" error={errors.traderEmail}>
                    <input
                      type="email"
                      className={inputCls(errors.traderEmail)}
                      placeholder="ali@demir.com"
                      value={form.traderEmail}
                      onChange={(e) => set("traderEmail", e.target.value)}
                    />
                  </Field>
                </div>
              </FormSection>

              {/* ── Schedule & status ── */}
              <FormSection label="Schedule & Status">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Phase" required>
                    <select
                      className={selectCls()}
                      value={form.phase}
                      onChange={(e) => set("phase", e.target.value as ShipmentPhase)}
                    >
                      {PHASES.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="ETA" required error={errors.eta}>
                    <input
                      type="date"
                      className={inputCls(errors.eta)}
                      value={form.eta}
                      onChange={(e) => set("eta", e.target.value)}
                    />
                  </Field>
                  <Field label="ETD" error={errors.etd}>
                    <input
                      type="date"
                      className={inputCls()}
                      value={form.etd}
                      onChange={(e) => set("etd", e.target.value)}
                    />
                  </Field>
                </div>
              </FormSection>

              {/* ── Commercial ── */}
              <FormSection label="Commercial">
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Free Days Total"
                    required
                    error={errors.freeDaysTotal}
                  >
                    <input
                      type="number"
                      min={1}
                      className={inputCls(errors.freeDaysTotal)}
                      value={form.freeDaysTotal}
                      onChange={(e) => set("freeDaysTotal", e.target.value)}
                    />
                  </Field>
                  <Field
                    label="Demurrage Rate / Day (EUR)"
                    required
                    error={errors.demurrageRatePerDay}
                  >
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      className={inputCls(errors.demurrageRatePerDay)}
                      value={form.demurrageRatePerDay}
                      onChange={(e) => set("demurrageRatePerDay", e.target.value)}
                    />
                  </Field>
                  <Field label="TEU" error={errors.teu}>
                    <input
                      type="number"
                      min={1}
                      className={inputCls()}
                      value={form.teu}
                      onChange={(e) => set("teu", e.target.value)}
                    />
                  </Field>
                  <Field label="Weight (kg)" error={errors.weightKg}>
                    <input
                      type="number"
                      min={0}
                      className={inputCls()}
                      placeholder="18000"
                      value={form.weightKg}
                      onChange={(e) => set("weightKg", e.target.value)}
                    />
                  </Field>
                  <div className="col-span-2">
                    <Field label="Commodity" error={errors.commodity}>
                      <input
                        className={inputCls()}
                        placeholder="Automotive parts"
                        value={form.commodity}
                        onChange={(e) => set("commodity", e.target.value)}
                      />
                    </Field>
                  </div>
                </div>
              </FormSection>
            </form>

            {/* Sticky footer */}
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
                form="new-shipment-form"
                disabled={submitting}
                className="inline-flex items-center gap-2 h-9 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong transition-colors shadow-[0_4px_16px_-6px_var(--brand)] disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {submitting && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                Create Shipment
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
