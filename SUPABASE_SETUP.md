# Supabase Setup — Altun Logistics Dashboard

The dashboard runs **fully on mock data** out of the box. Supabase is
optional: connect it to swap the `oceanFreight.ts` fixtures for live data.
Until then every service call falls back to mock fixtures, so the app
never crashes.

## What is in the repo

```
supabase/
  config.toml                     local CLI config (project + ports)
  migrations/
    0001_initial_schema.sql
    0002_seed.sql
    0003_ocean_freight.sql         customers, shipments, automation_logs + RLS
```

`src/lib/supabase.ts` initialises the client from these env vars:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Put them in a local `.env` (see `.env.example`). Missing/placeholder
values → the app stays in mock mode automatically.

## Option A — Local Docker stack

Requires Docker Desktop running.

```bash
# 1. (only if supabase/ was not initialised) — config.toml already exists,
#    so this is normally NOT needed:
npx supabase init

# 2. Start the local stack (Postgres + Studio + Auth)
npx supabase start

# 3. Apply all migrations, including 0003
npx supabase db reset      # fresh DB, runs every migration in order

# 4. `supabase start` prints the local URL + anon key — copy them into .env:
#    VITE_SUPABASE_URL=http://127.0.0.1:54321
#    VITE_SUPABASE_ANON_KEY=<anon key from the start output>

# Studio UI: http://127.0.0.1:54323
```

Stop the stack with `npx supabase stop`.

## Option B — Link a cloud project

Your previous cloud project is paused. Create a fresh one at
<https://supabase.com/dashboard>, then:

```bash
# 1. Link this repo to the new project
npx supabase link --project-ref <new-project-ref>

# 2. Push the migrations to the cloud database
npx supabase db push

# 3. Copy the project URL + anon key from
#    Project Settings → API  into .env:
#    VITE_SUPABASE_URL=https://<new-project-ref>.supabase.co
#    VITE_SUPABASE_ANON_KEY=<anon public key>
```

## Verify

```bash
npm run dev
```

With valid env vars the service layer queries Supabase first. If the
`shipments` table is missing (migrations not applied) or the keys are
absent, it logs one warning and serves mock data — no crash.

## Notes

- Only the **publishable anon key** belongs in `.env` / the client.
  Never ship the `service_role` key to the browser.
- `0003_ocean_freight.sql` enables Row Level Security. Policies read the
  dashboard role from the JWT claim `user_role` — only `ceo` / `planner`
  may update shipment / demurrage rows.
