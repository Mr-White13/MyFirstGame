import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PALETTES } from '../render/theme';
import { resolveAppearance } from './Appearance';
import { readSettings, SETTINGS_KEY, SETTINGS_VERSION } from './Settings';

/*
 * index.html applies the saved theme, motion and effects before any module
 * loads (no flash of the wrong theme). That inline parser must agree with
 * readSettings + resolveAppearance. This runs the real inline script.
 */
const HTML = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const INLINE = /<script>([\s\S]*?)<\/script>/.exec(HTML)?.[1] ?? '';

interface System {
  readonly prefersLight: boolean;
  readonly reducesMotion: boolean;
}

interface Painted {
  theme: string;
  motion: string;
  effects: string;
  themeColor: string;
}

function firstPaint(raw: string | null, system: System, storage: { throws?: boolean; mediaThrows?: boolean } = {}): Painted & { splash?: string } {
  const attrs: Record<string, string> = {};
  const meta: Record<string, string> = {};
  const document = {
    documentElement: { setAttribute: (k: string, v: string) => (attrs[k] = v) },
    getElementById: (id: string) => (id === 'theme-color' ? { setAttribute: (k: string, v: string) => (meta[k] = v) } : null),
  };
  const localStorage = {
    getItem(key: string) {
      if (storage.throws) throw new Error('blocked');
      return key === SETTINGS_KEY ? raw : null;
    },
  };
  const window: Record<string, unknown> = {
    matchMedia: (q: string) => {
      if (storage.mediaThrows) throw new Error('no matchMedia');
      const light = q === '(prefers-color-scheme: light)';
      return { matches: light ? system.prefersLight : q === '(prefers-reduced-motion: reduce)' ? system.reducesMotion : false };
    },
  };
  const sessionStorage = { getItem: () => null };
  const performance = { now: () => 42 };
  new Function('document', 'localStorage', 'window', 'sessionStorage', 'performance', INLINE)(document, localStorage, window, sessionStorage, performance);
  return { theme: attrs['data-theme'], motion: attrs['data-motion'], effects: attrs['data-effects'], themeColor: meta.content, splash: attrs['data-splash'] };
}

const hex = (color: number) => `#${color.toString(16).padStart(6, '0')}`;

function fromModules(raw: string | null, system: System, version = SETTINGS_VERSION, migrations = {}): Painted {
  const a = resolveAppearance(readSettings(raw, version, migrations).value, system);
  return { theme: a.theme, motion: a.reducedMotion ? 'reduce' : 'full', effects: a.effects, themeColor: hex(PALETTES[a.theme].background) };
}

const SYSTEMS: readonly System[] = [
  { prefersLight: false, reducesMotion: false },
  { prefersLight: true, reducesMotion: false },
  { prefersLight: false, reducesMotion: true },
  { prefersLight: true, reducesMotion: true },
];

const v1 = (fields: Record<string, unknown>) => JSON.stringify({ version: 1, ...fields });

/** Raw stored values where the two parsers currently agree, for every device preference. */
const AGREE: Record<string, string | null> = {
  missing: null,
  empty: '',
  'corrupt JSON': '{"version":1,"theme":"light"',
  'JSON null': 'null',
  'JSON array': '[1]',
  'JSON number': '1',
  'JSON string': '"light"',
  'no version': JSON.stringify({ theme: 'light', motion: 'reduce', effects: 'off' }),
  'version 0': JSON.stringify({ version: 0, theme: 'light', motion: 'reduce', effects: 'off' }),
  'version 2 (newer)': JSON.stringify({ version: 2, theme: 'light', motion: 'reduce', effects: 'off' }),
  'version "1" (string)': JSON.stringify({ version: '1', theme: 'light' }),
  'version 1.5': JSON.stringify({ version: 1.5, theme: 'light' }),
  'v1 only version': v1({}),
  'v1 dark/auto/normal': v1({ theme: 'dark', motion: 'auto', effects: 'normal' }),
  'v1 light/reduce/off': v1({ theme: 'light', motion: 'reduce', effects: 'off' }),
  'v1 colorful/full/low': v1({ theme: 'colorful', motion: 'full', effects: 'low' }),
  'v1 system/auto': v1({ theme: 'system', motion: 'auto' }),
  'v1 system/full': v1({ theme: 'system', motion: 'full' }),
  'v1 unknown values': v1({ theme: 'neon', motion: 'slow', effects: 'max' }),
  'v1 wrong types': v1({ theme: 1, motion: true, effects: null }),
  'v1 upper case': v1({ theme: 'LIGHT', motion: 'REDUCE', effects: 'OFF' }),
  'v1 partial: theme only': v1({ theme: 'light' }),
  'v1 partial: motion only': v1({ motion: 'reduce' }),
  'v1 partial: effects only': v1({ effects: 'low' }),
  'v1 full save': JSON.stringify({ version: 1, theme: 'colorful', motion: 'reduce', effects: 'low', muted: true, music: false, sfx: true, musicVolume: 0.5, sfxVolume: 1, haptics: false, showTimer: false, confirmRestart: true, showRecap: false }),
  'v1 with extra fields': v1({ theme: 'light', future: { nested: true } }),
  'v1 inherited names': v1({ theme: 'constructor', motion: 'toString', effects: '__proto__' }),
  'v1 __proto__ key': '{"version":1,"__proto__":{"theme":"light","motion":"reduce"}}',
  'v1 duplicate keys': '{"version":1,"theme":"light","theme":"colorful"}',
  'v1 negative zero version': '{"version":-0,"theme":"light"}',
};

describe('index.html first-paint settings parser vs readSettings', () => {
  it('finds the inline script', () => {
    expect(INLINE).toContain("localStorage.getItem('neon-escape.settings')");
    expect(SETTINGS_KEY).toBe('neon-escape.settings');
  });

  for (const [name, raw] of Object.entries(AGREE)) {
    it(`agrees: ${name}`, () => {
      for (const system of SYSTEMS) {
        const { splash: _splash, ...painted } = firstPaint(raw, system);
        expect({ system, painted }).toEqual({ system, painted: fromModules(raw, system) });
      }
    });
  }

  it('falls back to the defaults when storage throws (as SafeStore does)', () => {
    for (const system of SYSTEMS) {
      const { splash: _splash, ...painted } = firstPaint(v1({ theme: 'light' }), system, { throws: true });
      expect(painted).toEqual(fromModules(null, system));
    }
  });

  it('treats a failing matchMedia as no device preference (as Appearance does without one)', () => {
    for (const raw of [v1({ theme: 'system', motion: 'auto' }), v1({ theme: 'light', motion: 'reduce' })]) {
      const { splash: _splash, ...painted } = firstPaint(raw, SYSTEMS[3], { mediaThrows: true });
      expect(painted).toEqual(fromModules(raw, SYSTEMS[0]));
    }
  });

  it('the static <html> attributes and theme-color match the defaults', () => {
    const html = /<html([^>]*)>/.exec(HTML)![1];
    const meta = /<meta name="theme-color" content="([^"]+)"/.exec(HTML)![1];
    const d = fromModules(null, SYSTEMS[0]);
    expect(html).toContain(`data-theme="${d.theme}"`);
    expect(html).toContain(`data-motion="${d.motion}"`);
    expect(html).toContain(`data-effects="${d.effects}"`);
    expect(meta).toBe(d.themeColor);
  });

  it('plays the splash on a cold launch', () => {
    expect(firstPaint(null, SYSTEMS[0]).splash).toBe('play');
  });

  // KNOWN DISAGREEMENT (audit 3c): index.html hard-codes `version === 1`. Once SETTINGS_VERSION
  // moves past 1 (with a migration), saves in the new format are read by readSettings but
  // ignored at first paint: the page flashes Dark Neon before the module applies the real theme.
  it('DISAGREES after a settings version bump: the inline parser ignores version 2 saves', () => {
    const raw = JSON.stringify({ version: 2, theme: 'light', motion: 'reduce', effects: 'off' });
    const system = SYSTEMS[0];
    const { splash: _splash, ...painted } = firstPaint(raw, system);
    expect(painted).toEqual({ theme: 'dark', motion: 'full', effects: 'normal', themeColor: '#101522' });
    expect(fromModules(raw, system, 2, { 1: (d: Record<string, unknown>) => d })).toEqual({
      theme: 'light',
      motion: 'reduce',
      effects: 'off',
      themeColor: '#e9eef6',
    });
  });
});
