import { useCallback, useRef } from "react";

/**
 * Sonic branding — synthesised UI feedback via the Web Audio API.
 *
 * No audio files: every sound is generated from oscillators + gain
 * envelopes, so it adds zero network weight. The AudioContext is created
 * lazily on first use (a user gesture) to satisfy browser autoplay
 * policies, and every call fails silently if audio is blocked.
 *
 *  - playHover()      ultra-short high tick (card hover)
 *  - playRoleSwitch() soft low chord/thud (role change)
 *  - playSuccess()    futuristic double-beep (workflow / AI action)
 */

type AudioCtor = typeof AudioContext;

function resolveAudioContext(): AudioCtor | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioCtor })
      .webkitAudioContext ??
    null
  );
}

interface ToneOptions {
  ctx: AudioContext;
  freq: number;
  /** Seconds from now to start. */
  delay?: number;
  /** Note length in seconds. */
  duration: number;
  /** Peak gain (0–1). */
  gain: number;
  type?: OscillatorType;
}

/** Plays a single enveloped oscillator note. */
function playTone({
  ctx,
  freq,
  delay = 0,
  duration,
  gain,
  type = "sine",
}: ToneOptions) {
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);

  // Fast attack, smooth exponential release — keeps it click-free.
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(amp).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

// ── Standalone alert tone (importable without the hook) ───────────────────────
//
// Used by `useRealtimeShipments` to signal critical changes (new customs hold
// or D&D dropping below 24 h) without requiring a hook call inside a hook.
// A separate module-level AudioContext isolates it from the shared hook ctx.

let _alertCtx: AudioContext | null = null;

/**
 * Three-tone descending chime — distinct from `playSuccess` so operators can
 * recognise a critical alert vs routine UI feedback.
 * Fails silently if audio is blocked by the browser.
 */
export function playAlertTone(): void {
  try {
    const Ctor = resolveAudioContext();
    if (!Ctor) return;
    if (!_alertCtx) _alertCtx = new Ctor();
    const ctx = _alertCtx;
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    // High → mid → low: urgency signal, opposite direction to the success beep.
    playTone({ ctx, freq: 1760, duration: 0.12,  gain: 0.06,  type: "sine" });
    playTone({ ctx, freq: 1320, delay: 0.13, duration: 0.10, gain: 0.055, type: "sine" });
    playTone({ ctx, freq: 880,  delay: 0.25, duration: 0.18, gain: 0.05,  type: "sine" });
  } catch {
    /* audio blocked — ignore */
  }
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useUiSounds() {
  const ctxRef = useRef<AudioContext | null>(null);

  /** Lazily create + resume the shared AudioContext. */
  const getCtx = useCallback((): AudioContext | null => {
    if (!ctxRef.current) {
      const Ctor = resolveAudioContext();
      if (!Ctor) return null;
      try {
        ctxRef.current = new Ctor();
      } catch {
        return null;
      }
    }
    const ctx = ctxRef.current;
    if (ctx.state === "suspended") {
      void ctx.resume().catch(() => {});
    }
    return ctx;
  }, []);

  const playHover = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    try {
      playTone({
        ctx,
        freq: 2600,
        duration: 0.045,
        gain: 0.022,
        type: "triangle",
      });
    } catch {
      /* audio blocked — ignore */
    }
  }, [getCtx]);

  const playRoleSwitch = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    try {
      // Soft low chord — root + fifth — for an organic 'thud'.
      playTone({ ctx, freq: 116, duration: 0.26, gain: 0.09, type: "sine" });
      playTone({ ctx, freq: 174, duration: 0.22, gain: 0.05, type: "sine" });
    } catch {
      /* ignore */
    }
  }, [getCtx]);

  const playSuccess = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    try {
      // Quick futuristic double-beep, rising.
      playTone({ ctx, freq: 880, duration: 0.08, gain: 0.05, type: "sine" });
      playTone({
        ctx,
        freq: 1320,
        delay: 0.085,
        duration: 0.1,
        gain: 0.05,
        type: "sine",
      });
    } catch {
      /* ignore */
    }
  }, [getCtx]);

  return { playHover, playRoleSwitch, playSuccess };
}
