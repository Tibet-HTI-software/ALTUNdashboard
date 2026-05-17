/**
 * Authentication context — Supabase Auth with a demo bypass.
 *
 * Wraps the app and exposes the current user + auth actions. Real auth
 * uses `supabase.auth` (`onAuthStateChange`). When no Supabase project is
 * connected the "demo bypass" lets the team enter the dashboard without a
 * backend — it sets a local flag and a mock CEO user.
 *
 * The logged-in user's `user_role` JWT metadata is synced into the
 * `useRole()` store so the dashboard opens in the right view.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { setStoredRole, type Role } from "@/lib/dashboard/role";

const BYPASS_KEY = "altun-auth-bypass";

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  /** True when this is the demo-bypass user, not a real Supabase session. */
  mock: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  authed: boolean;
  signInWithPassword: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  /** Demo entry — no backend required. */
  bypass: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isRole(v: unknown): v is Role {
  return v === "ceo" || v === "planner" || v === "customs" || v === "service";
}

/** Reads the dashboard role from a Supabase user's metadata. */
function roleFromMetadata(meta: Record<string, unknown> | undefined): Role {
  const r = meta?.user_role;
  return isRole(r) ? r : "ceo";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    // Demo bypass takes priority — instant entry, no network.
    try {
      if (localStorage.getItem(BYPASS_KEY) === "1") {
        setUser({
          id: "demo-bypass",
          email: "demo@altun-logistics.com",
          role: "ceo",
          mock: true,
        });
        setLoading(false);
        return;
      }
    } catch {
      /* storage blocked — fall through to Supabase */
    }

    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        const s = data.session;
        if (s?.user) {
          const role = roleFromMetadata(s.user.user_metadata);
          setStoredRole(role);
          setUser({
            id: s.user.id,
            email: s.user.email ?? "",
            role,
            mock: false,
          });
        }
        setLoading(false);
      })
      .catch(() => active && setLoading(false));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!active) return;
      if (s?.user) {
        const role = roleFromMetadata(s.user.user_metadata);
        setStoredRole(role);
        setUser({
          id: s.user.id,
          email: s.user.email ?? "",
          role,
          mock: false,
        });
      } else {
        setUser(null);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      if (!isSupabaseConfigured) {
        return {
          error:
            "Supabase is not connected. Use the demo bypass to explore the dashboard.",
        };
      }
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error: error?.message ?? null };
    },
    [],
  );

  const signInWithGoogle = useCallback(async () => {
    if (!isSupabaseConfigured) {
      return {
        error:
          "Supabase is not connected. Use the demo bypass to explore the dashboard.",
      };
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    return { error: error?.message ?? null };
  }, []);

  const bypass = useCallback(() => {
    try {
      localStorage.setItem(BYPASS_KEY, "1");
    } catch {
      /* ignore */
    }
    setStoredRole("ceo");
    setUser({
      id: "demo-bypass",
      email: "demo@altun-logistics.com",
      role: "ceo",
      mock: true,
    });
  }, []);

  const signOut = useCallback(async () => {
    try {
      localStorage.removeItem(BYPASS_KEY);
    } catch {
      /* ignore */
    }
    if (isSupabaseConfigured) {
      await supabase.auth.signOut().catch(() => {});
    }
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      authed: user !== null,
      signInWithPassword,
      signInWithGoogle,
      bypass,
      signOut,
    }),
    [user, loading, signInWithPassword, signInWithGoogle, bypass, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
