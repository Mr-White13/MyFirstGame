import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateLevel } from '../core/levelValidation';
import { analyzeDifficulty, countTurns } from '../core/difficulty';
import { analyzeLevel, findSolution } from '../core/solver';
import type { LevelData, LevelTier } from '../core/types';
import { isSelfTouching, layoutSimilarity } from '../levelgen/generateLevel';
import { CHAPTER_NAMES, CHAPTER_SIZE } from '../progress/chapters';
import { getLevel, LEVEL_COUNT, LEVELS } from './index';
import { arrowLabel, levelFromMap, levelToMap } from './levelMap';

/*
 * The 100-level campaign: five chapters of 20. Levels 1–3 are the tutorial;
 * 4–100 follow one rhythm: two or three normal levels, then a hard one, with
 * a very hard one closing every chapter (and more often in chapters 3–5).
 * Ten very hard levels are the extreme ones (THE IMPOSSIBLE GRID and nine
 * shaped boards), with their own checks in impossibleGrid.test.ts and
 * shapedLevels.test.ts. Scores are a heuristic (see core/difficulty.ts):
 * these checks keep the campaign consistent with it, not a claim about
 * human difficulty.
 */
const tierOf = (l: LevelData): LevelTier => l.tier ?? 'normal';
/** Generated rectangular levels: everything after the tutorial except the extreme levels. */
const GENERATED = LEVELS.slice(3).filter((l) => l.name === undefined);
const reports = LEVELS.map((l) => analyzeDifficulty(l, { lives: false }));
const score = (id: number) => reports[id - 1].score;
const depth = (id: number) => reports[id - 1].exact.depth;
const chapterLevels = (chapter: number) => LEVELS.slice((chapter - 1) * CHAPTER_SIZE, chapter * CHAPTER_SIZE);

describe('level registry', () => {
  it('has 100 levels with ids 1..100 in order, in five named chapters of 20', () => {
    expect(LEVEL_COUNT).toBe(100);
    expect(LEVELS.map((l) => l.id)).toEqual(Array.from({ length: 100 }, (_, i) => i + 1));
    expect(CHAPTER_SIZE).toBe(20);
    expect(CHAPTER_NAMES).toHaveLength(5);
    expect(CHAPTER_NAMES[0]).toBe("It's Just the Beginning");
  });

  it('looks levels up by id', () => {
    expect(getLevel(1)).toBe(LEVELS[0]);
    expect(getLevel(50)).toBe(LEVELS[49]);
    expect(getLevel(100)).toBe(LEVELS[99]);
    expect(getLevel(0)).toBeUndefined();
    expect(getLevel(101)).toBeUndefined();
  });

  it('names only the ten extreme levels', () => {
    expect(LEVELS.filter((l) => l.name !== undefined).map((l) => l.id)).toEqual([47, 54, 60, 67, 74, 80, 87, 90, 94, 100]);
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

describe('campaign rhythm', () => {
  it('runs two or three normal levels, then a harder one, in every chapter', () => {
    for (let chapter = 1; chapter <= 5; chapter++) {
      // Chapter 1 opens with the three tutorial levels, then the same rhythm.
      const levels = chapterLevels(chapter).slice(chapter === 1 ? 3 : 0);
      let run = 0;
      for (const level of levels) {
        if (tierOf(level) === 'normal') {
          run++;
          continue;
        }
        expect([2, 3], `normal levels before level ${level.id}`).toContain(run);
        run = 0;
      }
      expect(run, `chapter ${chapter} ends on a harder level`).toBe(0);
    }
  });

  it('closes every chapter with a very hard level, and has very hard levels more often in chapters 3–5', () => {
    for (let chapter = 1; chapter <= 5; chapter++) {
      const levels = chapterLevels(chapter);
      expect(tierOf(levels.at(-1)!), `chapter ${chapter}`).toBe('very hard');
      const veryHard = levels.filter((l) => tierOf(l) === 'very hard').length;
      expect(veryHard, `chapter ${chapter}`).toBe(chapter <= 2 ? 1 : chapter === 5 ? 4 : 3);
    }
  });

  it('makes every harder level harder than the normal levels before it: deeper, and scoring at least as high', () => {
    let run: LevelData[] = [];
    for (const level of LEVELS.slice(3)) {
      if (tierOf(level) === 'normal') {
        run.push(level);
        continue;
      }
      for (const normal of run) {
        expect(depth(level.id), `level ${level.id} vs ${normal.id}`).toBeGreaterThan(depth(normal.id));
        expect(score(level.id), `level ${level.id} vs ${normal.id}`).toBeGreaterThanOrEqual(score(normal.id));
      }
      run = [];
    }
  });

  it('makes each very hard level the deepest of its chapter', () => {
    for (let chapter = 1; chapter <= 5; chapter++) {
      const levels = chapterLevels(chapter);
      const deepestOther = Math.max(...levels.filter((l) => tierOf(l) !== 'very hard').map((l) => depth(l.id)));
      for (const l of levels.filter((x) => tierOf(x) === 'very hard')) expect(depth(l.id), `level ${l.id}`).toBeGreaterThan(deepestOther);
    }
  });

  it('gets harder chapter by chapter: normal levels are deeper and score higher on average', () => {
    const average = (chapter: number, of: (id: number) => number) => {
      const normal = chapterLevels(chapter).filter((l) => l.id > 3 && tierOf(l) === 'normal');
      return normal.reduce((sum, l) => sum + of(l.id), 0) / normal.length;
    };
    for (let chapter = 2; chapter <= 5; chapter++) {
      expect(average(chapter, depth), `chapter ${chapter} depth`).toBeGreaterThan(average(chapter - 1, depth));
      expect(average(chapter, score), `chapter ${chapter} score`).toBeGreaterThanOrEqual(average(chapter - 1, score) - 1);
    }
  });

  it('starts genuinely easy', () => {
    const first = analyzeLevel(LEVELS[0])!;
    expect(first.arrows).toBeLessThanOrEqual(6);
    expect(first.depth).toBeLessThanOrEqual(2);
    expect(first.maxBlockers).toBe(1);
    expect(reports[0].category).toBe('Very easy');
  });

  it('keeps normal levels readable on a phone without zooming: tall boards up to 17×12 that never shrink', () => {
    expect(LEVELS.slice(0, 3).map((l) => `${l.rows}x${l.cols}`)).toEqual(['7x7', '7x7', '7x7']);
    const normal = LEVELS.slice(3).filter((l) => tierOf(l) === 'normal');
    for (const l of normal) {
      expect(l.rows, `level ${l.id}`).toBeGreaterThan(l.cols);
      expect(l.cols, `level ${l.id}`).toBeLessThanOrEqual(12);
      expect(l.rows, `level ${l.id}`).toBeLessThanOrEqual(17);
    }
    for (let i = 1; i < normal.length; i++) expect(normal[i].rows * normal[i].cols, `level ${normal[i].id}`).toBeGreaterThanOrEqual(normal[i - 1].rows * normal[i - 1].cols);
  });

  it('gives harder levels a board at least as big as the normal level before them', () => {
    let last = LEVELS[2];
    for (const level of LEVELS.slice(3)) {
      if (tierOf(level) === 'normal') last = level;
      else expect(level.rows * level.cols, `level ${level.id}`).toBeGreaterThanOrEqual(last.rows * last.cols);
    }
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

  it('marks rebuilt layouts with a new revision', () => {
    // 1 unchanged; 2–3 as rebalanced in Step 12; 4–30 redesigned in Steps 13 and 14 and again in the
    // 100-level rebuild; 31–40 rebuilt once (they were the experimental levels); 41–100 are new.
    expect(LEVELS.map((l) => l.revision ?? 1)).toEqual([1, 3, 3, ...Array(7).fill(6), ...Array(20).fill(4), ...Array(10).fill(2), ...Array(60).fill(1)]);
  });

  it('does not simply add arrows every level', () => {
    const counts = LEVELS.map((l) => l.arrows.length);
    expect(counts.every((n, i) => i === 0 || n > counts[i - 1])).toBe(false);
  });
});

/** Levels 1–3 as text maps, saved when Step 13 began: they must never change. */
const EARLY_LEVELS: string[] = JSON.parse(readFileSync(new URL('./levels1to3.golden.json', import.meta.url), 'utf8'));

describe('Levels 1–3 stay exactly as they were', () => {
  it('match the saved layouts', () => {
    const signature = (l: (typeof LEVELS)[number]) => levelToMap(l).join('\n');
    expect(LEVELS.slice(0, 3).map(signature)).toEqual(EARLY_LEVELS);
    expect(LEVELS.slice(0, 3).map((l) => l.revision)).toEqual([undefined, 3, 3]);
  });
});

describe('generated Levels 4–100 (all but the extreme levels)', () => {
  const generated = GENERATED.map((l) => [l, reports[l.id - 1]] as const);

  it('cover the board: at least 97 % of cells, no empty square, and full coverage on almost every level', () => {
    for (const [l, r] of generated) {
      expect(r.exact.density, `level ${l.id}`).toBeGreaterThanOrEqual(0.97);
      expect(r.exact.largestEmptySquare, `level ${l.id}`).toBeLessThanOrEqual(1);
    }
    expect(generated.filter(([, r]) => r.exact.density === 1).length / generated.length).toBeGreaterThanOrEqual(0.9);
  });

  it('never overlap: every cell belongs to at most one arrow', () => {
    for (const level of GENERATED) {
      const cells = level.arrows.flatMap((a) => a.cells.map((c) => `${c.row},${c.col}`));
      expect(new Set(cells).size, `level ${level.id}`).toBe(cells.length);
    }
  });

  it('favour long, winding arrows over many short ones', () => {
    for (const level of GENERATED) {
      // Full coverage leaves a few 2-cell arrows where a path had to split; never single cells.
      expect(level.arrows.every((a) => a.cells.length >= 2), `level ${level.id}`).toBe(true);
      expect(level.arrows.filter((a) => a.cells.length < 3).length / level.arrows.length, `level ${level.id}`).toBeLessThanOrEqual(0.15);
      const mean = level.arrows.reduce((n, a) => n + a.cells.length, 0) / level.arrows.length;
      expect(mean, `level ${level.id}`).toBeGreaterThanOrEqual(4.2);
    }
    const all = GENERATED.flatMap((l) => l.arrows);
    expect(all.filter((a) => countTurns(a) >= 1).length / all.length).toBeGreaterThan(0.5); // most arrows bend
    expect(all.filter((a) => countTurns(a) >= 3).length).toBeGreaterThan(0); // some wind a lot
  });

  it('are richer in blocking than in arrows: more blocking links than arrows', () => {
    for (const [l, r] of generated) expect(r.exact.blockingRelations, `level ${l.id}`).toBeGreaterThan(r.exact.arrows);
  });

  it('stay readable: no arrow runs alongside itself', () => {
    for (const level of GENERATED) {
      for (const a of level.arrows) expect(isSelfTouching(a.cells), `level ${level.id} arrow ${a.id}`).toBe(false);
    }
  });

  it('keep the opening a search: few arrows are free at the start', () => {
    for (const [l, r] of generated) expect(r.exact.initialFree / r.exact.arrows, `level ${l.id}`).toBeLessThanOrEqual(0.34);
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

  it('supports more than 52 arrows with letter+digit labels', () => {
    const many = levelFromMap(99, [Array.from({ length: 60 }, (_, i) => `${arrowLabel(i)}v`).join(' '), Array.from({ length: 60 }, () => '.').join(' ')]);
    expect(many.arrows).toHaveLength(60);
    expect(arrowLabel(51)).toBe('Z');
    expect(arrowLabel(52)).toBe('a0');
    expect(arrowLabel(53)).toBe('b0');
    expect(levelFromMap(99, levelToMap(many)).arrows).toHaveLength(60);
    expect(() => levelFromMap(1, ['a1 a1>'])).not.toThrow();
  });

  it('keeps the revision option', () => {
    expect(levelFromMap(3, ['a> .'], { revision: 4 }).revision).toBe(4);
    expect(levelFromMap(3, ['a> .']).revision).toBeUndefined();
  });

  it('keeps the name option, and adds no name field without it', () => {
    expect(levelFromMap(3, ['a> .'], { name: 'X' }).name).toBe('X');
    expect('name' in levelFromMap(3, ['a> .'], { revision: 2 })).toBe(false);
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
