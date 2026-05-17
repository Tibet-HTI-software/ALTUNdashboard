import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlarmClock,
  Database,
  Moon,
  Plug,
  Save,
  SlidersHorizontal,
  Sun,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useTheme } from "@/lib/dashboard/theme";
import { LANGUAGES, useLanguage } from "@/lib/dashboard/language";
import { useDemurrageThresholds } from "@/lib/dashboard/demurrage";
import { useRole, getRoleMeta } from "@/lib/dashboard/role";
import { useT } from "@/lib/dashboard/i18n";
import { demoSuccess } from "@/lib/dashboard/demo";

export const Route = createFileRoute("/dashboard/settings")({
  head: () => ({ meta: [{ title: "Settings — Altun Logistics Operations" }] }),
  component: SettingsPage,
});

type TabId = "profile" | "preferences" | "automation" | "api";

const TABS: { id: TabId; label: string; icon: typeof User }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "preferences", label: "Preferences", icon: SlidersHorizontal },
  { id: "automation", label: "Automation Rules", icon: AlarmClock },
  { id: "api", label: "API Connections", icon: Database },
];

function SettingsPage() {
  const t = useT();
  const [tab, setTab] = useState<TabId>("automation");

  return (
    <DashboardLayout lockViewport>
      <div className="mb-4 shrink-0">
        <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">
          {t("page.settings.title")}
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("page.settings.sub")}
        </p>
      </div>

      <div className="flex gap-5 flex-1 min-h-0 min-w-0">
        {/* Vertical tab nav */}
        <nav className="w-[13.5rem] shrink-0 flex flex-col gap-1">
          {TABS.map((tb) => {
            const Icon = tb.icon;
            const active = tab === tb.id;
            return (
              <button
                key={tb.id}
                type="button"
                onClick={() => setTab(tb.id)}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3.5 h-11 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                  active
                    ? "bg-brand/[0.1] text-brand dark:shadow-[0_0_18px_-8px_var(--brand)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {tb.label}
              </button>
            );
          })}
        </nav>

        {/* Tab content */}
        <div className="flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden scroll-thin pr-1 space-y-4">
          {tab === "profile" && <ProfileTab />}
          {tab === "preferences" && <PreferencesTab />}
          {tab === "automation" && <AutomationTab />}
          {tab === "api" && <ApiTab />}
        </div>
      </div>
    </DashboardLayout>
  );
}

/* ── Card shell ───────────────────────────────────────────── */

function Card({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof User;
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

/* ── Profile ──────────────────────────────────────────────── */

function ProfileTab() {
  const { role } = useRole();
  const meta = getRoleMeta(role);
  return (
    <Card
      icon={User}
      title="Profile"
      description="Your account identity within the operations workspace."
    >
      <div className="flex items-center gap-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-strong text-white font-display font-bold text-lg shadow-[0_6px_20px_-8px_var(--brand)]">
          {meta.initials}
        </span>
        <div>
          <p className="font-display text-lg font-semibold text-foreground">
            {meta.person}
          </p>
          <p className="text-sm text-muted-foreground">{meta.label}</p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3">
        <Field label="Workspace" value="Altun Logistics Operations" />
        <Field label="Active role" value={meta.label} />
        <Field label="Region" value="Rotterdam · Antwerp" />
        <Field label="Member since" value="2024" />
      </dl>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-foreground/[0.03] p-3">
      <dt className="text-[0.62rem] uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

/* ── Preferences ──────────────────────────────────────────── */

function PreferencesTab() {
  const t = useT();
  const { theme, toggle } = useTheme();
  const { language, setLanguage } = useLanguage();
  return (
    <Card
      icon={theme === "dark" ? Moon : Sun}
      title="Preferences"
      description="Appearance and interface language. Synced with the sidebar."
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
    </Card>
  );
}

/* ── Automation Rules ─────────────────────────────────────── */

function AutomationTab() {
  const t = useT();
  const { thresholds, setThresholds } = useDemurrageThresholds();
  const [rules, setRules] = useState([true, true, false]);

  return (
    <Card
      icon={AlarmClock}
      title={t("settings.demurrage")}
      description="The Demurrage Danger Zone — tune when containers turn amber and red across the Overview and Planner boards. Changes apply live."
    >
      <div className="space-y-5">
        <ThresholdSlider
          label="Critical zone — turns red"
          tone="rose"
          value={thresholds.criticalH}
          min={12}
          max={72}
          onChange={(criticalH) => setThresholds({ ...thresholds, criticalH })}
        />
        <ThresholdSlider
          label="Warning zone — turns amber"
          tone="amber"
          value={thresholds.warningH}
          min={36}
          max={144}
          onChange={(warningH) => setThresholds({ ...thresholds, warningH })}
        />

        <div className="rounded-xl border border-border bg-foreground/[0.03] p-3 text-xs text-muted-foreground">
          Containers with under{" "}
          <span className="font-semibold text-rose-600 dark:text-rose-400">
            {thresholds.criticalH}h
          </span>{" "}
          of free time show red; under{" "}
          <span className="font-semibold text-amber-600 dark:text-amber-400">
            {thresholds.warningH}h
          </span>{" "}
          show amber.
        </div>

        <div className="space-y-1.5">
          {[
            "Auto-scan new booking files for missing documents",
            "Email exporters automatically on a customs hold",
            "Escalate to a manager if unresolved after 24h",
          ].map((rule, i) => (
            <button
              key={rule}
              type="button"
              onClick={() =>
                setRules((r) => r.map((v, j) => (j === i ? !v : v)))
              }
              aria-pressed={rules[i]}
              className="w-full flex items-center justify-between gap-3 rounded-lg border border-border bg-foreground/[0.02] px-3 py-2.5 text-left hover:border-brand/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <span className="text-xs text-foreground">{rule}</span>
              <span
                className={cn(
                  "relative h-4 w-7 rounded-full transition-colors shrink-0",
                  rules[i] ? "bg-brand" : "bg-foreground/15",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-all",
                    rules[i] ? "left-[0.875rem]" : "left-0.5",
                  )}
                />
              </span>
            </button>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() =>
              demoSuccess("Rules saved", "Automation rules are stored.")
            }
            className="inline-flex items-center gap-1.5 h-10 rounded-xl bg-brand text-white px-4 text-sm font-semibold hover:bg-brand-strong transition-colors shadow-[0_6px_18px_-8px_var(--brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <Save className="h-4 w-4" /> {t("settings.save")}
          </button>
        </div>
      </div>
    </Card>
  );
}

function ThresholdSlider({
  label,
  tone,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  tone: "rose" | "amber";
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const dot = tone === "rose" ? "bg-rose-500" : "bg-amber-500";
  const accent = tone === "rose" ? "accent-rose-500" : "accent-amber-500";
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          <span className={cn("h-2 w-2 rounded-full", dot)} aria-hidden />
          {label}
        </p>
        <span className="font-display text-lg font-bold text-foreground tabular-nums">
          {value}
          <span className="text-xs text-muted-foreground">h</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={6}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className={cn("mt-2 w-full cursor-pointer", accent)}
      />
      <div className="mt-0.5 flex justify-between text-[0.6rem] text-muted-foreground">
        <span>{min}h</span>
        <span>{max}h</span>
      </div>
    </div>
  );
}

/* ── API Connections ──────────────────────────────────────── */

function ApiTab() {
  return (
    <Card
      icon={Database}
      title="API Connections"
      description="Connect a Supabase project to swap mock data for live data. The dashboard runs fully on mock data until then."
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
        Never paste the service-role key here — only the publishable anon key
        belongs on the client.
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
    </Card>
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
