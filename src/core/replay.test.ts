import { describe, expect, it } from 'vitest';
import { applyAttempt, type AttemptSummary, type Records } from '../app/AttemptTracker';
import { LEVELS } from '../levels';
import { createProgress } from '../progress/Progress';
import { createStats } from '../profile/Stats';
import { createDailyLog, recordDayAttempt } from '../recap/DailyLog';
import { golden, plain } from '../testing/golden';
import { headOf, step } from './Arrow';
import { GameState } from './GameState';
import { createRandom, randomInt } from './random';
import { findSolution } from './solver';
import type { Cell, GameSnapshot, LevelData, MoveResult, Removal } from './types';

/**
 * Characterization of the rules on every real level: fixed tap scripts at
 * fixed clock times, replayed headlessly. Records every MoveResult, the
 * final GameSnapshot and the saved records, so any change to moves, chains,
 * the streak bonus, cooldowns, lives, stars or arrow order shows up here.
 * This is the CURRENT behaviour, not a specification.
 */

interface Tap {
  readonly id: string;
  readonly at: number;
}

/** A tap script decides the next tap from the live state; null ends it. */
type Script = (state: GameState, level: LevelData, n: number) => Tap | null;

/** Lives for the scripts that must reach the end however many mistakes they make. */
const MANY_LIVES = 999;

/** The first normal arrow in level order whose way out is clear. */
function firstFree(state: GameState): string | undefined {
  return state.getArrows().find((a) => {
    if (state.isActivated(a.id)) return false;
    for (let c = step(headOf(a), a.direction); c.row >= 0 && c.col >= 0 && c.row < state.rows && c.col < state.cols; c = step(c, a.direction)) {
      if (state.arrowIdAt(c.row, c.col) !== undefined) return false;
    }
    return true;
  })?.id;
}

const SCRIPTS: Record<string, { lives?: number; script: (level: LevelData) => Script }> = {
  /** The solver's order, 1.1 s apart: never fast enough for a streak bonus. */
  'solution-slow': {
    script: (level) => {
      const order = findSolution(level)!;
      return (_s, _l, n) => (n < order.length ? { id: order[n], at: n * 1100 } : null);
    },
  },
  /** Exactly 1 s apart: five taps span exactly the 4 s window (the inclusive edge). */
  'solution-1000ms': {
    script: (level) => {
      const order = findSolution(level)!;
      let i = 0;
      return (state, _l, n) => {
        while (i < order.length && !state.has(order[i])) i++; // bonus clears skip ahead
        return i < order.length ? { id: order[i], at: n * 1000 } : null;
      };
    },
  },
  /** First free arrow in level order, 100 ms apart: bonuses and cooldowns. */
  'greedy-fast': {
    script: () => (state, _l, n) => {
      const id = state.isPlaying ? firstFree(state) : undefined;
      return id ? { id, at: n * 100 } : null;
    },
  },
  /** Bursts of four quick taps, then a pause that empties the window. */
  'greedy-bursts': {
    script: () => (state, _l, n) => {
      const id = state.isPlaying ? firstFree(state) : undefined;
      return id ? { id, at: Math.floor(n / 4) * 5000 + (n % 4) * 50 } : null;
    },
  },
  /** Every arrow in reverse level order, all at the same instant, round after round: red arrows and chains. */
  'reverse-same-instant': {
    lives: MANY_LIVES,
    script: (level) => {
      const ids = [...level.arrows].reverse().map((a) => a.id);
      return (state, _l, n) => (state.isPlaying && n < ids.length * ids.length ? { id: ids[n % ids.length], at: 0 } : null);
    },
  },
  /** Seeded random taps on any level arrow (removed ones included) with random gaps, normal lives, then taps after the end. */
  chaos: {
    script: (level) => {
      const random = createRandom(level.id * 7919);
      let at = 0;
      let after = 0;
      return (state, l, n) => {
        if (!state.isPlaying && after++ >= 3) return null;
        if (n >= l.arrows.length * 6) return null;
        at += randomInt(random, 0, 1500);
        return { id: l.arrows[randomInt(random, 0, l.arrows.length - 1)].id, at };
      };
    },
  },
  /** Seeded random taps with plenty of lives, until the board is empty. */
  'chaos-to-the-end': {
    lives: MANY_LIVES,
    script: (level) => {
      const random = createRandom(level.id * 104729);
      let at = 0;
      return (state, l, n) => {
        if (!state.isPlaying || n >= l.arrows.length * 40) return null;
        at += randomInt(random, 0, 900);
        const live = state.getArrows();
        return { id: live[randomInt(random, 0, live.length - 1)].id, at };
      };
    },
  },
  /** Every tap of the solution is repeated at the same instant (a double tap), plus a stray unknown id. */
  'double-taps': {
    script: (level) => {
      const order = findSolution(level)!;
      return (_s, _l, n) => {
        const i = Math.floor(n / 2);
        if (i > order.length) return null;
        return { id: i === order.length ? 'no-such-arrow' : order[i], at: i * 300 };
      };
    },
  },
};

/** Exit and free paths are straight lines from the head, so their length says everything. */
function assertStraight(level: LevelData, arrowId: string, path: readonly Cell[]): void {
  const arrow = level.arrows.find((a) => a.id === arrowId)!;
  let cell = headOf(arrow);
  for (const c of path) {
    cell = step(cell, arrow.direction);
    if (c.row !== cell.row || c.col !== cell.col) throw new Error(`path of ${arrowId} is not straight from its head`);
  }
}

const removals = (level: LevelData, list: readonly Removal[]) =>
  list
    .map((r) => {
      assertStraight(level, r.arrowId, r.exitPath);
      return `${r.arrowId}:${r.exitPath.length}`;
    })
    .join(',');

/** One line per tap: the result, plus streak / cooldown / lives / red count after it. */
function describeMove(level: LevelData, tap: Tap, r: MoveResult, s: GameSnapshot, emits: number): string {
  const after = `s${s.streak} cd${s.bonusCooldown} l${s.lives} r${s.activated} e${emits}`;
  switch (r.kind) {
    case 'cleared':
      assertStraight(level, r.arrowId, r.exitPath);
      return `@${tap.at} C ${r.arrowId}:${r.exitPath.length} [${removals(level, r.chain)}] [${removals(level, r.cascade)}] [${removals(level, r.cascadeChain)}]${r.won ? ' WON' : ''} | ${after}`;
    case 'blocked':
      assertStraight(level, r.arrowId, r.freePath);
      return `@${tap.at} B ${r.arrowId}<${r.blockerId}:${r.freePath.length}${r.lifeLost ? ' LIFE' : ''}${r.failed ? ' FAILED' : ''} | ${after}`;
    case 'ignored':
      return `@${tap.at} I ${tap.id} ${r.reason} | ${after}`;
  }
}

interface Replay {
  moves: string[];
  /** Every removal reported by onRemove, `!` marking automatic ones. */
  removed: string;
  /** Arrows left on the board, in getArrows() order. */
  left: string;
  final: GameSnapshot;
}

function replay(level: LevelData, name: string, state?: GameState): Replay {
  const { lives, script } = SCRIPTS[name];
  const s = state ?? new GameState(level, { startingLives: lives, clock: () => 0 });
  const next = script(level);
  const removed: string[] = [];
  let emits = 0;
  const offRemove = s.onRemove((a, auto) => removed.push(auto ? `!${a.id}` : a.id));
  const offEmit = s.subscribe(() => emits++);
  const moves: string[] = [];
  for (let n = 0, tap = next(s, level, 0); tap; tap = next(s, level, ++n)) {
    emits = 0;
    const result = s.tryMove(tap.id, tap.at);
    moves.push(describeMove(level, tap, result, s.snapshot(), emits));
  }
  offRemove();
  offEmit();
  return { moves, removed: removed.join(' '), left: s.getArrows().map((a) => a.id).join(' '), final: s.snapshot() };
}

const SCRIPT_NAMES = Object.keys(SCRIPTS);
const replays = Object.fromEntries(LEVELS.map((level) => [level.id, Object.fromEntries(SCRIPT_NAMES.map((name) => [name, replay(level, name)]))]));
const GOLDEN = golden(new URL('./replay.golden.json', import.meta.url), plain(replays));

describe.each(LEVELS.map((level) => [level.id, level] as const))('replay of level %i', (id, level) => {
  it.each(SCRIPT_NAMES)('%s gives the recorded moves and final state', (name) => {
    expect(plain(replays[id][name])).toEqual(GOLDEN[id][name]);
  });

  it('reports every removal once, in rule order (tap, chain, bonus, bonus chain)', () => {
    for (const name of SCRIPT_NAMES) {
      const r = replays[id][name];
      const fromMoves = r.moves.flatMap((m) => {
        const c = /^@\S+ C (\S+?):\d+ \[(.*?)\] \[(.*?)\] \[(.*?)\]/.exec(m);
        if (!c) return [];
        const auto = (list: string) => (list ? list.split(',').map((x) => `!${x.split(':')[0]}`) : []);
        return [c[1], ...auto(c[2]), ...auto(c[3]), ...auto(c[4])];
      });
      expect(r.removed, name).toBe(fromMoves.join(' '));
      const f = r.final;
      expect(f.directClears + f.autoClears + f.cascadeClears + f.remaining, name).toBe(level.arrows.length);
    }
  });

  it('replays identically on a reused state after load() and after reset()', () => {
    const reused = new GameState(LEVELS[(id % LEVELS.length)], { clock: () => 0 });
    reused.load(level);
    expect(plain(replay(level, 'greedy-fast', reused))).toEqual(GOLDEN[id]['greedy-fast']);
    reused.reset();
    expect(plain(replay(level, 'greedy-fast', reused))).toEqual(GOLDEN[id]['greedy-fast']);
  });
});

describe('records from replayed attempts', () => {
  const TRACKED_SINCE = new Date('2026-10-01T08:00:00.000Z');
  const DAY = '2026-10-31';

  const summary = (level: LevelData, final: GameSnapshot, timeMs: number): AttemptSummary => ({
    levelId: level.id,
    revision: level.revision ?? 1,
    outcome: final.status === 'won' ? 'won' : final.status === 'failed' ? 'failed' : 'abandoned',
    timeMs,
    uncountedTimeMs: timeMs,
    moves: final.moves,
    stars: final.stars,
    directClears: final.directClears,
    autoClears: final.autoClears,
    cascadeClears: final.cascadeClears,
    longestChain: final.longestChain,
    mistakes: final.mistakes,
  });

  /** Plays the whole game in order with several scripts per level, as one player would. */
  function campaign() {
    let records: Records = { progress: createProgress(), stats: createStats(TRACKED_SINCE) };
    let log = createDailyLog(DAY);
    const completions: unknown[] = [];
    for (const level of LEVELS) {
      for (const [i, name] of ['chaos', 'greedy-bursts', 'solution-slow', 'greedy-fast'].entries()) {
        const attempt = summary(level, replays[level.id][name].final, 60_000 - level.id * 1000 + [0, 9_000, -7_000, 3_000][i]);
        const applied = applyAttempt(records, attempt, LEVELS.length);
        records = applied.records;
        log = recordDayAttempt(log, DAY, attempt);
        // The progress inside each completion is checked through the final records.
        const { progress: _, ...completion } = applied.completion ?? { progress: null };
        completions.push([level.id, name, attempt.outcome, applied.completion ? completion : null]);
      }
    }
    return { completions, records, log };
  }

  const actual = plain(campaign());
  const GOLDEN_RECORDS = golden(new URL('./replay.records.golden.json', import.meta.url), actual);

  it('gives the recorded completions, progress, statistics and daily log', () => {
    expect(actual).toEqual(GOLDEN_RECORDS);
  });

  it('is deterministic', () => {
    expect(plain(campaign())).toEqual(actual);
  });
});
