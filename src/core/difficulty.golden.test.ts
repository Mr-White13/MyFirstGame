import { describe, expect, it } from 'vitest';
import { LEVELS } from '../levels';
import { levelToMap } from '../levels/levelMap';
import { golden, plain } from '../testing/golden';
import { analyzeDifficulty } from './difficulty';
import { analyzeLevel, findSolution } from './solver';

/**
 * Golden copies of what the offline tools and the rules derive from the 30
 * levels: the exact layouts (arrow order included), solver output and the
 * full difficulty report (`npm run levels:analyze -- --json` data). Rule
 * helper refactors must leave all of it byte-identical, including the
 * simulated lives model, which depends on arrow iteration order.
 */

describe('level layouts', () => {
  const actual = LEVELS.map((l) => ({ id: l.id, revision: l.revision ?? null, map: levelToMap(l), order: l.arrows.map((a) => a.id).join('') }));
  const expected = golden(new URL('./levels.layouts.golden.json', import.meta.url), actual);

  it.each(actual.map((a, i) => [a.id, i] as const))('level %i keeps its exact layout, revision and arrow order', (_id, i) => {
    expect(actual[i]).toEqual(expected[i]);
  });

  it('has exactly the recorded levels', () => {
    expect(actual.length).toBe(expected.length);
  });
});

describe('solver output', () => {
  const actual = plain(LEVELS.map((l) => ({ id: l.id, solution: findSolution(l)?.join(' ') ?? null, stats: analyzeLevel(l) })));
  const expected = golden(new URL('./solver.golden.json', import.meta.url), actual);

  it('findSolution and analyzeLevel give the recorded order and stats for every level', () => {
    expect(actual).toEqual(expected);
  });
});

describe('difficulty analysis', () => {
  const actual = plain(LEVELS.map((l) => ({ id: l.id, ...analyzeDifficulty(l) })));
  const expected = golden(new URL('./difficulty.golden.json', import.meta.url), actual);

  it.each(actual.map((a, i) => [a.id, i] as const))('level %i has the recorded report (search score and lives model)', (_id, i) => {
    expect(actual[i]).toEqual(expected[i]);
  });

  it('the search-only report is the full report without the lives model', () => {
    // A few levels only: the full analysis is the slow part of the suite.
    for (const i of [0, 9, 29]) {
      const { id: _, ...full } = actual[i];
      expect(plain(analyzeDifficulty(LEVELS[i], { lives: false }))).toEqual({ ...full, lives: null });
    }
  });
});
