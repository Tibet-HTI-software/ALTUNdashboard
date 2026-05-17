# Backend-ready dashboard architecture

This document describes how the Altun Logistics dashboard is wired today
(prototype, no backend) and what the migration path looks like once a real
backend (Supabase or otherwise) is connected.

The codebase is intentionally structured so the swap is body-only inside
`src/lib/dashboard/api/*` — no route or component file should need to
change shape when real data lands.

---

## 1. Current architecture (mock)

```
src/
├── data/dashboard/*           # static fixtures (TS modules, in-memory)
├── lib/dashboard/api/         # service layer — only file the routes use
│   ├── client.ts              # delay(), cloneData(), createApiError(), simulate*
│   ├── types.ts               # Create*Input, ApiResult, etc.
│   ├── useAsyncData.ts        # tiny hook (no caching, no retry)
│   ├── overview.api.ts
│   ├── shipments.api.ts
│   ├── customers.api.ts
│   ├── quotes.api.ts
│   ├── customs.api.ts
│   ├── warehouse.api.ts
│   ├── team.api.ts
│   ├── automation.api.ts
│   ├── reports.api.ts
│   ├── settings.api.ts
│   └── index.ts               # barrel
├── components/dashboard/
│   ├── AsyncStates.tsx        # LoadingState / ErrorState / EmptyState
│   └── …
└── routes/dashboard/*         # uses useAsyncData + service functions
```

### Read flow per route

| Route                          | Service call                |
|--------------------------------|-----------------------------|
| `/dashboard`                   | `getDashboardOverview()`    |
| `/dashboard/shipments`         | `getShipments()`            |
| `/dashboard/shipments/:id`     | `getShipmentById(id)` + `getCustomsFiles()` |
| `/dashboard/customers`         | `getCustomers()`            |
| `/dashboard/quotes`            | `getQuotes()`               |
| `/dashboard/customs`           | `getCustomsFiles()`         |
| `/dashboard/warehouse`         | `getWarehouseOverview()`    |
| `/dashboard/team`              | `getTeamMembers()` + `getTeamTasks()` |
| `/dashboard/automation`        | `getAutomationCenter()` *   |
| `/dashboard/reports`           | `getReportsOverview()`      |
| `/dashboard/settings`          | (write-only) `updateDashboardSettings()` |

\* The Automation route still imports the static fixtures at module scope so
the drawer renderers (`WorkflowDrawer`, `EventDrawer`, …) can read them by
reference. The page-level fetch path runs through `getAutomationCenter()`
and surfaces loading + error states. When a real backend lands, drop the
direct imports and thread the service result down via context or props.

### Write flow

Demo actions are wired through service functions where it improves the
prototype, even though no data persists:

| Action                                       | Service call                       |
|----------------------------------------------|------------------------------------|
| Quote Approve / Reject (table + detail)      | `updateQuoteStatus(id, status)`    |
| Settings Save changes                        | `updateDashboardSettings(input)`   |
| Reports Export report                        | `exportReport({ format })`         |
| Workflow Run demo (card + drawer)            | `runAutomationWorkflow(id)`        |
| AI Suggestion Create task                    | `createAutomationTask({…})`        |
| AI Suggestion Mark reviewed                  | `markSuggestionReviewed(id)`       |

Other prototype buttons (`New shipment`, `Add customer`, `New file`,
`Schedule job`, `Invite member`, `Send draft`, etc.) remain as
`window.alert` demos until real forms / endpoints exist.

### Helpers (`client.ts`)

- `delay(ms = 180)` — fakes network latency
- `cloneData<T>(data)` — `structuredClone` so callers can mutate freely
- `ApiError` / `createApiError(message, code)` — branchable errors
- `simulateRead(producer)` / `simulateSuccess(payload)` — helpers used in
  every service to keep behaviour uniform

### Hook (`useAsyncData`)

`{ data, loading, error, reload }` plus a stale-fetch cancellation flag.
Intentionally minimal — swap for `@tanstack/react-query` (already a
dependency) once a real backend is in place.

---

## 2. What changes when the real backend lands

Each service file becomes a thin wrapper over the chosen client. Routes do
not change.

### Option A — Supabase (recommended)

```ts
// shipments.api.ts (real)
import { supabase } from "./client";

export async function getShipments(): Promise<Shipment[]> {
  const { data, error } = await supabase
    .from("shipments")
    .select("*")
    .order("eta", { ascending: true });
  if (error) throw createApiError(error.message, error.code);
  return data ?? [];
}
```

Auth state would flow through Supabase Auth and get applied via Row Level
Security (RLS) policies on every table. Roles (see §4) map to RLS rules.

### Option B — REST or RPC

Each function becomes a `fetch()` call against the corresponding endpoint
(e.g. `GET /api/shipments`). Keep the same return types so route code does
not change.

---

## 3. Recommended backend entities

| Entity                  | Notes                                                       |
|-------------------------|-------------------------------------------------------------|
| `users` / `profiles`    | Linked to Supabase Auth `auth.users.id`                     |
| `customers`             | Companies served by Altun Logistics                         |
| `shipments`             | Core operational record                                      |
| `shipment_events`       | Append-only timeline (status changes, comments, hand-offs)  |
| `quotes`                | Quote requests + status                                     |
| `quote_requests`        | Raw inbound submissions from public website (pre-quote)     |
| `customs_files`         | One per shipment customs case                               |
| `customs_documents`     | One row per required document (status, file ref)            |
| `warehouse_zones`       | Static zone catalogue + capacity                            |
| `handling_jobs`         | Inbound / outbound / cross-dock / picking jobs              |
| `team_tasks`            | Assigned to staff, links to shipment / quote / customs file |
| `automation_workflows`  | Workflow registry                                           |
| `automation_runs`       | One row per workflow execution                              |
| `email_drafts`          | Generated by Email Response Assistant; pending staff review |
| `notifications`         | Per-user inbox feed                                         |
| `audit_logs`            | Every mutation, who/when/what (compliance)                  |
| `dashboard_settings`    | Per-organisation preferences                                |

---

## 4. Recommended roles

| Role        | Scope                                                              |
|-------------|--------------------------------------------------------------------|
| `admin`     | Full access — settings, users, automation rules                    |
| `ceo`       | Read-only across the whole org + summary dashboards                |
| `operations`| Shipments, warehouse, handling jobs, team workload                 |
| `customs`   | Customs files, documents, customs SLA alerts                       |
| `sales`     | Customers, quote requests, quotes pipeline                         |
| `warehouse` | Warehouse zones, handling jobs, capacity alerts                    |
| `viewer`    | Read-only — useful for auditors / external partners                |

Map these to Supabase RLS via a `profiles.role` column and policy
checks. Every mutation should also write to `audit_logs`.

---

## 5. Recommended integrations

- **Database / API**: Supabase (Postgres + auto-generated REST + Realtime)
- **Auth**: Supabase Auth (email + OAuth) — alternatives: Clerk, Auth0
- **Storage**: Supabase Storage for customs documents and quote
  attachments. S3-compatible alternative if hosting moves off Supabase
- **Email**: transactional gateway (SES / Postmark / Resend) for
  customer communications and the Email Response Assistant outbound path
- **OCR / document processing**: triggered when a customs document is
  uploaded — extracts metadata for the completeness check
- **AI assistant layer**: server-side LLM gateway for the Email Response
  Assistant, Quote Preparation Assistant, and Delay Risk Detection. Keep
  prompts + redaction server-side so secrets never reach the browser

---

## 6. Migration checklist

1. Provision Supabase project (no commit needed in repo).
2. Add `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` to local `.env`.
3. Install `@supabase/supabase-js` (deferred — not yet a dependency).
4. Create Supabase client in `src/lib/dashboard/api/client.ts` alongside
   the existing helpers.
5. Replace each service body one entity at a time. Routes do not change.
6. Replace `useAsyncData` with `@tanstack/react-query` once you want
   caching + revalidation. Already in dependencies.
7. Add Supabase Auth, gate routes via TanStack Router `beforeLoad`
   redirect to `/login` when no session exists.
8. Add RLS policies per role.
9. Wire write actions: real `updateQuoteStatus`, real `runAutomationWorkflow`
   (calls a backend Edge Function), real `exportReport` (returns a signed
   storage URL).
10. Keep `VITE_API_MODE=mock` as a build-time fallback for local dev.

---

## 7. Files that still read static fixtures directly

These are intentional — see §1 notes:

- `src/routes/dashboard/automation.tsx` — drawer renderers consume the
  module-level imports of `automationWorkflows`, `automationEvents`,
  `automationSuggestions`, `automationRules`, `automationDraftEmail` for
  read paths. Page-level fetch still goes through `getAutomationCenter()`.

When the real backend lands, plumb `data` from the service into the drawer
renderers via context or props, then drop the direct imports.

---

## 8. Environment variables

See `.env.example` at the project root. The only currently-used variable
is `VITE_API_MODE=mock`. Real keys (Supabase, email gateway, AI gateway)
are listed there as placeholders only — do not commit live values.
