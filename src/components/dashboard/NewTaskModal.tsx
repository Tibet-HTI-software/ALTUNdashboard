/**
 * NewTaskModal
 *
 * Glassmorphic centered modal for manually creating a new board task.
 * On submit: calls `createBoardTask()` then fires `onCreated()` so the
 * Kanban board reloads. Falls back gracefully in demo/mock mode.
 *
 * Fields:
 *   Title         — required free text
 *   Description   — optional textarea
 *   Assigned Role — role selector (defaults to current user's role)
 *   Category      — board category selector
 *   Priority      — high / medium / low
 *   Due Date      — date picker, defaults to today
 *   Shipment Link — optional, searches loaded ocean shipments
 *
 * Design tokens: `glass-panel`, `card-premium`, `scroll-thin`, `--brand`.
 * Framer Motion entrance/exit matches the other dashboard modals (scale + fade).
 */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  Container,
  Loader2,
  ListTodo,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  createBoardTask,
  getOceanShipments,
  type BoardTaskCategory,
  type BoardTaskPriority,
  type OceanShipment,
} from "@/lib/dashboard/api";
import { ROLES, type Role } from "@/lib/dashboard/role";
import { demoError } from "@/lib/dashboard/demo";

/* ── Static option lists ─────────────────────────────────────────────────── */

const CATEGORIES: BoardTaskCategory[] = [
  "D&D",
  "Documents",
  "Carrier",
  "Finance",
  "Customs",
  "Comms",
  "Booking",
  "Operations",
  "Management",
];

const PRIORITIES: { value: BoardTaskPriority; label: string; cls: string }[] =
  [
    {
      value: "high",
      label: "High",
      cls: "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-300",
    },
    {
      value: "medium",
      label: "Medium",
      cls: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    },
    {
      value: "low",
      label: "Low",
      cls: "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-300",
    },
  ];

/* ── Form state ──────────────────────────────────────────────────────────── */

interface FormState {
  title: string;
  description: string;
  assignedRole: Role;
  category: BoardTaskCategory;
  priority: BoardTaskPriority;
  shipmentId: string;
  dueDate: string;
}

function emptyForm(defaultRole: Role): FormState {
  return {
    title: "",
    description: "",
    assignedRole: defaultRole,
    category: "Operations",
    priority: "medium",
    shipmentId: "",
    dueDate: new Date().toISOString().slice(0, 10),
  };
}

type FormErrors = Partial<Record<keyof FormState, string>>;

function validate(f: FormState): FormErrors {
  const e: FormErrors = {};
  if (!f.title.trim()) e.title = "Required";
  if (!f.dueDate) e.dueDate = "Required";
  return e;
}

/* ── Component ───────────────────────────────────────────────────────────── */

export interface NewTaskModalProps {
  open: boolean;
  onClose: () => void;
  /** Called after the task is successfully created so the board can reload. */
  onCreated?: () => void;
  /** Pre-select the assigned-role dropdown; defaults to "ceo". */
  defaultRole?: Role;
}

export function NewTaskModal({
  open,
  onClose,
  onCreated,
  defaultRole = "ceo",
}: NewTaskModalProps) {
  const [form, setForm] = useState<FormState>(() => emptyForm(defaultRole));
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [shipments, setShipments] = useState<OceanShipment[]>([]);
  const titleRef = useRef<HTMLInputElement>(null);

  /* Reset form + load shipments on open. */
  useEffect(() => {
    if (!open) return;
    setForm(emptyForm(defaultRole));
    setErrors({});
    setSubmitting(false);
    const t = setTimeout(() => titleRef.current?.focus(), 60);
    getOceanShipments()
      .then(setShipments)
      .catch(() => {});
    return () => clearTimeout(t);
  }, [open, defaultRole]);

  /* Escape to close. */
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose();
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, submitting, onClose]);

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
      await createBoardTask({
        title: form.title.trim(),
        description: form.description.trim(),
        assignedRole: form.assignedRole,
        category: form.category,
        priority: form.priority,
        shipmentId: form.shipmentId || null,
        dueDate: form.dueDate,
      });
      toast.success("Task created", {
        description: form.title.trim().slice(0, 72),
      });
      onCreated?.();
      onClose();
    } catch (err) {
      demoError(
        "Create failed",
        err instanceof Error ? err.message : "Could not create task.",
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
    cn(inputCls(err), "cursor-pointer appearance-none pr-8");

  const labelCls = "block text-xs font-semibold text-muted-foreground mb-1.5";

  /* ── Render ──────────────────────────────────────────────────────────── */

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="new-task-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => !submitting && onClose()}
          />

          {/* Panel */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              key="new-task-panel"
              initial={{ opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 14 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-auto w-full max-w-md"
            >
              <div className="glass-panel rounded-2xl border border-border shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 border border-brand/20 shrink-0">
                    <ListTodo className="h-3.5 w-3.5 text-brand" />
                  </span>
                  <h2 className="font-display text-sm font-bold text-foreground flex-1">
                    New Task
                  </h2>
                  <button
                    type="button"
                    onClick={() => !submitting && onClose()}
                    disabled={submitting}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand disabled:opacity-50"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Form */}
                <form
                  onSubmit={handleSubmit}
                  className="flex flex-col gap-4 p-5 overflow-y-auto scroll-thin max-h-[calc(100dvh-10rem)]"
                >
                  {/* Title */}
                  <div>
                    <label className={labelCls}>
                      Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      ref={titleRef}
                      type="text"
                      value={form.title}
                      onChange={(e) => set("title", e.target.value)}
                      placeholder="e.g. Chase free time extension — MSCU4821033"
                      className={inputCls(errors.title)}
                    />
                    {errors.title && (
                      <p className="mt-1 text-[0.68rem] text-rose-500">
                        {errors.title}
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className={labelCls}>Description</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => set("description", e.target.value)}
                      rows={3}
                      placeholder="Optional context or action steps…"
                      className={cn(
                        inputCls(),
                        "h-auto resize-none py-2 leading-relaxed",
                      )}
                    />
                  </div>

                  {/* Row: Role + Category */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Assigned Role</label>
                      <div className="relative">
                        <select
                          value={form.assignedRole}
                          onChange={(e) =>
                            set("assignedRole", e.target.value as Role)
                          }
                          className={selectCls()}
                        >
                          {ROLES.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.short}
                            </option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[0.6rem]">
                          ▼
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className={labelCls}>Category</label>
                      <div className="relative">
                        <select
                          value={form.category}
                          onChange={(e) =>
                            set("category", e.target.value as BoardTaskCategory)
                          }
                          className={selectCls()}
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[0.6rem]">
                          ▼
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Row: Priority + Due Date */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Priority — pill toggle */}
                    <div>
                      <label className={labelCls}>Priority</label>
                      <div className="flex gap-1.5">
                        {PRIORITIES.map((p) => (
                          <button
                            key={p.value}
                            type="button"
                            onClick={() => set("priority", p.value)}
                            className={cn(
                              "flex-1 rounded-lg border py-1.5 text-[0.68rem] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand",
                              form.priority === p.value
                                ? p.cls
                                : "border-border bg-foreground/[0.02] text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Due Date */}
                    <div>
                      <label className={labelCls}>
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          Due Date <span className="text-rose-500">*</span>
                        </span>
                      </label>
                      <input
                        type="date"
                        value={form.dueDate}
                        onChange={(e) => set("dueDate", e.target.value)}
                        className={cn(inputCls(errors.dueDate), "cursor-pointer")}
                      />
                      {errors.dueDate && (
                        <p className="mt-1 text-[0.68rem] text-rose-500">
                          {errors.dueDate}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Shipment Link — optional */}
                  <div>
                    <label className={labelCls}>
                      <span className="inline-flex items-center gap-1">
                        <Container className="h-3 w-3" />
                        Shipment Link
                        <span className="text-muted-foreground/50 font-normal ml-0.5">
                          (optional)
                        </span>
                      </span>
                    </label>
                    <div className="relative">
                      <select
                        value={form.shipmentId}
                        onChange={(e) => set("shipmentId", e.target.value)}
                        className={selectCls()}
                      >
                        <option value="">— None —</option>
                        {shipments.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.id}
                            {s.blNumber ? ` · ${s.blNumber}` : ""}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[0.6rem]">
                        ▼
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-border mt-1">
                    <button
                      type="button"
                      onClick={() => !submitting && onClose()}
                      disabled={submitting}
                      className="h-9 px-4 rounded-lg border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="h-9 px-4 rounded-lg bg-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 disabled:opacity-60 inline-flex items-center gap-1.5"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Creating…
                        </>
                      ) : (
                        "Create Task"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
