import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { runIntro, type IntroParts } from '../app/Intro';
import type { Insight } from '../recap/insights';
import type { KeyValueStore } from '../storage/SafeStore';
import {
  DEFAULT_SPLASH_TIMING,
  nameVisibleFor,
  REDUCED_SPLASH_MS,
  shouldShowSplash,
  SPLASH_SESSION_KEY,
  SPLASH_START_GLOBAL,
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

type Listener = (event: { preventDefault(): void; stopPropagation(): void }) => void;

function fakeSplash() {
  const classes = new Set<string>();
  const props = new Map<string, string>();
  const listeners = new Map<string, Listener>();
  let removed = false;
  const element: SplashElement = {
    classList: { add: (name) => void classes.add(name) },
    style: { setProperty: (name, value) => void props.set(name, value) },
    addEventListener: (type, listener) => void listeners.set(type, listener),
    remove: () => void (removed = true),
  };
  const event = () => {
    const e = { prevented: false, stopped: false, preventDefault: () => void (e.prevented = true), stopPropagation: () => void (e.stopped = true) };
    return e;
  };
  return {
    element,
    classes,
    props,
    removed: () => removed,
    tap: () => listeners.get('pointerdown')?.(event()),
    click: () => {
      const e = event();
      listeners.get('click')?.(e);
      return e;
    },
  };
}

/** A manual monotonic clock: scheduled callbacks run, in time order, as time advances. */
function fakeClock(start = 0) {
  let now = start;
  const queue: { at: number; callback: () => void }[] = [];
  return {
    now: () => now,
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

function start(options: { reducedMotion?: boolean; timing?: SplashTiming; startedAt?: number; clockAt?: number } = {}) {
  const clock = fakeClock(options.clockAt ?? 0);
  const splash = fakeSplash();
  const studio = new StudioSplash(splash.element, {
    reducedMotion: options.reducedMotion ?? false,
    session: new MemoryStore(),
    schedule: clock.schedule,
    now: clock.now,
    startedAt: options.startedAt,
    timing: options.timing,
  });
  const events: string[] = [];
  let finished: boolean | undefined;
  void studio.run(() => events.push(`leaving@${clock.now()}`)).then((shown) => (finished = shown));
  return { clock, splash, studio, events, finished: () => finished };
}

describe('studio splash timing', () => {
  it('lasts 3.5–4 seconds in all, with "Mr. White Games" fully visible for at least 2 seconds', () => {
    expect(splashDuration()).toBeGreaterThanOrEqual(3500);
    expect(splashDuration()).toBeLessThanOrEqual(4000);
    expect(nameVisibleFor()).toBeGreaterThanOrEqual(2000);
    expect(nameVisibleFor(DEFAULT_SPLASH_TIMING, true)).toBeGreaterThanOrEqual(2000);
    expect(DEFAULT_SPLASH_TIMING.fade).toBeGreaterThanOrEqual(400); // an unhurried fade
  });

  it('runs reveal → shown → leaving → gone on the clock, then removes itself', async () => {
    const { clock, splash, studio, events, finished } = start();
    const t = DEFAULT_SPLASH_TIMING;
    expect(splash.classes.has('studio-splash--play')).toBe(true);
    expect(splash.props.get('--splash-reveal')).toBe(`${t.reveal}ms`);
    expect(studio.state).toBe('revealing');
    clock.advance(t.reveal - 1);
    expect(studio.state).toBe('revealing');
    clock.advance(1);
    expect(studio.state).toBe('shown');
    expect(splash.classes.has('studio-splash--ready')).toBe(true);
    clock.advance(t.hold - 1);
    expect(events).toEqual([]);
    clock.advance(1);
    expect(studio.state).toBe('leaving');
    expect(splash.classes.has('studio-splash--leaving')).toBe(true);
    expect(events).toEqual([`leaving@${t.reveal + t.hold}`]); // the next screen starts appearing now
    expect(splash.removed()).toBe(false); // still fading: no gap, no flash
    clock.advance(t.fade);
    await flush();
    expect(studio.state).toBe('gone');
    expect(splash.removed()).toBe(true);
    expect(finished()).toBe(true);
    expect(events).toHaveLength(1); // one transition, never two
  });

  it('is anchored to first paint: a slow game start never stretches or shortens it', async () => {
    // The reveal began at first paint (t = 1000); the script only ran 1500 ms later.
    const { clock, studio, events } = start({ startedAt: 1000, clockAt: 2500 });
    const t = DEFAULT_SPLASH_TIMING;
    expect(studio.state).toBe('shown'); // the reveal (1100 ms) is already over on screen
    clock.advance(1000 + t.reveal + t.hold - 2500 - 1);
    expect(events).toEqual([]);
    clock.advance(1);
    expect(events).toEqual([`leaving@${1000 + t.reveal + t.hold}`]);
  });

  it('if the script starts after the hold is over, it fades out at once (never a second reveal)', async () => {
    const { clock, studio, events, finished } = start({ startedAt: 0, clockAt: 9000 });
    expect(studio.state).toBe('leaving');
    expect(events).toEqual(['leaving@9000']);
    clock.advance(DEFAULT_SPLASH_TIMING.fade);
    await flush();
    expect(finished()).toBe(true);
  });

  it('ignores a start time in the future (clock oddities) and starts now', () => {
    const { studio } = start({ startedAt: 5000, clockAt: 100 });
    expect(studio.state).toBe('revealing');
  });

  it('is configurable', async () => {
    const timing = { reveal: 1000, hold: 2200, fade: 700, skipFade: 200 };
    const { clock, splash, finished } = start({ timing });
    expect(splash.props.get('--splash-fade')).toBe('700ms');
    expect(splashDuration(timing)).toBe(3900);
    clock.advance(3899);
    await flush();
    expect(finished()).toBeUndefined();
    clock.advance(1);
    await flush();
    expect(finished()).toBe(true);
  });
});

describe('studio splash: skipping and taps', () => {
  it('ignores taps until the logo has fully appeared, then a tap skips with a short fade', async () => {
    const { clock, splash, studio, events, finished } = start();
    const t = DEFAULT_SPLASH_TIMING;
    clock.advance(t.reveal / 2);
    splash.tap(); // too early: still revealing
    expect(studio.state).toBe('revealing');
    clock.advance(t.reveal / 2);
    splash.tap();
    expect(studio.state).toBe('leaving');
    expect(splash.classes.has('studio-splash--skipped')).toBe(true);
    expect(events).toEqual([`leaving@${t.reveal}`]);
    splash.tap(); // a second tap during the fade changes nothing
    clock.advance(t.skipFade);
    await flush();
    expect(finished()).toBe(true);
    clock.advance(10_000); // the regular timeline firing later does nothing
    expect(events).toHaveLength(1);
  });

  it('never lets a tap through to the screen underneath, even while fading', () => {
    const { clock, splash } = start();
    clock.advance(DEFAULT_SPLASH_TIMING.reveal);
    splash.tap();
    const click = splash.click(); // the click that follows the skip tap
    expect(click.prevented && click.stopped).toBe(true);
  });

  it('with reduced motion: the finished logo at once, removed without a fade, skippable at once', async () => {
    const still = start({ reducedMotion: true });
    expect(still.studio.state).toBe('shown');
    still.clock.advance(REDUCED_SPLASH_MS - 1);
    expect(still.splash.removed()).toBe(false);
    still.clock.advance(1);
    expect(still.splash.classes.has('studio-splash--leaving')).toBe(false); // no fade
    expect(still.splash.removed()).toBe(true);
    expect(still.events).toEqual([`leaving@${REDUCED_SPLASH_MS}`]); // the next screen still gets its turn

    const skipped = start({ reducedMotion: true });
    skipped.splash.tap();
    await flush();
    expect(skipped.finished()).toBe(true);
  });
});

describe('studio splash: cold launch only', () => {
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

  it('when already shown this session: removed at once, reports false, and hands over nothing', async () => {
    const session = new MemoryStore();
    session.setItem(SPLASH_SESSION_KEY, '1');
    const splash = fakeSplash();
    let leaving = 0;
    expect(await new StudioSplash(splash.element, { reducedMotion: false, session, schedule: () => {} }).run(() => leaving++)).toBe(false);
    expect(splash.removed()).toBe(true);
    expect(leaving).toBe(0);
  });

  it('runs only once even if asked twice', async () => {
    const clock = fakeClock();
    const splash = new StudioSplash(fakeSplash().element, { reducedMotion: true, session: new MemoryStore(), schedule: clock.schedule, now: clock.now });
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
    // Only composited properties animate in the splash keyframes (no filters, dash offsets or letter-spacing).
    const keyframes = [...css.matchAll(/@keyframes splash-[\w-]+ \{([\s\S]*?)\n\}/g)].map((m) => m[1]).join('\n');
    expect(keyframes).not.toMatch(/filter|stroke-dashoffset|letter-spacing/);
    expect(keyframes).toMatch(/opacity/);
  });
});

describe('startup intro', () => {
  const insight: Insight = { id: 'progress', title: 'Progress', text: '3 of 30 levels completed. Next up: Level 4.' };

  /** A splash that hands over (onLeaving) and then finishes when the test says so. */
  function parts(overrides: Partial<IntroParts> & { shown?: boolean } = {}) {
    const calls: string[] = [];
    let gone: () => void = () => {};
    const base: IntroParts = {
      splash: {
        run: (onLeaving) =>
          new Promise<boolean>((resolve) => {
            calls.push('splash');
            if (overrides.shown === false) return resolve(false);
            gone = () => {
              calls.push('splash gone');
              resolve(true);
            };
            calls.push('fading');
            onLeaving?.();
          }),
      },
      recap: { show: async (i) => (calls.push(`recap:${i.id}`), 'continue') },
      recapEnabled: () => true,
      nextInsight: () => (calls.push('pick'), insight),
    };
    return { calls, parts: { ...base, ...overrides }, finishSplash: () => gone() };
  }

  it('opens the recap as the splash starts fading (one crossfade), then hands over to Home', async () => {
    const { calls, parts: p, finishSplash } = parts();
    const done = runIntro(p);
    await flush();
    expect(calls).toEqual(['splash', 'fading', 'pick', 'recap:progress']); // the recap is up before the splash is gone
    finishSplash();
    expect(await done).toBe('recap');
  });

  it('skips the recap when it is turned off in Settings (and does not advance the rotation)', async () => {
    const { calls, parts: p, finishSplash } = parts({ recapEnabled: () => false });
    const done = runIntro(p);
    finishSplash();
    expect(await done).toBe('splash');
    expect(calls).toEqual(['splash', 'fading', 'splash gone']);
  });

  it('skips the recap when the records support no insight yet', async () => {
    const { calls, parts: p, finishSplash } = parts({ nextInsight: () => null });
    const done = runIntro(p);
    finishSplash();
    expect(await done).toBe('splash');
    expect(calls).toEqual(['splash', 'fading', 'splash gone']);
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
    expect(html).toContain("root.setAttribute('data-splash', shown ? 'skip' : 'play')"); // the reveal starts at first paint
    expect(html).toContain(`window.${SPLASH_START_GLOBAL} = performance.now()`);
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
