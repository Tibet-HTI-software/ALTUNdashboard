/**
 * Canonical Supabase entry point.
 *
 * The actual singleton `@supabase/supabase-js` client (initialised from
 * `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`) lives in
 * `dashboard/api/supabase.ts` alongside the dual-mode fallback helpers.
 * This module re-exports it so application code has one obvious import
 * path — and so only ONE client instance is ever created (multiple
 * `createClient` calls would spawn duplicate auth listeners).
 *
 * Usage:
 *   import { supabase, isSupabaseConfigured } from "@/lib/supabase";
 */
export {
  supabase,
  isSupabaseConfigured,
  isSchemaMissingError,
  withSupabaseFallback,
} from "./dashboard/api/supabase";
