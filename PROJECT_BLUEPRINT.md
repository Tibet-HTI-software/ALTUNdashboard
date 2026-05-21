# Project Blueprint — Altun Logistics Dashboard
### Enterprise SaaS Foundation · Replication Guide

> **Purpose:** Complete architectural DNA of this project so any future AI instance or developer can bootstrap an identical-quality enterprise dashboard for a new client in a single sprint.

---

## 1. Tech Stack & Versions

| Layer | Technology | Version |
|---|---|---|
| Framework | React | ^19.2.0 |
| Language | TypeScript | ^5.8.3 |
| Routing / SSR | TanStack Router + TanStack Start | ^1.168 |
| Styling | Tailwind CSS v4 | ^4.2.1 |
| Animation | Framer Motion | ^12.38.0 |
| Icons | Lucide React | ^0.575.0 |
| Toasts | Sonner | ^2.0.7 |
| Database | Supabase | ^2.105.4 |
| 3D Globe | react-globe.gl | ^2.38.0 |
| Fonts | Plus Jakarta Sans (display) · Inter (body) | Google Fonts |

**Notable absence:** No chart library (Recharts, Chart.js, etc.). All charts are hand-rolled SVG for exact visual control and zero bundle overhead.

---

## 2. Project Structure

```
src/
├── components/
│   ├── dashboard/          # All dashboard UI widgets
│   └── portal/             # Client portal UI
├── data/
│   └── dashboard/          # Static mock data files (oceanFreight.ts, ports.ts, etc.)
├── lib/
│   └── dashboard/
│       ├── api/            # Service layer (Supabase + mock fallback)
│       ├── ai.service.ts   # OpenAI gpt-4o-mini + demo mode
│       ├── exportCsv.ts    # Browser download utility
│       ├── i18n.ts         # Translation hook + key map
│       ├── nav.ts          # Navigation groups + RBAC filtering
│       ├── role.ts         # useRole() hook + localStorage persistence
│       ├── roles.config.ts # SINGLE SOURCE OF TRUTH for all permissions
│       └── routeGuards.ts  # requireRoles() / requireClientPermission()
├── routes/
│   ├── dashboard/          # Staff dashboard pages
│   ├── portal/             # Client portal pages
│   └── index.tsx           # Public landing page
└── styles.css              # All design tokens (CSS custom properties)
```

---

## 3. Routing Architecture (TanStack Router)

### File-based routes
Every file in `src/routes/` becomes a route automatically. TanStack Start handles SSR.

```
/                           → public landing page
/dashboard                  → overview (role-adaptive board)
/dashboard/shipments        → shipment table
/dashboard/shipments/$id    → shipment detail (dynamic segment)
/dashboard/customs          → customs action center
/dashboard/quotes           → quotes list + rate calculator tab
/dashboard/finance          → invoice ledger + KPIs
/dashboard/fleet-tracking   → 3D globe command view
/dashboard/reports          → audit log export (CEO only)
/dashboard/automation       → automation cockpit
/portal/shipments           → client shipment tracker
/portal/tracking            → client 3D fleet map
/portal/invoices            → client invoice history
```

### Route guard pattern
Every protected route uses `beforeLoad`:

```typescript
// In the route file:
export const Route = createFileRoute("/dashboard/finance")({
  beforeLoad: () => requireRoles(ROUTE_ROLES.finance),
  component: FinancePage,
});
```

`requireRoles` throws a redirect to `/` if the active role is not in the allowed list.

### Search params (type-safe)
```typescript
export const Route = createFileRoute("/portal/tracking")({
  validateSearch: (s): { focus?: string } => ({
    focus: typeof s.focus === "string" ? s.focus : undefined,
  }),
});
// Usage: const { focus } = Route.useSearch();
```

---

## 4. RBAC System

### Role enum
```typescript
// src/lib/dashboard/role.ts
export type Role = "ceo" | "planner" | "customs" | "service" | "client";
```

### Permission matrix — `roles.config.ts`
```typescript
export const ROUTE_ROLES: Record<string, Role[]> = {
  // Operations
  shipments: ["ceo", "planner", "service"],
  customs:   ["ceo", "customs"],
  warehouse: ["ceo", "planner"],
  // Commercial
  customers: ["ceo", "service"],
  quotes:    ["ceo", "planner", "service"],
  // Management (CEO-only)
  reports:   ["ceo"],
  team:      ["ceo"],
  finance:   ["ceo"],
};
```

**Rule:** Every new route and nav item reads from `ROUTE_ROLES`. Never hardcode role strings inside components.

### Role persistence
```typescript
// useRole() hook — persists to localStorage
const { role, setRole } = useRole();
```

### Client portal isolation
Client data is scoped at two levels:
1. Route guard: `requireClientPermission("viewOwnShipments")`
2. API level: every query includes `.eq("client_id", clientId)`

`PORTAL_DEMO_CLIENT_ID = "demo-bypass"` sentinel enables demo mode when no real client session exists.

---

## 5. API / Data Layer

### Dual-mode pattern (live Supabase + offline mock)
```typescript
// Every API function uses this wrapper:
export async function getOceanShipments(): Promise<OceanShipment[]> {
  return withSupabaseFallback(
    "ocean_shipments",
    () => supabase.from("ocean_shipments").select("*"),
    () => MOCK_OCEAN_SHIPMENTS,   // always-ready mock data
  );
}
```

`withSupabaseFallback` checks for `VITE_SUPABASE_URL`. If absent → returns mock immediately. If present → tries live, falls back to mock on error.

### Data fetching hook
```typescript
const { data, loading, error, reload } = useAsyncData(getOceanShipments, []);
```
- Cancels in-flight requests on dependency change
- `reload()` re-triggers the fetch (used after mutations)
- Always render `<LoadingState />` and `<ErrorState onRetry={reload} />` guards

### AI service (`ai.service.ts`)
```typescript
// Auto-detects VITE_OPENAI_API_KEY at runtime
export async function sendChatMessage(
  userMessage: string,
  options?: SendOptions,   // { pageContext, history }
): Promise<string>

export function isAiDemoMode(): boolean
```
- **Live mode:** `gpt-4o-mini`, max 600 tokens, last 10 messages as context window
- **Demo mode:** keyword-matched mock responses with `simulateTypingDelay()` (700ms + 12ms/char + jitter, max 3.2s)

---

## 6. Design System

### Color palette (oklch — device-independent)
```css
--navy:        oklch(0.22 0.06 254);   /* medium navy */
--navy-deep:   oklch(0.14 0.045 258);  /* deep navy — headings, sidebar */
--brand:       oklch(0.52 0.18 254);   /* primary blue */
--brand-strong:oklch(0.43 0.19 254);   /* hover state */
--brand-soft:  oklch(0.95 0.025 254);  /* tint backgrounds */
```

**Dark mode** flips `--navy-deep` to near-white (text) and deepens brand to `oklch(0.62 0.18 254)`. The sidebar stays dark in both modes (uses `--dashboard-sidebar-bg: oklch(0.14 0.045 258)` which does not invert).

### Typography
```css
--font-display: "Plus Jakarta Sans", "Inter", system-ui, sans-serif;
--font-sans:    "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif;
```
- All `<h1>`–`<h4>` use `font-display` (`font-family: var(--font-display)`)
- Heading letter-spacing: `h1 → -0.03em`, `h2–h4 → -0.025em`
- Body line-height: `1.7`

### Utility class glossary

| Class | What it does |
|---|---|
| `card-premium` | White card light / layered glass dark. Subtle shadow. |
| `glass-panel` | `backdrop-blur(16px) saturate(140%)` — used for drawers, modals, floating panels |
| `hover-lift` | `translateY(-3px)` on hover + shadow deepens. Spring: `240ms cubic-bezier(0.22,1,0.36,1)` |
| `dashboard-bg` | Radial gradient page background. Subtle blue tint light / cinematic navy dark |
| `scroll-thin` | Thin 4px scrollbar (webkit + standard) |
| `text-gradient` | `background-clip: text` with `--gradient-brand` |
| `label-overline` | `0.6875rem / 700 / 0.14em tracking / uppercase / brand color` — section labels |
| `bg-dot-light` | 28px radial dot grid (marketing sections) |
| `bg-grid` | 56px line grid white-on-dark (globe backgrounds) |

### Glassmorphism recipe
```css
/* Drawer / modal panel */
background: oklch(1 0 0 / 0.82);
backdrop-filter: blur(16px) saturate(140%);
border: 1px solid oklch(0.9 0.01 254 / 0.9);

/* Dark mode override */
background: oklch(0.21 0.035 254 / 0.72);
border-color: oklch(1 0 0 / 0.08);
```

### Borders — standard semantic tokens
```
border-border          → oklch(0.905 0.012 254)  light / oklch(1 0 0 / 10%) dark
border-brand/25        → brand at 25% opacity — active/focused states
border-brand/30        → branded interactive borders
```

### Shadow tokens
```
--shadow-card:    0 1px 3px .../0.05, 0 6px 20px -6px .../0.10
--shadow-elevated:0 4px 6px .../0.05, 0 16px 40px -12px .../0.20
--shadow-brand:   0 8px 24px -8px oklch(0.52 0.18 254 / 0.40)
```

---

## 7. Framer Motion — Standard Animation Timings

### Page transitions (route change)
```typescript
// motion.div wrapping page content, keyed by pathname
initial={{ opacity: 0, y: 4 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
```

### Widget entrance (cards, rows)
```typescript
initial={{ opacity: 0, y: 10 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.28, delay: Math.min(index * 0.03, 0.3) }}
```

### Slide-in drawer (right edge)
```typescript
initial={{ x: "100%" }}
animate={{ x: 0 }}
exit={{ x: "100%" }}
transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
```

### FAB spring pop-in
```typescript
initial={{ opacity: 0, scale: 0.5, y: 12 }}
animate={{ opacity: 1, scale: 1, y: 0 }}
transition={{ type: "spring", stiffness: 420, damping: 22, delay: 0.4 }}
whileHover={{ scale: 1.1, y: -2 }}
whileTap={{ scale: 0.88 }}
```

### Panel expand (AnimatePresence)
```typescript
initial={{ height: 0, opacity: 0 }}
animate={{ height: "auto", opacity: 1 }}
exit={{ height: 0, opacity: 0 }}
transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
```

### Layout rule
Always use `layout` prop on `motion.div` / `motion.li` inside lists so reordering animates smoothly. Wrap list containers in `<AnimatePresence>` for enter/exit.

---

## 8. Component Inventory

### Layout shells
| Component | Purpose |
|---|---|
| `DashboardLayout` | Top-level chrome. Sidebar + topbar + `<CommandMenu>` + global FABs. `lockViewport` prop locks scroll to viewport. |
| `DashboardSidebar` | Collapsible rail (lg+) / slide drawer (mobile). Reads `dashboardNavGroups` + filters by role. |
| `DashboardTopbar` | Search bar, role switcher, theme toggle, notifications. |
| `DashboardPageHeader` | Title + breadcrumbs + `actions` slot. Used at top of every page. |
| `PortalLayout` | Client-facing shell. Amber "Exit Preview" button returns to internal dashboard. |

### Data display
| Component | Purpose |
|---|---|
| `DataTable<T>` | Generic sortable table. Columns declared as `Column<T>[]`. `hideOn` prop hides cols at breakpoints. |
| `KPIStatCard` | Animated counter card. `progress` prop renders progress bar. `delta` prop shows ±trend chip. |
| `ChartCard` | Card wrapper with title/description/action slot. Children = chart content. |
| `CeoTrendChart` | Hand-rolled SVG area chart. No chart library. `data: { week, bookings, delivered }[]`. |
| `Co2FootprintWidget` | SVG dual-line chart (actual vs target). `compact` prop omits footnote. |
| `Timeline` | Vertical step tracker. `status: "done" | "current" | "upcoming"`. |

### Operations widgets
| Component | Purpose |
|---|---|
| `FleetGlobe` | `react-globe.gl` WebGL globe. Props: `arcs`, `vessels` (HTML overlay markers), `minAltitude`/`maxAltitude` zoom clamp. |
| `DemurrageRiskBoard` | Risk-sorted shipment list with free-time countdown chips. |
| `CustomsActionCenter` | Blocked declarations grid + AI chase-email modal. |
| `ExceptionAlertCenter` | Collapsible MBE strip. Computed from `getFreeTimeStatus()`. `computeExceptions()` caps at 6. |
| `CommunicationHub` | Threaded email inbox panel. |
| `DocumentChecklist` | Document status list (Pending / Approved / Rejected). |
| `DocumentVault` | Full archive: 6 mock docs, View/Download CTAs, drag-upload zone. |

### Commercial
| Component | Purpose |
|---|---|
| `QuoteRateCalculator` | Rate engine: form → 2.4s animated calculation → itemised breakdown → PDF proposal CTA. Rates deterministic from input hash. |
| `NewQuoteModal` | Full-form modal for creating new quote records. |

### AI / automation
| Component | Purpose |
|---|---|
| `AiCoPilot` | Global floating chat widget. `fixed bottom-6 right-6`. Context-aware (reads pathname). OpenAI live + demo mode. |
| `AiDocDropzoneFab` | Document parser FAB. `fixed bottom-6 right-20`. Route-scoped (customs + shipments only). |
| `AiDocDropzoneModal` | Multi-step parse animation → mock structured data result. |

### Utility
| Component | Purpose |
|---|---|
| `CommandMenu` | `⌘K` palette. Fuzzy-searches nav items + recent shipments. |
| `LoadingState` / `ErrorState` | Standard async guards. Always used in `useAsyncData` renders. |
| `EmptyState` | Zero-data placeholder with optional action button. |
| `StatusBadge` | Tone-mapped badge. Tones: `success` `warning` `info` `neutral`. |

---

## 9. Key Implementation Patterns

### Viewport-locked cockpit layout
Pages that must not scroll (overview, automation) use `<DashboardLayout lockViewport>`. Internal sections own their own scroll regions with `overflow-y-auto scroll-thin flex-1 min-h-0`.

### Deterministic mock data from hash
When you need stable but varied mock values per record:
```typescript
function deterministicRate(id: string): number {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return 1400 + (h % 1700);
}
```

### CSV export (no library)
```typescript
import { downloadFile } from "@/lib/dashboard/exportCsv";

const csv = rows.map(r => [r.id, r.name, r.amount].join(",")).join("\n");
downloadFile(csv, `export-${date}.csv`, "text/csv;charset=utf-8");
```

### Toast notifications (Sonner)
```typescript
import { toast } from "sonner";
toast.success("Title", { description: "Detail text." });
toast.error("Failed", { description: err.message });
```

### Demo action stubs
```typescript
import { demoSuccess, demoError } from "@/lib/dashboard/demo";
demoSuccess("Feature name", "This would do X in production.");
```

---

## 10. Globe Implementation Notes

```typescript
const GLOBE_RADIUS = 100; // react-globe.gl internal units

// Zoom clamp (prevents pixelation)
controls.minDistance = GLOBE_RADIUS * (1 + 0.6);  // ~160 units
controls.maxDistance = GLOBE_RADIUS * (1 + 4.5);  // ~550 units
controls.enableDamping = true;
controls.dampingFactor = 0.12;

// Vessel HTML markers
htmlElementsData: vessels,
htmlElement: (d) => makeVesselMarker(d as GlobeVessel),
htmlAltitude: 0.02,
```

CSS classes for vessel markers: `.vessel-marker`, `.vessel-dot`, `.vessel-ring` (pulsing animation), `.vessel-marker--focused` (green tint).

Vessel position interpolation for "In Transit" shipments:
```typescript
const t = (now - etd) / (eta - etd);  // 0..1 progress
return { lat: pol.lat + (pod.lat - pol.lat) * t, lng: pol.lng + (pod.lng - pol.lng) * t };
```

---

---

# Master System Prompt
### Copy-paste this into a fresh AI session to bootstrap an identical project for a new client.

---

```
You are a Senior Full-Stack Enterprise Architect and Lead UI Engineer. Your task is to build a complete, production-quality internal operations dashboard for [CLIENT_NAME], a [CLIENT_INDUSTRY] company. 

This project must replicate the exact architecture, design system, and component quality described below. Do not simplify or cut corners — every pattern here exists for a reason.

---

## TECH STACK (exact versions)

- React 19 + TypeScript 5.8 (strict mode)
- TanStack Router ^1.168 + TanStack Start ^1.167 (file-based routing, SSR-ready)
- Tailwind CSS v4.2 (CSS-first config via styles.css — no tailwind.config.js)
- Framer Motion ^12.38 (AnimatePresence, layout animations, spring physics)
- Lucide React for ALL icons (no mixing icon libraries)
- Sonner for toasts
- Supabase JS ^2.105 as database client
- react-globe.gl for 3D globe views (if fleet tracking is needed)

---

## PROJECT STRUCTURE

Replicate this exact folder layout:

src/
├── components/
│   ├── dashboard/       # All reusable dashboard UI components
│   └── portal/          # Client-facing portal UI (if needed)
├── data/dashboard/      # Static mock data (TypeScript files, no JSON)
├── lib/dashboard/
│   ├── api/             # All data fetching (withSupabaseFallback pattern)
│   ├── ai.service.ts    # AI chat service (OpenAI + demo fallback)
│   ├── exportCsv.ts     # downloadFile() utility
│   ├── i18n.ts          # Translation hook (useT)
│   ├── nav.ts           # Navigation groups with RBAC per item
│   ├── role.ts          # useRole() hook, localStorage persistence
│   ├── roles.config.ts  # SINGLE SOURCE OF TRUTH for all permissions
│   └── routeGuards.ts   # requireRoles() beforeLoad guard
└── routes/
    ├── dashboard/       # All staff dashboard pages
    └── portal/          # Client portal pages (if needed)

---

## RBAC SYSTEM

Define all roles as a TypeScript union type:
  type Role = "ceo" | "planner" | "operations" | "finance" | "service" | "client"
  (adjust role names to client's org structure)

Create roles.config.ts as the single source of truth:
  export const ROUTE_ROLES: Record<string, Role[]> = {
    shipments: ["ceo", "planner", "operations"],
    finance:   ["ceo", "finance"],
    // ... all routes
  };

Every route file must use:
  beforeLoad: () => requireRoles(ROUTE_ROLES.routeName)

Navigation items in nav.ts must include allowedRoles: ROUTE_ROLES.xxx so the sidebar auto-hides items the current role cannot access.

The useRole() hook reads/writes localStorage. A role switcher in the topbar lets staff preview other roles.

---

## DATA LAYER PATTERN

Every API function must use the dual-mode withSupabaseFallback wrapper:

  export async function getData(): Promise<DataType[]> {
    return withSupabaseFallback(
      "table_name",
      () => supabase.from("table_name").select("*"),
      () => MOCK_DATA,  // fully populated, demo-ready
    );
  }

All mock data lives in src/data/dashboard/ as TypeScript arrays.
The hook useAsyncData(fn, deps) returns { data, loading, error, reload }.
Always render <LoadingState /> and <ErrorState onRetry={reload} /> guards.

---

## DESIGN SYSTEM — CSS CUSTOM PROPERTIES

In styles.css, define all colors using oklch() for device-independent reproduction:

  --brand:        oklch(0.52 0.18 [HUE]);   /* primary accent */
  --brand-strong: oklch(0.43 0.19 [HUE]);   /* hover/active */
  --brand-soft:   oklch(0.95 0.025 [HUE]);  /* tint background */
  --navy-deep:    oklch(0.14 0.045 258);     /* deep text/sidebar */
  --navy:         oklch(0.22 0.06 254);      /* medium navy */

Replace [HUE] with the client's brand hue (254 = Altun's blue; adjust per brand).

Define these utility classes:

  .card-premium   — white card light / layered glass dark, subtle inset shadow
  .glass-panel    — backdrop-blur(16px) saturate(140%) frosted surface
  .hover-lift     — translateY(-3px) on hover, spring 240ms cubic-bezier(0.22,1,0.36,1)
  .dashboard-bg   — radial gradient page background (subtle brand tint light / deep navy dark)
  .scroll-thin    — 4px thin scrollbar

Dark mode: add .dark class to <html>. Override surface tokens to slate-navy. Brand tokens shift lightness up ~0.1 for contrast. Sidebar stays dark in both modes.

Typography:
  --font-display: "Plus Jakarta Sans" (headings, font-bold, tracking-tight)
  --font-sans:    "Inter" (body text)
  h1–h4 use font-display. Letter-spacing: h1 → -0.03em, h2-h4 → -0.025em.

---

## FRAMER MOTION — STANDARD TIMINGS

Copy these exact timings and do not deviate:

Page transition (keyed by pathname):
  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}

Widget entrance (staggered list items):
  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.28, delay: Math.min(index * 0.03, 0.3) }}

Slide-in drawer (from right):
  initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}

FAB spring pop:
  initial={{ opacity: 0, scale: 0.5, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
  transition={{ type: "spring", stiffness: 420, damping: 22 }}
  whileHover={{ scale: 1.1, y: -2 }} whileTap={{ scale: 0.88 }}

Collapsible panel (AnimatePresence):
  initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
  transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}

Always use layout prop on motion list items. Always wrap lists in AnimatePresence.

---

## LAYOUT ARCHITECTURE

DashboardLayout is the top-level chrome wrapper used on every dashboard page:
- Fixed sidebar (lg+) / slide drawer (mobile) — collapsible to icon rail, preference in localStorage
- Content column offset adjusts to sidebar width via lg:pl-[16.5rem] / lg:pl-[4.75rem]
- lockViewport prop: when true, <main> is overflow-y-hidden — the page is a flex column filling the viewport exactly. Internal sections own their own scroll with overflow-y-auto scroll-thin flex-1 min-h-0.
- CommandMenu (⌘K palette) mounted globally
- AI Co-Pilot FAB mounted globally (bottom-right, always visible to staff)
- Route-specific FABs (e.g. Doc Parser) mounted inside individual route components

---

## STANDARD PAGE PATTERN

Every dashboard page must follow this pattern:

  function MyPage() {
    const { data, loading, error, reload } = useAsyncData(getData, []);
    
    const header = <DashboardPageHeader title="..." description="..." crumbs={[...]} actions={<Button />} />;
    
    if (loading) return <DashboardLayout>{header}<LoadingState /></DashboardLayout>;
    if (error)   return <DashboardLayout>{header}<ErrorState error={error} onRetry={reload} /></DashboardLayout>;
    
    return (
      <DashboardLayout>
        {header}
        {/* page content */}
      </DashboardLayout>
    );
  }

---

## REQUIRED CORE COMPONENTS TO BUILD

Build these in order. Each must match the design system exactly:

1. DashboardLayout — chrome shell (sidebar + topbar + slot)
2. DashboardSidebar — grouped nav, collapsible rail, RBAC-filtered
3. DashboardTopbar — search, role switcher, theme toggle, notifications
4. DashboardPageHeader — title / breadcrumbs / actions slot
5. KPIStatCard — animated stat with optional progress bar + delta chip
6. DataTable<T> — generic column-typed table, hideOn breakpoints
7. LoadingState / ErrorState / EmptyState — standard async guards
8. StatusBadge — tone-mapped (success/warning/info/neutral/critical)
9. CommandMenu — ⌘K fuzzy palette over nav items

Then per-domain widgets as the client's use case requires.

---

## GLASSMORPHISM UI RULES

1. Never use pure white or pure black surfaces. Always use oklch with a slight hue.
2. Cards: card-premium class. No custom background/border inline styles.
3. Modals and drawers: glass-panel class + shadow-2xl.
4. Borders: always border-border (semantic token) or border-brand/25 for active states.
5. Dark mode: surfaces use 72–82% opacity with backdrop-blur — never solid fills.
6. Interactive buttons: always include focus-visible:ring-2 focus-visible:ring-brand accessibility ring.
7. Empty/loading states: never show blank divs. Always render a styled placeholder.

---

## AI CO-PILOT PATTERN

Build a floating chat widget mounted globally in DashboardLayout:
- FAB: fixed bottom-6 right-6 z-40, violet gradient, Bot icon, spring pop animation
- Panel: fixed bottom-20 right-6 z-40, w-[360px], max-h-[560px], glass-panel
- Reads useRouterState pathname to inject page-specific greeting + suggested prompts
- On navigation to a different section while panel is open: remount panel with fresh context
- Messages: user bubbles right (brand bg), assistant bubbles left (glass border)
- Typing indicator: 3-dot Framer Motion stagger animation
- Demo mode badge when VITE_OPENAI_API_KEY is absent

---

## WHAT NOT TO DO

- Do NOT use any chart library (Recharts, Chart.js, Victory). Hand-roll all SVG charts.
- Do NOT hardcode role strings in components. Always import from roles.config.ts.
- Do NOT use arbitrary inline Tailwind values (e.g. w-[317px]) unless strictly necessary for a specific layout constraint. Prefer the scale.
- Do NOT use `overflow: hidden` on the root layout — it breaks sticky positioning on mobile.
- Do NOT use `any` TypeScript types. All API response types must be defined interfaces.
- Do NOT add external animation libraries beyond Framer Motion.
- Do NOT use `alert()` or `confirm()`. Always use Sonner toasts.

---

## DEMO-READINESS REQUIREMENT

Every feature must look fully populated on first load with zero configuration:
- Mock data must be realistic and domain-specific (real company names, real port codes, real carrier names)
- Mock values must be deterministic (derived from ID hash) so they stay stable across re-renders
- Loading states must show shimmer/spinner so the demo feels live
- All mutation buttons (approve, mark paid, download) must show a Sonner toast even in demo mode

---

Begin by scaffolding the project with `npx create-tsrouter-app@latest`, then implement the design system tokens in styles.css, then build DashboardLayout, then add routes one by one following the patterns above.
```

---

*Blueprint generated: 2026-05-19 · Altun Logistics Dashboard v1.0-sprint-complete*
