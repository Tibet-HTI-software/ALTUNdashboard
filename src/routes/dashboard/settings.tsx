import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlarmClock,
  Database,
  Minus,
  Moon,
  Plus,
  Save,
  Sun,
  Plug,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useTheme } from "@/lib/dashboard/theme";
import { LANGUAGES, useLanguage } from "@/lib/dashboard/language";
import { useDemurrageThresholds } from "@/lib/dashboard/demurrage";
import { useT } from "@/lib/dashboard/i18n";
import { demoSuccess } from "@/lib/dashboard/demo";

export const Route = createFileRoute("/dashboard/settings")({
  head: () => ({ meta: [{ title: "Settings — Altun Logistics Operations" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const t = useT();
  const { theme, toggle } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { thresholds, setThresholds } = useDemurrageThresholds();

  return (
    <DashboardLayout>
      <div className="mb-5">
        <h1 className="font-display text-2xl sm:text-[1.75rem] font-bold text-foreground tracking-tight">
          {t("page.settings.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("page.settings.sub")}
        </p>
      </div>

      <div className="max-h-[calc(100vh-15rem)] overflow-y-auto scroll-thin pr-1 space-y-4">
        {/* Demurrage risk alerts */}
        <SettingsCard
          icon={AlarmClock}
          title={t("settings.demurrage")}
          description="When a container's remaining free time drops below these limits, the Demurrage Risk Board escalates its colour."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Stepper
              label={t("settings.critical")}
              tone="rose"
              value={thresholds.criticalH}
              suffix="h"
              onChange={(criticalH) =>
                setThresholds({ ...thresholds, criticalH })
              }
            />
            <Stepper
              label={t("settings.warning")}
              tone="amber"
              value={thresholds.warningH}
              suffix="h"
              onChange={(warningH) =>
                setThresholds({ ...thresholds, warningH })
              }
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Containers under{" "}
            <span className="font-semibold text-rose-600 dark:text-rose-400">
              {thresholds.criticalH}h
            </span>{" "}
            show red, under{" "}
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              {thresholds.warningH}h
            </span>{" "}
            show amber. Changes apply live.
          </p>
        </SettingsCard>

        {/* Appearance */}
        <SettingsCard
          icon={theme === "dark" ? Moon : Sun}
          title="Appearance"
          description="Theme and interface language. Synced with the sidebar."
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={toggle}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-foreground/[0.03] px-3.5 h-10 text-sm font-medium text-foreground hover:border-brand/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              {theme === "dark" ? (
                <Moon className="h-4 w-4 text-brand" />
              ) : (
                <Sun className="h-4 w-4 text-brand" />
              )}
              {theme === "dark" ? t("pref.darkMode") : t("pref.lightMode")}
            </button>

            <div
              role="group"
              aria-label={t("pref.language")}
              className="flex gap-1 rounded-lg bg-foreground/[0.04] p-1"
            >
              {LANGUAGES.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setLanguage(l.value)}
                  aria-pressed={l.value === language}
                  className={cn(
                    "h-8 min-w-[3rem] rounded-md px-2 text-xs font-bold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                    l.value === language
                      ? "bg-brand text-white"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {l.value}
                </button>
              ))}
            </div>
          </div>
        </SettingsCard>

        {/* Backend connection */}
        <SettingsCard
          icon={Database}
          title={t("settings.connection")}
          description="Connect a Supabase project to swap mock data for live data. The dashboard works fully on mock data until then."
        >
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 h-7 text-[0.7rem] font-semibold text-amber-700 dark:text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Not connected — running on mock data
          </div>
          <div className="space-y-3">
            <CredField
              label="Supabase project URL"
              placeholder="https://your-project.supabase.co"
            />
            <CredField
              label="Anon / publishable key"
              placeholder="paste the publishable anon key"
              mono
            />
          </div>
          <p className="mt-2.5 text-[0.7rem] text-muted-foreground">
            Never paste the service-role key here — only the publishable anon
            key belongs on the client.
          </p>
          <button
            type="button"
            onClick={() =>
              demoSuccess(
                "Prototype",
                "Backend connection is a placeholder in this preview.",
              )
            }
            className="mt-3 inline-flex items-center gap-1.5 h-9 rounded-lg border border-border bg-foreground/[0.03] px-3.5 text-sm font-medium text-foreground hover:border-brand/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <Plug className="h-3.5 w-3.5" /> Test connection
          </button>
        </SettingsCard>

        <div className="flex justify-end pb-2">
          <button
            type="button"
            onClick={() =>
              demoSuccess("Settings saved", "Your preferences are stored.")
            }
            className="inline-flex items-center gap-1.5 h-10 rounded-xl bg-brand text-white px-4 text-sm font-semibold hover:bg-brand-strong transition-colors shadow-[0_6px_18px_-8px_var(--brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Save className="h-4 w-4" /> {t("settings.save")}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}

function SettingsCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card-premium rounded-2xl p-5">
      <header className="flex items-start gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/12 border border-brand/20 shrink-0">
          <Icon className="h-4 w-4 text-brand" />
        </span>
        <div>
          <h2 className="font-display font-semibold text-foreground text-base tracking-tight">
            {title}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
      </header>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Stepper({
  label,
  value,
  suffix,
  tone,
  onChange,
}: {
  label: string;
  value: number;
  suffix: string;
  tone: "rose" | "amber";
  onChange: (v: number) => void;
}) {
  const dot = tone === "rose" ? "bg-rose-500" : "bg-amber-500";
  return (
    <div className="rounded-xl border border-border bg-foreground/[0.03] p-3.5">
      <p className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        <span className={cn("h-2 w-2 rounded-full", dot)} aria-hidden />
        {label}
      </p>
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(value - 6)}
          aria-label={`Decrease ${label}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-foreground hover:border-brand/40 hover:text-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="font-display text-2xl font-bold text-foreground tabular-nums min-w-[3.5rem] text-center">
          {value}
          <span className="text-sm text-muted-foreground">{suffix}</span>
        </span>
        <button
          type="button"
          onClick={() => onChange(value + 6)}
          aria-label={`Increase ${label}`}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-foreground hover:border-brand/40 hover:text-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function CredField({
  label,
  placeholder,
  mono,
}: {
  label: string;
  placeholder: string;
  mono?: boolean;
}) {
  const [value, setValue] = useState("");
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className={cn(
          "mt-1 w-full h-10 rounded-lg border border-border bg-foreground/[0.03] px-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45 focus-visible:border-brand/40 transition-colors",
          mono && "font-mono text-xs",
        )}
      />
    </label>
  );
}
