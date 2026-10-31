import { describe, expect, it } from 'vitest';
import { dailyChallenges } from '../league/challenges';
import { collect, settle } from '../league/League';
import { readLeague } from '../league/LeagueService';
import { LEVELS } from '../levels';
import { arrowLabel, levelFromMap } from '../levels/levelMap';
import { GameState } from './GameState';
import { BONUS_CLEARS, BONUS_COOLDOWN, STREAK_TAPS, STREAK_WINDOW_MS, type MoveResult } from './types';

/**
 * `free` single-cell arrows stacked in column 0, all pointing right (each free
 * from the start), and below them `z` pointing up through all of them: it is
 * blocked until the whole column has gone. Labels a, b, c… in level order.
 */
function column(free: number) {
  const rows = Array.from({ length: free }, (_, i) => `${arrowLabel(i)}> .  .`);
  return levelFromMap(99, [...rows, 'z^ .  .']);
}
const big = column(24);

const cleared = (r: MoveResult) => {
  if (r.kind !== 'cleared') throw new Error(`expected a clear, got ${r.kind}`);
  return r;
};
const ids = (removals: readonly { arrowId: string }[]) => removals.map((r) => r.arrowId);
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

/** Taps free arrows (in level order) at the given times; returns each tap's bonus clears. */
function play(state: GameState, times: readonly number[]): string[][] {
  return times.map((at) => ids(cleared(state.tryMove(freeArrow(state)!, at)).cascade));
}

/** `n` taps, `gap` ms apart, starting at `from`. */
const taps = (n: number, gap: number, from = 0) => Array.from({ length: n }, (_, i) => from + i * gap);

describe('streak bonus: frequency', () => {
  it('uses the configured rules: 5 taps within 4 s, exactly 2 clears, then 8 more clears', () => {
    expect([STREAK_TAPS, STREAK_WINDOW_MS, BONUS_CLEARS, BONUS_COOLDOWN]).toEqual([5, 4000, 2, 8]);
  });

  it('four quick taps are not enough; the fifth within 4 s clears exactly 2 arrows', () => {
    const state = new GameState(big);
    const bonuses = play(state, taps(5, 500));
    expect(bonuses.slice(0, 4)).toEqual([[], [], [], []]);
    // a–e were tapped; the first two arrows that can escape next are f and g.
    expect(bonuses[4]).toEqual(['f', 'g']);
    expect(state.snapshot()).toMatchObject({ moves: 5, cascadeClears: 2, streak: 0, bonusCooldown: BONUS_COOLDOWN });
  });

  it('slow play never earns a bonus', () => {
    const state = new GameState(big);
    expect(play(state, taps(12, 1100)).flat()).toEqual([]); // 5 taps always span 4.4 s
  });

  it('uses a rolling window: the 5 most recent taps must fit in 4 s (exactly 4 s counts)', () => {
    const state = new GameState(big);
    // 0, 1000, 2000, 3000, 4500: the five span 4.5 s, so no bonus yet...
    const first = play(state, [0, 1000, 2000, 3000, 4500]);
    expect(first.flat()).toEqual([]);
    expect(state.snapshot().streak).toBe(4); // 1000–4500 are still in the window
    // ...but 1000, 2000, 3000, 4500, 5000 fit exactly in 4 s.
    expect(play(state, [5000])[0]).toHaveLength(BONUS_CLEARS);
  });

  it('after a bonus, the next one needs at least 8 more clears of the player, however fast', () => {
    const state = new GameState(big);
    const bonuses = play(state, taps(13, 100));
    const fired = bonuses.map((b, i) => (b.length > 0 ? i + 1 : 0)).filter(Boolean);
    expect(fired).toEqual([5, 13]); // the 5th tap, then the 8th clear after it
    const cooldowns: number[] = [];
    const s2 = new GameState(big);
    for (const at of taps(6, 100)) {
      s2.tryMove(freeArrow(s2)!, at);
      cooldowns.push(s2.snapshot().bonusCooldown);
    }
    expect(cooldowns).toEqual([0, 0, 0, 0, 8, 7]);
  });

  it('chain and bonus clears never count towards the streak', () => {
    const state = new GameState(big);
    play(state, taps(5, 100)); // bonus: 2 automatic clears
    expect(state.snapshot()).toMatchObject({ streak: 0, cascadeClears: 2, directClears: 5 });
    play(state, [600]);
    expect(state.snapshot().streak).toBe(1); // only the player's own tap
  });
});

describe('streak bonus: eligibility and resets', () => {
  it('only removable normal arrows are taken, never blocked or red ones', () => {
    // a–d free; e (up) is blocked by d, c, b, a; f free; g (up) is blocked by f.
    const level = levelFromMap(98, [
      'a> .  .',
      'b> .  .',
      'c> .  .',
      'd> .  .',
      'e^ f> .',
      '.  g^ .',
      'h> .  .',
      'i> .  .',
    ]);
    const state = new GameState(level);
    expect(state.tryMove('g', 0).kind).toBe('blocked'); // g turns red; the streak starts after this
    const bonus = play(state, taps(5, 100, 100))[4];
    // Tapped: a, b, c, d (freeing e) and e. Removable now: f, h, i; g is red, not eligible.
    expect(bonus).toEqual(['f', 'h']);
    expect(state.isActivated('g')).toBe(false); // f left: the red g was released by the chain rule
  });

  it('is skipped while fewer than 2 arrows are removable (no cooldown), and fires on a later tap once there are', () => {
    // a–e free. x (up) waits for all of them; m (left) and y (up) wait for x; w waits for y.
    const level = levelFromMap(97, [
      'a> .  .',
      'b> .  .',
      'c> .  .',
      'd> .  .',
      'e> .  .',
      'x^ m< m',
      'y^ .  .',
      'w^ .  .',
    ]);
    const state = new GameState(level);
    const bonuses = play(state, taps(5, 100)); // a–e: afterwards only x can escape
    expect(bonuses.flat()).toEqual([]);
    expect(state.snapshot()).toMatchObject({ streak: 5, bonusCooldown: 0, cascadeClears: 0 });
    // Tapping x frees m and y: now two are removable, and the streak still holds.
    expect(play(state, [600])[0]).toEqual(['m', 'y']);
    expect(state.getArrows().map((a) => a.id)).toEqual(['w']);
    expect(state.snapshot()).toMatchObject({ streak: 0, bonusCooldown: BONUS_COOLDOWN });
  });

  it('never empties the board: the last arrow is always the player\'s', () => {
    const s = new GameState(column(5)); // a–e free, z behind them
    const bonuses = play(s, taps(5, 100));
    expect(bonuses.flat()).toEqual([]); // after the 5th tap only z is left
    expect(cleared(s.tryMove('z', 600)).won).toBe(true);
  });

  it('a blocked tap resets the streak, including a repeat tap on a red arrow', () => {
    const state = new GameState(big);
    play(state, taps(4, 100));
    expect(state.tryMove('z', 450).kind).toBe('blocked'); // costs a life
    expect(state.snapshot().streak).toBe(0);
    play(state, taps(4, 100, 500));
    expect(state.tryMove('z', 900)).toMatchObject({ kind: 'blocked', lifeLost: false }); // already red
    expect(state.snapshot().streak).toBe(0);
    expect(play(state, [1000])[0]).toEqual([]);
  });

  it('restart, a new level and running out of lives reset the streak and the cooldown', () => {
    const state = new GameState(big);
    play(state, taps(6, 100)); // a bonus, then one clear of the cooldown
    expect(state.snapshot()).toMatchObject({ streak: 1, bonusCooldown: 7 });
    state.reset();
    expect(state.snapshot()).toMatchObject({ streak: 0, streakAt: null, bonusCooldown: 0 });
    play(state, taps(6, 100));
    state.load(big);
    expect(state.snapshot()).toMatchObject({ streak: 0, bonusCooldown: 0 });
    play(state, taps(6, 100));
    for (let i = 0; i < 3; i++) state.tryMove('z', 1000 + i); // first tap red (life), repeats free
    const s = new GameState(big, { startingLives: 1 });
    play(s, taps(6, 100));
    expect(s.tryMove('z', 700)).toMatchObject({ kind: 'blocked', failed: true });
    expect(s.snapshot()).toMatchObject({ status: 'failed', streak: 0, bonusCooldown: 0 });
  });

  it('is deterministic for the same taps at the same times', () => {
    const run = () => {
      const s = new GameState(big);
      return taps(14, 150).map((at) => s.tryMove(freeArrow(s)!, at));
    };
    expect(run()).toEqual(run());
  });
});

describe('streak bonus: records and rewards', () => {
  it('reports each removed arrow exactly once, bonus clears as automatic', () => {
    const state = new GameState(big);
    const removed: [string, boolean][] = [];
    state.onRemove((arrow, auto) => removed.push([arrow.id, auto]));
    play(state, taps(5, 100));
    expect(removed).toEqual([['a', false], ['b', false], ['c', false], ['d', false], ['e', false], ['f', true], ['g', true]]);
  });

  it('a won level counts every arrow once: taps + chain + bonus', () => {
    const state = new GameState(big);
    let t = 0;
    for (let id = freeArrow(state); id && state.isPlaying; id = freeArrow(state)) state.tryMove(id, (t += 100));
    const s = state.snapshot();
    expect(s.won).toBe(true);
    expect(s.cascadeClears).toBe(2 * BONUS_CLEARS); // taps 5 and 13 earned a bonus; the cooldown was not over again before the end
    expect(s.directClears + s.autoClears + s.cascadeClears).toBe(big.arrows.length);
  });

  it('awards each Energy Arrow once, also when a bonus removes it', () => {
    const day = '2026-11-05';
    let bonuses = 0;
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
      bonuses += state.snapshot().cascadeClears;
      expect(awarded).toBe(challenge.energyArrowIds.length);
      // Collecting the same arrow again is never paid twice.
      expect(collect(league, day, challenge, challenge.energyArrowIds[0]).status).toBe('duplicate');
    }
    expect(bonuses).toBeGreaterThan(0); // quick play earned bonuses along the way
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
