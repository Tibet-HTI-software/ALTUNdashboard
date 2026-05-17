# Supabase setup — Altun Logistics Dashboard

This guide walks through creating the Supabase project, applying the
initial schema + seed data, and creating the first staff users.

The frontend is **not yet** connected to Supabase — the app still runs on
the mock service layer in `src/lib/dashboard/api/*`. This setup just
provisions the database so a follow-up migration can swap the service
bodies for real Supabase calls without further schema work.

---

## 1. Create the Supabase project

1. Sign in at <https://supabase.com>.
2. **New project** → choose an organisation → name it
   `altun-logistics-dashboard`.
3. Pick a region close to Antwerp (e.g. `eu-central-1`).
4. Set a strong database password and store it somewhere safe.
5. Wait for the project to provision (a few minutes).

---

## 2. Capture the API credentials

Project Settings → **API** → copy:

| Field | Use |
|-------|-----|
| `Project URL`              | `VITE_SUPABASE_URL` |
| `anon` `public` key        | `VITE_SUPABASE_ANON_KEY` (also called the *publishable* key) |
| `service_role` `secret` key| **server-side only** — never commit, never put in `VITE_*` |

### Local `.env`

A starter `.env` ships in the project root with placeholder values:

```
VITE_API_MODE=mock
VITE_APP_ENV=development
VITE_SUPABASE_URL=PASTE_SUPABASE_PROJECT_URL_HERE
VITE_SUPABASE_ANON_KEY=PASTE_SUPABASE_PUBLISHABLE_KEY_HERE
```

Open the file and replace the two `PASTE_…` placeholders with the values
from Supabase Studio. **Keep `.env` out of version control** — it is
already in `.gitignore`. `.env.example` stays committed with empty
placeholders so new contributors know what to fill in.

While the placeholders are still in `.env` the dashboard transparently
falls back to the in-memory mock fixtures, so the UI stays usable until
real keys are pasted in.

---

## 3. Apply the schema

The repository ships two SQL migrations under `supabase/migrations/`:

| File | What it does |
|------|--------------|
| `0001_initial_schema.sql` | All enums, tables, indexes, helper functions (`set_updated_at`, `has_role`), and RLS policies. |
| `0002_seed.sql`           | Demo data mirroring the current mock fixtures (customers, shipments, quotes, customs files, documents, warehouse zones, handling jobs, team tasks, automation workflows + events, default org settings). |

### Option A — Supabase SQL Editor (fastest)

1. Open the project in Supabase Studio → **SQL Editor** → **New query**.
2. Paste the entire contents of `supabase/migrations/0001_initial_schema.sql`.
3. **Run**. You should see "Success. No rows returned" once it finishes.
4. Open another **New query**, paste `supabase/migrations/0002_seed.sql`,
   **Run**.

### Option B — Supabase CLI

```bash
# install if needed
npm install --global supabase

# from project root
supabase login
supabase link --project-ref <your-project-ref>

# apply both migrations in order
supabase db push
```

---

## 4. Create the first staff users

Profiles in this schema reference `auth.users(id)` so you cannot insert a
profile without an auth user existing first.

1. Supabase Studio → **Authentication → Users → Add user → Email + password**.
   Create one user per staff member (start with the CEO / admin).
2. Once each user exists, copy their `id` from the Users table.
3. Run this SQL once per user, replacing the UUIDs and details:

```sql
insert into profiles (id, full_name, email, role, department) values
  ('00000000-0000-0000-0000-000000000000', 'Huseyin Altun', 'huseyin@altunlogistics.be', 'admin',  'Leadership');
```

Roles available:

`admin · ceo · operations · customs · sales · warehouse · viewer`

---

## 5. Verify

In SQL Editor:

```sql
select count(*) from customers;        -- expects 8
select count(*) from shipments;        -- expects 10
select count(*) from quotes;           -- expects 8
select count(*) from automation_workflows; -- expects 6
select * from has_role(array['admin']::user_role[]);  -- run while authed as admin → true
```

The dashboard `/dashboard/automation` mock fixtures map 1:1 to the seeded
`automation_*` rows, so once the frontend is switched to Supabase the
existing UI should render unchanged.

---

## 6. RLS notes

- Every table has RLS enabled. Anonymous traffic (no JWT) gets nothing.
- Authenticated reads are open across business tables; mutations are
  gated to the user's `profiles.role` via the `has_role(...)` helper.
- `notifications`, `dashboard_settings` (user scope), and `audit_logs`
  have stricter, owner-scoped policies.
- Tighten policies in follow-up migrations once auth is wired up
  (e.g. customer-scoped views for sales reps, customs-only access to
  customs files for the customs team).

---

## 7. Next steps (not in this PR)

1. Install `@supabase/supabase-js` (deferred).
2. Add `src/lib/dashboard/api/supabase.ts` exporting a singleton client
   built from `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
3. Replace the body of each service file in `src/lib/dashboard/api/*` with
   real Supabase queries. The function signatures stay identical, so no
   route or component file needs to change.
4. Swap `useAsyncData` for `@tanstack/react-query` (already in
   `package.json`) for caching + revalidation.
5. Add Supabase Auth and route-guard via TanStack Router `beforeLoad`.
6. Audit RLS policies once real workflows are in production.

---

## Troubleshooting

### `Could not find the table 'public.customers' in the schema cache`

This means the schema has **not been applied yet** — Supabase's PostgREST
schema cache only knows about tables that exist when it inspects the
database. Fix order:

1. Run `supabase/migrations/0001_initial_schema.sql` in the SQL Editor.
2. Run `supabase/migrations/0002_seed.sql` in the SQL Editor.
3. Force PostgREST to reload its schema cache:

   ```sql
   notify pgrst, 'reload schema';
   ```

4. Restart the dev server (Ctrl+C in the terminal running `npm run dev`,
   then `npm run dev` again).
5. Hard-refresh the browser tab (Ctrl+Shift+R / Cmd+Shift+R).

After this, **Table Editor** should list at least these tables in the
`public` schema:

  `profiles · customers · shipments · shipment_events · quotes ·
  customs_files · documents · warehouse_zones · handling_jobs ·
  team_tasks · automation_workflows · automation_events · notifications ·
  audit_logs · dashboard_settings`

`customers` should contain 8 rows (Demir Industrial Trading, Karlsruhe
Maschinenbau GmbH, BeneluxFresh BV, Polimer Plastik San., Egean Trade
House, Anatolia Steel Co., Italmoda Tessile SRL, Pirene Distribution).

### Other common errors

- **`type "user_role" already exists`** — the schema migration ran twice.
  The `do $$ … exception` blocks swallow this; safe to ignore.
- **Foreign key violation in seed** — make sure 0001 ran fully before 0002.
- **`new row violates row-level security policy`** — you ran a mutation
  while not authenticated, or your `profiles.role` does not match the
  policy. Confirm `has_role(array['admin'])` returns true.
- **`function gen_random_uuid() does not exist`** — `pgcrypto` extension
  did not enable. Re-run `create extension if not exists "pgcrypto";`.
- **Customers page shows empty list (no error)** — RLS blocks anonymous
  reads. Either log in via Supabase Auth (a follow-up PR will add
  this) or, for quick testing only, temporarily relax the read policy in
  SQL Editor:

  ```sql
  -- TEMP: allow anonymous reads of customers (revert before production!)
  drop policy if exists customers_read on customers;
  create policy customers_read on customers for select using (true);
  ```
