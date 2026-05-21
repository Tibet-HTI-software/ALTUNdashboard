/**
 * InviteMemberModal
 *
 * Glassmorphic centered modal for inviting a new team member.
 * On submit: inserts into `team_invitations` via `inviteTeamMember()`.
 * Falls back to a simulated response in demo/mock mode.
 *
 * Design tokens: `glass-panel`, `card-premium`, `scroll-thin`,
 * `--brand`, `--brand-strong`. Framer Motion entrance/exit matches
 * the other modals (scale + fade, 220ms ease).
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { inviteTeamMember, type TeamRole } from "@/lib/dashboard/api";
import { demoError } from "@/lib/dashboard/demo";

/* ── Static option lists ─────────────────────────────────────────────────── */

const ROLES: { value: TeamRole; label: string; description: string }[] = [
  {
    value: "CEO",
    label: "CEO",
    description: "Full read access across all modules. Strategy & KPI views.",
  },
  {
    value: "Planner",
    label: "Planner",
    description: "Shipment scheduling, demurrage board, fleet tracking.",
  },
  {
    value: "Customs",
    label: "Customs",
    description: "Customs files, document checklists, clearance actions.",
  },
  {
    value: "Service",
    label: "Service",
    description: "Quote management, customer comms, team tasks.",
  },
];

/* ── Form state ──────────────────────────────────────────────────────────── */

interface FormState {
  email: string;
  role: TeamRole;
  message: string;
}

const EMPTY: FormState = {
  email: "",
  role: "Planner",
  message: "",
};

type Errors = Partial<Record<keyof FormState, string>>;

function validate(f: FormState): Errors {
  const e: Errors = {};
  if (!f.email.trim()) {
    e.email = "Required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) {
    e.email = "Enter a valid email address";
  }
  return e;
}

/* ── Component ───────────────────────────────────────────────────────────── */

export interface InviteMemberModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function InviteMemberModal({
  open,
  onClose,
  onCreated,
}: InviteMemberModalProps) {
  const [form, setForm] = useState<FormState>({ ...EMPTY });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  /* Reset on open. */
  useEffect(() => {
    if (!open) return;
    setForm({ ...EMPTY });
    setErrors({});
    setSubmitting(false);
    const t = setTimeout(() => emailRef.current?.focus(), 60);
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
      await inviteTeamMember({
        email: form.email.trim().toLowerCase(),
        role: form.role,
        message: form.message.trim() || undefined,
      });

      toast.success("Invitation sent", {
        description: `${form.email.trim()} · ${form.role}`,
      });
      onCreated?.();
      onClose();
    } catch (err) {
      demoError(
        "Invite failed",
        err instanceof Error ? err.message : "Could not send invitation.",
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

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            key="imm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            key="imm-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Invite team member"
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-md glass-panel rounded-2xl border shadow-[var(--shadow-elevated)] flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-4 shrink-0">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand/25 to-brand/5 border border-brand/25 shadow-[0_0_14px_-5px_var(--brand)]">
                  <UserPlus className="h-4 w-4 text-brand" />
                </span>
                <div>
                  <h2 className="font-display text-base font-semibold text-foreground">
                    Invite Team Member
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Sends invitation to{" "}
                    <code className="font-mono">team_invitations</code>
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
              id="invite-member-form"
              onSubmit={handleSubmit}
              noValidate
              className="flex-1 overflow-y-auto scroll-thin px-6 py-5 space-y-6"
            >
              {/* ── Contact ── */}
              <FormSection label="Contact">
                <Field label="Email Address" required error={errors.email}>
                  <input
                    ref={emailRef}
                    type="email"
                    className={inputCls(errors.email)}
                    placeholder="colleague@altunlogistics.com"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    autoComplete="email"
                  />
                </Field>
              </FormSection>

              {/* ── Role ── */}
              <FormSection label="Role">
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map(({ value, label, description }) => {
                    const selected = form.role === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => set("role", value)}
                        className={cn(
                          "flex flex-col items-start gap-0.5 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                          selected
                            ? "border-brand/40 bg-brand/[0.06]"
                            : "border-border bg-foreground/[0.02] hover:border-border/80",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {/* Radio indicator */}
                          <span
                            className={cn(
                              "flex h-3.5 w-3.5 shrink-0 rounded-full border-2 items-center justify-center transition-colors",
                              selected
                                ? "border-brand"
                                : "border-muted-foreground/40",
                            )}
                          >
                            {selected && (
                              <span className="h-1.5 w-1.5 rounded-full bg-brand block" />
                            )}
                          </span>
                          <span
                            className={cn(
                              "text-sm font-semibold",
                              selected
                                ? "text-foreground"
                                : "text-muted-foreground",
                            )}
                          >
                            {label}
                          </span>
                        </div>
                        <p className="text-[0.63rem] text-muted-foreground leading-relaxed pl-5">
                          {description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </FormSection>

              {/* ── Personal message ── */}
              <FormSection label="Personal Message (optional)">
                <textarea
                  className={cn(
                    "w-full rounded-lg border bg-foreground/[0.03] px-3 py-2 text-sm text-foreground resize-none",
                    "placeholder:text-muted-foreground/50",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45 focus-visible:border-brand/40 transition-colors border-border",
                    "scroll-thin",
                  )}
                  rows={3}
                  placeholder="Hi, we'd love to have you on the Altun team…"
                  value={form.message}
                  onChange={(e) => set("message", e.target.value)}
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
                form="invite-member-form"
                disabled={submitting}
                className="inline-flex items-center gap-2 h-9 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-strong transition-colors shadow-[0_4px_16px_-6px_var(--brand)] disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {submitting && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                Send Invite
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
