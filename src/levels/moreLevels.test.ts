import { describe, expect, it } from 'vitest';
import { shapeMask } from '../../tools/shapes';
import { analyzeDifficulty, dependencyGraph } from '../core/difficulty';
import { GameState } from '../core/GameState';
import { findSolution } from '../core/solver';
import { STARTING_LIVES, type LevelData, type LevelTier } from '../core/types';
import { isSelfTouching } from '../levelgen/generateLevel';
import { challengePool } from '../league/challenges';
import { chapterOf, CHAPTER_SIZE } from '../progress/chapters';
import { getLevel, LEVELS } from './index';

/*
 * Chapters 6–10 (levels 101–200), generated from tools/level-plan.json. Each
 * chapter has the same rhythm: hard rectangular levels at positions 4, 13
 * and 19, shaped hard levels at 7 and 16, and a named, very hard shaped
 * board at 10 and 20; everything else is normal. The boards are bigger and
 * the arrows longer than in chapters 1–5, so they lean on zoom. Five normal
 * levels are one-life levels. Validation and solvability of every level are
 * covered by levels.test.ts.
 */
const NEW = LEVELS.slice(100, 200);
const tierOf = (l: LevelData): LevelTier => l.tier ?? 'normal';
const position = (l: LevelData) => ((l.id - 1) % CHAPTER_SIZE) + 1;
const reports = new Map(NEW.map((l) => [l.id, analyzeDifficulty(l, { lives: false })]));
const report = (l: LevelData) => reports.get(l.id)!;
const meanLength = (l: LevelData) => l.arrows.reduce((n, a) => n + a.cells.length, 0) / l.arrows.length;
const normal = NEW.filter((l) => tierOf(l) === 'normal');
const hardRect = NEW.filter((l) => tierOf(l) === 'hard' && !l.outline);
const rectangular = NEW.filter((l) => !l.outline);

const SHAPED_HARD: Record<number, string> = {
  107: 'arrowhead', 116: 'pyramid', 127: 'hourglass', 136: 'cross', 147: 'heart',
  156: 'crown', 167: 'shield', 176: 'tree', 187: 'ring', 196: 'castle',
};
const VERY_HARD: Record<number, [string, string]> = {
  110: ['THE STAR', 'star'], 120: ['THE BOLT', 'bolt'], 130: ['THE CRESCENT', 'crescent'], 140: ['THE ROCKET', 'rocket'],
  150: ['THE GEM', 'gem'], 160: ['THE KEY', 'key'], 170: ['THE BUTTERFLY', 'butterfly'], 180: ['THE NUT', 'nut'],
  190: ['INFINITY', 'infinity'], 200: ['THE EXIT', 'exit'],
};
const SHAPE_OF: Record<number, string> = { ...SHAPED_HARD, ...Object.fromEntries(Object.entries(VERY_HARD).map(([id, [, s]]) => [id, s])) };

describe('chapters 6–10: rhythm', () => {
  it('place hard levels at 4, 13 and 19, shaped hard ones at 7 and 16, and very hard ones at 10 and 20 of every chapter', () => {
    for (const l of NEW) {
      const p = position(l);
      const expected: LevelTier = [4, 7, 13, 16, 19].includes(p) ? 'hard' : [10, 20].includes(p) ? 'very hard' : 'normal';
      expect(tierOf(l), `level ${l.id}`).toBe(expected);
      expect(Boolean(l.outline), `level ${l.id}`).toBe([7, 10, 16, 20].includes(p));
    }
  });

  it('name only the ten very hard shaped levels, ending chapter 10 on THE EXIT', () => {
    expect(Object.fromEntries(NEW.filter((l) => l.name).map((l) => [l.id, l.name]))).toEqual(
      Object.fromEntries(Object.entries(VERY_HARD).map(([id, [name]]) => [id, name])),
    );
    expect(getLevel(200)?.name).toBe('THE EXIT');
  });

  it('have exactly five one-life levels, one in each chapter from 6 to 10', () => {
    expect(NEW.filter((l) => l.lives !== undefined).map((l) => [l.id, l.lives])).toEqual([105, 125, 145, 165, 185].map((id) => [id, 1]));
  });

  it('keep every new level out of the Daily League pool', () => {
    expect(challengePool(LEVELS).filter((l) => l.id > 100 && l.id <= 200)).toEqual([]);
  });
});

describe('chapters 6–10: harder than chapters 1–5', () => {
  it('use longer arrows: every normal level averages at least 6.5 cells per arrow, well above chapters 1–5', () => {
    const oldNormal = LEVELS.slice(3, 100).filter((l) => tierOf(l) === 'normal');
    const average = (ls: LevelData[]) => ls.reduce((n, l) => n + meanLength(l), 0) / ls.length;
    for (const l of normal) expect(meanLength(l), `level ${l.id}`).toBeGreaterThanOrEqual(6.5);
    expect(average(normal)).toBeGreaterThan(average(oldNormal) * 1.2);
  });

  it('score at least 70 on every normal level, and rate every level Hard or Very hard', () => {
    for (const l of normal) expect(report(l).score, `level ${l.id}`).toBeGreaterThanOrEqual(70);
    for (const l of NEW) expect(['Hard', 'Very hard'], `level ${l.id}`).toContain(report(l).category);
  });

  it('use bigger boards: normal boards from 18×13 to 21×15 that never shrink, harder boards at least as big as the normal before them', () => {
    for (const l of normal) {
      expect(l.rows, `level ${l.id}`).toBeGreaterThanOrEqual(18);
      expect(l.rows, `level ${l.id}`).toBeLessThanOrEqual(21);
      expect(l.cols, `level ${l.id}`).toBeGreaterThanOrEqual(13);
      expect(l.cols, `level ${l.id}`).toBeLessThanOrEqual(15);
    }
    for (let i = 1; i < normal.length; i++) expect(normal[i].rows * normal[i].cols, `level ${normal[i].id}`).toBeGreaterThanOrEqual(normal[i - 1].rows * normal[i - 1].cols);
    let last = LEVELS[99];
    for (const l of NEW) {
      if (tierOf(l) === 'normal') last = l;
      else expect(l.rows * l.cols, `level ${l.id}`).toBeGreaterThanOrEqual(last.rows * last.cols);
    }
  });

  it('make every hard or shaped level deeper than the normal levels just before it', () => {
    let run: LevelData[] = [];
    for (const l of NEW) {
      if (tierOf(l) === 'normal') {
        run.push(l);
        continue;
      }
      for (const n of run) expect(report(l).exact.depth, `level ${l.id} vs ${n.id}`).toBeGreaterThan(report(n).exact.depth);
      run = [];
    }
  });

  it('make hard rectangular levels score at least as high as the normal levels before them', () => {
    for (const h of hardRect) {
      const before = NEW.filter((l) => tierOf(l) === 'normal' && l.id < h.id && l.id > h.id - 4);
      for (const n of before) expect(report(h).score, `level ${h.id} vs ${n.id}`).toBeGreaterThanOrEqual(report(n).score);
    }
  });

  it('make each very hard level deeper than every normal level of its chapter, with a long critical chain', () => {
    for (const l of NEW.filter((x) => tierOf(x) === 'very hard')) {
      const deepestNormal = Math.max(...normal.filter((n) => chapterOf(n.id) === chapterOf(l.id)).map((n) => report(n).exact.depth));
      expect(report(l).exact.depth, `level ${l.id}`).toBeGreaterThan(deepestNormal);
      expect(report(l).exact.depth, `level ${l.id}`).toBeGreaterThanOrEqual(46);
      expect(dependencyGraph(l).criticalPath, `level ${l.id}`).toHaveLength(report(l).exact.depth);
    }
  });

  it('make the ten finales deeper on average than the ten chapter 1–5 finales, scoring within 2 points of them', () => {
    const finales = NEW.filter((l) => tierOf(l) === 'very hard');
    const oldFinales = LEVELS.slice(0, 100).filter((l) => l.name !== undefined).map((l) => analyzeDifficulty(l, { lives: false }));
    const average = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(average(finales.map((l) => report(l).exact.depth))).toBeGreaterThan(average(oldFinales.map((r) => r.exact.depth)));
    expect(average(finales.map((l) => report(l).score))).toBeGreaterThanOrEqual(average(oldFinales.map((r) => r.score)) - 2);
  }, 60_000); // analyses the ten large chapter 1–5 finales
});

describe('chapters 6–10: fair and readable', () => {
  it('fill the rectangular boards: at least 97 % of cells and no empty square bigger than one cell', () => {
    for (const l of rectangular) {
      expect(report(l).exact.density, `level ${l.id}`).toBeGreaterThanOrEqual(0.97);
      expect(report(l).exact.largestEmptySquare, `level ${l.id}`).toBeLessThanOrEqual(1);
    }
  });

  it.each(Object.entries(SHAPE_OF).map(([id, shape]) => [Number(id), shape] as const))('level %i fills its %s outline', (id, shape) => {
    const level = getLevel(id)!;
    const mask = shapeMask(shape, level.rows, level.cols);
    const inside = new Set(mask.flatMap((row, r) => [...row].flatMap((ch, c) => (ch === '#' ? [`${r},${c}`] : []))));
    const cells = level.arrows.flatMap((a) => a.cells.map((c) => `${c.row},${c.col}`));
    expect(cells.every((c) => inside.has(c))).toBe(true);
    expect(cells.length / inside.size).toBeGreaterThanOrEqual(0.93);
  });

  it('never overlap arrows, fold an arrow against itself, or join two arrows so they read as one', () => {
    for (const l of NEW) {
      const cells = l.arrows.flatMap((a) => a.cells.map((c) => `${c.row},${c.col}`));
      expect(new Set(cells).size, `level ${l.id}`).toBe(cells.length);
      expect(l.arrows.some((a) => isSelfTouching(a.cells)), `level ${l.id}`).toBe(false);
      expect(report(l).exact.ambiguousJoins, `level ${l.id}`).toBe(0);
    }
  });

  it('keep the opening a search: at most a third of the arrows free at the start, and at least one', () => {
    for (const l of NEW) {
      expect(report(l).exact.initialFree, `level ${l.id}`).toBeGreaterThanOrEqual(1);
      expect(report(l).exact.initialFree / report(l).exact.arrows, `level ${l.id}`).toBeLessThanOrEqual(0.34);
    }
  });

  it('can each be completed without a mistake for full stars, one-life levels included', () => {
    for (const l of NEW) {
      const state = new GameState(l, { clock: () => 0 });
      findSolution(l)!.forEach((arrowId, n) => state.tryMove(arrowId, n * 5000));
      expect(state.snapshot(), `level ${l.id}`).toMatchObject({ status: 'won', lives: l.lives ?? STARTING_LIVES, stars: 3 });
    }
  });
});
