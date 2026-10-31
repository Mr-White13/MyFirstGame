import { describe, expect, it } from 'vitest';
import { GameState } from '../core/GameState';
import { findSolution } from '../core/solver';
import { addDays } from '../daily/dayKey';
import { LEVELS } from '../levels';
import { golden, plain } from '../testing/golden';
import { LeagueService } from './LeagueService';
import { MemoryStore } from '../testing/memoryStore';

/**
 * A scripted 45-day season through the live LeagueService (settling, Energy
 * Arrows collected by real play, challenge completions, milestones, notices,
 * credit delivery), starting from a save made on pool 4. The golden file
 * records the settle status and the saved state after every day.
 */

const START = '2026-10-19'; // the day the saved pool-4 competition began
/** Challenges finished each day (0–3); on a 0 day the first one is only half played. */
const PLAN = [3, 3, 2, 0, 0, 3, 1, 3, 3, 3, 0, 0, 0, 0, 2, 3, 3, 3, 3, 3, 1, 0, 3, 3, 3, 3, 3, 3, 3, 0, 0, 0, 0, 0, 0, 3, 2, 1, 3, 3, 3, 3, 0, 3, 3];
/** Days the game is not opened at all (settled later in one go). */
const SKIPPED = new Set([11, 12, 13, 30, 31, 32, 33]);

function season() {
  const store = new MemoryStore();
  // A competition already running on pool 4 when the season starts: that day keeps its pool-4 challenges.
  store.data.set('neon-escape.league', JSON.stringify({ version: 1, tier: 1, highestTier: 1, lastDay: '2026-10-19', current: { date: '2026-10-19', startTier: 1, collected: [], completed: [], sweepRewarded: false, pool: 4 } }));
  const granted: string[] = [];
  const league = new LeagueService(LEVELS, (tx) => (granted.push(`${tx.id}=${tx.amount}`), true), store);
  const days: unknown[] = [];
  for (const [i, finished] of PLAN.entries()) {
    const day = addDays(START, i);
    if (SKIPPED.has(i)) continue;
    const status = league.settle(day, true);
    const notice = league.current.notice;
    if (notice) league.acknowledge();
    const results: string[] = [];
    for (const challenge of league.challenges(day).slice(0, Math.max(finished, 1))) {
      const state = new GameState(challenge.level, { clock: () => 0 });
      state.onRemove((arrow) => {
        if (arrow.energy) results.push(`${arrow.id}:${league.collect(day, challenge, arrow.id)}`);
      });
      const order = findSolution(challenge.level)!;
      const taps = challenge.number <= finished ? order : order.slice(0, Math.ceil(order.length / 2));
      for (const id of taps) if (state.has(id)) state.tryMove(id, 0);
      if (state.isWon) results.push(`done:${league.complete(day, challenge)}`);
    }
    const { history, ...saved } = JSON.parse(store.data.get('neon-escape.league')!);
    days.push({ day, status, notice, pool: league.current.current?.pool ?? null, results: results.join(' '), lastHistory: history.at(-1) ?? null, historyLength: history.length, saved });
  }
  return { days, granted };
}

describe('league season', () => {
  const actual = plain(season());
  const expected = golden(new URL('./settlement.golden.json', import.meta.url), actual);

  it('settles, scores and rewards every day exactly as recorded', () => {
    expect(actual.days).toEqual(expected.days);
  });

  it('delivers the recorded credits once each', () => {
    expect(actual.granted).toEqual(expected.granted);
    expect(new Set(actual.granted).size).toBe(actual.granted.length);
  });
});
