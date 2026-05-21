import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DropAnimation,
} from "@dnd-kit/core";
import {
  BookOpen,
  CheckCheck,
  ChevronRight,
  Circle,
  Container,
  FileText,
  GripVertical,
  Loader2,
  PackageSearch,
  Plus,
  Receipt,
  RotateCcw,
  Tag,
  Timer,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { LoadingState, ErrorState } from "@/components/dashboard/AsyncStates";
import { NewTaskModal } from "@/components/dashboard/NewTaskModal";
import { ShipmentDetailDrawer } from "@/components/dashboard/ShipmentDetailDrawer";
import {
  getBoardTasks,
  updateBoardTaskStatus,
  getOceanShipments,
  useAsyncData,
  type BoardTask,
  type BoardTaskStatus,
  type OceanShipment,
} from "@/lib/dashboard/api";
import { useRole, getRoleMeta } from "@/lib/dashboard/role";
import { demoError } from "@/lib/dashboard/demo";

export const Route = createFileRoute("/dashboard/my-tasks")({
  head: () => ({
    meta: [{ title: "My Tasks — Altun Logistics" }],
  }),
  component: MyTasksPage,
});

/* ── Constants ───────────────────────────────────────────────────────── */

type ViewMode = "mine" | "all";


const COLUMNS: {
  status: BoardTaskStatus;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    status: "order_entry",
    label: "Order Entry & Budgeting",
    icon: <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />,
  },
  {
    status: "booking",
    label: "Booking & Transport",
    icon: <PackageSearch className="h-3.5 w-3.5 text-brand" />,
  },
  {
    status: "customs_docs",
    label: "Customs & Docs",
    icon: <FileText className="h-3.5 w-3.5 text-amber-500" />,
  },
  {
    status: "invoicing",
    label: "Invoicing",
    icon: <Receipt className="h-3.5 w-3.5 text-emerald-500" />,
  },
];

const PRIORITY_CLS: Record<string, string> = {
  high: "bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/25",
  medium:
    "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25",
  low: "bg-sky-500/10 text-sky-600 dark:text-sky-300 border-sky-500/25",
};

const CATEGORY_CLS: Record<string, string> = {
  "D&D": "bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/20",
  Documents:
    "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  Carrier: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20",
  Finance:
    "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20",
  Customs:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  Comms: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  Booking:
    "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20",
  VGM: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  Operations:
    "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
  Management:
    "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
};

/**
 * Short spring drop animation. Fires when a card is released over a column
 * before the optimistic state update moves it there.
 */
const DROP_ANIMATION: DropAnimation = {
  duration: 200,
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
};

/* ── Due-date formatter ──────────────────────────────────────────────── */

function formatDue(iso: string): {
  label: string;
  overdue: boolean;
  urgent: boolean;
} {
  const due = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (diff < 0)
    return { label: `${Math.abs(diff)}d overdue`, overdue: true, urgent: true };
  if (diff === 0) return { label: "Due today", overdue: false, urgent: true };
  if (diff === 1) return { label: "Tomorrow", overdue: false, urgent: false };
  if (diff <= 6)
    return {
      label: due.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
      overdue: false,
      urgent: false,
    };
  return {
    label: due.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    }),
    overdue: false,
    urgent: false,
  };
}

/* ── Advance-status helpers ──────────────────────────────────────────── */

function nextStatus(s: BoardTaskStatus): BoardTaskStatus {
  if (s === "order_entry") return "booking";
  if (s === "booking") return "customs_docs";
  if (s === "customs_docs") return "invoicing";
  return "order_entry"; // invoicing → reopen
}

function nextLabel(s: BoardTaskStatus): string {
  if (s === "order_entry") return "Book";
  if (s === "booking") return "To Customs";
  if (s === "customs_docs") return "Invoice";
  return "Reopen";
}

function NextIcon({ status }: { status: BoardTaskStatus }) {
  if (status === "order_entry") return <PackageSearch className="h-3 w-3" />;
  if (status === "booking") return <FileText className="h-3 w-3" />;
  if (status === "customs_docs") return <Receipt className="h-3 w-3" />;
  return <RotateCcw className="h-3 w-3" />;
}

/* ── Chips ───────────────────────────────────────────────────────────── */

function ShipmentChip({
  shipmentId,
  onClick,
}: {
  shipmentId: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="inline-flex items-center gap-1 rounded-md border border-brand/25 bg-brand/[0.07] px-1.5 py-0.5 text-[0.62rem] font-semibold text-brand hover:bg-brand/[0.14] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand"
    >
      <Container className="h-2.5 w-2.5" />
      {shipmentId}
      <ChevronRight className="h-2 w-2 opacity-60" />
    </button>
  );
}

/* ── Task card ───────────────────────────────────────────────────────── */

/**
 * Pure presentational card.
 * `isDragging` dims the card to act as a drop placeholder while the
 * `DragOverlay` carries the floating clone.
 */
function TaskCard({
  task,
  advancing,
  isDragging = false,
  onAdvance,
  onShipmentClick,
}: {
  task: BoardTask;
  advancing: boolean;
  isDragging?: boolean;
  onAdvance: (id: string, next: BoardTaskStatus) => void;
  onShipmentClick: (id: string) => void;
}) {
  const due = formatDue(task.dueDate);

  return (
    <div
      className={cn(
        "card-premium rounded-xl p-3.5 flex flex-col gap-2.5 transition-opacity duration-150",
        // Ghost: faint + dashed outline while DragOverlay carries the clone
        isDragging && "opacity-20 [border-style:dashed] border-brand/40",
      )}
    >
      {/* Row 1: priority · category · due · drag handle */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap flex-1">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[0.58rem] font-semibold capitalize shrink-0",
              PRIORITY_CLS[task.priority],
            )}
          >
            {task.priority}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[0.58rem] font-semibold shrink-0",
              CATEGORY_CLS[task.category] ??
                "bg-foreground/5 text-muted-foreground border-border",
            )}
          >
            <Tag className="h-2.5 w-2.5" />
            {task.category}
          </span>
        </div>

        <span
          className={cn(
            "text-[0.62rem] font-medium shrink-0 whitespace-nowrap",
            due.overdue
              ? "text-rose-500 dark:text-rose-400"
              : due.urgent
                ? "text-amber-600 dark:text-amber-400"
                : "text-muted-foreground",
          )}
        >
          {due.label}
        </span>

        {/* Visual drag-affordance hint — listeners live on the outer wrapper */}
        <GripVertical className="shrink-0 h-3.5 w-3.5 -mr-1 text-muted-foreground/25 cursor-grab" />
      </div>

      {/* Row 2: title */}
      <p
        className={cn(
          "text-[0.82rem] font-semibold leading-snug",
          "text-foreground",
        )}
      >
        {task.title}
      </p>

      {/* Row 3: description (2-line clamp) */}
      <p className="text-[0.68rem] text-muted-foreground leading-relaxed line-clamp-2">
        {task.description}
      </p>

      {/* Row 4: shipment chip + advance button */}
      <div className="flex items-center justify-between gap-2 mt-0.5">
        <div className="min-w-0">
          {task.shipmentId && (
            <ShipmentChip
              shipmentId={task.shipmentId}
              onClick={() => onShipmentClick(task.shipmentId!)}
            />
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAdvance(task.id, nextStatus(task.status));
          }}
          disabled={advancing}
          className={cn(
            "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[0.62rem] font-semibold transition-colors shrink-0",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            task.status === "invoicing"
              ? "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              : task.status === "customs_docs"
                ? "border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/[0.12]"
                : task.status === "booking"
                  ? "border-amber-500/30 bg-amber-500/[0.06] text-amber-700 dark:text-amber-300 hover:bg-amber-500/[0.12]"
                  : "border-brand/30 bg-brand/[0.06] text-brand hover:bg-brand/[0.12]",
          )}
        >
          {advancing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <NextIcon status={task.status} />
          )}
          {nextLabel(task.status)}
        </button>
      </div>
    </div>
  );
}

/* ── Draggable card wrapper ──────────────────────────────────────────── */

/**
 * Wrapper that layers @dnd-kit drag on top of framer-motion enter/exit.
 *
 * Key architecture: dnd-kit and framer-motion both want to own pointer events
 * on the same element, which causes silent failures. Solution: split concerns.
 *
 *   outer <div>  — dnd-kit owns this: setNodeRef, listeners, attributes,
 *                  touchAction:"none". Plain div, zero animation.
 *   inner <motion.div> — framer-motion owns this: enter/exit/opacity.
 *                        No dnd-kit props, no layout prop needed.
 *
 * The whole card is draggable (not just the grip icon). PointerSensor's
 * 5px activationConstraint means normal clicks on buttons/chips still fire.
 */
function DraggableTaskCard({
  task,
  advancing,
  onAdvance,
  onShipmentClick,
}: {
  task: BoardTask;
  advancing: boolean;
  onAdvance: (id: string, next: BoardTaskStatus) => void;
  onShipmentClick: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={isDragging ? "cursor-grabbing" : "cursor-grab"}
      style={{ touchAction: "none", userSelect: "none" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: -8 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
        <TaskCard
          task={task}
          advancing={advancing}
          isDragging={isDragging}
          onAdvance={onAdvance}
          onShipmentClick={onShipmentClick}
        />
      </motion.div>
    </div>
  );
}

/* ── Droppable column ────────────────────────────────────────────────── */

/**
 * `useDroppable` must be called inside the component that renders the drop
 * target. The `setNodeRef` is attached to the scrollable card-list div so
 * the full column body is a valid drop zone.
 *
 * `isOver` drives a subtle ring/background accent so users see exactly where
 * the card will land before releasing the pointer.
 */
function KanbanColumn({
  status,
  label,
  icon,
  tasks,
  advancing,
  activeTaskId,
  onAdvance,
  onShipmentClick,
}: {
  status: BoardTaskStatus;
  label: string;
  icon: React.ReactNode;
  tasks: BoardTask[];
  advancing: string | null;
  /** ID of the card currently being dragged (for placeholder sizing). */
  activeTaskId: string | null;
  onAdvance: (id: string, next: BoardTaskStatus) => void;
  onShipmentClick: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  const countCls =
    status === "order_entry"
      ? "bg-foreground/10 text-foreground"
      : status === "booking"
        ? "bg-brand text-white"
        : status === "customs_docs"
          ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
          : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border transition-colors duration-150",
        isOver
          ? "border-brand/40 bg-brand/[0.025] shadow-[inset_0_0_0_1px_var(--brand-20,rgba(0,123,255,0.12))]"
          : "border-border/60 bg-foreground/[0.015]",
      )}
    >
      {/* Column header */}
      <header className="shrink-0 flex items-center gap-2 px-3.5 py-3 border-b border-border bg-foreground/[0.02]">
        {icon}
        <span className="text-xs font-semibold text-foreground">{label}</span>
        <span
          className={cn(
            "inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full text-[0.6rem] font-bold px-1 ml-auto",
            countCls,
          )}
        >
          {tasks.length}
        </span>
      </header>

      {/* Drop zone — card list */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-0 overflow-y-auto scroll-thin p-2.5 space-y-2 transition-colors duration-150",
          isOver && "bg-brand/[0.03]",
        )}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {tasks.map((task) => (
            <DraggableTaskCard
              key={task.id}
              task={task}
              advancing={advancing === task.id}
              onAdvance={onAdvance}
              onShipmentClick={onShipmentClick}
            />
          ))}
        </AnimatePresence>

        {/* Empty state — expands to give a larger drop target when column is empty */}
        {tasks.length === 0 && (
          <div
            className={cn(
              "flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-10 gap-2 text-center transition-colors duration-150",
              isOver
                ? "border-brand/40 bg-brand/[0.04]"
                : "border-border/40",
            )}
          >
            <span className={cn("transition-colors", isOver ? "text-brand/40" : "text-muted-foreground/30")}>
              {status === "invoicing" ? (
                <Receipt className="h-7 w-7" />
              ) : status === "customs_docs" ? (
                <FileText className="h-7 w-7" />
              ) : status === "booking" ? (
                <PackageSearch className="h-7 w-7" />
              ) : (
                <Circle className="h-7 w-7" />
              )}
            </span>
            <p className={cn("text-[0.68rem] transition-colors", isOver ? "text-brand/70" : "text-muted-foreground")}>
              {isOver ? "Drop here" : "No tasks here"}
            </p>
          </div>
        )}

        {/* Invisible spacer at the bottom so the last card isn't flush against the edge */}
        {tasks.length > 0 && activeTaskId && <div className="h-1" />}
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────── */

function MyTasksPage() {
  const { data, loading, error, reload } = useAsyncData(getBoardTasks, []);
  const { data: shipments } = useAsyncData(getOceanShipments, []);
  const { role } = useRole();

  const [viewMode, setViewMode] = useState<ViewMode>("mine");
  const [localStatuses, setLocalStatuses] = useState<
    Record<string, BoardTaskStatus>
  >({});
  /** Currently in-flight advance task ID (button or drop). Null = idle. */
  const [advancing, setAdvancing] = useState<string | null>(null);
  /** Task ID currently being dragged; null when no drag is active. */
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);

  /**
   * Lock body cursor + kill text selection globally while a drag is active.
   * Without this, moving the pointer off the dragged element reverts to the
   * default cursor and text in other cards can get highlighted mid-drag.
   */
  useEffect(() => {
    if (activeTaskId) {
      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
    } else {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [activeTaskId]);
  const [drawerShipment, setDrawerShipment] = useState<OceanShipment | null>(
    null,
  );

  /**
   * PointerSensor with 5px activation distance — lets normal clicks pass
   * through to all interactive children before drag kicks in.
   * No KeyboardSensor: column action buttons provide the keyboard fallback.
   */
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const roleMeta = getRoleMeta(role);
  const allTasks = useMemo(() => data ?? [], [data]);

  const effectiveTasks = useMemo(
    () =>
      allTasks.map((t) =>
        localStatuses[t.id] ? { ...t, status: localStatuses[t.id] } : t,
      ),
    [allTasks, localStatuses],
  );

  const visibleTasks = useMemo(
    () =>
      viewMode === "mine"
        ? effectiveTasks.filter((t) => t.assignedRole === role)
        : effectiveTasks,
    [effectiveTasks, viewMode, role],
  );

  const byStatus = useMemo(
    () =>
      ({
        order_entry: visibleTasks.filter((t) => t.status === "order_entry"),
        booking: visibleTasks.filter((t) => t.status === "booking"),
        customs_docs: visibleTasks.filter((t) => t.status === "customs_docs"),
        invoicing: visibleTasks.filter((t) => t.status === "invoicing"),
      }) as Record<BoardTaskStatus, BoardTask[]>,
    [visibleTasks],
  );

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      total: visibleTasks.filter((t) => t.status !== "invoicing").length,
      high: visibleTasks.filter(
        (t) => t.priority === "high" && t.status !== "invoicing",
      ).length,
      dueToday: visibleTasks.filter(
        (t) => t.dueDate === today && t.status !== "invoicing",
      ).length,
      done: byStatus.invoicing.length,
    };
  }, [visibleTasks, byStatus]);

  /** The task object being dragged, used to render the DragOverlay clone. */
  const activeTask = useMemo(
    () =>
      activeTaskId
        ? (effectiveTasks.find((t) => t.id === activeTaskId) ?? null)
        : null,
    [activeTaskId, effectiveTasks],
  );

  /* ── Event handlers ────────────────────────────────────────────────── */

  function handleShipmentClick(shipmentId: string) {
    setDrawerShipment(
      (shipments ?? []).find((s) => s.id === shipmentId) ?? null,
    );
  }

  /**
   * Shared advance function used by both button clicks and DnD drops.
   *
   * Guard changed from `if (advancing)` to `if (advancing === id)` so that
   * a concurrent DnD of a different card is never blocked by an in-flight
   * button advance on a different card.
   */
  async function handleAdvance(id: string, next: BoardTaskStatus) {
    if (advancing === id) return; // prevent double-submit on same card
    setLocalStatuses((prev) => ({ ...prev, [id]: next }));
    setAdvancing(id);
    try {
      await updateBoardTaskStatus(id, next);
      const label =
        next === "booking"
          ? "Moved to Booking & Transport"
          : next === "customs_docs"
            ? "Moved to Customs & Docs"
            : next === "invoicing"
              ? "Moved to Invoicing"
              : "Task reopened";
      const task = allTasks.find((t) => t.id === id);
      toast.success(label, { description: task?.title.slice(0, 72) });
    } catch (err) {
      setLocalStatuses((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      demoError(
        "Update failed",
        err instanceof Error ? err.message : "Could not update task.",
      );
    } finally {
      setAdvancing(null);
    }
  }

  function handleDragStart({ active }: DragStartEvent) {
    setActiveTaskId(active.id as string);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveTaskId(null);

    if (!over) return; // dropped outside any column

    const targetStatus = over.id as BoardTaskStatus;
    const task = effectiveTasks.find((t) => t.id === active.id);
    if (!task) return;
    if (task.status === targetStatus) return; // same column, no-op

    handleAdvance(active.id as string, targetStatus);
  }

  /* ── Render ────────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingState label="Loading task board…" />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <ErrorState error={error} onRetry={reload} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout lockViewport>
      <div className="h-full min-h-0 flex flex-col overflow-hidden gap-3">
        {/* ── Header ── */}
        <div className="shrink-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 border border-brand/20 shrink-0">
              <Timer className="h-4 w-4 text-brand" />
            </span>
            <div>
              <h1 className="font-display text-base font-bold text-foreground leading-tight">
                Task Board
              </h1>
              <p className="text-[0.68rem] text-muted-foreground">
                {viewMode === "mine" ? (
                  <span className="flex items-center gap-1">
                    <User className="h-2.5 w-2.5" />
                    {roleMeta.person} · {roleMeta.short}
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Users className="h-2.5 w-2.5" />
                    All roles
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5">
              <StatPill value={stats.total} label="open" />
              {stats.high > 0 && (
                <StatPill value={stats.high} label="high priority" urgent />
              )}
              {stats.dueToday > 0 && (
                <StatPill value={stats.dueToday} label="due today" warn />
              )}
              <StatPill value={stats.done} label="done" success />
            </div>

            <button
              type="button"
              onClick={() => setShowNewTaskModal(true)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-brand text-white text-[0.72rem] font-semibold hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              New Task
            </button>

            <div className="flex items-center rounded-lg border border-border bg-foreground/[0.03] p-0.5">
              <ToggleBtn
                active={viewMode === "mine"}
                onClick={() => setViewMode("mine")}
                icon={<User className="h-3 w-3" />}
              >
                My Tasks
              </ToggleBtn>
              <ToggleBtn
                active={viewMode === "all"}
                onClick={() => setViewMode("all")}
                icon={<Users className="h-3 w-3" />}
              >
                All Tasks
              </ToggleBtn>
            </div>
          </div>
        </div>

        {/* ── Kanban board ── */}
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-4 gap-3">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.status}
                status={col.status}
                label={col.label}
                icon={col.icon}
                tasks={byStatus[col.status]}
                advancing={advancing}
                activeTaskId={activeTaskId}
                onAdvance={handleAdvance}
                onShipmentClick={handleShipmentClick}
              />
            ))}
          </div>

          {/*
           * DragOverlay renders in a portal above all content.
           * We render a TaskCard WITHOUT listeners (no drag handle in the
           * clone) and WITHOUT isDragging so it looks fully opaque.
           * The slight rotation + elevation shadow signals "card is lifted".
           */}
          <DragOverlay dropAnimation={DROP_ANIMATION}>
            {activeTask ? (
              <div className="rotate-[2deg] scale-[1.01] shadow-[0_24px_48px_-8px_rgba(0,0,0,0.28)] rounded-xl ring-1 ring-brand/20 cursor-grabbing">
                <TaskCard
                  task={activeTask}
                  advancing={false}
                  isDragging={false}

                  onAdvance={() => {}}
                  onShipmentClick={() => {}}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <ShipmentDetailDrawer
        shipment={drawerShipment}
        onClose={() => setDrawerShipment(null)}
      />

      <NewTaskModal
        open={showNewTaskModal}
        onClose={() => setShowNewTaskModal(false)}
        onCreated={reload}
        defaultRole={role}
      />
    </DashboardLayout>
  );
}

/* ── Micro components ────────────────────────────────────────────────── */

function StatPill({
  value,
  label,
  urgent,
  warn,
  success,
}: {
  value: number;
  label: string;
  urgent?: boolean;
  warn?: boolean;
  success?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.62rem] font-semibold",
        urgent
          ? "border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-300"
          : warn
            ? "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300"
            : success
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-border bg-foreground/[0.04] text-muted-foreground",
      )}
    >
      <span className="tabular-nums font-bold">{value}</span>
      {label}
    </span>
  );
}

function ToggleBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[0.72rem] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand",
        active
          ? "bg-background border border-border text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {children}
    </button>
  );
}
