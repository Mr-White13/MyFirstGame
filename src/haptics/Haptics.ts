import { Throttle } from '../audio/mix';

export type HapticId = 'release' | 'blocked' | 'lifeLost' | 'chain' | 'complete' | 'reward' | 'promoted';

/**
 * One haptic effect: segments of `timings` ms, each at `amplitudes` (0 = pause,
 * 1..255 = strength). The native Android backend plays it as a waveform; the
 * browser backend turns it into an on/off pattern (no strength control).
 */
export interface HapticEffect {
  readonly timings: readonly number[];
  readonly amplitudes: readonly number[];
}

/**
 * The game's effects. Every pulse is at least ~30 ms: shorter ones (the
 * first version used 8–12 ms) are below what many phone motors can make you
 * feel. Nothing lasts more than a third of a second, and nothing repeats.
 */
export const HAPTIC_EFFECTS: Readonly<Record<HapticId, HapticEffect>> = {
  release: { timings: [32], amplitudes: [140] }, // a light tick
  chain: { timings: [36], amplitudes: [170] }, // once per chain, not per arrow (see throttle)
  blocked: { timings: [48], amplitudes: [220] }, // a firmer bump
  lifeLost: { timings: [45, 60, 45], amplitudes: [230, 0, 230] }, // distinct double pulse
  complete: { timings: [40, 70, 40, 70, 90], amplitudes: [190, 0, 190, 0, 255] }, // short celebration
  reward: { timings: [35, 50, 60], amplitudes: [180, 0, 255] }, // reward claimed, achievement unlocked
  promoted: { timings: [50, 60, 50, 60, 120], amplitudes: [200, 0, 220, 0, 255] }, // league promotion
};

/** The Settings "Test vibration" effect: long and strong enough to be unmistakable. */
export const TEST_EFFECT: HapticEffect = { timings: [400], amplitudes: [255] };

/** Minimum gap per effect, so rapid events never turn into continuous buzzing. */
const HAPTIC_GAP_MS: Readonly<Record<HapticId, number>> = {
  release: 70,
  blocked: 120,
  lifeLost: 300,
  chain: 600,
  complete: 1000,
  reward: 800,
  promoted: 1500,
};

/** Total length of an effect in ms. */
export function effectDuration(effect: HapticEffect): number {
  return effect.timings.reduce((sum, t) => sum + Math.max(0, t), 0);
}

/**
 * The Web Vibration API pattern for an effect: alternating vibrate/pause
 * durations starting with a vibration. Consecutive segments of the same kind
 * are merged; amplitudes only decide on (>0) or off (0).
 */
export function toWebPattern(effect: HapticEffect): number[] {
  const out: number[] = [];
  let on = true; // the next entry in `out` is a vibration
  effect.timings.forEach((t, i) => {
    const segmentOn = (effect.amplitudes[i] ?? 255) > 0;
    if (segmentOn === on) {
      out.push(Math.max(0, t));
      on = !on;
    } else if (out.length === 0) {
      out.push(0, Math.max(0, t)); // starts with a pause: vibrate 0 ms first
    } else {
      out[out.length - 1] += Math.max(0, t);
    }
  });
  return out;
}

export type HapticTestStatus = 'sent' | 'failed' | 'unsupported';

/** The result of the Settings test. "sent" means the request was accepted, not that it was felt. */
export interface HapticTestResult {
  readonly status: HapticTestStatus;
  /** Short technical note for logs (never shown as an error code to players). */
  readonly detail?: string;
}

/**
 * Where vibrations go: the browser's Vibration API, or the native Android
 * plugin in the installed app (see native/nativeApp.ts).
 */
export interface HapticsBackend {
  readonly kind: 'native' | 'web' | 'none';
  readonly supported: boolean;
  play(effect: HapticEffect, label: string): void;
  stop(): void;
  test(effect: HapticEffect): Promise<HapticTestResult>;
}

type VibrateNavigator = { vibrate?: (pattern: number | number[]) => boolean; userActivation?: { hasBeenActive: boolean } };

/**
 * Web Vibration API. Supported in Chrome for Android; desktop Chrome has the
 * function but no motor, and Safari/iOS doesn't have it at all. Chrome also
 * ignores calls until the user has interacted with the page, so those are
 * skipped instead of producing console warnings.
 */
export function webVibrationBackend(nav: VibrateNavigator | undefined = typeof navigator !== 'undefined' ? navigator : undefined): HapticsBackend {
  const supported = typeof nav?.vibrate === 'function';
  const send = (pattern: number | number[]): boolean => {
    if (!supported || nav?.userActivation?.hasBeenActive === false) return false;
    try {
      return nav!.vibrate!(pattern) !== false;
    } catch {
      return false; // blocked by the browser or a permissions policy: haptics are optional
    }
  };
  return {
    kind: supported ? 'web' : 'none',
    supported,
    play: (effect) => void send(toWebPattern(effect)),
    stop: () => void send(0),
    test: async (effect) =>
      !supported ? { status: 'unsupported', detail: 'no navigator.vibrate' } : send(toWebPattern(effect)) ? { status: 'sent' } : { status: 'failed', detail: 'navigator.vibrate refused' },
  };
}

/** Plays haptic cues when the player has them switched on and the device supports them. */
export class Haptics {
  private readonly throttle: Throttle;

  constructor(
    private readonly enabled: () => boolean,
    private readonly backend: HapticsBackend = webVibrationBackend(),
    now: () => number = () => performance.now(),
  ) {
    this.throttle = new Throttle(now);
  }

  get supported(): boolean {
    return this.backend.supported;
  }

  get kind(): HapticsBackend['kind'] {
    return this.backend.kind;
  }

  /** Returns true if a vibration was requested. */
  play(id: HapticId): boolean {
    if (!this.backend.supported || !this.enabled()) return false;
    if (!this.throttle.allow(id, HAPTIC_GAP_MS[id])) return false;
    this.backend.play(HAPTIC_EFFECTS[id], id);
    return true;
  }

  /** Cancels a vibration in progress (switched off, or the app went to the background). */
  stop(): void {
    if (this.backend.supported) this.backend.stop();
  }

  /**
   * The Settings diagnostic: one strong vibration, even if the Vibration
   * setting is off (it's an explicit request to check the device).
   */
  test(): Promise<HapticTestResult> {
    if (!this.backend.supported) return Promise.resolve({ status: 'unsupported' });
    return this.backend.test(TEST_EFFECT);
  }
}
