import { describe, expect, it } from 'vitest';
import { LEVELS } from '../levels';
import { levelFromMap } from '../levels/levelMap';
import { GameState } from './GameState';
import { Grid } from './Grid';
import { checkExitPath } from './PathChecker';
import { findSolution } from './solver';
import { STARTING_LIVES, type GameSnapshot, type LevelData, type MoveResult } from './types';

// a is blocked by b; b is free.
const small = levelFromMap(1, [
  'a  a> b^',
  '.  .  b',
  '.  .  .',
]);

// a and b are both blocked only by c; c is free.
const fork = levelFromMap(2, [
  '.  .  .  .  .',
  'a  a> c  .  .',
  '.  .  c  .  .',
  'b  b> cv .  .',
  '.  .  .  .  .',
]);

// x is blocked by y, y is blocked by z, z is free: a cascade.
const cascade = levelFromMap(3, [
  '.  .  .  .  .',
  'x  x> y  .  .',
  '.  .  y  .  .',
  '.  .  yv .  .',
  'z< z  z  .  .',
]);

function cleared(result: MoveResult) {
  if (result.kind !== 'cleared') throw new Error(`expected a clear, got ${result.kind}`);
  return result;
}

function blocked(result: MoveResult) {
  if (result.kind !== 'blocked') throw new Error(`expected a block, got ${result.kind}`);
  return result;
}

/** Ids of arrows that are blocked at the start of a level. */
function initiallyBlocked(level: LevelData): string[] {
  const grid = new Grid(level.rows, level.cols);
  level.arrows.forEach((a) => grid.place(a));
  return level.arrows.filter((a) => !checkExitPath(grid, a).clear).map((a) => a.id);
}

describe('lives and mistakes', () => {
  it.each(LEVELS.map((l) => [l.id, l] as const))('level %i starts with 3 lives and no mistakes', (_id, level) => {
    const s = new GameState(level).snapshot();
    expect(s).toMatchObject({ lives: STARTING_LIVES, mistakes: 0, activated: 0, status: 'playing' });
    expect(STARTING_LIVES).toBe(3);
  });

  it('a blocked tap costs exactly one life and activates the arrow', () => {
    const state = new GameState(small);
    const result = blocked(state.tryMove('a'));
    expect(result).toMatchObject({ blockerId: 'b', lifeLost: true, failed: false });
    expect(state.snapshot()).toMatchObject({ lives: 2, mistakes: 1, activated: 1, moves: 0 });
    expect(state.isActivated('a')).toBe(true);
  });

  it('a successful move costs no life', () => {
    const state = new GameState(small);
    cleared(state.tryMove('b'));
    expect(state.snapshot()).toMatchObject({ lives: 3, mistakes: 0, moves: 1, directClears: 1 });
  });

  it('repeat taps on a red, still-blocked arrow cost nothing and change nothing', () => {
    const state = new GameState(fork);
    state.tryMove('a');
    const before = state.snapshot();
    for (let i = 0; i < 5; i++) {
      expect(blocked(state.tryMove('a'))).toMatchObject({ lifeLost: false, failed: false });
    }
    expect(state.snapshot()).toEqual(before);
  });

  it('red arrows stay on the board and keep blocking', () => {
    const state = new GameState(cascade);
    state.tryMove('y'); // y is blocked by z → red
    expect(state.getArrows().map((a) => a.id)).toContain('y');
    // x is still blocked by the red y
    expect(blocked(state.tryMove('x')).blockerId).toBe('y');
  });

  it('lives never go below zero and the third mistake fails the level exactly once', () => {
    const level = LEVELS[9];
    const state = new GameState(level);
    const results = initiallyBlocked(level).slice(0, 4).map((id) => state.tryMove(id));
    const failures = results.filter((r) => r.kind === 'blocked' && r.failed);
    expect(failures).toHaveLength(1);
    expect(results[2]).toMatchObject({ kind: 'blocked', failed: true });
    expect(results[3]).toEqual({ kind: 'ignored', reason: 'level-over' });
    expect(state.snapshot()).toMatchObject({ lives: 0, mistakes: 3, status: 'failed', stars: 0, won: false });
  });

  it('a failed level accepts no more moves, even ones that would clear', () => {
    const state = new GameState(LEVELS[9]);
    initiallyBlocked(LEVELS[9]).slice(0, 3).forEach((id) => state.tryMove(id));
    const free = LEVELS[9].arrows.map((a) => a.id).find((id) => !initiallyBlocked(LEVELS[9]).includes(id))!;
    expect(state.tryMove(free)).toEqual({ kind: 'ignored', reason: 'level-over' });
    expect(state.snapshot().remaining).toBe(LEVELS[9].arrows.length);
  });
});

describe('chain reactions', () => {
  it('removing a blocker automatically releases the red arrow it was holding', () => {
    const state = new GameState(small);
    state.tryMove('a'); // red
    const result = cleared(state.tryMove('b'));
    expect(result.chain.map((r) => r.arrowId)).toEqual(['a']);
    expect(result.won).toBe(true);
    expect(state.snapshot()).toMatchObject({ remaining: 0, directClears: 1, autoClears: 1, moves: 1, lives: 2 });
  });

  it('releases several red arrows in level-data order', () => {
    const state = new GameState(fork);
    state.tryMove('b');
    state.tryMove('a');
    const result = cleared(state.tryMove('c'));
    expect(result.chain.map((r) => r.arrowId)).toEqual(['a', 'b']); // data order, not tap order
  });

  it('cascades: each release can free the next', () => {
    const state = new GameState(cascade);
    state.tryMove('x');
    state.tryMove('y');
    const result = cleared(state.tryMove('z'));
    // x comes first in data order but is still blocked by y, so y goes first.
    expect(result.chain.map((r) => r.arrowId)).toEqual(['y', 'x']);
    expect(state.snapshot()).toMatchObject({ status: 'won', autoClears: 2, directClears: 1, lives: 1 });
  });

  it('is deterministic', () => {
    const play = () => {
      const state = new GameState(cascade, { clock: () => 0 });
      return [state.tryMove('x'), state.tryMove('y'), state.tryMove('z'), state.snapshot()];
    };
    expect(play()).toEqual(play());
  });

  it('never releases ordinary cyan arrows', () => {
    const state = new GameState(fork);
    state.tryMove('a'); // only a is red; b stays cyan
    const result = cleared(state.tryMove('c'));
    expect(result.chain.map((r) => r.arrowId)).toEqual(['a']);
    expect(state.getArrows().map((a) => a.id)).toEqual(['b']);
    expect(state.isActivated('b')).toBe(false);
  });

  it('automatic releases cost no lives and are not counted as player moves', () => {
    const state = new GameState(fork);
    state.tryMove('a');
    state.tryMove('b');
    const before = state.snapshot();
    cleared(state.tryMove('c'));
    const after = state.snapshot();
    expect(after.lives).toBe(before.lives);
    expect(after.mistakes).toBe(before.mistakes);
    expect(after.moves).toBe(before.moves + 1);
    expect(after.autoClears).toBe(2);
  });
});

describe('stars', () => {
  it('awards 3 stars for a flawless clear', () => {
    const state = new GameState(fork);
    ['c', 'a', 'b'].forEach((id) => state.tryMove(id));
    expect(state.snapshot()).toMatchObject({ status: 'won', won: true, stars: 3 });
  });

  it('awards 2 stars with one mistake', () => {
    const state = new GameState(fork);
    ['a', 'c', 'b'].forEach((id) => state.tryMove(id));
    expect(state.snapshot()).toMatchObject({ status: 'won', mistakes: 1, stars: 2 });
  });

  it('awards 1 star with two mistakes', () => {
    const state = new GameState(fork);
    ['a', 'b', 'c'].forEach((id) => state.tryMove(id));
    expect(state.snapshot()).toMatchObject({ status: 'won', mistakes: 2, stars: 1 });
  });
});

describe('restart and level changes', () => {
  it('restart restores lives and clears mistakes, red arrows and counters', () => {
    const state = new GameState(fork);
    state.tryMove('a');
    state.tryMove('b');
    state.reset();
    expect(state.snapshot()).toMatchObject({
      status: 'playing',
      lives: 3,
      mistakes: 0,
      activated: 0,
      moves: 0,
      directClears: 0,
      autoClears: 0,
      remaining: 3,
    });
    expect(state.isActivated('a')).toBe(false);
    // b is blocked again and costs a life again: its red state is really gone.
    expect(blocked(state.tryMove('b')).lifeLost).toBe(true);
  });

  it('restart after a failure allows play again', () => {
    const state = new GameState(LEVELS[9]);
    initiallyBlocked(LEVELS[9]).slice(0, 3).forEach((id) => state.tryMove(id));
    expect(state.isFailed).toBe(true);
    state.reset();
    expect(state.isPlaying).toBe(true);
    expect(state.lives).toBe(3);
  });

  it('loading another level replaces everything from the previous one', () => {
    const state = new GameState(fork);
    state.tryMove('a');
    state.load(LEVELS[8]);
    expect(state.snapshot()).toEqual({
      levelId: 9,
      status: 'playing',
      moves: 0,
      directClears: 0,
      autoClears: 0,
      cascadeClears: 0,
      streak: 0,
      streakAt: null,
      bonusCooldown: 0,
      longestChain: 0,
      mistakes: 0,
      lives: 3,
      remaining: LEVELS[8].arrows.length,
      total: LEVELS[8].arrows.length,
      activated: 0,
      won: false,
      stars: 0,
    });
    expect([state.rows, state.cols]).toEqual([LEVELS[8].rows, LEVELS[8].cols]);
  });

  it('notifies subscribers on mistakes, moves, restarts and level changes', () => {
    const state = new GameState(small);
    const seen: GameSnapshot[] = [];
    state.subscribe((s) => seen.push(s));
    state.tryMove('a'); // life lost
    state.tryMove('a'); // repeat: no notification
    state.tryMove('b'); // clear + chain
    state.reset();
    state.load(LEVELS[1]);
    expect(seen.map((s) => [s.levelId, s.lives, s.remaining])).toEqual([
      [1, 3, 2],
      [1, 2, 2],
      [1, 2, 0],
      [1, 3, 2],
      [2, 3, LEVELS[1].arrows.length],
    ]);
  });
});

describe('all levels', () => {
  it.each(LEVELS.map((l) => [l.id, l] as const))('level %i can be won flawlessly for 3 stars', (_id, level) => {
    const state = new GameState(level);
    // Cascades may clear some arrows of the solution order before their turn: skip those.
    for (const id of findSolution(level)!) if (state.getArrows().some((a) => a.id === id)) expect(state.tryMove(id).kind).toBe('cleared');
    const s = state.snapshot();
    expect(s).toMatchObject({ won: true, stars: 3, autoClears: 0 });
    expect(s.moves + s.cascadeClears).toBe(level.arrows.length);
  });
});
