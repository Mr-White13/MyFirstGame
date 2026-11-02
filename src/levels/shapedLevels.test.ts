import { describe, expect, it } from 'vitest';
import { shapeMask } from '../../tools/shapes';
import { analyzeDifficulty, dependencyGraph } from '../core/difficulty';
import { GameState } from '../core/GameState';
import { validateLevel } from '../core/levelValidation';
import { findSolution } from '../core/solver';
import { STARTING_LIVES } from '../core/types';
import { isSelfTouching } from '../levelgen/generateLevel';
import { challengePool } from '../league/challenges';
import { chapterOf } from '../progress/chapters';
import { getLevel, LEVELS } from './index';

/**
 * The nine shaped extreme levels (built as Levels 32–40), now very hard
 * levels spread through chapters 3–5, easiest first. Each fills one outline
 * from tools/shapes.ts with ordinary arrows under the normal rules, and must
 * stay fair: valid, solvable, and completable without losing a life.
 */
const SHAPED = [
  [47, 'THE SHIELD', 'shield'],
  [54, 'THE CROSSROADS', 'cross'],
  [60, 'THE HOURGLASS', 'hourglass'],
  [67, 'THE CROWN', 'crown'],
  [74, 'THE NEON HEART', 'heart'],
  [80, 'THE NEON PINE', 'tree'],
  [87, 'THE ARROWHEAD', 'arrowhead'],
  [90, 'THE RING', 'ring'],
  [100, 'THE FORTRESS', 'castle'],
] as const;

/** Depth of every level, computed once (analysing all levels is the slow part). */
const DEPTHS = LEVELS.map((l) => analyzeDifficulty(l, { lives: false }).exact.depth);
/** The deepest normal or hard level in a level's chapter: every very hard shaped level goes deeper. */
const deepestOtherInChapter = (id: number) =>
  Math.max(...LEVELS.filter((l) => chapterOf(l.id) === chapterOf(id) && l.tier !== 'very hard').map((l) => DEPTHS[l.id - 1]));

describe.each(SHAPED)('Level %i — %s', (id, name, shape) => {
  const level = getLevel(id)!;
  const report = analyzeDifficulty(level, { lives: false });
  const mask = shapeMask(shape, level.rows, level.cols);
  const inside = new Set(mask.flatMap((row, r) => [...row].flatMap((ch, c) => (ch === '#' ? [`${r},${c}`] : []))));
  const cells = level.arrows.flatMap((a) => a.cells.map((c) => `${c.row},${c.col}`));

  it('is the named, shaped level', () => {
    expect(level).toMatchObject({ id, name, outline: true, tier: 'very hard' });
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

  it('is deeper than any normal or hard level of its chapter, with a long critical chain', () => {
    expect(report.exact.depth).toBeGreaterThan(deepestOtherInChapter(id));
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

describe('the shaped levels', () => {
  it('are nine different shapes, and THE FORTRESS is the last level of the game', () => {
    expect(new Set(SHAPED.map(([, , shape]) => shape)).size).toBe(9);
    expect(LEVELS.at(-1)?.name).toBe('THE FORTRESS');
  });

  it('are the only levels with an outline', () => {
    expect(LEVELS.filter((l) => l.outline).map((l) => l.id)).toEqual(SHAPED.map(([id]) => id));
  });
});
