import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Ship, Anchor, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { LoadingState, ErrorState } from "@/components/dashboard/AsyncStates";
import {
  FleetGlobe,
  type GlobeArc,
  type GlobePoint,
} from "@/components/dashboard/FleetGlobe";
import { useRealtimeShipments } from "@/hooks/useRealtimeShipments";
import { portCoord } from "@/data/dashboard/ports";
import { useUiSounds } from "@/hooks/useUiSounds";
import { useT } from "@/lib/dashboard/i18n";

export const Route = createFileRoute("/dashboard/fleet-tracking")({
  head: () => ({
    meta: [{ title: "Fleet Tracking — Altun Logistics Operations" }],
  }),
  component: FleetTrackingPage,
});

function FleetTrackingPage() {
  const { data, loading, error, reload } = useRealtimeShipments();
  const { playSuccess, playHover } = useUiSounds();
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const t = useT();

  const vessels = useMemo(
    () => (data ?? []).filter((s) => s.phase !== "Delivered"),
    [data],
  );

  // Trade-route arcs (POL → POD).
  const arcs = useMemo<GlobeArc[]>(
    () =>
      vessels.map((s) => {
        const a = portCoord(s.pol);
        const b = portCoord(s.pod);
        return {
          startLat: a.lat,
          startLng: a.lng,
          endLat: b.lat,
          endLng: b.lng,
        };
      }),
    [vessels],
  );

  // Unique port markers — flagged red when a customs hold is inbound.
  const points = useMemo<GlobePoint[]>(() => {
    const byName = new Map<string, GlobePoint>();
    for (const s of vessels) {
      for (const name of [s.pol, s.pod]) {
        const c = portCoord(name);
        const existing = byName.get(name);
        const risk = name === s.pod && s.customsBlock !== null;
        if (existing) {
          existing.risk = existing.risk || risk;
        } else {
          byName.set(name, { lat: c.lat, lng: c.lng, label: name, risk });
        }
      }
    }
    return [...byName.values()];
  }, [vessels]);

  const focused = vessels.find((s) => s.id === focusedId) ?? null;
  const focus = focused ? portCoord(focused.pod) : null;

  const header = (
    <div className="mb-4 shrink-0">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-brand transition-colors mb-2"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        {t("nav.overview")}
      </Link>
      <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-foreground tracking-tight">
        <Navigation className="h-5 w-5 text-brand" />
        {t("fleet.title")}
      </h1>
      <p className="mt-0.5 text-sm text-muted-foreground">{t("fleet.sub")}</p>
    </div>
  );

  if (loading) {
    return (
      <DashboardLayout lockViewport>
        {header}
        <LoadingState label={t("fleet.loading")} />
      </DashboardLayout>
    );
  }
  if (error || !data) {
    return (
      <DashboardLayout lockViewport>
        {header}
        <ErrorState
          error={error ?? new Error(t("fleet.error"))}
          onRetry={reload}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout lockViewport>
      {header}

      <div className="flex gap-4 flex-1 min-h-0 min-w-0">
        {/* Left — vessel list (30%) */}
        <aside className="w-[30%] min-w-[15rem] flex flex-col card-premium rounded-2xl overflow-hidden">
          <header className="flex items-center gap-2 px-4 h-12 border-b border-border shrink-0">
            <Ship className="h-4 w-4 text-brand" />
            <h2 className="text-sm font-semibold text-foreground">
              {t("fleet.vessels")}
            </h2>
            <span className="ml-auto rounded-full bg-brand/12 px-2 py-0.5 text-[0.65rem] font-bold text-brand">
              {vessels.length}
            </span>
          </header>
          <ul className="flex-1 min-h-0 overflow-y-auto scroll-thin divide-y divide-border">
            {vessels.map((s) => {
              const active = s.id === focusedId;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onMouseEnter={playHover}
                    onClick={() => {
                      setFocusedId(s.id);
                      playSuccess();
                    }}
                    aria-current={active}
                    className={cn(
                      "w-full text-left px-4 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand",
                      active ? "bg-brand/[0.1]" : "hover:bg-foreground/[0.04]",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {s.vessel}
                      </span>
                      {s.customsBlock && (
                        <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                      )}
                    </div>
                    <p className="font-mono text-[0.68rem] text-muted-foreground">
                      {s.containerNumber}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-foreground/80">
                      <Anchor className="h-3 w-3 text-brand shrink-0" />
                      {s.pol} → {s.pod}
                    </p>
                    <p className="text-[0.68rem] text-muted-foreground">
                      {t("fleet.vesselEta", { eta: s.eta, phase: s.phase })}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Right — globe (70%) */}
        <div className="flex-1 min-w-0 card-premium rounded-2xl overflow-hidden relative">
          <FleetGlobe arcs={arcs} points={points} focus={focus} interactive />
          {focused && (
            <div className="absolute left-4 bottom-4 rounded-xl glass-panel border px-3.5 py-2.5 shadow-[var(--shadow-elevated)]">
              <p className="font-mono text-xs font-semibold text-foreground">
                {focused.containerNumber}
              </p>
              <p className="text-[0.68rem] text-muted-foreground">
                {focused.vessel} · {focused.pol} → {focused.pod}
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
