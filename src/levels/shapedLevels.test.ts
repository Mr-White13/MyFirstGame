import { describe, expect, it } from 'vitest';
import { shapeMask } from '../../tools/shapes';
import { analyzeDifficulty, dependencyGraph } from '../core/difficulty';
import { GameState } from '../core/GameState';
import { validateLevel } from '../core/levelValidation';
import { findSolution } from '../core/solver';
import { STARTING_LIVES } from '../core/types';
import { isSelfTouching } from '../levelgen/generateLevel';
import { challengePool } from '../league/challenges';
import { getLevel, LEVELS } from './index';

/**
 * Levels 32–40: experimental extreme levels on shaped boards. Each fills one
 * outline from tools/shapes.ts with ordinary arrows under the normal rules,
 * and must stay fair: valid, solvable, and completable without losing a life.
 */
const SHAPED = [
  [32, 'THE ARROWHEAD', 'arrowhead'],
  [33, 'THE HOURGLASS', 'hourglass'],
  [34, 'THE CROSSROADS', 'cross'],
  [35, 'THE RING', 'ring'],
  [36, 'THE NEON HEART', 'heart'],
  [37, 'THE CROWN', 'crown'],
  [38, 'THE SHIELD', 'shield'],
  [39, 'THE NEON PINE', 'tree'],
  [40, 'THE FORTRESS', 'castle'],
] as const;

const campaignDepth = Math.max(...LEVELS.slice(0, 30).map((l) => analyzeDifficulty(l, { lives: false }).exact.depth));

describe.each(SHAPED)('Level %i — %s', (id, name, shape) => {
  const level = getLevel(id)!;
  const report = analyzeDifficulty(level, { lives: false });
  const mask = shapeMask(shape, level.rows, level.cols);
  const inside = new Set(mask.flatMap((row, r) => [...row].flatMap((ch, c) => (ch === '#' ? [`${r},${c}`] : []))));
  const cells = level.arrows.flatMap((a) => a.cells.map((c) => `${c.row},${c.col}`));

  it('is the named, shaped level', () => {
    expect(level).toMatchObject({ id, name, outline: true });
  });

  it('fills its outline: every arrow inside the shape, at least 97 % of the shape covered, no overlaps', () => {
    expect(cells.every((c) => inside.has(c))).toBe(true);
    expect(new Set(cells).size).toBe(cells.length);
    expect(cells.length / inside.size).toBeGreaterThanOrEqual(0.97);
  });

  it('is a large, readable board: 150–260 arrows of mixed lengths, none folded or reading as one', () => {
    expect(level.arrows.length).toBeGreaterThanOrEqual(150);
    expect(level.arrows.length).toBeLessThanOrEqual(260);
    const lengths = level.arrows.map((a) => a.cells.length);
    expect(lengths.filter((n) => n <= 3).length).toBeGreaterThan(20);
    expect(lengths.filter((n) => n >= 5).length).toBeGreaterThan(10);
    expect(level.arrows.some((a) => isSelfTouching(a.cells))).toBe(false);
    expect(report.exact.ambiguousJoins).toBe(0);
  });

  it('is valid and solvable, with a valid first move', () => {
    expect(() => validateLevel(level)).not.toThrow();
    expect(new Set(findSolution(level))).toEqual(new Set(level.arrows.map((a) => a.id)));
    expect(report.exact.initialFree).toBeGreaterThanOrEqual(1);
  });

  it('is far deeper than anything in Levels 1–30, with a long critical chain', () => {
    expect(report.exact.depth).toBeGreaterThan(2 * campaignDepth);
    expect(dependencyGraph(level).criticalPath).toHaveLength(report.exact.depth);
    expect(['Hard', 'Very hard']).toContain(report.category);
  });

  it('can be completed without losing a life (3 stars)', () => {
    const slow = new GameState(level, { clock: () => 0 });
    findSolution(level)!.forEach((arrowId, n) => slow.tryMove(arrowId, n * 5000));
    expect(slow.snapshot()).toMatchObject({ status: 'won', lives: STARTING_LIVES, stars: 3 });
  });

  it('stays out of the Daily League pool', () => {
    expect(challengePool(LEVELS).some((l) => l.id === id)).toBe(false);
  });
});

describe('shaped Levels 32–40', () => {
  it('are nine different shapes, and Level 40 is the last level', () => {
    expect(new Set(SHAPED.map(([, , shape]) => shape)).size).toBe(9);
    expect(LEVELS.at(-1)?.id).toBe(40);
  });

  it('leave Levels 1–31 without an outline', () => {
    expect(LEVELS.slice(0, 31).some((l) => l.outline)).toBe(false);
  });
});
