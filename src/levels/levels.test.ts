import { describe, expect, it } from 'vitest';
import { validateLevel } from '../core/levelValidation';
import { analyzeDifficulty } from '../core/difficulty';
import { analyzeLevel, findSolution } from '../core/solver';
import { layoutSimilarity } from '../levelgen/generateLevel';
import { getLevel, LEVEL_COUNT, LEVELS } from './index';
import { levelFromMap, levelToMap } from './levelMap';

describe('level registry', () => {
  it('has 10 levels with ids 1..10 in order', () => {
    expect(LEVEL_COUNT).toBe(10);
    expect(LEVELS.map((l) => l.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('looks levels up by id', () => {
    expect(getLevel(1)).toBe(LEVELS[0]);
    expect(getLevel(10)).toBe(LEVELS[9]);
    expect(getLevel(0)).toBeUndefined();
    expect(getLevel(11)).toBeUndefined();
  });

  it('uses the planned grid sizes', () => {
    expect(LEVELS.map((l) => `${l.rows}x${l.cols}`)).toEqual([
      '7x7', '7x7', '7x7', '7x7', '7x7',
      '8x8', '8x8', '8x8',
      '9x9', '9x9',
    ]);
  });
});

describe.each(LEVELS.map((level) => [level.id, level] as const))('level %i', (_id, level) => {
  it('passes validation', () => {
    expect(() => validateLevel(level)).not.toThrow();
  });

  it('is solvable, clearing every arrow', () => {
    const solution = findSolution(level);
    expect(solution).not.toBeNull();
    expect(new Set(solution)).toEqual(new Set(level.arrows.map((a) => a.id)));
  });

  it('is not trivial: at least one arrow starts blocked', () => {
    const stats = analyzeLevel(level)!;
    expect(stats.initialFree).toBeLessThan(stats.arrows);
  });
});

describe('difficulty curve', () => {
  const stats = LEVELS.map((l) => analyzeLevel(l)!);

  it('starts genuinely easy', () => {
    expect(stats[0].arrows).toBeLessThanOrEqual(6);
    expect(stats[0].depth).toBeLessThanOrEqual(2);
    expect(stats[0].maxBlockers).toBe(1);
  });

  it('ends much deeper than it starts', () => {
    expect(stats[9].depth).toBeGreaterThanOrEqual(stats[0].depth * 4);
  });

  // Scores are a heuristic (see core/difficulty.ts); these checks keep the
  // curated order consistent with it, not a claim about human difficulty.
  const reports = LEVELS.map((l) => analyzeDifficulty(l));

  it('rises in estimated difficulty every level', () => {
    for (let i = 1; i < reports.length; i++) {
      expect(reports[i].score).toBeGreaterThan(reports[i - 1].score);
    }
  });

  it('starts very easy and ends in the hard band', () => {
    expect(reports[0].category).toBe('Very easy');
    expect(['Hard', 'Very hard']).toContain(reports[9].category);
  });

  it('makes levels 7–10 clearly harder than levels 1–3', () => {
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const early = mean(reports.slice(0, 3).map((r) => r.score));
    const late = mean(reports.slice(6, 10).map((r) => r.score));
    expect(late - early).toBeGreaterThanOrEqual(25);
  });

  it('has no arrows that read as one (tail-to-tail joins)', () => {
    expect(reports.map((r) => r.exact.ambiguousJoins)).toEqual(LEVELS.map(() => 0));
  });

  it('has no two levels that are near-duplicates', () => {
    for (const a of LEVELS) {
      for (const b of LEVELS) {
        if (a.id < b.id) expect(layoutSimilarity(a, b)).toBeLessThanOrEqual(0.6);
      }
    }
  });

  it('marks redesigned layouts with a new revision', () => {
    expect(LEVELS.map((l) => l.revision ?? 1)).toEqual([1, 2, 2, 2, 2, 2, 2, 2, 2, 2]);
  });

  it('does not simply add arrows every level', () => {
    const counts = stats.map((s) => s.arrows);
    const alwaysGrowing = counts.every((n, i) => i === 0 || n > counts[i - 1]);
    expect(alwaysGrowing).toBe(false);
  });
});

describe('levelFromMap', () => {
  it('builds arrows tail → head from a text map', () => {
    const level = levelFromMap(99, [
      'a  a  .',
      '.  a> .',
      '.  .  .',
    ]);
    expect(level).toMatchObject({ id: 99, rows: 3, cols: 3 });
    expect(level.arrows).toEqual([
      {
        id: 'a',
        direction: 'right',
        cells: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 1, col: 1 },
        ],
      },
    ]);
  });

  it('round-trips through levelToMap', () => {
    for (const level of LEVELS) {
      const again = levelFromMap(level.id, levelToMap(level));
      expect(again.arrows.map((a) => [a.direction, a.cells])).toEqual(
        expect.arrayContaining(level.arrows.map((a) => [a.direction, a.cells])),
      );
      expect(again.arrows).toHaveLength(level.arrows.length);
    }
  });

  it('keeps the revision option', () => {
    expect(levelFromMap(3, ['a> .'], { revision: 4 }).revision).toBe(4);
    expect(levelFromMap(3, ['a> .']).revision).toBeUndefined();
  });

  it('rejects malformed maps with a helpful message', () => {
    expect(() => levelFromMap(1, ['a  .', '.  .'])).toThrow(/no head/);
    expect(() => levelFromMap(1, ['a> a>', '.  .'])).toThrow(/two heads/);
    expect(() => levelFromMap(1, ['a> .', 'a'])).toThrow(/row 1/);
    expect(() => levelFromMap(1, ['a> .  a', '.  .  .'])).toThrow(/disconnected/);
    expect(() => levelFromMap(1, ['a  a  .', 'a  a> .'])).toThrow(/branching/);
    expect(() => levelFromMap(1, ['?  .', '.  .'])).toThrow(/invalid token/);
  });
});
