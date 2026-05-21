import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import type { GlobeMethods } from "react-globe.gl";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/dashboard/theme";

/**
 * Premium 3D fleet-tracking globe (react-globe.gl + three).
 *
 * Rendered client-side only — `react-globe.gl` touches `window`/WebGL, so
 * it is lazily imported and gated behind a mount flag to avoid SSR
 * hydration mismatches. Self-measures its parent so it fills any container
 * without breaking the 100vh layout lock.
 */

// Lazy — the import factory never runs on the server.
const GlobeGL = lazy(() => import("react-globe.gl"));
type GlobeGLProps = ComponentProps<typeof GlobeGL>;

const TEXTURE = {
  dark: "https://unpkg.com/three-globe/example/img/earth-night.jpg",
  light: "https://unpkg.com/three-globe/example/img/earth-day.jpg",
};

export interface GlobeArc {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
}

export interface GlobePoint {
  lat: number;
  lng: number;
  label?: string;
  risk?: boolean;
}

/** Animated vessel marker rendered as an HTML overlay on the globe. */
export interface GlobeVessel {
  lat: number;
  lng: number;
  /** Short vessel / shipment label shown beneath the marker. */
  label?: string;
  /** Highlights the marker as the currently-selected vessel. */
  focused?: boolean;
}

/** Build a DOM element for a vessel pulse marker (runs client-side only). */
function makeVesselMarker(v: GlobeVessel): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = v.focused
    ? "vessel-marker vessel-marker--focused"
    : "vessel-marker";

  const ring = document.createElement("div");
  ring.className = "vessel-ring";

  const dot = document.createElement("div");
  dot.className = "vessel-dot";

  wrap.appendChild(ring);
  wrap.appendChild(dot);

  if (v.label) {
    const lbl = document.createElement("div");
    lbl.className = "vessel-label";
    lbl.textContent = v.label;
    wrap.appendChild(lbl);
  }

  return wrap;
}

/**
 * Globe radius in THREE.js world units (react-globe.gl constant).
 * Used to convert altitude fractions → camera distances for OrbitControls.
 *   distance = GLOBE_RADIUS * (1 + altitude)
 */
const GLOBE_RADIUS = 100;

interface Props {
  arcs?: GlobeArc[];
  points?: GlobePoint[];
  /** HTML-overlay vessel pulse markers. */
  vessels?: GlobeVessel[];
  /** Camera flies here smoothly when this changes. */
  focus?: { lat: number; lng: number } | null;
  /** When false, the globe is decorative — pointer events pass through. */
  interactive?: boolean;
  autoRotate?: boolean;
  /**
   * Closest zoom expressed as altitude fraction above the globe surface.
   * Default 0.6 — close enough to read regional routes, far enough to avoid
   * texture pixelation without loading a higher-res tile set.
   */
  minAltitude?: number;
  /**
   * Farthest zoom expressed as altitude fraction above the globe surface.
   * Default 4.5 — full globe visible with atmosphere context.
   */
  maxAltitude?: number;
  className?: string;
}

/** Quiet placeholder shown before WebGL mounts / while measuring. */
function GlobeFallback() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="h-2/3 aspect-square rounded-full bg-gradient-to-br from-sky-500/15 to-brand/5 border border-brand/15 animate-pulse" />
    </div>
  );
}

export function FleetGlobe({
  arcs = [],
  points = [],
  vessels = [],
  focus,
  interactive = true,
  autoRotate = true,
  minAltitude = 0.6,
  maxAltitude = 4.5,
  className,
}: Props) {
  const { theme } = useTheme();
  const dark = theme === "dark";

  const wrapRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeMethods | undefined>(undefined);

  const [mounted, setMounted] = useState(false);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => setMounted(true), []);

  // Measure the parent so the globe canvas matches it exactly.
  useEffect(() => {
    if (!mounted) return;
    function measure() {
      const el = wrapRef.current;
      if (el) setSize({ w: el.clientWidth, h: el.clientHeight });
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [mounted]);

  // Configure OrbitControls once the globe instance exists.
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    const controls = globe.controls() as unknown as {
      autoRotate: boolean;
      autoRotateSpeed: number;
      enableZoom: boolean;
      enablePan: boolean;
      enableDamping: boolean;
      dampingFactor: number;
      minDistance: number;
      maxDistance: number;
    };

    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.45;
    controls.enableZoom = interactive;
    controls.enablePan = false;

    // Zoom distance limits — converts altitude fractions to world-unit distances.
    // Prevents the user from zooming in so close that the texture tiles pixelate,
    // while still keeping global/regional routes clearly legible.
    controls.minDistance = GLOBE_RADIUS * (1 + minAltitude);
    controls.maxDistance = GLOBE_RADIUS * (1 + maxAltitude);

    // Damped inertia — zoom and rotation decelerate smoothly instead of
    // hard-stopping. Critically, this also makes hitting the zoom boundary
    // feel like a soft spring rather than a hard wall.
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;

    globe.pointOfView({ lat: 28, lng: 35, altitude: 2.3 });
  }, [mounted, size, autoRotate, interactive, minAltitude, maxAltitude]);

  // Fly the camera to the focused vessel/port.
  useEffect(() => {
    if (focus && globeRef.current) {
      globeRef.current.pointOfView(
        { lat: focus.lat, lng: focus.lng, altitude: 1.7 },
        1200,
      );
    }
  }, [focus]);

  const globeProps: GlobeGLProps = {
    width: size.w,
    height: size.h,
    backgroundColor: "rgba(0,0,0,0)",
    globeImageUrl: dark ? TEXTURE.dark : TEXTURE.light,
    showAtmosphere: true,
    atmosphereColor: dark ? "#22d3ee" : "#7dd3fc",
    atmosphereAltitude: 0.16,
    arcsData: arcs,
    arcColor: () => ["#34d399", "#22d3ee"],
    arcStroke: 0.45,
    arcDashLength: 0.45,
    arcDashGap: 0.22,
    arcDashAnimateTime: 2400,
    arcAltitudeAutoScale: 0.42,
    pointsData: points,
    pointLat: "lat",
    pointLng: "lng",
    pointColor: (p: object) =>
      (p as GlobePoint).risk ? "#fb7185" : dark ? "#22d3ee" : "#2563eb",
    pointAltitude: 0.012,
    pointRadius: 0.32,
    pointLabel: "label",
    // HTML overlay vessel markers — pulsing animated dots.
    htmlElementsData: vessels,
    htmlElement: (d: object) => makeVesselMarker(d as GlobeVessel),
    htmlLat: "lat",
    htmlLng: "lng",
    htmlAltitude: 0.02,
  };

  return (
    <div
      ref={wrapRef}
      className={cn(
        "relative h-full w-full overflow-hidden",
        !interactive && "pointer-events-none",
        className,
      )}
    >
      {mounted && size.w > 0 ? (
        <Suspense fallback={<GlobeFallback />}>
          <GlobeGL ref={globeRef} {...globeProps} />
        </Suspense>
      ) : (
        <GlobeFallback />
      )}
    </div>
  );
}
