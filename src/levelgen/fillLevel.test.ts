import { describe, expect, it } from 'vitest';
import { findSolution } from '../core/solver';
import { validateLevel } from '../core/levelValidation';
import { countAmbiguousJoins } from '../core/difficulty';
import { coverage, fillLevel } from './fillLevel';
import { isSelfTouching } from './generateLevel';

describe('fill-first level generator', () => {
  const sizes = [
    [9, 7],
    [12, 9],
    [17, 12],
  ] as const;

  it.each(sizes)('covers a %i×%i board (≥ 97 %%) with valid, solvable, readable arrows', (rows, cols) => {
    const result = fillLevel({ rows, cols, seed: 7, minScore: 0, maxScore: 100, attempts: 10, refineSteps: 0 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const level = result.level;
    expect(coverage(level)).toBeGreaterThanOrEqual(0.97);
    expect(() => validateLevel(level)).not.toThrow(); // no overlaps, no arrow into its own body
    expect(findSolution(level)).not.toBeNull();
    expect(countAmbiguousJoins(level)).toBe(0);
    for (const a of level.arrows) {
      expect(isSelfTouching(a.cells)).toBe(false);
      expect(a.cells.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('is reproducible: the same options give the same level', () => {
    const make = () => fillLevel({ rows: 10, cols: 8, seed: 42, minScore: 0, maxScore: 100, attempts: 5 });
    const a = make();
    const b = make();
    expect(a.ok && b.ok && JSON.stringify(a.level) === JSON.stringify(b.level)).toBe(true);
  });

  it('steers towards a score range and reports when it cannot reach it', () => {
    const hit = fillLevel({ rows: 10, cols: 8, seed: 3, minScore: 45, maxScore: 55, attempts: 30 });
    expect(hit.ok && hit.report.score >= 45 && hit.report.score <= 55).toBe(true);
    const miss = fillLevel({ rows: 6, cols: 5, seed: 3, minScore: 99, maxScore: 100, attempts: 2, refineSteps: 5 });
    expect(miss.ok).toBe(false);
  });

  it('honours the shortest-arrow share and mean length targets', () => {
    const result = fillLevel({ rows: 12, cols: 9, seed: 11, minScore: 0, maxScore: 100, attempts: 40, minMeanLength: 4.5, maxShortShare: 0.12 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const arrows = result.level.arrows;
    expect(arrows.filter((a) => a.cells.length < 3).length / arrows.length).toBeLessThanOrEqual(0.12);
    expect(arrows.reduce((n, a) => n + a.cells.length, 0) / arrows.length).toBeGreaterThanOrEqual(4.5);
  });
});
