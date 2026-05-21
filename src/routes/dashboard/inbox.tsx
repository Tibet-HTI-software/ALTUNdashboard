import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  ChevronRight,
  Container,
  Inbox,
  Loader2,
  MailOpen,
  Search,
  Send,
  Tag,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { LoadingState, ErrorState } from "@/components/dashboard/AsyncStates";
import { ShipmentDetailDrawer } from "@/components/dashboard/ShipmentDetailDrawer";
import {
  getCommunications,
  markAsRead,
  archiveMessage,
  sendReply,
  getOceanShipments,
  useAsyncData,
  type CommunicationMessage,
  type MessageStatus,
  type OceanShipment,
} from "@/lib/dashboard/api";
import { useGlobalSearch } from "@/lib/dashboard/search";
import { demoError } from "@/lib/dashboard/demo";

export const Route = createFileRoute("/dashboard/inbox")({
  head: () => ({
    meta: [{ title: "Inbox & Communications — Altun Logistics" }],
  }),
  component: InboxPage,
});

/* ── Helpers ─────────────────────────────────────────────────────────── */

/** Returns a short human-readable timestamp (time today, "Yesterday", or date). */
function formatReceivedAt(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffH = (now.getTime() - d.getTime()) / 3_600_000;
  if (diffH < 24 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }
  if (diffH < 48) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const TAG_STYLES: Record<string, string> = {
  "D&D Alert":
    "bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/25",
  "Missing Doc":
    "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25",
  Carrier: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25",
  Finance:
    "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/25",
  Customs:
    "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/25",
  Booking:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
};

/* ── Sub-components ──────────────────────────────────────────────────── */

function TagChip({ label }: { label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[0.58rem] font-semibold shrink-0",
        TAG_STYLES[label] ??
          "bg-foreground/5 text-muted-foreground border-border",
      )}
    >
      <Tag className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

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
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-md border border-brand/25 bg-brand/[0.07] px-2 py-0.5 text-[0.68rem] font-semibold text-brand hover:bg-brand/[0.14] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand"
    >
      <Container className="h-3 w-3" />
      {shipmentId}
      <ChevronRight className="h-2.5 w-2.5 opacity-60" />
    </button>
  );
}

/* ── Thread row ─────────────────────────────────────────────────────── */

function ThreadRow({
  msg,
  isActive,
  localStatus,
  onClick,
}: {
  msg: CommunicationMessage;
  isActive: boolean;
  localStatus?: MessageStatus;
  onClick: () => void;
}) {
  const status = localStatus ?? msg.status;
  const isUnread = status === "unread";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3.5 transition-colors border-b border-border last:border-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-brand",
        isActive
          ? "bg-brand/[0.07]"
          : isUnread
            ? "bg-brand/[0.025] hover:bg-brand/[0.05]"
            : "hover:bg-foreground/[0.025]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            {isUnread && (
              <span className="h-1.5 w-1.5 rounded-full bg-brand shrink-0" />
            )}
            <p
              className={cn(
                "text-xs truncate",
                isUnread
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {msg.from}
            </p>
          </div>
          <p className="text-[0.78rem] font-medium text-foreground truncate leading-snug">
            {msg.subject}
          </p>
          <p className="text-[0.68rem] text-muted-foreground mt-0.5 truncate">
            {msg.preview}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className="text-[0.62rem] text-muted-foreground whitespace-nowrap">
            {formatReceivedAt(msg.receivedAt)}
          </span>
          <TagChip label={msg.tag} />
        </div>
      </div>
    </button>
  );
}

/* ── Detail pane ────────────────────────────────────────────────────── */

function DetailPane({
  msg,
  shipments,
  localStatuses,
  onStatusChange,
}: {
  msg: CommunicationMessage | null;
  shipments: OceanShipment[];
  localStatuses: Record<string, MessageStatus>;
  onStatusChange: (id: string, status: MessageStatus) => void;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [drawerShipment, setDrawerShipment] = useState<OceanShipment | null>(
    null,
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset reply state when message changes
  useEffect(() => {
    setReplyOpen(false);
    setReplyText("");
  }, [msg?.id]);

  // Focus textarea when reply opens
  useEffect(() => {
    if (replyOpen) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [replyOpen]);

  async function handleArchive() {
    if (!msg || archiving) return;
    setArchiving(true);
    try {
      await archiveMessage(msg.id);
      onStatusChange(msg.id, "archived");
      toast.success("Message archived", {
        description: `${msg.subject.slice(0, 60)} moved to archive.`,
      });
    } catch (err) {
      demoError(
        "Archive failed",
        err instanceof Error ? err.message : "Could not archive message.",
      );
    } finally {
      setArchiving(false);
    }
  }

  async function handleSendReply() {
    if (!msg || !replyText.trim() || sending) return;
    setSending(true);
    try {
      await sendReply({ messageId: msg.id, body: replyText.trim() });
      toast.success("Reply sent", {
        description: `Your reply to ${msg.from} has been sent.`,
      });
      setReplyText("");
      setReplyOpen(false);
      onStatusChange(msg.id, "read");
    } catch (err) {
      demoError(
        "Send failed",
        err instanceof Error ? err.message : "Could not send reply.",
      );
    } finally {
      setSending(false);
    }
  }

  if (!msg) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand/25 to-brand/5 border border-brand/20 shadow-[0_0_24px_-8px_var(--brand)]">
          <MailOpen className="h-6 w-6 text-brand" />
        </span>
        <div>
          <h2 className="font-display text-base font-semibold text-foreground">
            Select a message
          </h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-xs">
            Click any thread on the left to read it here alongside the linked
            shipment data and reply tools.
          </p>
        </div>
      </div>
    );
  }

  const linkedShipment = msg.shipmentId
    ? (shipments.find((s) => s.id === msg.shipmentId) ?? null)
    : null;

  return (
    <>
      {/* Header */}
      <div className="shrink-0 border-b border-border px-5 py-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-sm font-semibold text-foreground leading-snug pr-2">
            {msg.subject}
          </h2>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleArchive}
              disabled={archiving}
              title="Archive"
              className="inline-flex items-center gap-1 h-7 rounded-md border border-border bg-foreground/[0.03] px-2 text-[0.72rem] font-medium text-muted-foreground hover:border-foreground/25 hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand"
            >
              {archiving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Archive className="h-3 w-3" />
              )}
              Archive
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{msg.from}</span>{" "}
            &lt;{msg.email}&gt;
          </span>
          <span className="text-[0.62rem] text-muted-foreground">
            {new Date(msg.receivedAt).toLocaleString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <TagChip label={msg.tag} />
          {msg.shipmentId && (
            <ShipmentChip
              shipmentId={msg.shipmentId}
              onClick={() => setDrawerShipment(linkedShipment)}
            />
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto scroll-thin px-5 py-4">
        <pre className="whitespace-pre-wrap font-sans text-sm text-foreground leading-relaxed">
          {msg.body}
        </pre>
      </div>

      {/* Reply area */}
      <div className="shrink-0 border-t border-border px-5 py-3 space-y-2">
        <AnimatePresence initial={false}>
          {replyOpen && (
            <motion.div
              key="reply-compose"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="rounded-xl border border-border bg-foreground/[0.02] overflow-hidden mb-2">
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-[0.68rem] text-muted-foreground">
                    To:{" "}
                    <span className="text-foreground font-medium">
                      {msg.from} &lt;{msg.email}&gt;
                    </span>
                  </p>
                  <p className="text-[0.68rem] text-muted-foreground mt-0.5">
                    Re: {msg.subject}
                  </p>
                </div>
                <textarea
                  ref={textareaRef}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write your reply…"
                  rows={5}
                  className="w-full resize-none bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-2">
          {replyOpen ? (
            <>
              <button
                type="button"
                onClick={handleSendReply}
                disabled={sending || !replyText.trim()}
                className="inline-flex items-center gap-1.5 h-8 rounded-lg bg-brand text-white px-3.5 text-xs font-semibold hover:bg-brand-strong transition-colors shadow-[0_4px_12px_-6px_var(--brand)] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                {sending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
                {sending ? "Sending…" : "Send reply"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setReplyOpen(false);
                  setReplyText("");
                }}
                className="inline-flex items-center gap-1 h-8 rounded-lg border border-border bg-foreground/[0.03] px-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand"
              >
                <X className="h-3 w-3" />
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setReplyOpen(true)}
              className="inline-flex items-center gap-1.5 h-8 rounded-lg border border-brand/30 bg-brand/[0.06] px-3.5 text-xs font-semibold text-brand hover:bg-brand/[0.12] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand"
            >
              <Send className="h-3 w-3" />
              Reply
            </button>
          )}
        </div>
      </div>

      {/* Shipment detail drawer */}
      <ShipmentDetailDrawer
        shipment={drawerShipment}
        onClose={() => setDrawerShipment(null)}
      />
    </>
  );
}

/* ── Page ────────────────────────────────────────────────────────────── */

function InboxPage() {
  const { data, loading, error, reload } = useAsyncData(getCommunications, []);
  const { data: shipments } = useAsyncData(getOceanShipments, []);
  const { query } = useGlobalSearch();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** Optimistic local status overrides — avoids re-fetching after every action. */
  const [localStatuses, setLocalStatuses] = useState<
    Record<string, MessageStatus>
  >({});
  const [searchText, setSearchText] = useState("");

  const allMessages = useMemo(() => data ?? [], [data]);

  /** Merge global search bar query + local search box. */
  const filterQ = (query.trim() || searchText.trim()).toLowerCase();

  const visibleMessages = useMemo(() => {
    return allMessages.filter((m) => {
      const status = localStatuses[m.id] ?? m.status;
      if (status === "archived") return false;
      if (!filterQ) return true;
      return (
        m.from.toLowerCase().includes(filterQ) ||
        m.subject.toLowerCase().includes(filterQ) ||
        m.preview.toLowerCase().includes(filterQ) ||
        m.tag.toLowerCase().includes(filterQ) ||
        (m.shipmentId?.toLowerCase().includes(filterQ) ?? false)
      );
    });
  }, [allMessages, localStatuses, filterQ]);

  const unreadCount = visibleMessages.filter(
    (m) => (localStatuses[m.id] ?? m.status) === "unread",
  ).length;

  const selectedMsg =
    visibleMessages.find((m) => m.id === selectedId) ?? null;

  /** Select a message and mark it read (optimistic + async). */
  async function handleSelect(id: string) {
    setSelectedId(id);
    const msg = allMessages.find((m) => m.id === id);
    if (!msg) return;
    const status = localStatuses[id] ?? msg.status;
    if (status === "unread") {
      setLocalStatuses((prev) => ({ ...prev, [id]: "read" }));
      try {
        await markAsRead(id);
      } catch {
        // silently revert on failure
        setLocalStatuses((prev) => ({ ...prev, [id]: "unread" }));
      }
    }
  }

  function handleStatusChange(id: string, status: MessageStatus) {
    setLocalStatuses((prev) => ({ ...prev, [id]: status }));
    // Deselect if archived
    if (status === "archived" && selectedId === id) {
      setSelectedId(null);
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingState label="Loading inbox…" />
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
      <div className="h-full min-h-0 flex flex-col overflow-hidden">
        {/* ── Inbox header bar ── */}
        <div className="shrink-0 flex items-center justify-between gap-4 pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 border border-brand/20">
              <Inbox className="h-4 w-4 text-brand" />
            </span>
            <div>
              <h1 className="font-display text-base font-bold text-foreground leading-tight">
                Inbox
              </h1>
              <p className="text-[0.68rem] text-muted-foreground">
                {unreadCount > 0
                  ? `${unreadCount} unread · ${visibleMessages.length} total`
                  : `${visibleMessages.length} messages`}
              </p>
            </div>
            {unreadCount > 0 && (
              <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand text-[0.6rem] font-bold text-white px-1">
                {unreadCount}
              </span>
            )}
          </div>

          {/* Search */}
          <div className="relative hidden sm:block w-48 lg:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search messages…"
              className="w-full h-8 rounded-lg border border-border bg-foreground/[0.03] pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand/50 transition-colors"
            />
          </div>
        </div>

        {/* ── 2-pane layout ── */}
        <div className="flex-1 min-h-0 grid lg:grid-cols-5 gap-0 mt-3">
          {/* Left: thread list */}
          <div className="lg:col-span-2 card-premium rounded-2xl flex flex-col overflow-hidden border border-border/60">
            <div className="flex-1 min-h-0 overflow-y-auto scroll-thin divide-y divide-border">
              <AnimatePresence initial={false}>
                {visibleMessages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                  >
                    <ThreadRow
                      msg={msg}
                      isActive={msg.id === selectedId}
                      localStatus={localStatuses[msg.id]}
                      onClick={() => handleSelect(msg.id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>

              {visibleMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-2">
                  <Inbox className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-foreground">
                    All caught up
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {filterQ
                      ? "No messages match your search."
                      : "No messages in your inbox."}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right: detail pane */}
          <div className="hidden lg:flex lg:col-span-3 lg:ml-3 card-premium rounded-2xl flex-col overflow-hidden border border-border/60">
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedId ?? "__empty__"}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col h-full min-h-0"
              >
                <DetailPane
                  msg={selectedMsg}
                  shipments={shipments ?? []}
                  localStatuses={localStatuses}
                  onStatusChange={handleStatusChange}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
