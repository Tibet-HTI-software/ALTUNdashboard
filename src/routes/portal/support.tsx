/**
 * /portal/support — Client support contact page.
 */

import { createFileRoute } from "@tanstack/react-router";
import { Headset, Mail, MessageSquare, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { PortalLayout } from "@/components/portal/PortalLayout";

export const Route = createFileRoute("/portal/support")({
  head: () => ({
    meta: [{ title: "Support — Altun Logistics Portal" }],
  }),
  component: PortalSupportPage,
});

const CONTACTS = [
  {
    icon: Phone,
    label: "Phone",
    value: "+31 (0)10 123 4567",
    sub: "Mon–Fri · 08:00–18:00 CET",
    href: "tel:+31101234567",
    color: "brand",
  },
  {
    icon: Mail,
    label: "Email",
    value: "support@altun-logistics.com",
    sub: "Response within 4 business hours",
    href: "mailto:support@altun-logistics.com",
    color: "violet",
  },
  {
    icon: MessageSquare,
    label: "Live Chat",
    value: "Coming soon",
    sub: "Available in next portal update",
    href: null,
    color: "emerald",
  },
] as const;

function PortalSupportPage() {
  return (
    <PortalLayout>
      <div className="flex flex-col gap-6 max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 border border-brand/20 shrink-0">
            <Headset className="h-4.5 w-4.5 text-brand" />
          </span>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Support</h1>
            <p className="text-[0.72rem] text-muted-foreground">
              We're here to help with your shipments and invoices
            </p>
          </div>
        </div>

        {/* Contact options */}
        <div className="flex flex-col gap-3">
          {CONTACTS.map(({ icon: Icon, label, value, sub, href, color }) => {
            const colorCls = {
              brand: "border-brand/20 bg-brand/[0.05]",
              violet: "border-violet-500/20 bg-violet-500/[0.05]",
              emerald: "border-emerald-500/20 bg-emerald-500/[0.05]",
            }[color];
            const iconCls = {
              brand: "border-brand/20 bg-brand/10 text-brand",
              violet: "border-violet-500/20 bg-violet-500/10 text-violet-500",
              emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-500",
            }[color];

            const inner = (
              <div className={cn("card-premium rounded-2xl border p-5 flex items-center gap-4 transition-colors", colorCls, href && "hover:border-brand/30")}>
                <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl border shrink-0", iconCls)}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60">{label}</p>
                  <p className="text-[0.88rem] font-semibold text-foreground">{value}</p>
                  <p className="text-[0.65rem] text-muted-foreground">{sub}</p>
                </div>
              </div>
            );

            return href ? (
              <a key={label} href={href} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-2xl block">
                {inner}
              </a>
            ) : (
              <div key={label}>{inner}</div>
            );
          })}
        </div>

        {/* SLA note */}
        <div className="rounded-xl border border-border/60 bg-foreground/[0.015] px-4 py-3">
          <p className="text-[0.72rem] text-muted-foreground leading-relaxed">
            When contacting support about a specific shipment, please have your
            booking reference (e.g.{" "}
            <span className="font-mono font-semibold text-foreground">AL-2026-1041</span>
            ) ready to speed up handling.
          </p>
        </div>
      </div>
    </PortalLayout>
  );
}
