import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Copy,
  FileWarning,
  Mail,
  Sparkles,
  Stamp,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CustomsBlockReason, OceanShipment } from "@/lib/dashboard/api";
import { useT } from "@/lib/dashboard/i18n";
import { demoSuccess } from "@/lib/dashboard/demo";

/** Document a given customs block is waiting on. */
const REQUIRED_DOC: Record<CustomsBlockReason, string> = {
  "Missing Commercial Invoice": "Commercial Invoice (signed, with HS codes)",
  "Certificate of Origin Hold": "Certificate of Origin (chamber-stamped)",
  "Packing List Discrepancy": "Corrected Packing List matching the B/L",
  "Incomplete Bill of Lading": "Complete, released Bill of Lading",
  "Pending Duty Payment": "Proof of import-duty payment",
  "Phytosanitary Certificate Missing": "Phytosanitary Certificate",
};

/** Composes the AI chase-email to the exporter for a blocked shipment. */
function buildExporterEmail(s: OceanShipment): string {
  const doc = s.customsBlock ? REQUIRED_DOC[s.customsBlock] : "the document";
  return [
    `Subject: Action required — ${doc} for container ${s.containerNumber}`,
    "",
    `Dear ${s.traderContact},`,
    "",
    `Container ${s.containerNumber} (booking ${s.id}, B/L ${s.blNumber}) is currently held by customs at ${s.terminal}.`,
    "",
    `Reason: ${s.customsBlock}.`,
    `To release the shipment we need: ${doc}.`,
    "",
    `The container was carried on ${s.vessel} (voyage ${s.voyage}) from ${s.pol} to ${s.pod}. Terminal free time is limited — sending the document today prevents demurrage charges of EUR ${s.demurrageRatePerDay}/day.`,
    "",
    "Please reply to this email with the document attached and we will lodge the declaration immediately.",
    "",
    "Kind regards,",
    "Altun Logistics — Customs Department",
  ].join("\n");
}

/**
 * Customs Declarant board — interactive grid of blocked declarations.
 * Clicking a card opens a Framer Motion modal detailing the missing
 * document and generating an AI chase-email to the exporter.
 */
export function CustomsActionCenter({
  shipments,
}: {
  shipments: OceanShipment[];
}) {
  const blocked = shipments.filter((s) => s.customsBlock !== null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = blocked.find((s) => s.id === selectedId) ?? null;

  return (
    <div>
      {blocked.length === 0 ? (
        <div className="card-premium rounded-xl p-8 text-center">
          <Check className="mx-auto h-8 w-8 text-emerald-500" />
          <p className="mt-2 text-sm font-medium text-foreground">
            No customs holds — all declarations are clear.
          </p>
        </div>
      ) : (
        <motion.ul layout className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {blocked.map((s) => (
            <motion.li key={s.id} layout layoutId={`cust-${s.id}`}>
              <button
                type="button"
                onClick={() => setSelectedId(s.id)}
                className={cn(
                  "w-full text-left rounded-xl border border-amber-500/30 bg-amber-500/[0.03] p-4 card-premium",
                  "hover:border-amber-500/55 hover:-translate-y-0.5 transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                )}
              >
                <div className="flex items-center gap-2">
                  <FileWarning className="h-4 w-4 text-amber-500 shrink-0" />
                  <span className="font-mono text-sm font-semibold text-foreground">
                    {s.containerNumber}
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
                  {s.customsBlock}
                </p>
                <p className="mt-1 text-xs text-muted-foreground truncate">
                  {s.trader} · {s.pol} → {s.pod}
                </p>
                <p className="mt-3 inline-flex items-center gap-1 text-[0.7rem] font-semibold text-brand">
                  <Stamp className="h-3 w-3" />
                  Open declaration
                </p>
              </button>
            </motion.li>
          ))}
        </motion.ul>
      )}

      <AnimatePresence>
        {selected && (
          <CustomsModal
            shipment={selected}
            onClose={() => setSelectedId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CustomsModal({
  shipment,
  onClose,
}: {
  shipment: OceanShipment;
  onClose: () => void;
}) {
  const t = useT();
  const [draft, setDraft] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const doc = shipment.customsBlock
    ? REQUIRED_DOC[shipment.customsBlock]
    : "the document";

  function generate() {
    setDraft(buildExporterEmail(shipment));
    demoSuccess(
      "AI email generated",
      `Chase-email to ${shipment.traderContact} is ready to review.`,
    );
  }

  async function copyDraft() {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draft);
      demoSuccess("Copied", "Email draft copied to clipboard.");
    } catch {
      demoSuccess("Draft ready", "Select the text to copy it.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Customs declaration ${shipment.containerNumber}`}
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-2xl glass-panel border shadow-[var(--shadow-elevated)]"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="flex items-center gap-2 font-mono text-sm font-semibold text-foreground">
              <FileWarning className="h-4 w-4 text-amber-500" />
              {shipment.containerNumber}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {shipment.id} · B/L {shipment.blNumber}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            aria-label="Close"
            className="p-1.5 rounded-md hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3.5">
            <p className="text-[0.62rem] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              Customs block
            </p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">
              {shipment.customsBlock}
            </p>
            <p className="mt-2 text-[0.62rem] font-semibold uppercase tracking-wider text-muted-foreground">
              Document required
            </p>
            <p className="mt-0.5 text-sm text-foreground">{doc}</p>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
            <Detail label="Trader" value={shipment.trader} />
            <Detail label="Contact" value={shipment.traderContact} />
            <Detail label="Route" value={`${shipment.pol} → ${shipment.pod}`} />
            <Detail label="Terminal" value={shipment.terminal} />
            <Detail
              label="Vessel"
              value={`${shipment.vessel} · ${shipment.voyage}`}
            />
            <Detail
              label="Demurrage rate"
              value={`EUR ${shipment.demurrageRatePerDay}/day`}
            />
          </dl>

          {/* Generate AI email */}
          {!draft ? (
            <button
              type="button"
              onClick={generate}
              className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-gradient-to-br from-brand to-brand-strong text-white text-sm font-semibold shadow-[0_8px_22px_-10px_var(--brand)] hover:-translate-y-0.5 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Sparkles className="h-4 w-4" />
              {t("common.generateEmail")}
            </button>
          ) : (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Mail className="h-3.5 w-3.5 text-brand" />
                    AI-generated email to exporter
                  </p>
                  <button
                    type="button"
                    onClick={copyDraft}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[0.7rem] font-medium text-muted-foreground hover:text-foreground hover:border-brand/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    <Copy className="h-3 w-3" /> Copy
                  </button>
                </div>
                <pre className="whitespace-pre-wrap rounded-xl border border-border bg-foreground/[0.03] p-3.5 text-xs leading-relaxed text-foreground font-sans">
                  {draft}
                </pre>
                <p className="text-[0.65rem] text-muted-foreground">
                  Prototype — no email is actually sent.
                </p>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.62rem] uppercase tracking-wider text-muted-foreground/80">
        {label}
      </dt>
      <dd className="text-foreground font-medium truncate">{value}</dd>
    </div>
  );
}
