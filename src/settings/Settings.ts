import { browserStorage, parseObject, SafeStore, type KeyValueStore, type SaveStatus } from '../storage/SafeStore';

/** The player's visual theme choice. `system` follows the device's light/dark preference. */
export type ThemeChoice = 'dark' | 'light' | 'colorful' | 'system';
/**
 * Reduced motion: `auto` follows the device's `prefers-reduced-motion`,
 * `reduce` always reduces ("On"), `full` never does ("Off"). An explicit
 * choice always wins over the device preference.
 */
export type MotionChoice = 'auto' | 'reduce' | 'full';
/** How much decorative effect work is done: particles, trails, background motes. */
export type EffectsLevel = 'off' | 'low' | 'normal';

/**
 * Everything on the Settings screen. Kept apart from progress, profile and
 * statistics: resetting settings never touches player data.
 */
export interface GameSettings {
  readonly theme: ThemeChoice;
  readonly motion: MotionChoice;
  readonly effects: EffectsLevel;
  /** Master mute: silences music and sound effects without changing their own switches. */
  readonly muted: boolean;
  readonly music: boolean;
  readonly sfx: boolean;
  /** 0..1 */
  readonly musicVolume: number;
  /** 0..1 */
  readonly sfxVolume: number;
  readonly haptics: boolean;
  readonly showTimer: boolean;
  readonly confirmRestart: boolean;
}

export const THEME_CHOICES: readonly ThemeChoice[] = ['dark', 'light', 'colorful', 'system'];
export const MOTION_CHOICES: readonly MotionChoice[] = ['auto', 'reduce', 'full'];
export const EFFECTS_LEVELS: readonly EffectsLevel[] = ['off', 'low', 'normal'];

export const DEFAULT_SETTINGS: GameSettings = Object.freeze({
  theme: 'dark',
  motion: 'auto',
  effects: 'normal',
  muted: false,
  music: true,
  sfx: true,
  musicVolume: 0.35, // ambient music sits low under the sound effects by default
  sfxVolume: 0.7,
  haptics: true,
  showTimer: true,
  confirmRestart: true,
});

export function createSettings(): GameSettings {
  return { ...DEFAULT_SETTINGS };
}

/** Volumes are stored in 5 % steps, which is all a slider offers. */
export function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.min(1, Math.max(0, value)) * 20) / 20;
}

const isOneOf = <T extends string>(options: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (options as readonly string[]).includes(value);

/**
 * Applies a partial change, keeping only valid values. Returns the same object
 * when nothing actually changed, so callers can skip saving and redrawing.
 */
export function withSettings(current: GameSettings, patch: Partial<Record<keyof GameSettings, unknown>>): GameSettings {
  const next: { -readonly [K in keyof GameSettings]: GameSettings[K] } = { ...current };
  const p = patch;
  if (isOneOf(THEME_CHOICES, p.theme)) next.theme = p.theme;
  if (isOneOf(MOTION_CHOICES, p.motion)) next.motion = p.motion;
  if (isOneOf(EFFECTS_LEVELS, p.effects)) next.effects = p.effects;
  for (const key of ['muted', 'music', 'sfx', 'haptics', 'showTimer', 'confirmRestart'] as const) {
    if (typeof p[key] === 'boolean') next[key] = p[key];
  }
  for (const key of ['musicVolume', 'sfxVolume'] as const) {
    if (typeof p[key] === 'number' && Number.isFinite(p[key])) next[key] = clampVolume(p[key]);
  }
  const changed = (Object.keys(next) as (keyof GameSettings)[]).some((key) => next[key] !== current[key]);
  return changed ? next : current;
}

// --------------------------------------------------------------- storage

export const SETTINGS_KEY = 'neon-escape.settings';
export const SETTINGS_VERSION = 1;

/** Upgrades raw stored data from one version to the next. Keyed by the version it upgrades *from*. */
export type SettingsMigration = (data: Record<string, unknown>) => Record<string, unknown>;

/**
 * Version 1 is the first settings format, so there is nothing to upgrade yet.
 * A future version 2 adds `1: (data) => ({ ...data, newField: ... })` here and
 * every older save is walked forward one step at a time.
 */
export const SETTINGS_MIGRATIONS: Readonly<Record<number, SettingsMigration>> = {};

/** Walks stored data forward to `target`. Returns null if a step is missing. */
export function migrateSettings(
  data: Record<string, unknown>,
  from: number,
  target = SETTINGS_VERSION,
  migrations: Readonly<Record<number, SettingsMigration>> = SETTINGS_MIGRATIONS,
): Record<string, unknown> | null {
  let current = data;
  for (let version = from; version < target; version++) {
    const step = migrations[version];
    if (!step) return null;
    current = step(current);
  }
  return current;
}

/**
 * Reads stored settings, keeping every valid field and defaulting the rest
 * (missing, wrong type or out of range). Never throws.
 */
export function readSettings(
  raw: string | null,
  version = SETTINGS_VERSION,
  migrations: Readonly<Record<number, SettingsMigration>> = SETTINGS_MIGRATIONS,
): { value: GameSettings; status: SaveStatus } {
  if (raw === null) return { value: createSettings(), status: 'empty' };
  const data = parseObject(raw);
  if (!data || !Number.isInteger(data.version) || (data.version as number) < 1) {
    return { value: createSettings(), status: 'corrupt' };
  }
  const stored = data.version as number;
  if (stored > version) return { value: createSettings(), status: 'newer' };
  const upgraded = stored === version ? data : migrateSettings(data, stored, version, migrations);
  if (!upgraded) return { value: createSettings(), status: 'corrupt' };
  return { value: withSettings(createSettings(), upgraded), status: stored === version ? 'current' : 'migrated' };
}

export function serializeSettings(settings: GameSettings): string {
  return JSON.stringify({ version: SETTINGS_VERSION, ...settings });
}

export type SettingsListener = (settings: GameSettings, previous: GameSettings) => void;

/**
 * The live settings: one place to read them, change them and hear about
 * changes. Every change is validated and saved at once, so a refresh never
 * loses it. Uses the same safety rules as every other save (SafeStore).
 */
export class SettingsStore {
  private readonly safe: SafeStore<GameSettings>;
  private settings: GameSettings;
  private readonly listeners = new Set<SettingsListener>();

  constructor(store: KeyValueStore | null = browserStorage()) {
    this.safe = new SafeStore(SETTINGS_KEY, { read: (raw) => readSettings(raw), write: serializeSettings, fallback: createSettings }, store);
    this.settings = this.safe.load();
  }

  get current(): GameSettings {
    return this.settings;
  }

  /** Applies a change; invalid values are ignored. Returns true if anything changed. */
  update(patch: Partial<GameSettings>): boolean {
    return this.replace(withSettings(this.settings, patch));
  }

  /** Back to the defaults. Only settings: progress, profile and statistics live under other keys. */
  reset(): boolean {
    return this.replace(withSettings(this.settings, DEFAULT_SETTINGS));
  }

  /** Calls `listener` on every change. Returns an unsubscribe function. */
  subscribe(listener: SettingsListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private replace(next: GameSettings): boolean {
    if (next === this.settings) return false;
    const previous = this.settings;
    this.settings = next;
    this.safe.save(next);
    this.listeners.forEach((listener) => listener(next, previous));
    return true;
  }
}
