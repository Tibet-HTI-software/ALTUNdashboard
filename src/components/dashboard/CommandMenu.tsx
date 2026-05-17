import { useEffect, useMemo, useState } from "react";
import { Command } from "cmdk";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "@tanstack/react-router";
import {
  Container,
  FileSearch,
  Globe2,
  Languages,
  LayoutDashboard,
  Moon,
  Search,
  Sparkles,
  Sun,
  Timer,
  UserCog,
} from "lucide-react";
import { buildOceanShipments } from "@/data/dashboard/oceanFreight";
import { useTheme } from "@/lib/dashboard/theme";
import { useRole, ROLES } from "@/lib/dashboard/role";
import { LANGUAGES, useLanguage } from "@/lib/dashboard/language";
import { useUiSounds } from "@/hooks/useUiSounds";
import { useT } from "@/lib/dashboard/i18n";

/**
 * Pro command palette — global ⌘K / Ctrl+K navigation.
 *
 * Heavy glassmorphism backdrop, centred sleek panel with a glowing edge in
 * dark mode. Searchable shipments + one-shot quick actions (run an
 * automation, switch role, toggle theme). Every action executes
 * immediately and closes the palette.
 */
export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const { setRole } = useRole();
  const { setLanguage } = useLanguage();
  const { playSuccess } = useUiSounds();
  const t = useT();

  // Global ⌘K / Ctrl+K toggle.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const containers = useMemo(() => buildOceanShipments().slice(0, 10), []);

  /** Run an action, play the success chime, then close. */
  function run(action: () => void) {
    action();
    playSuccess();
    setOpen(false);
  }

  const themeMode = theme === "dark" ? "light" : "dark";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[14vh] backdrop-blur-md bg-black/40"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden dark:border-white/10 dark:bg-slate-950 dark:shadow-[0_0_60px_-12px_rgba(56,189,248,0.45),0_0_0_1px_rgba(56,189,248,0.2)]"
          >
            <Command
              className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[0.62rem] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-muted-foreground"
              loop
            >
              <div className="flex items-center gap-2 border-b border-border px-4">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <Command.Input
                  autoFocus
                  placeholder={t("cmd.placeholder")}
                  className="h-12 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                />
                <kbd className="rounded border border-border bg-foreground/[0.04] px-1.5 py-0.5 text-[0.6rem] font-medium text-muted-foreground">
                  ESC
                </kbd>
              </div>

              <Command.List className="max-h-[22rem] overflow-y-auto scroll-thin p-2">
                <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
                  {t("cmd.noResults")}
                </Command.Empty>

                <Command.Group heading={t("cmd.group.shipments")}>
                  {containers.map((s) => (
                    <Item
                      key={s.id}
                      icon={<Container className="h-4 w-4" />}
                      label={s.containerNumber}
                      hint={`${s.trader} · ${s.pol} → ${s.pod}`}
                      onSelect={() =>
                        run(() => navigate({ to: "/dashboard/shipments" }))
                      }
                    />
                  ))}
                </Command.Group>

                <Command.Group heading={t("cmd.group.actions")}>
                  <Item
                    icon={<Timer className="h-4 w-4" />}
                    label={t("cmd.action.delayRisk")}
                    onSelect={() =>
                      run(() =>
                        navigate({ to: "/dashboard/automation/delay-risk" }),
                      )
                    }
                  />
                  <Item
                    icon={<FileSearch className="h-4 w-4" />}
                    label={t("cmd.action.docScan")}
                    onSelect={() =>
                      run(() =>
                        navigate({
                          to: "/dashboard/automation/document-completeness",
                        }),
                      )
                    }
                  />
                  <Item
                    icon={<LayoutDashboard className="h-4 w-4" />}
                    label={t("cmd.action.automationCenter")}
                    onSelect={() =>
                      run(() => navigate({ to: "/dashboard/automation" }))
                    }
                  />
                  <Item
                    icon={<Globe2 className="h-4 w-4" />}
                    label={t("cmd.action.fleetTracking")}
                    onSelect={() =>
                      run(() => navigate({ to: "/dashboard/fleet-tracking" }))
                    }
                  />
                  {ROLES.map((r) => (
                    <Item
                      key={r.value}
                      icon={<UserCog className="h-4 w-4" />}
                      label={t("cmd.action.switchRole", { role: r.label })}
                      onSelect={() => run(() => setRole(r.value))}
                    />
                  ))}
                </Command.Group>

                <Command.Group heading={t("cmd.group.settings")}>
                  <Item
                    icon={
                      theme === "dark" ? (
                        <Sun className="h-4 w-4" />
                      ) : (
                        <Moon className="h-4 w-4" />
                      )
                    }
                    label={t("cmd.action.toggleTheme", { mode: themeMode })}
                    onSelect={() => run(toggle)}
                  />
                  {LANGUAGES.map((l) => (
                    <Item
                      key={l.value}
                      icon={<Languages className="h-4 w-4" />}
                      label={t("cmd.action.switchLang", { lang: l.label })}
                      onSelect={() => run(() => setLanguage(l.value))}
                    />
                  ))}
                </Command.Group>
              </Command.List>

              <div className="flex items-center gap-1.5 border-t border-border px-3 py-2 text-[0.62rem] text-muted-foreground">
                <Sparkles className="h-3 w-3 text-brand" />
                {t("cmd.footer")}
              </div>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Item({
  icon,
  label,
  hint,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={`${label} ${hint ?? ""}`}
      onSelect={onSelect}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer text-foreground data-[selected=true]:bg-brand/[0.1] data-[selected=true]:text-brand transition-colors"
    >
      <span className="text-muted-foreground [[data-selected=true]_&]:text-brand">
        {icon}
      </span>
      <span className="font-medium">{label}</span>
      {hint && (
        <span className="ml-auto truncate text-xs text-muted-foreground">
          {hint}
        </span>
      )}
    </Command.Item>
  );
}
