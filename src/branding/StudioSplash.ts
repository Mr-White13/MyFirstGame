import type { KeyValueStore } from '../storage/SafeStore';

/** sessionStorage flag: the splash already played in this session (WebView process or browser tab). */
export const SPLASH_SESSION_KEY = 'neon-escape.splash-shown';
/**
 * Splash timing, in milliseconds. The whole intro is reveal + hold + fade
 * (3.7 s by default): the M and W draw in and the name appears during
 * `reveal`, the finished logo stays for `hold` so "Mr. White Games" can be
 * read, then everything fades out over `fade`. The CSS animation in
 * style.css uses the same values (custom properties set from these).
 */
export interface SplashTiming {
  readonly reveal: number;
  readonly hold: number;
  readonly fade: number;
  /** Fade used when the player taps to skip (after the reveal). */
  readonly skipFade: number;
}

export const DEFAULT_SPLASH_TIMING: SplashTiming = Object.freeze({ reveal: 1300, hold: 1700, fade: 700, skipFade: 250 });

/** With reduced motion: the finished logo appears at once, stays this long, and is removed without a fade. */
export const REDUCED_SPLASH_MS = 2400;

/** Total time on screen when nobody taps. */
export function splashDuration(timing: SplashTiming = DEFAULT_SPLASH_TIMING, reducedMotion = false): number {
  return reducedMotion ? REDUCED_SPLASH_MS : timing.reveal + timing.hold + timing.fade;
}

export function sessionStore(): KeyValueStore | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
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
  addEventListener(type: 'pointerdown', listener: () => void): void;
  remove(): void;
}

export interface SplashOptions {
  readonly reducedMotion: boolean;
  readonly session: KeyValueStore | null;
  /** Durations (default DEFAULT_SPLASH_TIMING). */
  readonly timing?: SplashTiming;
  /** setTimeout by default; tests pass a fake clock. */
  readonly schedule?: (callback: () => void, ms: number) => unknown;
}

const defaultSchedule = (callback: () => void, ms: number) => setTimeout(callback, ms);

/**
 * The Mr. White Games startup splash. The markup is in index.html so it is on
 * screen from the first paint (the native launch screen is a plain colour, so
 * there is only one branded splash). This runs its timeline once and removes
 * it; the drawing itself is CSS and turns off with reduced motion.
 *
 * Once the logo has fully appeared (after `reveal`; at once with reduced
 * motion) a tap skips the rest with a short fade. Taps during the reveal are
 * ignored, so the logo is always seen.
 */
export class StudioSplash {
  private done: Promise<boolean> | null = null;
  private phase: 'revealing' | 'shown' | 'leaving' | 'gone' = 'revealing';
  private finish: () => void = () => {};

  constructor(
    private readonly element: SplashElement | null,
    private readonly options: SplashOptions,
  ) {}

  private get timing(): SplashTiming {
    return this.options.timing ?? DEFAULT_SPLASH_TIMING;
  }

  private get schedule(): (callback: () => void, ms: number) => unknown {
    return this.options.schedule ?? defaultSchedule;
  }

  /** Resolves when the splash is gone (true) or at once if it isn't shown this launch (false). */
  run(): Promise<boolean> {
    if (this.done) return this.done;
    const { element, options, timing } = this;
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
    element.addEventListener('pointerdown', () => this.skip());

    this.done = new Promise((resolve) => {
      this.finish = () => {
        if (this.phase === 'gone') return;
        this.phase = 'gone';
        element.remove();
        resolve(true);
      };
      if (options.reducedMotion) {
        this.show();
        this.schedule(() => this.finish(), REDUCED_SPLASH_MS);
        return;
      }
      this.schedule(() => this.show(), timing.reveal);
      this.schedule(() => this.leave(timing.fade), timing.reveal + timing.hold);
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

  private show(): void {
    if (this.phase !== 'revealing') return;
    this.phase = 'shown';
    this.element?.classList.add('studio-splash--ready'); // shows the "tap to skip" hint
  }

  private leave(fade: number): void {
    if (this.phase === 'leaving' || this.phase === 'gone') return;
    this.phase = 'leaving';
    this.element?.classList.add('studio-splash--leaving');
    this.schedule(() => this.finish(), fade);
  }
}
