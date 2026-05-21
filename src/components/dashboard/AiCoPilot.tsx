/**
 * Altun Logistics AI Co-Pilot — floating chat widget.
 *
 * FAB: fixed bottom-left (symmetric with AiDocDropzone FAB on bottom-right).
 * Panel: slides up from FAB, ~360 px wide, max 560 px tall.
 *
 * Context-aware: reads TanStack Router pathname and injects a relevant
 * greeting + suggested prompts on first open and on significant navigation.
 */

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
} from "react";
import { useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  X,
  Send,
  Sparkles,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  sendChatMessage,
  isAiDemoMode,
  type ChatMessage,
} from "@/lib/dashboard/ai.service";

/* ── Context parsing ─────────────────────────────────────────────────────── */

interface PageContext {
  label: string;
  greeting: string;
  suggestedPrompts: string[];
}

function parsePageContext(pathname: string): PageContext {
  // Shipment detail — /dashboard/shipments/AL-XXXX
  const shipmentMatch = pathname.match(/\/dashboard\/shipments\/([\w-]+)/);
  if (shipmentMatch) {
    const id = shipmentMatch[1];
    return {
      label: `Shipment: ${id}`,
      greeting: `I can see you're viewing shipment **${id}**. What do you need help with?`,
      suggestedPrompts: [
        "Summarise this shipment's status",
        "Is there a demurrage risk?",
        "Draft a client ETA update email",
        "What documents are needed?",
      ],
    };
  }

  if (pathname.includes("/dashboard/customs")) {
    return {
      label: "Customs Action Center",
      greeting:
        "You're in the Customs Action Center. I can help resolve holds and draft document requests.",
      suggestedPrompts: [
        "How do I resolve a customs hold?",
        "Draft a document request to the shipper",
        "Explain EUR.1 certificate requirements",
        "What's the Douane SLA?",
      ],
    };
  }

  if (pathname.includes("/dashboard/shipments")) {
    return {
      label: "Shipments",
      greeting:
        "You're viewing the shipment list. Ask me about any shipment or exception.",
      suggestedPrompts: [
        "Which shipments are at demurrage risk?",
        "Show me customs holds",
        "Draft a delay notification email",
        "What needs attention today?",
      ],
    };
  }

  if (pathname.includes("/dashboard/fleet-tracking")) {
    return {
      label: "Fleet Tracking",
      greeting:
        "You're on the fleet tracking globe. I can help with vessel ETAs and routing questions.",
      suggestedPrompts: [
        "What's the typical Turkey–Rotterdam transit time?",
        "Explain Suez Canal routing",
        "Which vessels are delayed?",
        "Draft a vessel ETA update",
      ],
    };
  }

  if (pathname.includes("/dashboard/automation")) {
    return {
      label: "Automation Cockpit",
      greeting:
        "You're in the Automation Cockpit. I can help optimise workflows and explain rule logic.",
      suggestedPrompts: [
        "What automation rules should I set up?",
        "Explain demurrage escalation triggers",
        "How do I automate customs notifications?",
        "Suggest SLA thresholds for this lane",
      ],
    };
  }

  // Default — overview / other
  return {
    label: "Dashboard",
    greeting:
      "Hi — I'm your **Altun Logistics Co-Pilot**. How can I help you today?",
    suggestedPrompts: [
      "What needs my attention today?",
      "Explain demurrage & detention",
      "Draft a client delay email",
      "Analyse a customs hold",
    ],
  };
}

/** True when two pathnames represent meaningfully different pages. */
function significantNavigation(a: string, b: string): boolean {
  if (a === b) return false;
  // Same top-level section with different detail — not significant (e.g. sorting)
  const section = (p: string) => p.split("/").slice(0, 4).join("/");
  return section(a) !== section(b);
}

/* ── Markdown-lite renderer ──────────────────────────────────────────────── */

/**
 * Splits text on **bold** markers and renders inline bold spans.
 * Preserves newlines via `white-space: pre-wrap` on the parent.
 */
function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

/* ── Typing indicator ────────────────────────────────────────────────────── */

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/10 border border-violet-500/20 shrink-0">
        <Bot className="h-3.5 w-3.5 text-violet-500" />
      </span>
      <div className="rounded-2xl rounded-bl-sm border border-border bg-foreground/[0.04] px-3.5 py-2.5">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
              animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.18,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Message bubble ──────────────────────────────────────────────────────── */

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className={cn("flex items-end gap-2", isUser && "flex-row-reverse")}
    >
      {!isUser && (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/10 border border-violet-500/20 shrink-0">
          <Bot className="h-3.5 w-3.5 text-violet-500" />
        </span>
      )}
      <div
        className={cn(
          "max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[0.78rem] leading-relaxed",
          "whitespace-pre-wrap break-words",
          isUser
            ? "rounded-br-sm bg-brand text-white"
            : "rounded-bl-sm border border-border bg-foreground/[0.04] text-foreground",
        )}
      >
        <InlineMarkdown text={msg.content} />
      </div>
    </motion.div>
  );
}

/* ── Suggested prompts ───────────────────────────────────────────────────── */

function SuggestedPrompts({
  prompts,
  onSelect,
}: {
  prompts: string[];
  onSelect: (p: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 px-4 pb-2">
      {prompts.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onSelect(p)}
          className={cn(
            "rounded-full border border-violet-500/25 bg-violet-500/[0.06] px-3 py-1",
            "text-[0.68rem] font-medium text-violet-700 dark:text-violet-300",
            "hover:border-violet-500/50 hover:bg-violet-500/[0.12]",
            "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
          )}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

/* ── Chat panel ──────────────────────────────────────────────────────────── */

interface ChatPanelProps {
  onClose: () => void;
  pageCtx: PageContext;
}

function ChatPanel({ onClose, pageCtx }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const demoMode = isAiDemoMode();

  // Show greeting as first assistant message
  useEffect(() => {
    setMessages([{ role: "assistant", content: pageCtx.greeting }]);
  }, [pageCtx.greeting]);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const showSuggestions =
    messages.length <= 1 && !loading;

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = messages.filter((m) => m.role !== "system");
      const reply = await sendChatMessage(trimmed, {
        pageContext: pageCtx.label,
        history,
      });
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "Sorry — I couldn't reach the AI service. Please try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  function reset() {
    setMessages([{ role: "assistant", content: pageCtx.greeting }]);
    setInput("");
    inputRef.current?.focus();
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 16 }}
      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      style={{ transformOrigin: "bottom right" }}
      className={cn(
        "fixed bottom-20 right-4 sm:right-6 z-40 sm:right-6",
        "w-[calc(100vw-2rem)] sm:w-[360px]",
        "max-h-[min(560px,calc(100vh-7rem))]",
        "flex flex-col overflow-hidden",
        "rounded-2xl border border-border",
        "bg-background/95 backdrop-blur-xl shadow-2xl",
        "glass-panel",
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-3 shrink-0">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/15 border border-violet-500/25 shrink-0">
          <Bot className="h-3.5 w-3.5 text-violet-500" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[0.8rem] font-bold text-foreground leading-none">
            AI Co-Pilot
          </p>
          <p className="mt-0.5 text-[0.65rem] text-muted-foreground truncate">
            {pageCtx.label}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {demoMode && (
            <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/25 bg-violet-500/[0.07] px-2 py-0.5 text-[0.6rem] font-semibold text-violet-600 dark:text-violet-400">
              <Sparkles className="h-2.5 w-2.5" />
              Demo
            </span>
          )}
          <button
            type="button"
            onClick={reset}
            title="Clear conversation"
            className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto scroll-thin px-4 py-3 space-y-3">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}
          {loading && (
            <motion.div
              key="typing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <TypingIndicator />
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Suggested prompts */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            key="suggestions"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border overflow-hidden shrink-0"
          >
            <p className="px-4 pt-2.5 pb-1 text-[0.62rem] font-semibold uppercase tracking-wider text-muted-foreground">
              Suggested
            </p>
            <SuggestedPrompts
              prompts={pageCtx.suggestedPrompts}
              onSelect={(p) => send(p)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="shrink-0 border-t border-border px-3 py-2.5">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about logistics…"
            disabled={loading}
            className={cn(
              "flex-1 min-h-0 resize-none bg-transparent outline-none",
              "text-[0.78rem] text-foreground placeholder:text-muted-foreground/60",
              "max-h-[6rem] overflow-y-auto scroll-thin",
              "py-1.5 leading-relaxed",
              "disabled:opacity-50",
            )}
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
          <button
            type="button"
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all",
              "bg-violet-500 text-white",
              "hover:bg-violet-600 active:scale-95",
              "disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500",
            )}
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="mt-1.5 text-[0.58rem] text-muted-foreground/50 text-center">
          Enter to send · Shift+Enter for newline
        </p>
      </div>
    </motion.div>
  );
}

/* ── FAB ─────────────────────────────────────────────────────────────────── */

interface FabProps {
  open: boolean;
  onClick: () => void;
  hasUnread: boolean;
}

function AiCoPilotFab({ open, onClick, hasUnread }: FabProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.5, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 22, delay: 0.4 }}
      whileHover={{ scale: 1.1, y: -2 }}
      whileTap={{ scale: 0.88 }}
      aria-label={open ? "Close AI Co-Pilot" : "Open AI Co-Pilot"}
      className={cn(
        "fixed bottom-6 right-6 z-40",
        "h-12 w-12 rounded-2xl shadow-lg",
        "flex items-center justify-center",
        "bg-gradient-to-br from-violet-500 to-violet-700",
        "text-white",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2",
        "transition-shadow hover:shadow-violet-500/40 hover:shadow-xl",
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {open ? (
          <motion.span
            key="close"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <ChevronDown className="h-5 w-5" />
          </motion.span>
        ) : (
          <motion.span
            key="bot"
            initial={{ rotate: 90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -90, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <Bot className="h-5 w-5" />
          </motion.span>
        )}
      </AnimatePresence>

      {/* Unread indicator dot */}
      {hasUnread && !open && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-rose-500 border-2 border-background"
        />
      )}
    </motion.button>
  );
}

/* ── Root export ─────────────────────────────────────────────────────────── */

export function AiCoPilot() {
  const [open, setOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const prevPathnameRef = useRef(pathname);
  const pageCtx = parsePageContext(pathname);

  // When user navigates to a significantly different page while panel is open,
  // update page context (the panel re-derives from `pageCtx` reactively via
  // key trick below).  If panel is closed, light up the unread dot.
  const [ctxKey, setCtxKey] = useState(pathname);

  useEffect(() => {
    const prev = prevPathnameRef.current;
    prevPathnameRef.current = pathname;

    if (!significantNavigation(prev, pathname)) return;

    if (open) {
      // Remount panel so greeting + suggestions refresh
      setCtxKey(pathname);
    } else {
      setHasUnread(true);
    }
  }, [pathname, open]);

  const handleOpen = useCallback(() => {
    setOpen(true);
    setHasUnread(false);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <>
      <AiCoPilotFab open={open} onClick={open ? handleClose : handleOpen} hasUnread={hasUnread} />

      <AnimatePresence>
        {open && (
          <ChatPanel
            key={ctxKey}
            pageCtx={pageCtx}
            onClose={handleClose}
          />
        )}
      </AnimatePresence>
    </>
  );
}
