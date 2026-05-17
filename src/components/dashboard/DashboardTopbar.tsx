import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bell,
  Menu,
  Search,
  Ship,
  Users,
  FileText,
  Container,
  Plus,
  Activity,
} from "lucide-react";
import { shipments } from "@/data/dashboard/shipments";
import { customers } from "@/data/dashboard/customers";
import { quotes } from "@/data/dashboard/quotes";
import { buildOceanShipments } from "@/data/dashboard/oceanFreight";
import { demoAction } from "@/lib/dashboard/demo";
import { useT } from "@/lib/dashboard/i18n";
import { useGlobalSearch } from "@/lib/dashboard/search";
import { RoleSwitcher } from "./RoleSwitcher";

interface Props {
  onOpenSidebar: () => void;
}

interface SearchHit {
  id: string;
  label: string;
  sub: string;
  to: string;
  params?: Record<string, string>;
  kind: "Container" | "Shipment" | "Customer" | "Quote";
}

/**
 * Sticky glass topbar across all dashboard pages.
 * Contains: mobile menu, live-status pill, operations indicator, search,
 * notifications, profile chip, and a primary action button.
 *
 * Search is a prototype-only client-side filter over mock shipments,
 * customers, and quotes — replace with a real search service later.
 */
export function DashboardTopbar({ onOpenSidebar }: Props) {
  const { query, setQuery } = useGlobalSearch();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const t = useT();

  // Ocean Freight shipments — searchable by container, B/L and vessel.
  const oceanShipments = useMemo(() => buildOceanShipments(), []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const hits: SearchHit[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: SearchHit[] = [];
    for (const o of oceanShipments) {
      if (
        o.containerNumber.toLowerCase().includes(q) ||
        o.blNumber.toLowerCase().includes(q) ||
        o.vessel.toLowerCase().includes(q) ||
        o.trader.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q)
      ) {
        out.push({
          id: o.id,
          label: o.containerNumber,
          sub: `${o.trader} · ${o.pol} → ${o.pod} · ${o.vessel}`,
          to: "/dashboard/shipments",
          kind: "Container",
        });
      }
      if (out.length >= 6) break;
    }
    for (const s of shipments) {
      if (
        s.id.toLowerCase().includes(q) ||
        s.customer.toLowerCase().includes(q) ||
        s.origin.toLowerCase().includes(q) ||
        s.destination.toLowerCase().includes(q)
      ) {
        out.push({
          id: s.id,
          label: s.id,
          sub: `${s.customer} · ${s.origin} → ${s.destination}`,
          to: "/dashboard/shipments/$id",
          params: { id: s.id },
          kind: "Shipment",
        });
      }
      if (out.length >= 12) break;
    }
    for (const c of customers) {
      if (
        c.company.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q) ||
        c.contact.toLowerCase().includes(q)
      ) {
        out.push({
          id: c.id,
          label: c.company,
          sub: `${c.country} · ${c.routeFocus}`,
          to: "/dashboard/customers",
          kind: "Customer",
        });
      }
      if (out.length >= 16) break;
    }
    for (const qu of quotes) {
      if (
        qu.id.toLowerCase().includes(q) ||
        qu.customer.toLowerCase().includes(q) ||
        qu.service.toLowerCase().includes(q)
      ) {
        out.push({
          id: qu.id,
          label: qu.id,
          sub: `${qu.customer} · ${qu.service}`,
          to: "/dashboard/quotes",
          kind: "Quote",
        });
      }
      if (out.length >= 20) break;
    }
    return out.slice(0, 8);
  }, [query, oceanShipments]);

  const kindIcon = {
    Container,
    Shipment: Ship,
    Customer: Users,
    Quote: FileText,
  } as const;

  return (
    <header className="sticky top-0 z-20 glass-panel border-b border-border">
      <div className="flex items-center gap-3 px-4 sm:px-6 lg:px-8 h-[4.25rem]">
        {/* Mobile sidebar toggle */}
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-foreground/5 transition-colors text-foreground"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Live status pill + operations indicator */}
        <div className="hidden md:flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 h-7 text-[0.7rem] font-semibold text-emerald-600 dark:text-emerald-300">
            <span className="relative h-1.5 w-1.5">
              <span className="status-pulse absolute inset-0 rounded-full bg-emerald-500" />
            </span>
            {t("top.systemsLive")}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-foreground/[0.03] px-3 h-7 text-[0.7rem] font-medium text-muted-foreground">
            <Activity className="h-3 w-3 text-brand" />
            12 operations active
          </span>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-md ml-auto md:ml-2" ref={wrapperRef}>
          <label htmlFor="dash-search" className="sr-only">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70 pointer-events-none" />
            <input
              id="dash-search"
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder={t("top.search")}
              title="Demo search — container number, B/L, vessel, trader."
              autoComplete="off"
              className="w-full h-9 pl-9 pr-14 rounded-lg border border-border bg-foreground/[0.03] text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45 focus-visible:border-brand/40 transition-colors"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[0.55rem] uppercase tracking-widest font-semibold text-muted-foreground/60 pointer-events-none hidden sm:block">
              Demo
            </span>

            {open && query.trim() && (
              <div className="absolute left-0 right-0 mt-2 rounded-xl glass-panel border shadow-[var(--shadow-elevated)] overflow-hidden z-30">
                {hits.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-muted-foreground">
                    No matches in mock data. Demo search covers shipments,
                    customers, quotes.
                  </p>
                ) : (
                  <ul className="max-h-80 overflow-y-auto divide-y divide-border">
                    {hits.map((h) => {
                      const Icon = kindIcon[h.kind];
                      return (
                        <li key={`${h.kind}-${h.id}`}>
                          <Link
                            to={h.to}
                            params={h.params}
                            onClick={() => {
                              setQuery("");
                              setOpen(false);
                            }}
                            className="flex items-start gap-3 px-3 py-2.5 hover:bg-foreground/[0.04] transition-colors"
                          >
                            <div className="h-7 w-7 rounded-lg bg-brand/12 border border-brand/20 text-brand flex items-center justify-center shrink-0 mt-0.5">
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="text-sm font-semibold text-foreground truncate">
                                  {h.label}
                                </span>
                                <span className="text-[0.6rem] uppercase tracking-widest font-bold text-muted-foreground/70 shrink-0">
                                  {h.kind}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {h.sub}
                              </p>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <p className="px-3 py-2 text-[0.65rem] text-muted-foreground border-t border-border bg-foreground/[0.02]">
                  Prototype search — mock data only, no backend connected.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={() =>
              demoAction("this would open the notifications panel.")
            }
            className="relative p-2 rounded-lg hover:bg-foreground/5 transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Notifications"
            title="Notifications (demo)"
          >
            <Bell className="h-[1.15rem] w-[1.15rem]" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-brand ring-2 ring-background shadow-[0_0_8px_0_var(--brand)]" />
          </button>

          {/* Primary action */}
          <button
            type="button"
            onClick={() => demoAction("this would open the new shipment form.")}
            className="hidden sm:inline-flex items-center gap-1.5 h-9 rounded-lg bg-brand text-white px-3.5 text-sm font-semibold hover:bg-brand-strong transition-colors shadow-[0_4px_16px_-6px_var(--brand)]"
          >
            <Plus className="h-4 w-4" /> {t("top.newShipment")}
          </button>

          {/* Role-preview switcher (doubles as the profile chip) */}
          <div className="pl-1.5 ml-0.5 border-l border-border">
            <RoleSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
}
