import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STREAK_WINDOW_MS, type GameSnapshot } from '../core/types';
import { expectGolden } from '../testing/golden';
import { byId, FakeText, installDom, snapshotIds, uninstallDom } from './fakeDom.test-helper';
import { Hud, type ChallengeHud } from './Hud';

// Characterization: the HUD DOM exactly as rendered today, including its reliance on the
// index.html markup (energyWrap.lastChild, every momentum child treated as a pip).
const GOLDEN = new URL('./Hud.golden.json', import.meta.url);
const IDS = [
  'hud-title',
  'hud-level',
  'btn-back',
  'btn-restart',
  'hud-timer',
  'hud-hearts',
  'hud-progress',
  'hud-momentum',
  'hud-remaining',
  'hud-league',
  'btn-reset-view',
];

function snapshot(patch: Partial<GameSnapshot> = {}): GameSnapshot {
  return {
    levelId: 3,
    status: 'playing',
    moves: 0,
    directClears: 0,
    autoClears: 0,
    bonusClears: 0,
    streak: 0,
    streakAt: null,
    bonusCooldown: 0,
    longestChain: 0,
    mistakes: 0,
    lives: 3,
    remaining: 20,
    total: 20,
    activated: 0,
    won: false,
    stars: 0,
    ...patch,
  } as GameSnapshot;
}

const CHALLENGE: ChallengeHud = { number: 2, collected: 1, perChallenge: 4, today: 5, maxToday: 12, leagueName: 'Gold' };

beforeEach(() => {
  vi.useFakeTimers();
  installDom();
});
afterEach(() => {
  vi.useRealTimers();
  uninstallDom();
});

describe('Hud render (golden)', () => {
  it('renders a level and a Daily League challenge exactly as before', () => {
    const out: Record<string, unknown> = {};
    const hud = new Hud();
    const step = (name: string, action: () => void) => {
      action();
      out[name] = snapshotIds(IDS);
    };
    step('initial', () => {});
    step('level 3 start', () => hud.update(snapshot()));
    step('moves, streak 2', () => hud.update(snapshot({ moves: 4, directClears: 4, remaining: 16, streak: 2, streakAt: 1 })));
    step('mistake: 2 lives', () => hud.update(snapshot({ moves: 4, directClears: 4, remaining: 16, mistakes: 1, lives: 2 })));
    step('last life', () => hud.update(snapshot({ moves: 5, directClears: 5, remaining: 15, mistakes: 2, lives: 1, streak: 1 })));
    step('streak 5', () => hud.update(snapshot({ moves: 10, directClears: 10, remaining: 10, mistakes: 2, lives: 1, streak: 5 })));
    step('bonus +2, cooldown', () =>
      hud.update(snapshot({ moves: 10, directClears: 10, bonusClears: 2, remaining: 8, mistakes: 2, lives: 1, bonusCooldown: 8 })),
    );
    step('streak 6 (lights the +N label too)', () =>
      hud.update(snapshot({ moves: 16, directClears: 16, bonusClears: 2, remaining: 2, mistakes: 2, lives: 1, streak: 6, bonusCooldown: 2 })),
    );
    step('streak window passed', () => vi.advanceTimersByTime(STREAK_WINDOW_MS));
    step('time, timer hidden, zoomed', () => {
      hud.setTime(83_456);
      hud.setTimerVisible(false);
      hud.setZoomed(true);
    });
    step('other level (no tick, no breaking heart)', () => hud.update(snapshot({ levelId: 4, lives: 1, remaining: 30, total: 30 })));
    step('challenge', () => hud.setChallenge(CHALLENGE));
    step('challenge: update keeps "2/3"', () => hud.update(snapshot({ levelId: 4, moves: 1, directClears: 1, remaining: 29, total: 30 })));
    step('challenge: arrow collected', () => hud.setChallenge({ ...CHALLENGE, collected: 2, today: 6 }));
    step('challenge: other per-challenge count', () => hud.setChallenge({ ...CHALLENGE, number: 3, collected: 0, perChallenge: 5, leagueName: 'Neon Elite' }));
    step('back to a level', () => hud.setChallenge(null));
    expectGolden(GOLDEN, out);
  });
});

describe('Hud markup coupling', () => {
  it('writes "/N" into the text node after the energy counter', () => {
    const hud = new Hud();
    const wrap = byId('hud-energy-wrap');
    const last = wrap.lastChild;
    expect(last).toBeInstanceOf(FakeText);
    expect((last as FakeText).data.trim()).toBe('/4');
    hud.setChallenge({ ...CHALLENGE, perChallenge: 7 });
    expect(wrap.lastChild).toBe(last);
    expect((last as FakeText).data).toBe('/7');
    expect(wrap.getAttribute('aria-label')).toBe('1 of 7 Energy Arrows collected');
  });

  it('treats every momentum child as a pip, including the +N label', () => {
    const hud = new Hud();
    const children = byId('hud-momentum').children;
    expect(children.map((c) => c.tagName)).toEqual(['i', 'i', 'i', 'i', 'i', 'b']);
    hud.update(snapshot({ streak: 6, moves: 6 }));
    expect(children.map((c) => c.classList.contains('momentum__pip--on'))).toEqual([true, true, true, true, true, true]);
    expect(byId('hud-bonus').className).toBe('momentum__bonus momentum__pip--on');
  });

  it("shows a named level's name under the title, and hides it for other levels and challenges", () => {
    const hud = new Hud((id) => (id === 31 ? 'THE IMPOSSIBLE GRID' : undefined));
    const name = byId('hud-name');
    expect(name.hidden).toBe(true);
    hud.update(snapshot({ levelId: 31 }));
    expect([name.hidden, name.textContent]).toEqual([false, 'THE IMPOSSIBLE GRID']);
    hud.update(snapshot({ levelId: 30 }));
    expect([name.hidden, name.textContent]).toEqual([true, '']);
    hud.update(snapshot({ levelId: 31 }));
    hud.setChallenge(CHALLENGE);
    expect(name.hidden).toBe(true);
    hud.setChallenge(null);
    expect([name.hidden, name.textContent]).toEqual([false, 'THE IMPOSSIBLE GRID']);
  });

  it('wires back, restart and reset view', () => {
    const hud = new Hud();
    const calls: string[] = [];
    hud.onBack(() => calls.push('back'));
    hud.onRestart(() => calls.push('restart'));
    hud.onResetView(() => calls.push('reset'));
    byId('btn-back').click();
    byId('btn-restart').click();
    byId('btn-reset-view').click();
    expect(calls).toEqual(['back', 'restart', 'reset']);
  });
});
