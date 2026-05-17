/**
 * Singleton Supabase client + dual-mode helpers.
 *
 * Two modes:
 *  - Mock: env vars missing → service files keep returning the static
 *    fixtures from `src/data/dashboard/*` so the app boots without a backend.
 *  - Live: both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set →
 *    service files fetch from Supabase using this client.
 *
 * Service files import `supabase`, `isSupabaseConfigured`, and
 * `withSupabaseFallback`. They branch on the flag to keep call sites
 * simple. The fallback wrapper handles the common case where the schema
 * has not yet been applied yet (PGRST205 / 42P01) by warning once and
 * returning the mock data so the UI never crashes mid-setup.
 *
 * Never put the service_role key on the client. Only the publishable
 * `anon` key belongs in `VITE_SUPABASE_ANON_KEY`.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ApiError, createApiError } from "./client";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * True when both env vars are present and not the placeholder strings the
 * .env.example ships with. Service files should branch on this.
 */
export const isSupabaseConfigured: boolean = Boolean(
  url && anonKey && !url.startsWith("PASTE_") && !anonKey.startsWith("PASTE_"),
);

/**
 * Always-defined client. When env vars are missing we still create a
 * client against safe placeholder values so importing this module never
 * throws — call sites must gate live calls on `isSupabaseConfigured`.
 */
export const supabase: SupabaseClient = createClient(
  url ?? "https://placeholder.supabase.co",
  anonKey ?? "placeholder-anon-key",
  {
    auth: { persistSession: true, autoRefreshToken: true },
  },
);

/**
 * Returns true when the error indicates the table or schema is not yet
 * present in the PostgREST cache (typically because migrations have not
 * been applied yet). Used to keep the dashboard functional during the
 * DB setup gap by transparently falling back to mock fixtures.
 *
 * Real auth / RLS / network errors are NOT matched — those should
 * surface to the UI so problems are visible.
 */
export function isSchemaMissingError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  // PostgrestError shape:
  //   { code: 'PGRST205', message: 'Could not find the table …' }
  const e = err as { code?: string; message?: string };
  const code = e.code ?? "";
  const msg = (e.message ?? "").toLowerCase();
  return (
    code === "PGRST205" ||
    code === "PGRST301" ||
    code === "42P01" ||
    // Permission denied — anon role missing GRANT or RLS blocks read.
    // Treat the same as schema-missing so the UI falls back to mock data
    // rather than surfacing an error state.
    code === "42501" ||
    msg.includes("schema cache") ||
    msg.includes("does not exist") ||
    msg.includes("permission denied")
  );
}

const warnedLabels = new Set<string>();

/**
 * Run a Supabase query when configured, fall back to a mock producer when:
 *  - Supabase is not configured (placeholder env), OR
 *  - The query failed because the schema is not yet applied.
 *
 * Real backend errors (auth/RLS/network) are wrapped in ApiError and
 * re-thrown so the UI surfaces them.
 *
 * @param label    Short identifier for warning messages (e.g. "customers").
 * @param live     Function that performs the Supabase query when configured.
 * @param mock     Function that returns the mock-data result.
 */
export async function withSupabaseFallback<T>(
  label: string,
  live: () => Promise<T>,
  mock: () => Promise<T>,
): Promise<T> {
  if (!isSupabaseConfigured) {
    if (!warnedLabels.has(`${label}:config`)) {
      warnedLabels.add(`${label}:config`);

      console.warn(
        `[supabase] not configured — using mock data for "${label}". Paste real keys into .env to enable live mode.`,
      );
    }
    return mock();
  }
  try {
    return await live();
  } catch (err) {
    if (isSchemaMissingError(err)) {
      if (!warnedLabels.has(`${label}:schema`)) {
        warnedLabels.add(`${label}:schema`);

        console.warn(
          `[supabase] schema not applied for "${label}" yet — falling back to mock data. Run supabase/migrations/0001 + 0002 to enable live data.`,
        );
      }
      return mock();
    }
    if (err instanceof ApiError) throw err;
    const e = err as { message?: string; code?: string };
    throw createApiError(
      e.message ?? `Supabase query for "${label}" failed.`,
      e.code ?? "supabase_error",
    );
  }
}
