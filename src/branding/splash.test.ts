import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { runIntro, type IntroParts } from '../app/Intro';
import type { Insight } from '../recap/insights';
import type { KeyValueStore } from '../storage/SafeStore';
import {
  DEFAULT_SPLASH_TIMING,
  REDUCED_SPLASH_MS,
  shouldShowSplash,
  SPLASH_SESSION_KEY,
  splashDuration,
  StudioSplash,
  type SplashElement,
  type SplashTiming,
} from './StudioSplash';

class MemoryStore implements KeyValueStore {
  readonly data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

function fakeSplash() {
  const classes = new Set<string>();
  const props = new Map<string, string>();
  let removed = false;
  let onTap: () => void = () => {};
  const element: SplashElement = {
    classList: { add: (name) => void classes.add(name) },
    style: { setProperty: (name, value) => void props.set(name, value) },
    addEventListener: (_type, listener) => void (onTap = listener),
    remove: () => void (removed = true),
  };
  return { element, classes, props, removed: () => removed, tap: () => onTap() };
}

/** A manual clock: scheduled callbacks run when time is advanced past them. */
function fakeSchedule() {
  let now = 0;
  const queue: { at: number; callback: () => void }[] = [];
  return {
    schedule: (callback: () => void, ms: number) => void queue.push({ at: now + ms, callback }),
    advance(ms: number) {
      const target = now + ms;
      for (;;) {
        const due = queue.filter((q) => q.at <= target).sort((a, b) => a.at - b.at)[0];
        if (!due) break;
        queue.splice(queue.indexOf(due), 1);
        now = due.at;
        due.callback();
      }
      now = target;
    },
  };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function start(options: { reducedMotion?: boolean; timing?: SplashTiming } = {}) {
  const clock = fakeSchedule();
  const splash = fakeSplash();
  const studio = new StudioSplash(splash.element, { reducedMotion: options.reducedMotion ?? false, session: new MemoryStore(), schedule: clock.schedule, timing: options.timing });
  let finished: boolean | undefined;
  void studio.run().then((shown) => (finished = shown));
  return { clock, splash, studio, finished: () => finished };
}

describe('studio splash lifecycle', () => {
  it('lasts about 3.5–4 seconds: reveal, readable hold, then a fade-out', () => {
    const t = DEFAULT_SPLASH_TIMING;
    expect(splashDuration()).toBeGreaterThanOrEqual(3500);
    expect(splashDuration()).toBeLessThanOrEqual(4000);
    expect(t.hold).toBeGreaterThanOrEqual(1500); // long enough to read "Mr. White Games"
    expect(t.fade).toBeGreaterThanOrEqual(500); // an unhurried fade
  });

  it('follows the timeline and removes itself at the end', async () => {
    const { clock, splash, finished } = start();
    const t = DEFAULT_SPLASH_TIMING;
    expect(splash.props.get('--splash-reveal')).toBe(`${t.reveal}ms`);
    clock.advance(t.reveal - 1);
    expect(splash.classes.has('studio-splash--ready')).toBe(false);
    clock.advance(1);
    expect(splash.classes.has('studio-splash--ready')).toBe(true); // logo fully shown: skippable
    clock.advance(t.hold - 1);
    expect(splash.classes.has('studio-splash--leaving')).toBe(false);
    clock.advance(1);
    expect(splash.classes.has('studio-splash--leaving')).toBe(true);
    expect(splash.removed()).toBe(false);
    clock.advance(t.fade);
    await flush();
    expect(splash.removed()).toBe(true);
    expect(finished()).toBe(true);
  });

  it('is configurable', async () => {
    const timing = { reveal: 1000, hold: 2000, fade: 900, skipFade: 200 };
    const { clock, splash, finished } = start({ timing });
    expect(splash.props.get('--splash-fade')).toBe('900ms');
    clock.advance(3899);
    await flush();
    expect(finished()).toBeUndefined();
    clock.advance(1);
    await flush();
    expect(finished()).toBe(true);
    expect(splashDuration(timing)).toBe(3900);
  });

  it('ignores taps until the logo has appeared, then a tap skips with a short fade', async () => {
    const { clock, splash, finished } = start();
    const t = DEFAULT_SPLASH_TIMING;
    clock.advance(t.reveal / 2);
    splash.tap(); // too early: the logo is still drawing
    expect(splash.classes.has('studio-splash--leaving')).toBe(false);
    clock.advance(t.reveal / 2 + 100);
    splash.tap();
    expect(splash.classes.has('studio-splash--skipped')).toBe(true);
    expect(splash.classes.has('studio-splash--leaving')).toBe(true);
    clock.advance(t.skipFade);
    await flush();
    expect(finished()).toBe(true);
    expect(splash.removed()).toBe(true);
    // The regular timeline firing later changes nothing.
    clock.advance(10_000);
    splash.tap();
  });

  it('with reduced motion: the finished logo at once, removed without a fade, skippable at once', async () => {
    const still = start({ reducedMotion: true });
    expect(still.splash.classes.has('studio-splash--ready')).toBe(true);
    still.clock.advance(REDUCED_SPLASH_MS - 1);
    expect(still.splash.removed()).toBe(false);
    still.clock.advance(1);
    expect(still.splash.classes.has('studio-splash--leaving')).toBe(false);
    expect(still.splash.removed()).toBe(true);

    const skipped = start({ reducedMotion: true });
    skipped.splash.tap();
    await flush();
    expect(skipped.finished()).toBe(true);
  });

  it('shows once per session: a cold launch shows it, a reload or resume does not', () => {
    const session = new MemoryStore();
    expect(shouldShowSplash(session)).toBe(true);
    void new StudioSplash(fakeSplash().element, { reducedMotion: false, session, schedule: () => {} }).run();
    expect(session.getItem(SPLASH_SESSION_KEY)).toBe('1');
    expect(shouldShowSplash(session)).toBe(false);
    expect(shouldShowSplash(new MemoryStore())).toBe(true); // a new process starts with empty session storage
  });

  it('shows without session storage rather than never', () => {
    expect(shouldShowSplash(null)).toBe(true);
    const throwing: KeyValueStore = {
      getItem() {
        throw new Error('blocked');
      },
      setItem() {
        throw new Error('blocked');
      },
    };
    expect(shouldShowSplash(throwing)).toBe(true);
  });

  it('when already shown this session: removed at once and reports false', async () => {
    const session = new MemoryStore();
    session.setItem(SPLASH_SESSION_KEY, '1');
    const splash = fakeSplash();
    expect(await new StudioSplash(splash.element, { reducedMotion: false, session, schedule: () => {} }).run()).toBe(false);
    expect(splash.removed()).toBe(true);
  });

  it('runs only once even if asked twice', async () => {
    const clock = fakeSchedule();
    const splash = new StudioSplash(fakeSplash().element, { reducedMotion: true, session: new MemoryStore(), schedule: clock.schedule });
    const first = splash.run();
    expect(splash.run()).toBe(first);
    clock.advance(REDUCED_SPLASH_MS);
    expect(await first).toBe(true);
  });

  it('the CSS fallbacks match the default timing (used before the script runs)', () => {
    const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
    const t = DEFAULT_SPLASH_TIMING;
    expect(css).toContain(`var(--splash-reveal, ${t.reveal}ms)`);
    expect(css).toContain(`var(--splash-fade, ${t.fade}ms)`);
    expect(css).toContain(`var(--splash-skip-fade, ${t.skipFade}ms)`);
  });
});

describe('startup intro', () => {
  const insight: Insight = { id: 'progress', title: 'Progress', text: '3 of 30 levels completed. Next up: Level 4.' };

  function parts(overrides: Partial<IntroParts> & { shown?: boolean } = {}) {
    const calls: string[] = [];
    const base: IntroParts = {
      splash: { run: async () => (calls.push('splash'), overrides.shown ?? true) },
      recap: { show: async (i) => (calls.push(`recap:${i.id}`), 'continue') },
      recapEnabled: () => true,
      nextInsight: () => (calls.push('pick'), insight),
    };
    return { calls, parts: { ...base, ...overrides } };
  }

  it('plays the splash, then one recap insight, then hands over to Home', async () => {
    const { calls, parts: p } = parts();
    expect(await runIntro(p)).toBe('recap');
    expect(calls).toEqual(['splash', 'pick', 'recap:progress']);
  });

  it('skips the recap when it is turned off in Settings (and does not advance the rotation)', async () => {
    const { calls, parts: p } = parts({ recapEnabled: () => false });
    expect(await runIntro(p)).toBe('splash');
    expect(calls).toEqual(['splash']);
  });

  it('skips the recap when the records support no insight yet', async () => {
    const { calls, parts: p } = parts({ nextInsight: () => null });
    expect(await runIntro(p)).toBe('splash');
    expect(calls).toEqual(['splash']);
  });

  it('shows nothing after a reload or resume (no splash, no recap)', async () => {
    const { calls, parts: p } = parts({ shown: false });
    expect(await runIntro(p)).toBe('skipped');
    expect(calls).toEqual(['splash']);
  });
});

describe('one branded splash, from first paint', () => {
  const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

  it('index.html has the splash markup and skips it with the same session flag', () => {
    const html = read('../../index.html');
    expect(html).toContain('id="studio-splash"');
    expect(html).toContain(`sessionStorage.getItem('${SPLASH_SESSION_KEY}') === '1'`);
    expect(html).toContain('<symbol id="mw-mark"');
  });

  it('the Android launch screen is a plain colour with no logo, matching the splash background', () => {
    const styles = read('../../android/app/src/main/res/values/styles.xml');
    const launch = styles.slice(styles.indexOf('AppTheme.NoActionBarLaunch'));
    expect(launch).not.toContain('@drawable/splash');
    expect(launch).toContain('windowSplashScreenAnimatedIcon">@drawable/launch_blank');
    expect(read('../../android/app/src/main/res/values/launch.xml')).toContain('#101522');
    expect(read('../style.css')).toMatch(/\.studio-splash \{[^}]*background: #101522;/);
  });
});
