import { Throttle } from '../audio/mix';

export type HapticId = 'release' | 'blocked' | 'lifeLost' | 'chain' | 'complete' | 'reward';

/**
 * Vibration patterns in ms (on, off, on, …). All short: the longest is under
 * a quarter of a second, and nothing repeats or loops.
 *
 * Intensity can't be set: the Web Vibration API only controls duration, and
 * most Android devices ignore amplitude anyway, so there is no intensity
 * setting rather than one that wouldn't do anything.
 */
export const HAPTIC_PATTERNS: Readonly<Record<HapticId, number | readonly number[]>> = {
  release: 8, // very light tick
  blocked: 22, // a slightly firmer bump
  lifeLost: [30, 50, 30], // distinct double pulse
  chain: 12, // once per chain, not per arrow (see throttle)
  complete: [18, 60, 18, 60, 40], // short celebratory triple
  reward: [12, 40, 24], // a reward claimed or an achievement unlocked
};

/** Minimum gap per pattern, so rapid events never turn into continuous buzzing. */
const HAPTIC_GAP_MS: Readonly<Record<HapticId, number>> = {
  release: 60,
  blocked: 120,
  lifeLost: 300,
  chain: 600,
  complete: 1000,
  reward: 800,
};

/**
 * Where vibrations go. The browser backend uses `navigator.vibrate`; a
 * native backend (for example a Capacitor Haptics plugin) can implement the
 * same interface later without touching the game code.
 */
export interface HapticsBackend {
  readonly supported: boolean;
  vibrate(pattern: number | readonly number[]): void;
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
  return {
    supported,
    vibrate(pattern) {
      if (!supported || nav?.userActivation?.hasBeenActive === false) return;
      try {
        nav!.vibrate!(typeof pattern === 'number' ? pattern : [...pattern]);
      } catch {
        // Blocked by the browser or a permissions policy: haptics are optional.
      }
    },
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

  /** Returns true if a vibration was requested. */
  play(id: HapticId): boolean {
    if (!this.backend.supported || !this.enabled()) return false;
    if (!this.throttle.allow(id, HAPTIC_GAP_MS[id])) return false;
    this.backend.vibrate(HAPTIC_PATTERNS[id]);
    return true;
  }

  /** Cancels a vibration in progress (when switched off, or the app goes to the background). */
  stop(): void {
    if (this.backend.supported) this.backend.vibrate(0);
  }
}
