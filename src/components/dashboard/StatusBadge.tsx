import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StatusTone =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral"
  | "brand";

const toneClass: Record<StatusTone, string> = {
  success: "bg-emerald-50/80 text-emerald-700 border-emerald-100",
  warning: "bg-amber-50/80 text-amber-700 border-amber-100",
  danger: "bg-rose-50/80 text-rose-700 border-rose-100",
  info: "bg-sky-50/80 text-sky-700 border-sky-100",
  neutral: "bg-slate-100/70 text-slate-600 border-slate-200/80",
  brand: "bg-brand-soft text-brand border-brand/15",
};

interface Props {
  tone?: StatusTone;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}

export function StatusBadge({
  tone = "neutral",
  children,
  className,
  dot,
}: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.6875rem] font-semibold whitespace-nowrap",
        toneClass[tone],
        className,
      )}
    >
      {dot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full", {
            "bg-emerald-500": tone === "success",
            "bg-amber-500": tone === "warning",
            "bg-rose-500": tone === "danger",
            "bg-sky-500": tone === "info",
            "bg-slate-400": tone === "neutral",
            "bg-brand": tone === "brand",
          })}
          aria-hidden
        />
      )}
      {children}
    </span>
  );
}

/* ── domain-specific helpers ───────────────────────────────────────── */

import type {
  ShipmentStatus,
  Priority,
  QuoteStatus,
  CustomerStatus,
  DocumentStatus,
} from "@/lib/dashboard/types";

export function shipmentStatusTone(s: ShipmentStatus): StatusTone {
  switch (s) {
    case "Booked":
      return "info";
    case "In Transit":
      return "brand";
    case "Customs Clearance":
      return "warning";
    case "At Warehouse":
      return "info";
    case "Delivered":
      return "success";
    case "Delayed":
      return "danger";
  }
}

export function priorityTone(p: Priority): StatusTone {
  switch (p) {
    case "Urgent":
      return "danger";
    case "High":
      return "warning";
    case "Normal":
      return "neutral";
    case "Low":
      return "neutral";
  }
}

export function quoteStatusTone(s: QuoteStatus): StatusTone {
  switch (s) {
    case "New":
      return "brand";
    case "Reviewing":
      return "warning";
    case "Sent":
      return "info";
    case "Approved":
      return "success";
    case "Rejected":
      return "danger";
  }
}

export function customerStatusTone(s: CustomerStatus): StatusTone {
  switch (s) {
    case "Active":
      return "success";
    case "Onboarding":
      return "info";
    case "Inactive":
      return "neutral";
    case "On Hold":
      return "warning";
  }
}

export function documentStatusTone(s: DocumentStatus): StatusTone {
  switch (s) {
    case "Approved":
      return "success";
    case "In Review":
      return "warning";
    case "Pending":
      return "neutral";
    case "Rejected":
      return "danger";
  }
}
