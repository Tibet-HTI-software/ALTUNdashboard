# Altun Logistics Dashboard — Technical Audit Report

*Generated 2026-05-18 · Auditor: Senior Technical Review + Codebase Scan*

---

## 1. Project Overview & Tech Stack

### Core Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| **Frontend Framework** | React 19 + TypeScript 5.8 | Strict mode enabled |
| **Build Tool** | Vite 7 | TanStack Start adapter (SSR-capable) |
| **Routing** | TanStack Router 1.168 + TanStack Start 1.167 | File-based routing, SSR-ready |
| **Styling** | Tailwind CSS v4.2 (CSS-first config) | Custom design tokens: `--brand`, `card-premium`, `glass-panel`, `scroll-thin`, `status-pulse` |
| **Animation** | Framer Motion | Used extensively for page transitions, drawers, modals |
| **Database** | Supabase (PostgreSQL 15) | Realtime enabled on `ocean_shipments` |
| **Auth** | Supabase Auth | Schema defined; login page exists; session enforcement partial |
| **State** | React local state + module-singleton CustomEvent pattern | No Redux/Zustand; shared state via `window.dispatchEvent` |
| **Data Fetching** | Custom `useAsyncData` hook + `withSupabaseFallback` dual-mode wrapper | Falls back to static fixtures when Supabase unconfigured |
| **Realtime** | Supabase Realtime (WebSocket) | `useRealtimeShipments` — exponential backoff reconnect, `CHANNEL_ERROR`/`TIMED_OUT` handling |
| **Charts** | Recharts | KPI trends, occupancy bars, customs throughput |
| **3D Globe** | `react-globe.gl` + Three.js | Fleet tracking view |
| **Notifications** | Sonner (toast) + HTML5 Notifications API | Browser push notifications on customs hold / D&D alerts |
| **Audio** | Web Audio API (oscillator synthesis) | Alert chimes — zero audio files |
| **i18n** | Custom `useT()` hook | English / Dutch / Turkish — full dictionary |

### Directory Structure

```
src/
├── components/dashboard/     # 29 shared UI components
├── data/dashboard/           # Static mock fixture files (fallback dataset)
├── hooks/                    # useFilteredShipments, useRealtimeShipments,
│                             # useRealtimeConnectionStatus, useUiSounds, etc.
├── lib/dashboard/
│   ├── api/                  # 15 service modules + dual-mode client
│   ├── DashboardFilterContext.ts
│   ├── demurrage.ts
│   ├── exportCsv.ts
│   ├── notifications.ts
│   ├── types.ts
│   └── i18n.ts / role.ts / theme.ts
├── routes/dashboard/         # 16 route files (one per page)
└── routes/                   # __root.tsx, login.tsx, index.tsx

supabase/
├── migrations/               # 0001–0009 (schema → seed → ocean freight
│                             # → RLS → realtime → storage → indexes)
└── functions/                # ingest-terminal-data (Deno webhook)
```

---

## 2. Core Features & Functionality

### ✅ Fully Functional

| Feature | Module | Detail |
|---|---|---|
| **Role-based overview board** | `routes/dashboard/index.tsx` | CEO → trend KPIs + globe teaser; Planner → D&D risk board; Customs → action center; Service → communication hub. All role-switch live. |
| **Fleet Tracking Globe** | `fleet-tracking.tsx` + `FleetGlobe` | 3D interactive globe with POL→POD arcs, port risk markers (red on customs hold), vessel detail drawer. Filters apply without WS disconnect. |
| **Demurrage Risk Board** | `DemurrageRiskBoard` + `automation.delay-risk.tsx` | Live countdown tickers (tick per render), risk banding (demurrage/critical/warning/healthy), configurable thresholds via settings. |
| **Shipment Detail Drawer** | `ShipmentDetailDrawer` | Full tabbed drawer: overview, D&D ledger, customs timeline, document vault. AI quick-action banner (customs hold + D&D critical). Signed-URL download + upload to Supabase Storage. |
| **Realtime WebSocket** | `useRealtimeShipments` | Full-jitter exponential backoff (2s base, 60s cap, 10 retries). Live connection status pill in topbar. `detectCriticalChanges` diffs prev/next on every WS push. |
| **Audio + Browser Alerts** | `useUiSounds` + `notifications.ts` | Descending 1760→1320→880 Hz chime on customs hold apply or D&D <24h crossing. Browser notification with tag deduplication. |
| **Global Cross-filtering** | `DashboardFilterContext` + `useFilteredShipments` | Carrier / customs status / consignee filters. Module-singleton + CustomEvent — no Provider needed. Filter changes never disconnect WS. |
| **Audit CSV Export** | `exportCsv.ts` + `reports.tsx` | RFC 4180, 12 columns. `computeAuditSummary` calculates total cost avoided. Client-side `Blob` download. |
| **AI Email Workflow** | `send-ai-warning` edge function + `ShipmentDetailDrawer` | `SendState` machine (idle → approving → sent/failed). Immutable audit trail in `audit_logs` (0006 migration). |
| **New Shipment Modal** | `NewShipmentModal` | 19-field form, 5 sections, per-field validation. `createOceanShipment()` → Supabase INSERT. WS auto-pushes to all subscribers. |
| **New Quote Modal** | `NewQuoteModal` | 6-section form. `createQuote()` wired to Supabase `quotes` INSERT. |
| **Quotes Approve/Decline** | `quotes.tsx` + `updateQuoteStatus` | Real `Supabase UPDATE` with loading spinner (`deciding` state). Reloads list after commit. |
| **Reports Page** | `reports.tsx` | KPI cards (YTD shipments, on-time %, customs cleared, revenue indexed). 4 charts. Audit CSV export button. |
| **Automation Center** | `automation.index.tsx` | AI Companion drawer (generative UI with `ShipmentTrackingCard` embed). 3 workflow cards linking to sub-pages. SFX only on executed actions. |
| **i18n** | `useT()` | EN/NL/TR complete. All route headers, nav labels, KPI strings translated. |
| **Theme** | CSS custom properties | Dark/light toggle, persisted in localStorage. |
| **Command Palette** | `CommandMenu` / `useGlobalSearch` | Global search across shipments, quotes, customers. Module-singleton CustomEvent. |
| **Performance Indexes** | Migration 0009 | 8 B-tree indexes: partial, composite covering, partial exclusion. |
| **Ingest Webhook** | `supabase/functions/ingest-terminal-data` | POST endpoint, shared-secret auth, 15-status PHASE_MAP, upsert into `ocean_shipments`. |

### ⚠️ Partially Implemented

| Feature | Status | Gap |
|---|---|---|
| **Customs page** | Data real (mock), UI complete | "New customs file" button still `demoAction()` — no form/insert |
| **Warehouse page** | Data real (mock), UI complete | "Schedule job" button still `demoAction()` — no form/insert |
| **Team page** | Data real (mock), UI complete | "Invite member" button still `demoAction()` — no form/insert |
| **Settings — Automation** | UI complete (demurrage sliders, rule toggles) | Save calls `demoSuccess()` — not persisted to `dashboard_settings` table |
| **Settings — API credentials** | Input fields exist | Test-connection button is `demoAction()` — no real handshake |
| **Settings — Profile** | Static hardcoded user meta | Not read from `auth.users` / `profiles` table |
| **Production data ingestion** | Webhook deployed | `PHASE_MAP` + validation complete; downstream Realtime triggers not tested end-to-end |

### 🔴 UI Placeholder Only

| Feature | Location | Note |
|---|---|---|
| **Notifications panel** | Topbar bell icon | `demoAction()` — panel does not open |
| **Document Completeness workflow** | `automation.document-completeness.tsx` | Page exists, shipments load, no actual document scoring engine |
| **Email Assistant workflow** | `automation.email-assistant.tsx` | Page exists, email drafts are mock fixtures |
| **Finance / Revenue feed** | Reports page | "Revenue Trend" chart uses indexed placeholder data; labeled "pending finance feed" |
| **Carrier rate integration** | Quotes page | Spot/contract rates are deterministic hash of quote ID — not from any carrier API |

---

## 3. Data Models & Flow

### Primary Types

| Model | Source | Key Fields |
|---|---|---|
| `OceanShipment` | `ocean_shipments` table | `id`, `containerNumber`, `carrier`, `vessel`, `pol`, `pod`, `phase`, `eta`, `freeTimeExpiresAt`, `demurrageRatePerDay`, `customsBlock`, `teu`, `trader` |
| `FreeTimeStatus` | Computed (pure fn) | `risk` (demurrage/critical/warning/healthy), `hoursLeft`, `daysLeft`, `accruedEur`, `label` |
| `Quote` | `quotes` table | `id`, `customer`, `direction`, `container`, `portOfLoading`, `portOfDestination`, `incoterm`, `grossWeightKg`, `status`, `urgency` |
| `Customer` | Derived from `OceanShipment` | trader name/contact/email aggregated per unique trader across shipments |
| `Shipment` | `shipments` table | Legacy general shipment (road/sea/rail) — separate from ocean freight model |
| `CustomsFile` | `customs_files` + `documents` | stage, documents array (type + status), owner, dueDate |
| `AuditLogEntry` | `audit_logs` (0006) | Immutable AI email trail — action_type, cost_avoided_eur, demurrage_risk, delivery_status |

### Data Flow

```
Static fixtures (data/dashboard/*.ts)
        │  fallback when Supabase unconfigured
        ▼
withSupabaseFallback(label, live, mock)
        │  live path: supabase.from(table).select()
        ▼
useAsyncData(fn, deps)          useRealtimeShipments()
        │                               │
        │                    Supabase Realtime WS channel
        │                    postgres_changes → re-fetch
        │                    detectCriticalChanges() diff
        ▼                               ▼
useFilteredShipments()   ←── applyFilters(DashboardFilterContext)
        │
        ▼
Route components → DashboardLayout → page-specific boards
        │
        ▼
Module-singleton CustomEvents: altun:realtime-status,
altun:dashboard-filter, altun:global-search
(topbar + sidebar subscribe without prop-drilling)
```

---

## 4. UI/UX & Component Architecture

### Layout Structure

```
__root.tsx (TanStack Router shell)
└── dashboard.tsx (DashboardLayout shell)
    ├── DashboardTopbar          sticky z-20, glass-panel
    │   ├── GlobalSearch         CommandMenu overlay
    │   ├── FilterPopover        carrier/customs/consignee chips
    │   ├── LiveStatusPill       WS status (idle/connecting/live/reconnecting/error)
    │   ├── + New Shipment btn   → NewShipmentModal (fixed z-50)
    │   └── RoleSwitcher
    ├── DashboardSidebar         collapsible, role-filtered nav
    │   ├── nav links (16 routes)
    │   ├── ThemeToggle
    │   ├── LanguageSelector
    │   └── SignOut
    └── <Outlet />               → route page content
```

### Key Components

| Component | Type | Complexity |
|---|---|---|
| `FleetGlobe` | 3D Canvas | Three.js + react-globe.gl; arcs, points, camera focus animation |
| `ShipmentDetailDrawer` | Side drawer | 4 tabs, Storage integration, AI action banner, SendState machine |
| `DemurrageRiskBoard` | Data table | Tick-based countdown, sortable risk columns, row selection |
| `CeoBoard` | Dashboard | Trend chart (Recharts), KPI grid, active containers map teaser |
| `NewShipmentModal` / `NewQuoteModal` | Center modal | Framer Motion scale+fade, multi-section form, per-field validation |
| `DashboardTopbar` | Global nav | WS status, filters, search, role switcher — all wired to module singletons |
| `ChartCard` + `BarChart` / `LineChart` | Micro-charts | SVG-native, no Recharts dependency — lightweight custom implementations |
| `KPIStatCard` | Stat card | Icon + value + delta badge + hint text |
| `WorkflowCard` | Nav card | Motion layout, tone-colored status dot, AI scan counts |
| `AsyncStates` | Utility | `LoadingState` (spinner + label) + `ErrorState` (retry button) |

### Design System Tokens (Tailwind CSS v4)

- `card-premium` — white/dark gradient surface with neon edge glow
- `glass-panel` — backdrop-blur frosted glass (topbar, drawers, modals)
- `scroll-thin` — slim custom scrollbar
- `status-pulse` — CSS animation for live indicator dot
- `--brand` / `--brand-strong` — sky-blue accent color, used for shadows + rings

---

## 5. Technical Debt & Low-Hanging Fruit

### Immediate Gaps

| Issue | Severity | Location |
|---|---|---|
| **`withSupabaseFallback` does not catch `42501` permission errors** | High | `supabase.ts` — RLS policy blocks return 42501 but it falls through to the throw path, showing `ErrorState` instead of mock fallback |
| **Login page has no session guard on routes** | High | `dashboard.tsx` shell — no `useSession()` redirect; any unauthenticated user can visit `/dashboard/*` directly |
| **`Settings → Profile` hardcoded** | Medium | `settings.tsx` — user name, role, region are static strings, not read from `profiles` table |
| **No `ErrorBoundary`** | Medium | Unhandled React render errors crash the entire dashboard with blank screen; no graceful fallback |
| **Customs / Warehouse / Team create actions still `demoAction()`** | Medium | 3 primary action buttons not wired to forms — `NewCustomsFileModal`, `NewHandlingJobModal`, `InviteMemberModal` are missing |
| **`ocean_shipments` has no `voyage` NOT NULL constraint** | Low | Migration 0003 — voyage field nullable in DB but required in form; slight schema mismatch |
| **`react-query` installed but unused** | Low | `@tanstack/react-query` in `package.json`; all data fetching uses custom `useAsyncData` — dead dependency |
| **No global `<Suspense>` boundaries** | Low | Route-level loading handled manually with `LoadingState` component; could leverage React Suspense + RSC in TanStack Start |
| **CommandMenu filter integration missing** | Low | `DashboardFilterContext` has `setFilters`; Command Palette has no "Show: Customs Holds" / "Clear filters" commands wired |

### Performance Notes

- `react-globe.gl` chunk: **1,819 kB** gzip 513 kB — largest bundle split candidate
- `index.js` chunk: **1,500 kB** — second candidate for route-level code splitting
- All 9 Supabase migrations run sequentially in dev; 0009 adds B-tree indexes that cover the hot query paths

---

## 6. AI-Ready Summary

**Current State (for AI Context):**
Altun Logistics Dashboard is a production-grade React 19 / TanStack Start SPA for a freight-forwarding operator managing ocean container shipments. The frontend is fully built with role-based views (CEO, Planner, Customs, Service Rep), a live Supabase Realtime WebSocket connection to `ocean_shipments`, demurrage & detention countdown logic, a 3D fleet globe, AI email drafting with audit trail, cross-filtering, browser push alerts, and creation modals for new shipments and quotes. The backend schema is fully defined across 9 migrations (shipments, quotes, customers, customs files, documents, warehouse zones, team tasks, automation workflows, storage bucket, performance indexes) and a Deno ingest webhook exists for terminal data feeds. In live mode, Supabase INSERT triggers automatic UI updates via WebSocket; in demo/mock mode, all 16 routes fall back to rich static fixtures so the app is fully demonstrable without credentials.

**What is Missing / Ready for Feature Work:**
Three primary create-action buttons remain as `demoAction()` placeholders (customs file, warehouse job, team member invite) and need modal forms wired to their respective Supabase tables. The settings page does not persist automation rules or user profile data. There is no session guard on dashboard routes (auth enforcement incomplete). The carrier rate engine in the Quotes module is entirely synthetic (hash-based), making it the most impactful integration target — connecting to a real carrier rate API (Freightos, Xeneta, or internal) would unlock live quote pricing. On the analytics side, the revenue trend chart is indexed placeholder data awaiting a finance system feed. The automation execution engine (document completeness scoring, delay-risk rule firing) is UI-only — the workflows exist as navigation cards but have no backend trigger logic. High-value next features in priority order: **(1)** session guard + profile hydration from Supabase Auth, **(2)** missing create modals for customs/warehouse/team, **(3)** carrier rate API integration in the quotes flow, **(4)** automation rule execution engine tied to the existing `automation_workflows` + `automation_events` tables, **(5)** finance data feed for revenue analytics.
