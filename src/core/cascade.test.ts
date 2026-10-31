import { describe, expect, it } from 'vitest';
import { dailyChallenges } from '../league/challenges';
import { collect, settle } from '../league/League';
import { readLeague } from '../league/LeagueService';
import { LEVELS } from '../levels';
import { levelFromMap } from '../levels/levelMap';
import { GameState } from './GameState';
import { BONUS_MAX, BONUS_MIN, STREAK_TAPS, STREAK_WINDOW_MS, type MoveResult } from './types';

/*
 * a, b, c, e and h are free. d (right) is blocked by e; f (up) by d, c, b, a;
 * g (up) by e.
 */
const level = levelFromMap(99, [
  'a> .  .  .  .',
  'b> .  .  .  .',
  'c> .  .  .  .',
  'd> e> .  .  .',
  'f^ g^ .  .  .',
  '.  .  .  .  h<',
]);

const cleared = (r: MoveResult) => {
  if (r.kind !== 'cleared') throw new Error(`expected a clear, got ${r.kind}`);
  return r;
};
const ids = (removals: readonly { arrowId: string }[]) => removals.map((r) => r.arrowId);
const left = (state: GameState) => state.getArrows().map((a) => a.id);
const STEP = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] } as const;
/** The first normal arrow (level order) whose way out is clear: what a careful player would tap. */
function freeArrow(state: GameState): string | undefined {
  return state.getArrows().find((a) => {
    if (state.isActivated(a.id)) return false;
    const [dr, dc] = STEP[a.direction];
    const head = a.cells[a.cells.length - 1];
    for (let r = head.row + dr, c = head.col + dc; r >= 0 && c >= 0 && r < state.rows && c < state.cols; r += dr, c += dc) {
      if (state.arrowIdAt(r, c) !== undefined) return false;
    }
    return true;
  })?.id;
}

describe('streak bonus: the rules', () => {
  it('uses the documented limits', () => {
    expect([STREAK_TAPS, STREAK_WINDOW_MS, BONUS_MIN, BONUS_MAX]).toEqual([3, 1500, 2, 3]);
  });

  it('a single tap never clears another normal arrow, whatever came before', () => {
    const state = new GameState(level);
    // Slow, separate taps: each is a streak of one.
    for (const [id, at] of [['a', 0], ['b', 2000], ['c', 4000], ['e', 6000], ['h', 8000]] as const) {
      const r = cleared(state.tryMove(id, at));
      expect(r.cascade).toEqual([]);
      expect(state.snapshot().streak).toBe(1);
    }
    expect(state.snapshot().cascadeClears).toBe(0);
  });

  it('three quick taps clear 2–3 currently removable arrows, in level order', () => {
    const state = new GameState(level);
    expect(cleared(state.tryMove('a', 0)).cascade).toEqual([]);
    expect(cleared(state.tryMove('b', 1000)).cascade).toEqual([]);
    expect(state.snapshot().streak).toBe(2);
    const third = cleared(state.tryMove('e', 2000));
    // After e leaves, c, d, g and h can all escape: the first three go.
    expect(ids(third.cascade)).toEqual(['c', 'd', 'g']);
    expect(left(state)).toEqual(['f', 'h']);
    expect(state.snapshot()).toMatchObject({ moves: 3, cascadeClears: 3, autoClears: 0, streak: 0, lives: 3 });
  });

  it('clears only arrows that were removable at that moment, never blocked ones', () => {
    const state = new GameState(level);
    state.tryMove('a', 0);
    state.tryMove('b', 500);
    const r = cleared(state.tryMove('c', 1000));
    // Removable now: e and h. d and g are blocked by e and stay, even after e leaves.
    expect(ids(r.cascade)).toEqual(['e', 'h']);
    expect(left(state)).toEqual(['d', 'f', 'g']);
  });

  it('a pause longer than 1.5 s starts a new streak; exactly 1.5 s still counts', () => {
    const state = new GameState(level);
    state.tryMove('a', 0);
    state.tryMove('b', STREAK_WINDOW_MS + 1); // too slow: streak of 1
    expect(state.snapshot().streak).toBe(1);
    state.tryMove('c', 2 * STREAK_WINDOW_MS + 1); // exactly on time
    expect(state.snapshot().streak).toBe(2);
    expect(cleared(state.tryMove('e', 2 * STREAK_WINDOW_MS + 1001)).cascade.length).toBeGreaterThanOrEqual(BONUS_MIN);
  });

  it('a blocked tap resets the streak, including a repeat tap on a red arrow', () => {
    const state = new GameState(level);
    state.tryMove('a', 0);
    state.tryMove('b', 100);
    expect(state.tryMove('d', 200).kind).toBe('blocked'); // costs a life
    expect(state.snapshot().streak).toBe(0);
    state.tryMove('c', 300);
    state.tryMove('h', 400);
    expect(state.snapshot().streak).toBe(2);
    const repeat = state.tryMove('d', 500); // already red: no life lost, but the streak is gone
    expect(repeat).toMatchObject({ kind: 'blocked', lifeLost: false });
    expect(state.snapshot().streak).toBe(0);
    expect(cleared(state.tryMove('e', 600)).cascade).toEqual([]); // a new streak of 1
  });

  it('restart and a new level reset the streak', () => {
    const state = new GameState(level);
    state.tryMove('a', 0);
    state.tryMove('b', 100);
    state.reset();
    expect(state.snapshot()).toMatchObject({ streak: 0, streakAt: null });
    state.tryMove('a', 200);
    state.load(level);
    expect(state.snapshot().streak).toBe(0);
  });

  it('with fewer than 2 removable arrows there is no bonus, and the streak still ends', () => {
    // After a, b and c leave, only d can escape (f is behind d).
    const small = levelFromMap(98, ['a> .  .', 'b> .  .', 'd> c> .', 'f^ .  .']);
    const state = new GameState(small);
    state.tryMove('a', 0);
    state.tryMove('b', 100);
    expect(cleared(state.tryMove('c', 200)).cascade).toEqual([]);
    expect(state.snapshot()).toMatchObject({ streak: 0, cascadeClears: 0 });
  });

  it('one bonus per streak: the next one needs three new quick taps', () => {
    const state = new GameState(level);
    state.tryMove('a', 0);
    state.tryMove('b', 100);
    cleared(state.tryMove('c', 200)); // bonus: e, h
    expect(cleared(state.tryMove('d', 300)).cascade).toEqual([]);
    expect(state.snapshot().streak).toBe(1);
  });

  it("never empties the board: the last arrow is always the player's", () => {
    const four = levelFromMap(97, ['a> .', 'b> .', 'c> .', 'd> .']);
    const state = new GameState(four);
    state.tryMove('a', 0);
    state.tryMove('b', 100);
    expect(cleared(state.tryMove('c', 200)).cascade).toEqual([]); // only d is left: no bonus
    expect(cleared(state.tryMove('d', 300)).won).toBe(true);
  });

  it('red arrows freed by a bonus leave by the usual chain rule', () => {
    const state = new GameState(level);
    expect(state.tryMove('f', 0).kind).toBe('blocked'); // f turns red
    state.tryMove('a', 100);
    state.tryMove('b', 200);
    const r = cleared(state.tryMove('e', 300));
    expect(ids(r.cascade)).toEqual(['c', 'd', 'g']);
    expect(ids(r.cascadeChain)).toEqual(['f']); // freed when c and d left
    expect(state.snapshot()).toMatchObject({ autoClears: 1, cascadeClears: 3, mistakes: 1, remaining: 1 });
  });

  it('is deterministic for the same taps at the same times', () => {
    const play = () => {
      const s = new GameState(level);
      return ([['a', 0], ['b', 900], ['e', 1800], ['h', 5000]] as const).map(([id, at]) => s.tryMove(id, at));
    };
    expect(play()).toEqual(play());
  });
});

describe('streak bonus: records and rewards', () => {
  it('reports each removed arrow exactly once, bonus clears as automatic', () => {
    const state = new GameState(level);
    const removed: [string, boolean][] = [];
    state.onRemove((arrow, auto) => removed.push([arrow.id, auto]));
    state.tryMove('a', 0);
    state.tryMove('b', 100);
    state.tryMove('e', 200);
    expect(removed).toEqual([['a', false], ['b', false], ['e', false], ['c', true], ['d', true], ['g', true]]);
  });

  it('a won level counts every arrow once: taps + chain + bonus', () => {
    const state = new GameState(level);
    let t = 0;
    for (let id = freeArrow(state); id && state.isPlaying; id = freeArrow(state)) state.tryMove(id, (t += 100));
    const s = state.snapshot();
    expect(s.won).toBe(true);
    expect(s.directClears + s.autoClears + s.cascadeClears).toBe(level.arrows.length);
  });

  it('awards each Energy Arrow once, also when a bonus removes it', () => {
    const day = '2026-11-05';
    for (const challenge of dailyChallenges(day, LEVELS)) {
      let league = settle(readLeague(null).value, day, true).state;
      let awarded = 0;
      const state = new GameState(challenge.level);
      state.onRemove((arrow) => {
        if (!arrow.energy) return;
        const result = collect(league, day, challenge, arrow.id);
        league = result.state;
        if (result.status === 'awarded') awarded++;
      });
      let t = 0;
      for (let id = freeArrow(state); id && state.isPlaying; id = freeArrow(state)) state.tryMove(id, (t += 200));
      expect(state.isWon).toBe(true);
      expect(state.snapshot().cascadeClears).toBeGreaterThan(0); // quick play earns bonuses
      expect(awarded).toBe(challenge.energyArrowIds.length);
      // Collecting the same arrow again is never paid twice.
      expect(collect(league, day, challenge, challenge.energyArrowIds[0]).status).toBe('duplicate');
    }
  });

  it('count towards arrows cleared (statistics and daily log), not towards chain clears', async () => {
    const { recordAttempt, createStats } = await import('../profile/Stats');
    const { createDailyLog, recordDayAttempt } = await import('../recap/DailyLog');
    const attempt = { outcome: 'won' as const, directClears: 3, autoClears: 1, cascadeClears: 2, mistakes: 0, uncountedTimeMs: 5 };
    const stats = recordAttempt(createStats(), attempt);
    expect(stats).toMatchObject({ arrowsCleared: 6, chainClears: 1 });
    expect(recordDayAttempt(createDailyLog('2026-10-31'), '2026-10-31', attempt).days['2026-10-31'].arrows).toBe(6);
    expect(recordAttempt(createStats(), { ...attempt, cascadeClears: undefined }).arrowsCleared).toBe(4);
  });
});
