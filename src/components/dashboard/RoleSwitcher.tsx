import { useEffect, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, ExternalLink, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLES, getRoleMeta, useRole, type Role } from "@/lib/dashboard/role";
import { useT } from "@/lib/dashboard/i18n";
import { useUiSounds } from "@/hooks/useUiSounds";
import { useAuth } from "@/lib/auth/AuthContext";

/* ── RoleItem ────────────────────────────────────────────────────────────── */

function RoleItem({
  r,
  isActive,
  onSelect,
  isPortal = false,
}: {
  r: (typeof ROLES)[number];
  isActive: boolean;
  onSelect: (v: Role) => void;
  isPortal?: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        role="menuitemradio"
        aria-checked={isActive}
        onClick={() => onSelect(r.value)}
        className={cn(
          "w-full flex items-start gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
          isActive
            ? isPortal
              ? "bg-violet-500/[0.1]"
              : "bg-brand/[0.1]"
            : "hover:bg-foreground/[0.05]",
        )}
      >
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg font-display font-semibold text-[0.7rem] shrink-0 mt-0.5",
            isActive
              ? isPortal
                ? "bg-gradient-to-br from-violet-500 to-violet-700 text-white"
                : "bg-gradient-to-br from-brand to-brand-strong text-white"
              : "bg-foreground/[0.06] text-muted-foreground",
          )}
        >
          {r.initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-foreground">
              {r.label}
            </span>
            {isActive && !isPortal && (
              <Check className="h-3.5 w-3.5 text-brand" />
            )}
            {isActive && isPortal && (
              <Check className="h-3.5 w-3.5 text-violet-500" />
            )}
            {!isActive && isPortal && (
              <ExternalLink className="h-3 w-3 text-muted-foreground/40" />
            )}
          </span>
          <span className="block text-xs text-muted-foreground leading-snug mt-0.5">
            {r.description}
          </span>
        </span>
      </button>
    </li>
  );
}

/**
 * Role-preview switcher for the topbar.
 *
 * Doubles as the profile chip: the avatar + name reflect the representative
 * person for the active role. Opening it reveals the four job functions,
 * each with a one-line description of what its dashboard view emphasises.
 * The choice is shared app-wide via the `useRole()` store.
 */
/** Roles shown in the "staff" section above the separator. */
const STAFF_ROLES = ROLES.filter((r) => r.value !== "client");
/** The client demo entry rendered below the separator. */
const CLIENT_ROLE = ROLES.find((r) => r.value === "client")!;

export function RoleSwitcher() {
  const { role, setRole } = useRole();
  const t = useT();
  const { playRoleSwitch } = useUiSounds();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  async function handleSignOut() {
    setOpen(false);
    await signOut();
    navigate({ to: "/login" });
  }

  /**
   * Switch role and navigate to the correct surface:
   *  • Selecting "client"  → /portal/shipments
   *  • Any staff role while on /portal/* → /dashboard
   *  • Any staff role while already on /dashboard/* → stay (no redirect)
   */
  function handleRoleSelect(next: Role) {
    if (next !== role) playRoleSwitch();
    setRole(next);
    setOpen(false);

    if (next === "client") {
      navigate({ to: "/portal/shipments" });
    } else if (pathname.startsWith("/portal")) {
      navigate({ to: "/dashboard" });
    }
    // already on /dashboard/* — no redirect needed
  }

  const active = getRoleMeta(role);

  useEffect(() => {
    function onPointer(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t("role.preview")}: ${active.label}`}
        className={cn(
          "flex items-center gap-2.5 rounded-xl border border-border bg-foreground/[0.03] pl-2 pr-2.5 h-11",
          "hover:border-brand/40 hover:bg-foreground/[0.05] transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
        )}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-strong text-white font-display font-semibold text-[0.72rem] shadow-[0_4px_14px_-4px_var(--brand)] shrink-0">
          {active.initials}
        </span>
        <span className="hidden sm:block leading-tight text-left min-w-0">
          <span className="block text-[0.8125rem] font-semibold text-foreground truncate">
            {active.person}
          </span>
          <span className="block text-[0.62rem] uppercase tracking-widest text-muted-foreground">
            {active.short}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform shrink-0",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 mt-2 w-[18rem] rounded-xl glass-panel border shadow-[var(--shadow-elevated)] overflow-hidden z-40"
          >
            <p className="px-3 pt-3 pb-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
              {t("role.preview")}
            </p>
            {/* ── Staff roles ── */}
            <ul className="p-1.5">
              {STAFF_ROLES.map((r) => (
                <RoleItem
                  key={r.value}
                  r={r}
                  isActive={r.value === role}
                  onSelect={handleRoleSelect}
                />
              ))}
            </ul>

            {/* ── Client Portal demo separator ── */}
            <div className="mx-3 border-t border-border" />
            <div className="px-3 pt-2 pb-1">
              <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">
                Client Portal Preview
              </p>
            </div>
            <ul className="px-1.5 pb-1.5">
              <RoleItem
                r={CLIENT_ROLE}
                isActive={role === "client"}
                onSelect={handleRoleSelect}
                isPortal
              />
            </ul>
            <p className="px-3 py-2 text-[0.65rem] text-muted-foreground border-t border-border bg-foreground/[0.02]">
              {t("role.previewNote")}
            </p>
            <div className="p-1.5 border-t border-border">
              <button
                type="button"
                role="menuitem"
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-muted-foreground hover:text-red-500 hover:bg-red-500/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                {t("auth.signOut")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
