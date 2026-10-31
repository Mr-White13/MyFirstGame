import { describe, expect, it } from 'vitest';
import { cellKey, directionBetween } from '../core/Arrow';
import { countAmbiguousJoins } from '../core/difficulty';
import { validateLevel } from '../core/levelValidation';
import type { LevelData } from '../core/types';
import { LEVELS } from '../levels';
import { findSolution } from '../core/solver';
import { levelFromMap, levelToMap } from '../levels/levelMap';
import { generateLevel, isSelfTouching, layoutSimilarity, type GenerateOptions } from './generateLevel';

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
    expect(layoutSimilarity(LEVELS[1], LEVELS[2])).toBeLessThan(0.6);
  });

  it('recognises mirror images and turned copies of tall rectangular boards', () => {
    const tall = LEVELS[19]; // 15 × 11
    const flipped: LevelData = {
      ...tall,
      arrows: tall.arrows.map((a) => ({
        ...a,
        cells: a.cells.map((c) => ({ row: tall.rows - 1 - c.row, col: c.col })),
        direction: a.direction === 'up' ? 'down' : a.direction === 'down' ? 'up' : a.direction,
      })),
    };
    expect(layoutSimilarity(flipped, tall)).toBe(1);
    const turned: LevelData = {
      ...tall,
      rows: tall.cols,
      cols: tall.rows,
      arrows: tall.arrows.map((a) => ({
        ...a,
        cells: a.cells.map((c) => ({ row: c.col, col: c.row })),
        direction: ({ up: 'left', left: 'up', down: 'right', right: 'down' } as const)[a.direction],
      })),
    };
    expect(layoutSimilarity(turned, tall)).toBe(1);
  });
});

describe('large grids and advanced shapes', () => {
  const big = (rows: number, options: Partial<GenerateOptions> = {}) =>
    generateLevel({ rows, cols: rows, minScore: 0, maxScore: 100, seed: 5, arrows: { min: Math.round(rows * rows / 9), max: Math.round(rows * rows / 6) }, maxLength: 9, maxTurns: 4, turnChance: 0.45, attempts: 20, workBudget: 20, ...options });

  it('builds valid, solvable 16×16 and 20×20 levels', () => {
    for (const n of [16, 20]) {
      const result = big(n);
      expect(result.ok, `${n}x${n}`).toBe(true);
      if (!result.ok) continue;
      expect(result.level.rows).toBe(n);
      expect(() => validateLevel(result.level)).not.toThrow();
      expect(findSolution(result.level)).not.toBeNull();
    }
  });

  it('labels more than 52 arrows (a0, b0…) so large levels survive the text map', () => {
    const result = big(20, { arrows: { min: 56, max: 70 }, maxLength: 6, maxTurns: 2, seed: 9 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.level.arrows.length).toBeGreaterThan(52);
    const back = levelFromMap(result.level.id, levelToMap(result.level));
    expect(back.arrows).toHaveLength(result.level.arrows.length);
  });

  it('makes long arrows with several bends (wide U shapes, winding paths) that never touch themselves', () => {
    const result = big(16);
    if (!result.ok) throw new Error(result.reason);
    const turnsOf = (cells: readonly { row: number; col: number }[]) => {
      let turns = 0;
      for (let i = 2; i < cells.length; i++) if (directionBetween(cells[i - 2], cells[i - 1]) !== directionBetween(cells[i - 1], cells[i])) turns++;
      return turns;
    };
    expect(Math.max(...result.level.arrows.map((a) => turnsOf(a.cells)))).toBeGreaterThanOrEqual(2);
    expect(Math.max(...result.level.arrows.map((a) => a.cells.length))).toBeGreaterThanOrEqual(6);
    for (const a of result.level.arrows) expect(isSelfTouching(a.cells)).toBe(false);
  });

  it('rejects arrows that cross themselves or point the wrong way, and flags self-touching paths', () => {
    expect(() => validateLevel(levelFromMap(1, ['a  a  a', 'a  .  a', 'a> a  a']))).toThrow();
    // A tight U (two turns in a row) touches itself: 0,0 → 0,1 → 1,1 → 1,0.
    expect(isSelfTouching([{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }, { row: 1, col: 0 }])).toBe(true);
    // A wide U with a gap between its arms does not.
    expect(isSelfTouching([{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 2 }, { row: 2, col: 2 }, { row: 2, col: 1 }, { row: 2, col: 0 }])).toBe(false);
  });

  it('is deterministic on large grids too', () => {
    const a = big(14, { seed: 77 });
    const b = big(14, { seed: 77 });
    expect(a).toEqual(b);
  });

  it('stops within its work budget instead of running for minutes', () => {
    const started = performance.now();
    const result = generateLevel({ rows: 16, cols: 16, minScore: 99, maxScore: 100, seed: 1, arrows: { min: 30, max: 45 }, maxLength: 8, maxTurns: 3, attempts: 10_000, workBudget: 15, refineSteps: 10_000 });
    expect(result.ok).toBe(false);
    expect(performance.now() - started).toBeLessThan(20_000);
  });

  it('can cap how many arrows are free at the start', () => {
    const result = generateLevel({ rows: 12, cols: 12, minScore: 0, maxScore: 100, seed: 3, arrows: { min: 28, max: 36 }, maxLength: 8, maxTurns: 3, attempts: 60, workBudget: 300, maxInitialFree: 6 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.report.exact.initialFree).toBeLessThanOrEqual(6);
  });
});
