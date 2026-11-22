import { describe, expect, it } from 'vitest';
import { shapeMask } from '../../tools/shapes';
import { analyzeDifficulty } from '../core/difficulty';
import { GameState } from '../core/GameState';
import { findSolution } from '../core/solver';
import { STARTING_LIVES, type LevelData, type LevelTier } from '../core/types';
import { isSelfTouching } from '../levelgen/generateLevel';
import { challengePool } from '../league/challenges';
import { CHAPTER_SIZE } from '../progress/chapters';
import { getLevel, LEVELS } from './index';
import { levelFromMap, levelToMap } from './levelMap';

/*
 * Chapters 11–15 (levels 201–300), generated from tools/level-plan.json and
 * modelled on dense maze levels: full boards, long arrows with spiral and
 * hook arrows (arrows that run alongside themselves, loaded with
 * levelFromMap's `curls`), few free arrows at the start (the opening), few
 * free arrows all through the solve (the bottleneck) and many arrows blocked
 * from far away (long blockers). Rhythm per chapter: hard mazes at 4, 13 and
 * 19, big maze specials at 7 and 16, a named finale at 10 and 20 (fat shapes,
 * THE FINAL GRID last). Ten normal levels have one life. Validation and
 * solvability of every level are covered by levels.test.ts.
 */
const FINAL = LEVELS.slice(200, 300);
const MIDDLE = LEVELS.slice(100, 200);
const tierOf = (l: LevelData): LevelTier => l.tier ?? 'normal';
const position = (l: LevelData) => ((l.id - 1) % CHAPTER_SIZE) + 1;
type Kind = 'normal' | 'hard' | 'special' | 'finale';
const kindOf = (l: LevelData): Kind =>
  tierOf(l) === 'very hard' ? 'finale' : tierOf(l) === 'normal' ? 'normal' : [7, 16].includes(position(l)) ? 'special' : 'hard';
/** Reports for levels 101–300, computed once (analysing the large boards is the slow part). */
const REPORTS = new Map([...MIDDLE, ...FINAL].map((l) => [l.id, analyzeDifficulty(l, { lives: false })]));
const report = (l: LevelData) => REPORTS.get(l.id)!;
const openingShare = (l: LevelData) => report(l).exact.initialFree / report(l).exact.arrows;
const freeShare = (l: LevelData) => report(l).estimated.averageFreeShare;
const longRange = (l: LevelData) => report(l).exact.longRangeBlocks / Math.max(1, report(l).exact.blockingRelations);
const average = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** The generator's limits per kind of level (the loosest after retries): free at start, average free share, long-range share, depth. */
const LIMITS: Record<Kind, { free: number; share: number; longRange: number; depth: number }> = {
  normal: { free: 3, share: 0.16, longRange: 0.62, depth: 24 },
  hard: { free: 5, share: 0.11, longRange: 0.68, depth: 34 },
  special: { free: 8, share: 0.11, longRange: 0.7, depth: 36 },
  finale: { free: 22, share: 0.1, longRange: 0.72, depth: 50 },
};

const FINALES: Record<number, [string, string | null]> = {
  210: ['THE PLANET', 'planet'], 220: ['THE ROBOT', 'robot'], 230: ['THE TROPHY', 'trophy'], 240: ['THE ANCHOR', 'anchor'],
  250: ['THE CLOVER', 'clover'], 260: ['THE LOCK', 'lock'], 270: ['THE DIAMOND', 'diamond'], 280: ['THE GAMEPAD', 'gamepad'],
  290: ['THE SHIP', 'ship'], 300: ['THE FINAL GRID', null],
};

describe('chapters 11–15: rhythm', () => {
  it('place hard mazes at 4, 13 and 19, maze specials at 7 and 16, and finales at 10 and 20 of every chapter', () => {
    for (const l of FINAL) {
      const p = position(l);
      const expected: LevelTier = [4, 7, 13, 16, 19].includes(p) ? 'hard' : [10, 20].includes(p) ? 'very hard' : 'normal';
      expect(tierOf(l), `level ${l.id}`).toBe(expected);
    }
  });

  it('name only the ten finales, shaped except THE FINAL GRID, which ends the game', () => {
    expect(Object.fromEntries(FINAL.filter((l) => l.name).map((l) => [l.id, l.name]))).toEqual(
      Object.fromEntries(Object.entries(FINALES).map(([id, [name]]) => [id, name])),
    );
    expect(FINAL.filter((l) => l.outline).map((l) => l.id)).toEqual(Object.keys(FINALES).map(Number).filter((id) => id !== 300));
    expect(LEVELS.at(-1)?.name).toBe('THE FINAL GRID');
  });

  it('have exactly ten one-life levels, all normal, at positions 5 and 15 of every chapter', () => {
    const oneLife = FINAL.filter((l) => l.lives !== undefined);
    expect(oneLife.map((l) => l.id)).toEqual([205, 215, 225, 235, 245, 255, 265, 275, 285, 295]);
    for (const l of oneLife) expect([l.lives, tierOf(l)]).toEqual([1, 'normal']);
  });

  it('keep every new level out of the Daily League pool', () => {
    expect(challengePool(LEVELS).filter((l) => l.id > 200)).toEqual([]);
  });
});

describe('chapters 11–15: the dense-maze targets', () => {
  it('fill every rectangular board (≥ 97 %, no empty square bigger than one cell) and every finale outline (≥ 96 %)', () => {
    for (const l of FINAL) {
      const shape = FINALES[l.id]?.[1];
      if (!shape) {
        expect(report(l).exact.density, `level ${l.id}`).toBeGreaterThanOrEqual(0.97);
        expect(report(l).exact.largestEmptySquare, `level ${l.id}`).toBeLessThanOrEqual(1);
        continue;
      }
      const mask = shapeMask(shape, l.rows, l.cols);
      const inside = new Set(mask.flatMap((row, r) => [...row].flatMap((ch, c) => (ch === '#' ? [`${r},${c}`] : []))));
      const cells = l.arrows.flatMap((a) => a.cells.map((c) => `${c.row},${c.col}`));
      expect(cells.every((c) => inside.has(c)), `level ${l.id}`).toBe(true);
      expect(cells.length / inside.size, `level ${l.id}`).toBeGreaterThanOrEqual(0.96);
    }
  });

  it('keep the opening, the bottleneck, long blockers and depth within each kind of level’s limits', () => {
    for (const l of FINAL) {
      const limit = LIMITS[kindOf(l)];
      expect(report(l).exact.initialFree, `level ${l.id} free at start`).toBeLessThanOrEqual(l.id === 300 ? 8 : limit.free);
      expect(report(l).exact.initialFree, `level ${l.id} free at start`).toBeGreaterThanOrEqual(1);
      expect(freeShare(l), `level ${l.id} bottleneck`).toBeLessThanOrEqual(limit.share);
      expect(longRange(l), `level ${l.id} long blockers`).toBeGreaterThanOrEqual(limit.longRange);
      expect(report(l).exact.depth, `level ${l.id} depth`).toBeGreaterThanOrEqual(l.id === 300 ? 60 : limit.depth);
    }
  });

  it('use spiral and hook arrows on most levels, and those load back exactly', () => {
    const curled = FINAL.filter((l) => l.arrows.some((a) => isSelfTouching(a.cells)));
    expect(curled.length).toBeGreaterThanOrEqual(50);
    const shape = (l: LevelData) => l.arrows.map((a) => JSON.stringify([a.direction, a.cells])).sort();
    for (const l of curled) expect(shape(levelFromMap(l.id, levelToMap(l), { curls: true })), `level ${l.id}`).toEqual(shape(l));
  });

  it('never overlap arrows or join two arrows so they read as one', () => {
    for (const l of FINAL) {
      const cells = l.arrows.flatMap((a) => a.cells.map((c) => `${c.row},${c.col}`));
      expect(new Set(cells).size, `level ${l.id}`).toBe(cells.length);
      expect(report(l).exact.ambiguousJoins, `level ${l.id}`).toBe(0);
    }
  });

  it('can each be completed without a mistake for full stars, one-life levels included', () => {
    for (const l of FINAL) {
      const state = new GameState(l, { clock: () => 0 });
      findSolution(l)!.forEach((arrowId, n) => state.tryMove(arrowId, n * 5000));
      expect(state.snapshot(), `level ${l.id}`).toMatchObject({ status: 'won', lives: l.lives ?? STARTING_LIVES, stars: 3 });
    }
  }, 120_000);
});

describe('chapters 11–15: harder than chapters 6–10', () => {
  const byKind = (levels: readonly LevelData[], kind: 'normal' | 'very hard') => levels.filter((l) => tierOf(l) === kind);

  it('give normal levels a smaller share of free arrows at the start (bigger boards, at most 3 free), a tighter bottleneck and deeper chains', () => {
    const now = byKind(FINAL, 'normal');
    const before = byKind(MIDDLE, 'normal');
    expect(average(now.map(openingShare))).toBeLessThan(average(before.map(openingShare)));
    expect(average(now.map(freeShare))).toBeLessThan(average(before.map(freeShare)));
    expect(average(now.map((l) => report(l).exact.depth))).toBeGreaterThan(average(before.map((l) => report(l).exact.depth)));
  });

  it('give the finales fewer free arrows at the start, a tighter bottleneck and deeper chains', () => {
    const now = byKind(FINAL, 'very hard');
    const before = byKind(MIDDLE, 'very hard');
    expect(average(now.map((l) => report(l).exact.initialFree))).toBeLessThan(average(before.map((l) => report(l).exact.initialFree)));
    expect(average(now.map(freeShare))).toBeLessThan(average(before.map(freeShare)));
    expect(average(now.map((l) => report(l).exact.depth))).toBeGreaterThan(average(before.map((l) => report(l).exact.depth)));
  });

  it('end on the hardest board: THE FINAL GRID scores at least as high as every level from 101 on, with the fewest free arrows of any finale', () => {
    const last = getLevel(300)!;
    for (const l of [...MIDDLE, ...FINAL.slice(0, -1)]) expect(report(last).score, `vs level ${l.id}`).toBeGreaterThanOrEqual(report(l).score);
    for (const l of byKind(FINAL, 'very hard')) expect(report(last).exact.initialFree).toBeLessThanOrEqual(report(l).exact.initialFree);
  }, 300_000);
});
