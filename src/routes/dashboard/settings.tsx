import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  Bell,
  Shield,
  Sliders,
  Plug,
  Save,
  Moon,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { Switch } from "@/components/ui/switch";
import { updateDashboardSettings } from "@/lib/dashboard/api";
import { demoSuccess, demoError } from "@/lib/dashboard/demo";
import { useTheme } from "@/lib/dashboard/theme";
import { LANGUAGES, useLanguage } from "@/lib/dashboard/language";

export const Route = createFileRoute("/dashboard/settings")({
  head: () => ({ meta: [{ title: "Settings — Altun Logistics Operations" }] }),
  component: SettingsPage,
});

function SettingsCard({
  title,
  icon: Icon,
  className,
  children,
}: {
  title: string;
  icon: typeof Building2;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`card-premium rounded-2xl p-5 ${className ?? ""}`}>
      <header className="flex items-center gap-2.5 mb-4">
        <div className="h-9 w-9 rounded-md bg-brand-soft text-brand flex items-center justify-center">
          <Icon className="h-4 w-4" />
        </div>
        <h2 className="font-display font-bold text-navy-deep text-base">
          {title}
        </h2>
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({
  id,
  label,
  defaultValue,
  hint,
}: {
  id: string;
  label: string;
  defaultValue: string;
  hint?: string;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="text-xs font-semibold text-navy-deep">{label}</span>
      <input
        id={id}
        type="text"
        defaultValue={defaultValue}
        className="mt-1 w-full h-9 rounded-md border border-border bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand transition-colors"
      />
      {hint && (
        <span className="mt-1 block text-[0.7rem] text-muted-foreground">
          {hint}
        </span>
      )}
    </label>
  );
}

function ToggleRow({
  id,
  label,
  description,
  defaultOn,
}: {
  id: string;
  label: string;
  description: string;
  defaultOn?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <div className="text-sm font-semibold text-navy-deep">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </label>
      <Switch id={id} defaultChecked={defaultOn} className="mt-1" />
    </div>
  );
}

/** Controlled toggle row — used by Dark Mode where state lives outside the form. */
function ControlledToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <label htmlFor={id} className="min-w-0 cursor-pointer">
        <div className="text-sm font-semibold text-navy-deep">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </label>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        className="mt-1"
      />
    </div>
  );
}

function SettingsPage() {
  const [saving, setSaving] = useState(false);
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();

  /**
   * Calls the mock settings API so the save path is wired up the same way a
   * real backend save would be. Form is currently uncontrolled — when a real
   * backend lands, lift inputs into state and pass the diff into
   * updateDashboardSettings().
   */
  async function handleSave() {
    setSaving(true);
    try {
      await updateDashboardSettings({});
      demoSuccess(
        "Settings saved",
        "Persisted in mock store — resets on reload.",
      );
    } catch (err) {
      demoError(
        "Could not save settings",
        err instanceof Error ? err.message : "Failed to save settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout>
      <DashboardPageHeader
        title="Settings"
        description="Internal preferences for the dashboard, notifications, and integrations."
        crumbs={[
          { label: "Dashboard", to: "/dashboard" },
          { label: "Settings" },
        ]}
        actions={
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 h-9 rounded-md bg-brand text-white px-3.5 text-sm font-medium hover:bg-brand-strong transition-colors disabled:opacity-60 disabled:pointer-events-none"
          >
            <Save className="h-3.5 w-3.5" />{" "}
            {saving ? "Saving…" : "Save changes"}
          </button>
        }
      />

      {/*
        12-col grid lets the 5 cards fit symmetrically:
        Row 1 (≥lg): Company Profile (6) · Notifications (6)
        Row 2 (≥lg): Roles (4) · Dashboard Prefs (4) · Integrations (4)
        Single col below lg.
      */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* Appearance pinned to top — first thing users see in Settings. */}
        <SettingsCard title="Appearance" icon={Moon} className="lg:col-span-12">
          <ControlledToggleRow
            id="pref-dark-mode"
            label="Dark Mode"
            description="Use a darker interface for low-light environments."
            checked={theme === "dark"}
            onChange={(next) => setTheme(next ? "dark" : "light")}
          />

          {/*
            Language preference — UI-only. Persisted via useLanguage()
            (localStorage). Real translations are deferred to the end of
            the project alongside the public-website i18n pass.
          */}
          <div className="pt-3 border-t border-border">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-navy-deep">
                  Language
                </div>
                <div className="text-xs text-muted-foreground">
                  Language preference is saved. Full interface translations will
                  be applied in a later release.
                </div>
              </div>
              <div
                role="radiogroup"
                aria-label="Language preference"
                className="inline-flex rounded-md border border-input bg-secondary/30 p-0.5 shrink-0"
              >
                {LANGUAGES.map((opt) => {
                  const active = language === opt.value;
                  return (
                    <label
                      key={opt.value}
                      aria-checked={active}
                      className={`relative cursor-pointer select-none px-3 h-8 inline-flex items-center justify-center rounded-[0.3rem] text-xs font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand has-[:focus-visible]:ring-offset-1 has-[:focus-visible]:ring-offset-card ${
                        active
                          ? "bg-brand text-white shadow-[var(--shadow-card)]"
                          : "text-muted-foreground hover:text-navy-deep"
                      }`}
                    >
                      <input
                        type="radio"
                        name="pref-language"
                        value={opt.value}
                        checked={active}
                        onChange={() => setLanguage(opt.value)}
                        className="sr-only"
                      />
                      {opt.label}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard
          title="Company Profile"
          icon={Building2}
          className="lg:col-span-6"
        >
          <Field
            id="set-company"
            label="Company name"
            defaultValue="Altun Logistics NV"
          />
          <Field
            id="set-address"
            label="Address"
            defaultValue="Paul Smekensplein 4 bus 301, 2000 Antwerpen, Belgium"
          />
          <Field
            id="set-contact"
            label="Operations contact"
            defaultValue="info@altunlogistics.be"
          />
          <Field
            id="set-vat"
            label="VAT / Reg. number"
            defaultValue=""
            hint="Add when client confirms registration data."
          />
        </SettingsCard>

        <SettingsCard
          title="Operational Notifications"
          icon={Bell}
          className="lg:col-span-6"
        >
          <ToggleRow
            id="notif-digest"
            label="Daily ops digest"
            description="Morning summary at 08:00 CET — delayed shipments, urgent customs, capacity."
            defaultOn
          />
          <ToggleRow
            id="notif-customs-sla"
            label="Customs SLA alerts"
            description="Notify file owner when a customs stage slips past its SLA window."
            defaultOn
          />
          <ToggleRow
            id="notif-eta-shift"
            label="Shipment ETA shift"
            description="Alert when carrier ETA moves by more than 24 hours."
            defaultOn
          />
          <ToggleRow
            id="notif-quotes"
            label="New quote requests"
            description="Push to Sales channel as soon as a request lands."
            defaultOn
          />
          <ToggleRow
            id="notif-quote-approved"
            label="Quote approval notifications"
            description="Notify Freight Forwarding when a customer approves a quote."
            defaultOn
          />
          <ToggleRow
            id="notif-warehouse"
            label="Warehouse capacity warnings"
            description="Alert Operations when any zone exceeds 90% occupancy."
          />
        </SettingsCard>

        <SettingsCard
          title="Roles & Permissions"
          icon={Shield}
          className="lg:col-span-4"
        >
          <p className="text-xs text-muted-foreground">
            Role-based access placeholders. Wire to real auth before granting
            non-admin access.
          </p>
          <ul className="text-sm space-y-2">
            {[
              { role: "Admin", scope: "Full access" },
              { role: "Operations", scope: "Shipments + warehouse" },
              { role: "Customs", scope: "Customs + documents" },
              { role: "Sales", scope: "Quotes + customers" },
            ].map((r) => (
              <li
                key={r.role}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2"
              >
                <span className="font-semibold text-navy-deep">{r.role}</span>
                <span className="text-xs text-muted-foreground">{r.scope}</span>
              </li>
            ))}
          </ul>
        </SettingsCard>

        <SettingsCard
          title="Document Workflow"
          icon={Sliders}
          className="lg:col-span-4"
        >
          <ToggleRow
            id="pref-doc-required"
            label="Block submission on missing docs"
            description="Prevent customs file submission until all required documents are attached."
            defaultOn
          />
          <ToggleRow
            id="pref-doc-autocheck"
            label="Auto document completeness check"
            description="Run automation check whenever a document is uploaded."
            defaultOn
          />
          <ToggleRow
            id="pref-cross"
            label="Show cross-trade lane"
            description="Pin the cross-trade route card to the top of the lane list."
            defaultOn
          />
          <ToggleRow
            id="pref-hide-delivered"
            label="Hide delivered shipments"
            description="Filter delivered records out of the default shipments view."
          />
        </SettingsCard>

        <SettingsCard
          title="Integrations"
          icon={Plug}
          className="lg:col-span-4"
        >
          <ul className="text-sm space-y-2">
            {[
              {
                name: "Carrier rate APIs (sea/road/rail)",
                state: "Not connected",
              },
              {
                name: "Customs filing system (PLDA / NCTS)",
                state: "Not connected",
              },
              {
                name: "Track & trace — vessel ETA feed",
                state: "Not connected",
              },
              { name: "Email & calendar gateway", state: "Not connected" },
              { name: "Accounting / invoicing", state: "Not connected" },
            ].map((i) => (
              <li
                key={i.name}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2"
              >
                <span className="font-semibold text-navy-deep">{i.name}</span>
                <span className="text-xs text-muted-foreground">{i.state}</span>
              </li>
            ))}
          </ul>
        </SettingsCard>
      </div>

      {/* Bottom save bar — duplicates the header action for long-scroll forms */}
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 h-10 rounded-md bg-brand text-white px-5 text-sm font-medium hover:bg-brand-strong transition-colors disabled:opacity-60 disabled:pointer-events-none"
        >
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </DashboardLayout>
  );
}
