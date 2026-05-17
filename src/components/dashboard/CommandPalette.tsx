import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useNavigate } from "@tanstack/react-router";
import { Search, Sun, Moon, CornerDownLeft } from "lucide-react";
import { dashboardNav } from "@/lib/dashboard/nav";
import { useTheme } from "@/lib/dashboard/theme";

/**
 * Global command palette — opens with ⌘K / Ctrl+K.
 * Fuzzy-search over dashboard routes plus a couple of quick actions.
 * Rendered once from DashboardLayout so it works on every page.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  // ⌘K / Ctrl+K toggles, Esc closes.
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

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function go(to: string) {
    navigate({ to });
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[14vh]">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in"
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <Command
        loop
        className="relative w-full max-w-lg glass-panel border rounded-2xl overflow-hidden shadow-[var(--shadow-elevated)]"
      >
        <div className="flex items-center gap-2.5 px-4 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground/70 shrink-0" />
          <Command.Input
            autoFocus
            placeholder="Search pages and actions…"
            className="flex-1 h-12 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center h-5 px-1.5 rounded border border-border bg-foreground/[0.04] text-[0.6rem] font-semibold text-muted-foreground">
            ESC
          </kbd>
        </div>

        <Command.List className="max-h-[20rem] overflow-y-auto p-2">
          <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
            No results found.
          </Command.Empty>

          <Command.Group
            heading="Navigate"
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[0.6rem] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-muted-foreground/60"
          >
            {dashboardNav.map((item) => {
              const Icon = item.icon;
              return (
                <Command.Item
                  key={item.to}
                  value={`nav ${item.label}`}
                  onSelect={() => go(item.to)}
                  className="group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-foreground cursor-pointer aria-selected:bg-brand/[0.12] transition-colors"
                >
                  <Icon className="h-4 w-4 text-muted-foreground group-aria-selected:text-brand" />
                  <span className="flex-1">{item.label}</span>
                  <CornerDownLeft className="h-3 w-3 text-muted-foreground/0 group-aria-selected:text-muted-foreground transition-colors" />
                </Command.Item>
              );
            })}
          </Command.Group>

          <Command.Group
            heading="Actions"
            className="mt-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[0.6rem] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-muted-foreground/60"
          >
            <Command.Item
              value="action toggle theme dark light mode"
              onSelect={() => {
                toggle();
                setOpen(false);
              }}
              className="group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-foreground cursor-pointer aria-selected:bg-brand/[0.12] transition-colors"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-muted-foreground group-aria-selected:text-brand" />
              ) : (
                <Moon className="h-4 w-4 text-muted-foreground group-aria-selected:text-brand" />
              )}
              <span className="flex-1">
                Switch to {theme === "dark" ? "light" : "dark"} mode
              </span>
            </Command.Item>
          </Command.Group>
        </Command.List>

        <div className="flex items-center justify-between gap-3 px-3 py-2 border-t border-border text-[0.65rem] text-muted-foreground">
          <span>Altun Logistics — Command</span>
          <span className="flex items-center gap-1">
            <kbd className="inline-flex items-center h-4 px-1 rounded border border-border bg-foreground/[0.04] font-semibold">
              ↑↓
            </kbd>
            to navigate
          </span>
        </div>
      </Command>
    </div>
  );
}
