import { describe, expect, it } from 'vitest';
import { LEVELS } from '../levels';
import { GameState } from './GameState';
import { findSolution } from './solver';

/** A big level, so a partial run leaves plenty on the board. */
const level = LEVELS.find((l) => l.arrows.length >= 40)!;

/**
 * Plays part of the level the way a person might: some quick taps (earning a
 * streak bonus), two mistakes on blocked arrows, an Extra Heart, more taps.
 */
function playPartly(): GameState {
  const state = new GameState(level, { validate: false });
  let t = 1000;
  const tapFree = (n: number, gap: number) => {
    for (let i = 0; i < n && state.isPlaying; i++) {
      const free = state.escapableArrows()[0];
      if (!free) return;
      state.tryMove(free.id, (t += gap));
    }
  };
  const tapBlocked = () => {
    const free = new Set(state.escapableArrows().map((a) => a.id));
    const blocked = state.getArrows().find((a) => !free.has(a.id) && !state.isActivated(a.id));
    if (blocked) state.tryMove(blocked.id, (t += 500));
  };
  tapFree(6, 300); // fast: a streak bonus fires
  tapBlocked();
  tapFree(3, 2000);
  tapBlocked();
  state.restoreLife();
  tapFree(4, 700);
  return state;
}

const comparable = (s: GameState) => {
  const { streak: _streak, streakAt: _streakAt, ...rest } = s.snapshot();
  return { ...rest, arrows: s.getArrows().map((a) => a.id), red: s.getArrows().filter((a) => s.isActivated(a.id)).map((a) => a.id) };
};

describe('resuming an unfinished attempt', () => {
  it('records every tap, Extra Heart and Continue in order, and forgets them on reset', () => {
    const state = playPartly();
    const kinds = state.history.map((e) => e.kind);
    expect(kinds.filter((k) => k === 'tap').length).toBeGreaterThan(10);
    expect(kinds).toContain('life');
    state.reset();
    expect(state.history).toEqual([]);
  });

  it('replaying the history rebuilds the exact board, lives, mistakes and counters', () => {
    const original = playPartly();
    expect(original.snapshot().bonusClears).toBeGreaterThan(0); // the run really used the streak rule
    expect(original.snapshot().mistakes).toBe(2);
    const events = JSON.parse(JSON.stringify(original.history)); // as saved and read back
    const resumed = new GameState(level, { validate: false });
    expect(resumed.replay(events)).toBe(true);
    expect(comparable(resumed)).toEqual(comparable(original));
    expect(resumed.history).toEqual(original.history);
  });

  it('starts a fresh streak after resuming, but keeps everything else', () => {
    const resumed = new GameState(level, { validate: false });
    resumed.replay(playPartly().history);
    expect(resumed.snapshot().streak).toBe(0);
  });

  it('tells listeners only about the final state, and fires no collectibles while rebuilding', () => {
    const events = playPartly().history;
    const resumed = new GameState(level, { validate: false });
    const seen: number[] = [];
    const removed: string[] = [];
    resumed.subscribe((s) => seen.push(s.remaining));
    resumed.onRemove((a) => removed.push(a.id));
    seen.length = 0;
    resumed.replay(events);
    expect(seen).toEqual([resumed.snapshot().remaining]);
    expect(removed).toEqual([]);
  });

  it('can be finished after resuming, like any attempt', () => {
    const resumed = new GameState(level, { validate: false });
    resumed.replay(playPartly().history);
    const rest = findSolution({ ...level, arrows: level.arrows.filter((a) => resumed.has(a.id)) })!;
    rest.forEach((id, i) => resumed.tryMove(id, 1e9 + i * 10_000));
    expect(resumed.isWon).toBe(true);
  });

  it('reports a history that no longer leads to a game in progress', () => {
    const state = new GameState(level, { validate: false });
    const solution = findSolution(level)!;
    const won = solution.map((arrowId, i) => ({ kind: 'tap' as const, arrowId, at: i * 10_000 }));
    expect(state.replay(won)).toBe(false);
    expect(state.replay([{ kind: 'tap', arrowId: 'no-such-arrow', at: 0 }])).toBe(true); // unknown steps are skipped
  });
});
