import { setMotionPreferences } from '../render/motion';
import { PALETTES, setPalette, type ThemeId } from '../render/theme';
import type { GameSettings, MotionChoice, SettingsStore, ThemeChoice } from './Settings';

/** The parts of MediaQueryList used here (lets tests pass a fake). */
export interface MediaQueryLike {
  readonly matches: boolean;
  addEventListener?(type: 'change', listener: () => void): void;
  /** Older Safari only has the deprecated form. */
  addListener?(listener: () => void): void;
}

export type MatchMedia = (query: string) => MediaQueryLike;

export const PREFERS_LIGHT = '(prefers-color-scheme: light)';
export const PREFERS_REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/**
 * `system` follows the device: Light when it asks for a light scheme,
 * otherwise Dark Neon (also when the device states no preference, so the
 * game keeps its own identity by default).
 */
export function resolveTheme(choice: ThemeChoice, systemPrefersLight: boolean): ThemeId {
  if (choice === 'system') return systemPrefersLight ? 'light' : 'dark';
  return choice;
}

/** An explicit On/Off always wins; Auto follows the device's reduced-motion preference. */
export function resolveReducedMotion(choice: MotionChoice, systemReduces: boolean): boolean {
  return choice === 'auto' ? systemReduces : choice === 'reduce';
}

/** What the page and the board should look like for these settings on this device. */
export interface ResolvedAppearance {
  readonly theme: ThemeId;
  readonly reducedMotion: boolean;
  readonly effects: GameSettings['effects'];
}

export function resolveAppearance(settings: GameSettings, system: { prefersLight: boolean; reducesMotion: boolean }): ResolvedAppearance {
  return {
    theme: resolveTheme(settings.theme, system.prefersLight),
    reducedMotion: resolveReducedMotion(settings.motion, system.reducesMotion),
    effects: settings.effects,
  };
}

const hex = (color: number) => `#${color.toString(16).padStart(6, '0')}`;

export interface AppearanceTarget {
  /** Usually `document.documentElement`: carries `data-theme`, `data-motion` and `data-effects` for CSS. */
  readonly root: { setAttribute(name: string, value: string): void };
  /** The `<meta name="theme-color">` element, if any (browser chrome colour on Android). */
  readonly themeColor?: { setAttribute(name: string, value: string): void } | null;
  readonly matchMedia?: MatchMedia;
}

/**
 * Applies the appearance settings everywhere at once: CSS (through data
 * attributes on <html>), the Phaser palette and motion preferences, and the
 * browser's theme colour. Follows device changes (light/dark, reduced motion)
 * while the game runs. index.html applies the saved theme before any script
 * loads, so there is no flash of the wrong theme at startup.
 */
export class Appearance {
  private readonly lightQuery: MediaQueryLike | null;
  private readonly motionQuery: MediaQueryLike | null;
  private resolved?: ResolvedAppearance;
  private readonly listeners = new Set<(appearance: ResolvedAppearance, previous: ResolvedAppearance | undefined) => void>();

  constructor(
    private readonly settings: SettingsStore,
    private readonly target: AppearanceTarget,
  ) {
    const match = target.matchMedia;
    this.lightQuery = match ? match(PREFERS_LIGHT) : null;
    this.motionQuery = match ? match(PREFERS_REDUCED_MOTION) : null;
    const follow = (query: MediaQueryLike | null) => {
      if (!query) return;
      if (query.addEventListener) query.addEventListener('change', () => this.apply());
      else query.addListener?.(() => this.apply());
    };
    follow(this.lightQuery);
    follow(this.motionQuery);
    settings.subscribe(() => this.apply());
    this.apply();
  }

  get current(): ResolvedAppearance {
    return this.resolved ?? this.resolve();
  }

  /** Calls `listener` whenever the resolved appearance changes (not on unrelated settings). */
  onChange(listener: (appearance: ResolvedAppearance, previous: ResolvedAppearance | undefined) => void): void {
    this.listeners.add(listener);
  }

  apply(): void {
    const next = this.resolve();
    const previous = this.resolved;
    if (previous && previous.theme === next.theme && previous.reducedMotion === next.reducedMotion && previous.effects === next.effects) {
      return;
    }
    this.resolved = next;
    setPalette(next.theme);
    setMotionPreferences(next.reducedMotion, next.effects);
    const { root, themeColor } = this.target;
    root.setAttribute('data-theme', next.theme);
    root.setAttribute('data-motion', next.reducedMotion ? 'reduce' : 'full');
    root.setAttribute('data-effects', next.effects);
    themeColor?.setAttribute('content', hex(PALETTES[next.theme].background));
    this.listeners.forEach((listener) => listener(next, previous));
  }

  private resolve(): ResolvedAppearance {
    return resolveAppearance(this.settings.current, {
      prefersLight: this.lightQuery?.matches ?? false,
      reducesMotion: this.motionQuery?.matches ?? false,
    });
  }
}
