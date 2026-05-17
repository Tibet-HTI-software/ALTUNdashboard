import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Anchor, ArrowRight, Lock, Mail, Sparkles, Zap } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useT } from "@/lib/dashboard/i18n";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Altun Logistics" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { authed, loading, signInWithPassword, signInWithGoogle, bypass } =
    useAuth();
  const t = useT();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Apply a dark canvas to the auth screen for the premium split look.
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  if (!loading && authed) {
    return <Navigate to="/dashboard" />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error: err } = await signInWithPassword(email, password);
    setBusy(false);
    if (err) setError(err);
    else navigate({ to: "/dashboard" });
  }

  async function handleGoogle() {
    setError(null);
    const { error: err } = await signInWithGoogle();
    if (err) setError(err);
  }

  function handleBypass() {
    bypass();
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="h-screen w-full overflow-hidden flex bg-slate-950 text-slate-100">
      {/* ── Left — abstract premium graphic ───────────────────── */}
      <div className="hidden lg:flex relative w-1/2 overflow-hidden border-r border-white/[0.06]">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black" />
        {/* glowing orbs */}
        <div className="absolute -left-24 top-1/4 h-96 w-96 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute right-0 bottom-0 h-80 w-80 rounded-full bg-brand/20 blur-3xl" />
        {/* grid */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="relative z-10 flex flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand/40 to-brand/10 border border-brand/30 shadow-[0_0_24px_-6px_var(--brand)]">
              <Anchor className="h-5 w-5 text-brand" />
            </span>
            <div>
              <p className="font-display font-bold tracking-tight text-white">
                Altun Logistics
              </p>
              <p className="text-[0.6rem] uppercase tracking-[0.25em] text-slate-400">
                Operations
              </p>
            </div>
          </div>

          <div className="max-w-md">
            <h1 className="font-display text-4xl font-bold leading-[1.15] tracking-tight text-white">
              {t("login.tagline")}
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              {t("login.taglineSub")}
            </p>
            <div className="mt-8 flex items-center gap-2 text-xs text-slate-500">
              <Sparkles className="h-3.5 w-3.5 text-brand" />
              {t("login.trusted")}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right — auth form ─────────────────────────────────── */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm"
        >
          <h2 className="font-display text-2xl font-bold tracking-tight text-white">
            {t("login.title")}
          </h2>
          <p className="mt-1 text-sm text-slate-400">{t("login.welcome")}</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <label className="block">
              <span className="text-xs font-medium text-slate-400">
                {t("login.email")}
              </span>
              <div className="mt-1 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("login.emailPlaceholder")}
                  autoComplete="email"
                  className="w-full h-11 rounded-xl border border-white/10 bg-white/[0.04] pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:border-brand/40 transition-colors"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-400">
                {t("login.password")}
              </span>
              <div className="mt-1 relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full h-11 rounded-xl border border-white/10 bg-white/[0.04] pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:border-brand/40 transition-colors"
                />
              </div>
            </label>

            {error && (
              <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-1.5 h-11 rounded-xl bg-gradient-to-br from-brand to-brand-strong text-white text-sm font-semibold shadow-[0_8px_24px_-10px_var(--brand)] hover:-translate-y-0.5 transition-transform disabled:opacity-60 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              {busy ? t("login.signingIn") : t("login.signIn")}
              {!busy && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          {/* divider */}
          <div className="my-4 flex items-center gap-3 text-[0.65rem] uppercase tracking-widest text-slate-600">
            <span className="h-px flex-1 bg-white/10" />
            {t("login.or")}
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl border border-white/10 bg-white/[0.04] text-sm font-medium text-white hover:bg-white/[0.08] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <GoogleMark />
            {t("login.google")}
          </button>

          <button
            type="button"
            onClick={handleBypass}
            className="mt-2 w-full inline-flex items-center justify-center gap-1.5 h-11 rounded-xl border border-brand/30 bg-brand/[0.08] text-sm font-semibold text-brand hover:bg-brand/[0.14] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <Zap className="h-4 w-4" />
            {t("login.demo")}
          </button>

          <p className="mt-4 text-center text-[0.68rem] text-slate-500">
            {t("login.demoHint")}
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}
