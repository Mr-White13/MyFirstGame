import { describe, expect, it } from 'vitest';
import { LEVELS } from '../levels';
import { levelFromMap } from '../levels/levelMap';
import { GameState } from './GameState';
import { findSolution } from './solver';
import type { GameSnapshot } from './types';

// a is blocked by b; b is free.
const small = levelFromMap(1, [
  'a  a> b^',
  '.  .  b',
  '.  .  .',
]);

describe('GameState', () => {
  it('does not count blocked moves', () => {
    const state = new GameState(small);
    const result = state.tryMove('a');
    expect(result).toMatchObject({ kind: 'blocked', blockerId: 'b' });
    expect(state.snapshot()).toMatchObject({ moves: 0, remaining: 2 });
  });

  it('counts each successful move exactly once', () => {
    const state = new GameState(small);
    expect(state.tryMove('b').kind).toBe('cleared');
    expect(state.snapshot().moves).toBe(1);
    // The same arrow can't be cleared twice.
    expect(state.tryMove('b')).toEqual({ kind: 'ignored', reason: 'unknown-arrow' });
    expect(state.snapshot().moves).toBe(1);
  });

  it('wins once every arrow is gone and ignores further input', () => {
    const state = new GameState(small);
    state.tryMove('b');
    state.tryMove('a');
    expect(state.snapshot()).toMatchObject({ moves: 2, remaining: 0, won: true });
    expect(state.tryMove('a')).toEqual({ kind: 'ignored', reason: 'game-over' });
  });

  it('restart resets moves and arrows', () => {
    const state = new GameState(small);
    state.tryMove('b');
    state.reset();
    expect(state.snapshot()).toMatchObject({ moves: 0, remaining: 2, won: false });
    expect(state.tryMove('a').kind).toBe('blocked'); // b is back in the way
  });

  it('loading another level replaces everything from the previous one', () => {
    const state = new GameState(LEVELS[0]);
    state.tryMove(findSolution(LEVELS[0])![0]);
    state.load(LEVELS[8]);
    expect(state.snapshot()).toEqual({
      levelId: 9,
      moves: 0,
      remaining: LEVELS[8].arrows.length,
      total: LEVELS[8].arrows.length,
      won: false,
    });
    expect([state.rows, state.cols]).toEqual([9, 9]);
    expect(state.getArrows().map((a) => a.id).sort()).toEqual(LEVELS[8].arrows.map((a) => a.id).sort());
  });

  it('notifies subscribers on moves, restarts and level changes', () => {
    const state = new GameState(small);
    const seen: GameSnapshot[] = [];
    state.subscribe((s) => seen.push(s));
    state.tryMove('a'); // blocked: no notification
    state.tryMove('b');
    state.reset();
    state.load(LEVELS[1]);
    expect(seen.map((s) => [s.levelId, s.moves])).toEqual([
      [1, 0],
      [1, 1],
      [1, 0],
      [2, 0],
    ]);
  });

  it.each(LEVELS.map((l) => [l.id, l] as const))('level %i can be played to a win', (_id, level) => {
    const state = new GameState(level);
    for (const id of findSolution(level)!) expect(state.tryMove(id).kind).toBe('cleared');
    expect(state.snapshot()).toMatchObject({ won: true, moves: level.arrows.length });
  });
});
