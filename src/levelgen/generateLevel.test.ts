import { describe, expect, it } from 'vitest';
import { cellKey, directionBetween } from '../core/Arrow';
import { countAmbiguousJoins } from '../core/difficulty';
import { validateLevel } from '../core/levelValidation';
import type { LevelData } from '../core/types';
import { LEVELS } from '../levels';
import { generateLevel, layoutSimilarity, type GenerateOptions } from './generateLevel';

const base: GenerateOptions = { rows: 7, cols: 7, minScore: 25, maxScore: 45, seed: 42, attempts: 60 };

function generated(options: Partial<GenerateOptions> = {}): LevelData {
  const result = generateLevel({ ...base, ...options });
  if (!result.ok) throw new Error(result.reason);
  return result.level;
}

describe('generateLevel', () => {
  it('is reproducible with a fixed seed', () => {
    expect(generated()).toEqual(generated());
  });

  it('produces different layouts for different seeds', () => {
    expect(generated({ seed: 1 })).not.toEqual(generated({ seed: 2 }));
  });

  it('produces valid, solvable levels within the score range', () => {
    for (const seed of [3, 4, 5]) {
      const result = generateLevel({ ...base, seed });
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(() => validateLevel(result.level)).not.toThrow();
      expect(result.report.score).toBeGreaterThanOrEqual(base.minScore);
      expect(result.report.score).toBeLessThanOrEqual(base.maxScore);
    }
  });

  it('keeps every arrow inside the grid without overlaps', () => {
    for (const [rows, cols] of [[6, 6], [7, 9], [9, 9]] as const) {
      const level = generated({ rows, cols, seed: rows * 10 + cols, minScore: 0, maxScore: 100 });
      const seen = new Set<string>();
      for (const arrow of level.arrows) {
        for (const cell of arrow.cells) {
          expect(cell.row).toBeGreaterThanOrEqual(0);
          expect(cell.row).toBeLessThan(rows);
          expect(cell.col).toBeGreaterThanOrEqual(0);
          expect(cell.col).toBeLessThan(cols);
          expect(seen.has(cellKey(cell))).toBe(false);
          seen.add(cellKey(cell));
        }
      }
    }
  });

  it('respects arrow length, turn limits and readability rules', () => {
    const straight = generated({ maxTurns: 0, maxLength: 3, minScore: 0, maxScore: 100 });
    for (const arrow of straight.arrows) {
      expect(arrow.cells.length).toBeGreaterThanOrEqual(2);
      expect(arrow.cells.length).toBeLessThanOrEqual(3);
      const dirs = arrow.cells.slice(1).map((c, i) => directionBetween(arrow.cells[i], c));
      expect(new Set(dirs).size).toBe(1);
    }
    const bent = generated({ maxTurns: 2, minScore: 0, maxScore: 100, seed: 9 });
    expect(countAmbiguousJoins(bent)).toBe(0);
    for (const arrow of bent.arrows) {
      const dirs = arrow.cells.slice(1).map((c, i) => directionBetween(arrow.cells[i], c));
      // Never two turns in a row (no U folded into a 2×2 square).
      for (let i = 2; i < dirs.length; i++) {
        expect(dirs[i] !== dirs[i - 1] && dirs[i - 1] !== dirs[i - 2]).toBe(false);
      }
    }
  });

  it('respects the requested arrow count range', () => {
    const level = generated({ arrows: { min: 8, max: 9 }, minScore: 0, maxScore: 100 });
    expect(level.arrows.length).toBeGreaterThanOrEqual(8);
    expect(level.arrows.length).toBeLessThanOrEqual(9);
  });

  it('stays away from levels it is told to avoid', () => {
    const level = generated({ avoid: LEVELS, similarityLimit: 0.5 });
    for (const other of LEVELS) expect(layoutSimilarity(level, other)).toBeLessThanOrEqual(0.5);
  });

  it('fails with a clear message when the target is out of reach', () => {
    const result = generateLevel({ ...base, minScore: 99, maxScore: 100, attempts: 5, refineSteps: 10 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/no 7×7 level scored 99–100 in 5 attempts/);
      expect(result.closestScore).not.toBeNull();
    }
  });

  it('rejects invalid options before generating', () => {
    expect(generateLevel({ ...base, rows: 2 }).ok).toBe(false);
    expect(generateLevel({ ...base, minScore: 60, maxScore: 50 }).ok).toBe(false);
    expect(generateLevel({ ...base, arrows: { min: 10, max: 5 } }).ok).toBe(false);
  });
});

describe('layoutSimilarity', () => {
  it('is 1 for a level and its mirror image, and lower for different levels', () => {
    const level = LEVELS[4];
    const mirrored: LevelData = {
      ...level,
      arrows: level.arrows.map((a) => ({
        ...a,
        cells: a.cells.map((c) => ({ row: c.row, col: level.cols - 1 - c.col })),
        direction: a.direction === 'left' ? 'right' : a.direction === 'right' ? 'left' : a.direction,
      })),
    };
    expect(layoutSimilarity(mirrored, level)).toBe(1);
    expect(layoutSimilarity(LEVELS[3], LEVELS[4])).toBeLessThan(0.6);
  });
});
