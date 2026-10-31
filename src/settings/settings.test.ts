import { afterEach, describe, expect, it } from 'vitest';
import { hasProgress, restartNeedsConfirm } from '../app/confirmPolicy';
import { LEVELS } from '../levels';
import { decorationScale, effectsLevel, reducedMotion, setMotionPreferences } from '../render/motion';
import { arrowColor, contrastRatio, palette, PALETTES } from '../render/theme';
import { createProfile, ProfileStorage, withNickname } from '../profile/Profile';
import { createStats, recordAttempt, StatsStorage } from '../profile/Stats';
import { createProgress, recordCompletion } from '../progress/Progress';
import { ProgressStorage } from '../progress/ProgressStorage';
import type { KeyValueStore } from '../storage/SafeStore';
import { Appearance, resolveAppearance, resolveReducedMotion, resolveTheme, type MediaQueryLike } from './Appearance';
import {
  clampVolume,
  createSettings,
  DEFAULT_SETTINGS,
  migrateSettings,
  readSettings,
  serializeSettings,
  SETTINGS_KEY,
  SETTINGS_VERSION,
  SettingsStore,
  withSettings,
  type GameSettings,
} from './Settings';

class MemoryStore implements KeyValueStore {
  readonly data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

class BrokenStore implements KeyValueStore {
  getItem(): string | null {
    throw new Error('SecurityError');
  }
  setItem(): void {
    throw new Error('QuotaExceededError');
  }
}

/** A media query whose answer the test can change, like a device switching to dark mode. */
class FakeQuery implements MediaQueryLike {
  private readonly listeners: (() => void)[] = [];
  constructor(public matches = false) {}
  addEventListener(_type: 'change', listener: () => void): void {
    this.listeners.push(listener);
  }
  set(matches: boolean): void {
    this.matches = matches;
    this.listeners.forEach((l) => l());
  }
}

function fakeDevice(light = false, reduce = false) {
  const queries = { light: new FakeQuery(light), motion: new FakeQuery(reduce) };
  const attributes = new Map<string, string>();
  const themeColor = new Map<string, string>();
  return {
    queries,
    attributes,
    themeColor,
    target: {
      root: { setAttribute: (name: string, value: string) => attributes.set(name, value) },
      themeColor: { setAttribute: (name: string, value: string) => themeColor.set(name, value) },
      matchMedia: (query: string) => (query.includes('color-scheme') ? queries.light : queries.motion),
    },
  };
}

afterEach(() => setMotionPreferences(false, 'normal'));

describe('settings model', () => {
  it('has sensible defaults', () => {
    expect(createSettings()).toEqual({
      theme: 'dark',
      motion: 'auto',
      effects: 'normal',
      muted: false,
      music: true,
      sfx: true,
      musicVolume: 0.35,
      sfxVolume: 0.7,
      haptics: true,
      showTimer: true,
      confirmRestart: true,
      showRecap: true,
    });
    expect(DEFAULT_SETTINGS.musicVolume).toBeLessThan(DEFAULT_SETTINGS.sfxVolume); // music low by default
    expect(Object.isFrozen(DEFAULT_SETTINGS)).toBe(true);
  });

  it('keeps valid changes and ignores invalid ones', () => {
    const s = createSettings();
    const next = withSettings(s, { theme: 'light', musicVolume: 0.5 });
    expect(next).toMatchObject({ theme: 'light', musicVolume: 0.5 });
    expect(withSettings(s, { theme: 'neon-pink', motion: 3, effects: null, muted: 'yes', sfxVolume: NaN } as never)).toBe(s);
  });

  it('returns the same object when nothing changes', () => {
    const s = createSettings();
    expect(withSettings(s, { theme: 'dark', music: true })).toBe(s);
  });

  it('clamps volumes to 0..1 in 5 % steps', () => {
    expect(clampVolume(1.4)).toBe(1);
    expect(clampVolume(-2)).toBe(0);
    expect(clampVolume(0.333)).toBe(0.35);
    expect(clampVolume(Infinity)).toBe(0);
    expect(withSettings(createSettings(), { sfxVolume: 7 }).sfxVolume).toBe(1);
  });

  it('keeps music and effects volumes independent', () => {
    const s = withSettings(createSettings(), { musicVolume: 0.1, sfxVolume: 0.9 });
    expect(s.musicVolume).toBe(0.1);
    expect(s.sfxVolume).toBe(0.9);
    expect(withSettings(s, { musicVolume: 0.6 }).sfxVolume).toBe(0.9);
  });
});

describe('settings storage', () => {
  it('saves every change and reloads it after a refresh', () => {
    const store = new MemoryStore();
    const settings = new SettingsStore(store);
    settings.update({ theme: 'colorful', muted: true, musicVolume: 0.2, haptics: false, showTimer: false, confirmRestart: false });
    const saved = JSON.parse(store.data.get(SETTINGS_KEY)!);
    expect(saved.version).toBe(SETTINGS_VERSION);
    const reloaded = new SettingsStore(store).current;
    expect(reloaded).toMatchObject({ theme: 'colorful', muted: true, musicVolume: 0.2, haptics: false, showTimer: false, confirmRestart: false });
  });

  it('starts from defaults with empty storage', () => {
    expect(readSettings(null)).toEqual({ value: createSettings(), status: 'empty' });
  });

  it('round-trips through serialise and read', () => {
    const s: GameSettings = { ...createSettings(), theme: 'system', motion: 'reduce', effects: 'low', sfx: false };
    expect(readSettings(serializeSettings(s))).toEqual({ value: s, status: 'current' });
  });

  it('recovers from corrupted data and keeps a backup', () => {
    const store = new MemoryStore();
    store.setItem(SETTINGS_KEY, '{not json');
    const settings = new SettingsStore(store);
    expect(settings.current).toEqual(createSettings());
    expect(store.data.get(`${SETTINGS_KEY}.backup`)).toBe('{not json');
    for (const raw of ['[]', '42', '"x"', '{}', '{"version":0}', '{"version":"1"}', '{"version":1.5}']) {
      expect(readSettings(raw).status).toBe('corrupt');
    }
  });

  it('keeps valid fields and defaults bad ones', () => {
    const raw = JSON.stringify({ version: 1, theme: 'light', motion: 'sideways', musicVolume: 'loud', sfxVolume: 0.4, haptics: 'no' });
    const { value, status } = readSettings(raw);
    expect(status).toBe('current');
    expect(value).toMatchObject({ theme: 'light', motion: 'auto', musicVolume: 0.35, sfxVolume: 0.4, haptics: true });
  });

  it('fills in fields missing from an older save of the same version', () => {
    expect(readSettings(JSON.stringify({ version: 1, theme: 'light' })).value).toEqual({ ...createSettings(), theme: 'light' });
  });

  it('migrates older versions step by step', () => {
    // A hypothetical v1 → v2 → v3 history: v1 stored reduced motion as a boolean.
    const migrations = {
      1: (d: Record<string, unknown>) => ({ ...d, motion: d.reduceMotion === true ? 'reduce' : 'auto', version: 2 }),
      2: (d: Record<string, unknown>) => ({ ...d, version: 3 }),
    };
    const raw = JSON.stringify({ version: 1, theme: 'light', reduceMotion: true });
    const { value, status } = readSettings(raw, 3, migrations);
    expect(status).toBe('migrated');
    expect(value).toMatchObject({ theme: 'light', motion: 'reduce' });
    expect(migrateSettings({ version: 1 }, 1, 3, { 1: migrations[1] })).toBeNull(); // missing step
    expect(readSettings(raw, 3, { 1: migrations[1] }).status).toBe('corrupt');
    expect(migrateSettings({ a: 1 }, SETTINGS_VERSION)).toEqual({ a: 1 }); // current: nothing to do
  });

  it('never overwrites settings saved by a newer game version', () => {
    const store = new MemoryStore();
    const future = JSON.stringify({ version: SETTINGS_VERSION + 1, theme: 'hologram' });
    store.setItem(SETTINGS_KEY, future);
    const settings = new SettingsStore(store);
    expect(settings.current).toEqual(createSettings());
    settings.update({ theme: 'light' });
    expect(settings.current.theme).toBe('light'); // works for this session…
    expect(store.data.get(SETTINGS_KEY)).toBe(future); // …but the newer save is protected
    expect(store.data.get(`${SETTINGS_KEY}.backup`)).toBe(future);
  });

  it('works without storage', () => {
    for (const store of [null, new BrokenStore()]) {
      const settings = new SettingsStore(store);
      expect(settings.current).toEqual(createSettings());
      expect(settings.update({ muted: true })).toBe(true);
      expect(settings.current.muted).toBe(true);
    }
  });

  it('notifies listeners only on real changes', () => {
    const settings = new SettingsStore(new MemoryStore());
    const seen: string[] = [];
    const off = settings.subscribe((next, prev) => seen.push(`${prev.theme}->${next.theme}`));
    settings.update({ theme: 'light' });
    settings.update({ theme: 'light' });
    settings.update({ theme: 'bogus' as never });
    off();
    settings.update({ theme: 'dark' });
    expect(seen).toEqual(['dark->light']);
  });
});

describe('reset settings', () => {
  it('restores defaults and applies them at once', () => {
    const settings = new SettingsStore(new MemoryStore());
    settings.update({ theme: 'light', muted: true, effects: 'off', confirmRestart: false });
    let applied: GameSettings | undefined;
    settings.subscribe((s) => (applied = s));
    expect(settings.reset()).toBe(true);
    expect(settings.current).toEqual(createSettings());
    expect(applied).toEqual(createSettings());
    expect(settings.reset()).toBe(false); // already default
  });

  it('never touches progress, stars, best times, statistics, profile or avatar', () => {
    const store = new MemoryStore();
    const progressStorage = new ProgressStorage(LEVELS.length, store);
    const profileStorage = new ProfileStorage(store);
    const statsStorage = new StatsStorage(store);
    const { progress } = recordCompletion(createProgress(), 1, { moves: 5, stars: 3, mistakes: 0, timeMs: 12_345 }, LEVELS.length, LEVELS[0].revision ?? 1);
    progressStorage.save(progress);
    profileStorage.save({ ...withNickname(createProfile(), 'Ada'), avatar: 'fox' as never });
    statsStorage.save(recordAttempt(createStats(new Date(Date.UTC(2026, 0, 1))), { outcome: 'won', uncountedTimeMs: 12_345, directClears: 5, autoClears: 0, mistakes: 0 }));
    const before = new Map(store.data);

    const settings = new SettingsStore(store);
    settings.update({ theme: 'light', sfxVolume: 0.2 });
    settings.reset();

    for (const [key, value] of before) expect(store.data.get(key)).toBe(value);
    expect(progressStorage.load()).toEqual(new ProgressStorage(LEVELS.length, store).load());
    expect(new ProgressStorage(LEVELS.length, store).load().completed[1]?.bestTimeMs).toBe(12_345);
    expect(profileStorage.load()).toMatchObject({ nickname: 'Ada', avatar: 'fox' });
    expect(new StatsStorage(store).load().arrowsCleared).toBe(5);
  });
});

describe('themes', () => {
  it('resolves explicit themes as chosen', () => {
    expect(resolveTheme('dark', true)).toBe('dark');
    expect(resolveTheme('light', false)).toBe('light');
    expect(resolveTheme('colorful', true)).toBe('colorful');
  });

  it('System follows the device: Light for a light scheme, otherwise Dark Neon', () => {
    expect(resolveTheme('system', true)).toBe('light');
    expect(resolveTheme('system', false)).toBe('dark');
  });

  it('applies the theme to CSS, the board palette and the browser colour', () => {
    const device = fakeDevice();
    const settings = new SettingsStore(new MemoryStore());
    new Appearance(settings, device.target);
    expect(device.attributes.get('data-theme')).toBe('dark');
    expect(palette().id).toBe('dark');
    settings.update({ theme: 'light' });
    expect(device.attributes.get('data-theme')).toBe('light');
    expect(palette().id).toBe('light');
    expect(device.themeColor.get('content')).toBe('#e9eef6');
    settings.update({ theme: 'colorful' });
    expect(palette().arrows.length).toBeGreaterThan(4);
    settings.update({ theme: 'dark' });
  });

  it('reacts to the device switching between light and dark while running', () => {
    const device = fakeDevice(false);
    const settings = new SettingsStore(new MemoryStore());
    const appearance = new Appearance(settings, device.target);
    const changes: string[] = [];
    appearance.onChange((a) => changes.push(a.theme));
    settings.update({ theme: 'system' });
    expect(device.attributes.get('data-theme')).toBe('dark');
    device.queries.light.set(true);
    expect(device.attributes.get('data-theme')).toBe('light');
    device.queries.light.set(false);
    expect(changes).toEqual(['light', 'dark']); // 'system' resolved to dark first: no change event
    settings.update({ theme: 'colorful' });
    device.queries.light.set(true); // explicit choice ignores the device
    expect(device.attributes.get('data-theme')).toBe('colorful');
    settings.update({ theme: 'dark' });
  });

  it('keeps every arrow readable against its board', () => {
    for (const p of Object.values(PALETTES)) {
      for (const color of [...p.arrows, p.error, p.success]) expect(contrastRatio(color, p.well)).toBeGreaterThanOrEqual(3);
    }
  });

  it('reserves red: no theme uses the error colour for a resting arrow', () => {
    for (const p of Object.values(PALETTES)) expect(p.arrows).not.toContain(p.error);
  });

  it('gives neighbouring arrows different colours in Colorful, one colour elsewhere', () => {
    const p = PALETTES.colorful;
    for (let i = 0; i < 20; i++) expect(arrowColor(p, i)).not.toBe(arrowColor(p, i + 1));
    expect(new Set(Array.from({ length: 10 }, (_, i) => arrowColor(PALETTES.dark, i))).size).toBe(1);
  });
});

describe('reduced motion and effects', () => {
  it('an explicit choice wins over the device; Auto follows it', () => {
    expect(resolveReducedMotion('auto', true)).toBe(true);
    expect(resolveReducedMotion('auto', false)).toBe(false);
    expect(resolveReducedMotion('reduce', false)).toBe(true);
    expect(resolveReducedMotion('full', true)).toBe(false);
  });

  it('applies the resolved preference to CSS and the canvas, and follows device changes', () => {
    const device = fakeDevice(false, false);
    const settings = new SettingsStore(new MemoryStore());
    new Appearance(settings, device.target);
    expect(device.attributes.get('data-motion')).toBe('full');
    device.queries.motion.set(true);
    expect(device.attributes.get('data-motion')).toBe('reduce');
    expect(reducedMotion()).toBe(true);
    settings.update({ motion: 'full' });
    expect(reducedMotion()).toBe(false);
    settings.update({ motion: 'reduce' });
    device.queries.motion.set(false);
    expect(reducedMotion()).toBe(true);
  });

  it('scales decorative effects by intensity; reduced motion turns them off', () => {
    setMotionPreferences(false, 'normal');
    expect(decorationScale()).toBe(1);
    setMotionPreferences(false, 'low');
    expect(decorationScale()).toBeGreaterThan(0);
    expect(decorationScale()).toBeLessThan(1);
    setMotionPreferences(false, 'off');
    expect(decorationScale()).toBe(0);
    setMotionPreferences(true, 'normal');
    expect(decorationScale()).toBe(0);
    expect(effectsLevel()).toBe('normal');
  });

  it('effects intensity reaches CSS through data-effects', () => {
    const device = fakeDevice();
    const settings = new SettingsStore(new MemoryStore());
    new Appearance(settings, device.target);
    settings.update({ effects: 'low' });
    expect(device.attributes.get('data-effects')).toBe('low');
    expect(resolveAppearance(settings.current, { prefersLight: false, reducesMotion: false }).effects).toBe('low');
  });
});

describe('gameplay preferences', () => {
  const untouched = { moves: 0, mistakes: 0 };
  const started = { moves: 2, mistakes: 0 };
  const mistaken = { moves: 0, mistakes: 1 };

  it('asks before restarting a level with progress when Confirm restart is on', () => {
    expect(restartNeedsConfirm(started, true, true)).toBe(true);
    expect(restartNeedsConfirm(mistaken, true, true)).toBe(true);
  });

  it('never asks for an untouched or finished level, or with the setting off', () => {
    expect(restartNeedsConfirm(untouched, true, true)).toBe(false);
    expect(restartNeedsConfirm(started, false, true)).toBe(false); // won or lost already
    expect(restartNeedsConfirm(started, true, false)).toBe(false);
  });

  it('leave-level confirmation is unchanged and independent of the restart setting', () => {
    expect(hasProgress(started, true)).toBe(true);
    expect(hasProgress(untouched, true)).toBe(false);
  });
});

describe('player recap setting', () => {
  it('is on by default, also for settings saved before it existed', () => {
    expect(createSettings().showRecap).toBe(true);
    const old = JSON.stringify({ version: 1, theme: 'light', showTimer: false });
    expect(readSettings(old).value).toMatchObject({ theme: 'light', showTimer: false, showRecap: true });
  });

  it('can be turned off and stays off after a restart', () => {
    const store = new MemoryStore();
    new SettingsStore(store).update({ showRecap: false });
    expect(new SettingsStore(store).current.showRecap).toBe(false);
    expect(withSettings(createSettings(), { showRecap: 'no' } as never).showRecap).toBe(true);
  });

  it('comes back on with Reset settings', () => {
    const settings = new SettingsStore(new MemoryStore());
    settings.update({ showRecap: false });
    settings.reset();
    expect(settings.current.showRecap).toBe(true);
  });
});

describe('borderless dotted board', () => {
  it('draws arrows straight on the page colour in every theme (no frame or well)', () => {
    for (const p of Object.values(PALETTES)) {
      expect(p.well).toBe(p.background);
      expect(p).not.toHaveProperty('frame');
      expect(p).not.toHaveProperty('surface');
    }
  });

  it('keeps the grid dots subtle but visible', () => {
    for (const p of Object.values(PALETTES)) {
      expect(p.dotAlpha).toBeGreaterThan(0.15);
      expect(p.dotAlpha).toBeLessThan(0.5);
      expect(p.dots).not.toBe(p.background);
    }
  });
});
