import type { KeyValueStore } from '../storage/SafeStore';

/** sessionStorage flag: the splash already played in this session (WebView process or browser tab). */
export const SPLASH_SESSION_KEY = 'neon-escape.splash-shown';
/** Set by the inline script in index.html: the clock time (performance.now) the splash started at first paint. */
export const SPLASH_START_GLOBAL = '__neonSplashStart';

/**
 * Splash timing, in milliseconds. The whole intro is reveal + hold + fade
 * (3.7 s by default): the mark and the name fade and settle in during
 * `reveal`, the finished logo stays for `hold` so "Mr. White Games" can be
 * read, then everything fades out over `fade` while the recap (or Home)
 * fades in underneath. The CSS animation in style.css uses the same values
 * (custom properties set from these; the fallbacks there match the defaults).
 */
export interface SplashTiming {
  readonly reveal: number;
  readonly hold: number;
  readonly fade: number;
  /** Fade used when the player taps to skip (after the reveal). */
  readonly skipFade: number;
}

export const DEFAULT_SPLASH_TIMING: SplashTiming = Object.freeze({ reveal: 1100, hold: 2000, fade: 600, skipFade: 250 });

/** The name is fully in view this far into the reveal (its CSS animation ends here). */
export const NAME_IN_FRACTION = 0.85;

/** With reduced motion: the finished logo appears at once, stays this long, and is removed without a fade. */
export const REDUCED_SPLASH_MS = 2600;

/** Total time on screen when nobody taps. */
export function splashDuration(timing: SplashTiming = DEFAULT_SPLASH_TIMING, reducedMotion = false): number {
  return reducedMotion ? REDUCED_SPLASH_MS : timing.reveal + timing.hold + timing.fade;
}

/** How long "Mr. White Games" is fully visible when nobody taps. */
export function nameVisibleFor(timing: SplashTiming = DEFAULT_SPLASH_TIMING, reducedMotion = false): number {
  return reducedMotion ? REDUCED_SPLASH_MS : timing.reveal * (1 - NAME_IN_FRACTION) + timing.hold;
}

export function sessionStore(): KeyValueStore | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

/** When the inline script started the splash at first paint, if it did. */
export function firstPaintStart(): number | undefined {
  const value = typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>)[SPLASH_START_GLOBAL] : undefined;
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/**
 * True on a cold launch: the app process (or browser tab) has not shown the
 * splash yet. Android resume never reloads the page, so it never asks again;
 * a reload in the same session is not a cold launch either. Without session
 * storage the splash is shown (and simply can't be remembered).
 */
export function shouldShowSplash(session: KeyValueStore | null): boolean {
  try {
    return session?.getItem(SPLASH_SESSION_KEY) !== '1';
  } catch {
    return true;
  }
}

/** The parts of the splash element used here (lets tests pass a fake). */
export interface SplashElement {
  readonly classList: { add(name: string): void };
  readonly style: { setProperty(name: string, value: string): void };
  addEventListener(type: 'pointerdown' | 'click', listener: (event: { preventDefault(): void; stopPropagation(): void }) => void): void;
  remove(): void;
}

export interface SplashOptions {
  readonly reducedMotion: boolean;
  readonly session: KeyValueStore | null;
  /** Durations (default DEFAULT_SPLASH_TIMING). */
  readonly timing?: SplashTiming;
  /**
   * Clock time the splash started on screen. index.html starts the CSS reveal
   * at first paint and records that moment, so the timeline here lines up
   * with what is on screen however long the game took to load. Defaults to now.
   */
  readonly startedAt?: number;
  /** Monotonic clock in ms (performance.now by default). */
  readonly now?: () => number;
  /** setTimeout by default; tests pass a fake clock. */
  readonly schedule?: (callback: () => void, ms: number) => unknown;
}

type Phase = 'revealing' | 'shown' | 'leaving' | 'gone';

/**
 * The Mr. White Games startup splash. The markup is in index.html, and the
 * inline script there starts the CSS reveal at first paint (on the studio's
 * dark background, the native launch colour, so there is no white flash and
 * only one branded splash). This class runs the rest of the timeline once:
 *
 *   reveal → shown (tap to skip) → leaving (fade) → gone
 *
 * Every phase is computed from the same start time on a monotonic clock, not
 * from frame counts or from when this script happened to load, so a slow
 * start never shortens or desynchronises the intro. Only opacity and
 * transform are animated (composited), so a busy main thread while the game
 * boots doesn't make it stutter.
 *
 * `onLeaving` runs when the fade-out starts, so the next screen (the recap
 * overlay, or Home) is already appearing underneath: one crossfade, no gap.
 * The splash keeps catching taps until it is gone, so a skip tap never lands
 * on what is underneath.
 */
export class StudioSplash {
  private done: Promise<boolean> | null = null;
  private phase: Phase = 'revealing';
  private finish: () => void = () => {};
  private onLeaving: () => void = () => {};

  constructor(
    private readonly element: SplashElement | null,
    private readonly options: SplashOptions,
  ) {}

  private get timing(): SplashTiming {
    return this.options.timing ?? DEFAULT_SPLASH_TIMING;
  }

  private get schedule(): (callback: () => void, ms: number) => unknown {
    return this.options.schedule ?? ((callback: () => void, ms: number) => setTimeout(callback, ms));
  }

  private get now(): number {
    return (this.options.now ?? (() => performance.now()))();
  }

  /** The current phase (for tests and the intro). */
  get state(): Phase {
    return this.phase;
  }

  /**
   * Resolves when the splash is gone (true) or at once if it isn't shown this
   * launch (false). `onLeaving` runs once, as the fade-out begins.
   */
  run(onLeaving: () => void = () => {}): Promise<boolean> {
    if (this.done) return this.done;
    const { element, options, timing } = this;
    this.onLeaving = onLeaving;
    if (!element || !shouldShowSplash(options.session)) {
      element?.remove();
      this.phase = 'gone';
      this.done = Promise.resolve(false);
      return this.done;
    }
    try {
      options.session?.setItem(SPLASH_SESSION_KEY, '1');
    } catch {
      // Not remembered: a reload would show it again, which is harmless.
    }
    element.style.setProperty('--splash-reveal', `${timing.reveal}ms`);
    element.style.setProperty('--splash-fade', `${timing.fade}ms`);
    element.style.setProperty('--splash-skip-fade', `${timing.skipFade}ms`);
    element.classList.add('studio-splash--play'); // no-op if index.html already started it
    element.addEventListener('pointerdown', () => this.skip());
    // Taps on the splash never reach the screen underneath, even while it fades out.
    element.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });

    const start = Math.min(options.startedAt ?? this.now, this.now);
    const elapsed = () => this.now - start;
    this.done = new Promise((resolve) => {
      this.finish = () => {
        if (this.phase === 'gone') return;
        if (this.phase !== 'leaving') this.onLeaving(); // reduced motion: no fade, hand over now
        this.phase = 'gone';
        element.remove();
        resolve(true);
      };
      if (options.reducedMotion) {
        this.show();
        this.at(REDUCED_SPLASH_MS - elapsed(), () => this.finish());
        return;
      }
      this.at(timing.reveal - elapsed(), () => this.show());
      this.at(timing.reveal + timing.hold - elapsed(), () => this.leave(timing.fade));
    });
    return this.done;
  }

  /** A tap: ends the splash early, but only once the logo has fully appeared. */
  skip(): void {
    if (this.phase !== 'shown') return;
    if (this.options.reducedMotion) {
      this.finish();
      return;
    }
    this.element?.classList.add('studio-splash--skipped');
    this.leave(this.timing.skipFade);
  }

  /** Runs `callback` after `ms` (at once if that moment has already passed). */
  private at(ms: number, callback: () => void): void {
    if (ms <= 0) callback();
    else this.schedule(callback, ms);
  }

  private show(): void {
    if (this.phase !== 'revealing') return;
    this.phase = 'shown';
    this.element?.classList.add('studio-splash--ready'); // shows the "tap to skip" hint
  }

  private leave(fade: number): void {
    if (this.phase === 'leaving' || this.phase === 'gone') return;
    if (this.phase === 'revealing') this.show();
    this.phase = 'leaving';
    this.element?.classList.add('studio-splash--leaving');
    this.onLeaving(); // the next screen fades in underneath while this fades out
    this.schedule(() => this.finish(), fade);
  }
}
