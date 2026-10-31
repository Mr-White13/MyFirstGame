import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateLevel } from '../core/levelValidation';
import { analyzeDifficulty, countTurns } from '../core/difficulty';
import { analyzeLevel, findSolution } from '../core/solver';
import { isSelfTouching, layoutSimilarity } from '../levelgen/generateLevel';
import { getLevel, LEVEL_COUNT, LEVELS } from './index';
import { arrowLabel, levelFromMap, levelToMap } from './levelMap';


describe('level registry', () => {
  it('has 30 levels with ids 1..30 in order', () => {
    expect(LEVEL_COUNT).toBe(30);
    expect(LEVELS.map((l) => l.id)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
  });

  it('looks levels up by id', () => {
    expect(getLevel(1)).toBe(LEVELS[0]);
    expect(getLevel(10)).toBe(LEVELS[9]);
    expect(getLevel(30)).toBe(LEVELS[29]);
    expect(getLevel(0)).toBeUndefined();
    expect(getLevel(31)).toBeUndefined();
  });

  it('keeps Levels 1–3 square and gives Levels 4–30 tall portrait boards', () => {
    expect(LEVELS.slice(0, 3).map((l) => `${l.rows}x${l.cols}`)).toEqual(['7x7', '7x7', '7x7']);
    for (const l of LEVELS.slice(3)) {
      expect(l.rows, `level ${l.id}`).toBeGreaterThan(l.cols);
      expect(l.cols).toBeLessThanOrEqual(12); // readable on a phone without zooming in most levels
      expect(l.rows).toBeLessThanOrEqual(17);
    }
    // Boards grow (never shrink) through the game.
    for (let i = 4; i < LEVELS.length; i++) expect(LEVELS[i].rows * LEVELS[i].cols).toBeGreaterThanOrEqual(LEVELS[i - 1].rows * LEVELS[i - 1].cols);
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
  // Scores are a heuristic (see core/difficulty.ts); these checks keep the
  // curated order consistent with it, not a claim about human difficulty.
  const reports = LEVELS.map((l) => analyzeDifficulty(l, { lives: false }));
  const score = (id: number) => reports[id - 1].score;
  const depth = (id: number) => reports[id - 1].exact.depth;
  const SPIKES = [10, 20, 30];

  it('starts genuinely easy', () => {
    expect(stats[0].arrows).toBeLessThanOrEqual(6);
    expect(stats[0].depth).toBeLessThanOrEqual(2);
    expect(stats[0].maxBlockers).toBe(1);
    expect(reports[0].category).toBe('Very easy');
  });

  it('rises gradually between the spikes (never easier than the level before)', () => {
    for (const [from, to] of [[1, 9], [11, 19], [21, 29]]) {
      for (let id = from + 1; id <= to; id++) expect(score(id), `level ${id}`).toBeGreaterThanOrEqual(score(id - 1));
    }
    expect(score(11)).toBeGreaterThanOrEqual(score(9));
    expect(score(21)).toBeGreaterThanOrEqual(score(19));
  });

  it('has difficulty spikes at Levels 10, 20 and 30, then returns to the curve', () => {
    for (const id of SPIKES) {
      expect(score(id), `level ${id}`).toBeGreaterThanOrEqual(score(id - 1) + 3);
      expect(depth(id), `level ${id}`).toBeGreaterThan(depth(id - 1));
      expect(reports[id - 1].exact.initialFree, `level ${id}`).toBeLessThanOrEqual(3);
      if (id < 30) {
        expect(score(id + 1), `level ${id + 1}`).toBeLessThanOrEqual(score(id) - 3); // back down after the spike
        expect(depth(id + 1)).toBeLessThan(depth(id));
      }
    }
  });

  it('ends much deeper than it starts, and ends in the hard band', () => {
    expect(depth(30)).toBeGreaterThanOrEqual(depth(1) * 8);
    for (const id of SPIKES) expect(['Hard', 'Very hard']).toContain(reports[id - 1].category);
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
    // 1 unchanged; 2–3 as rebalanced in Step 12; 4–30 redesigned in Step 13 and again (full coverage) in Step 14.
    expect(LEVELS.map((l) => l.revision ?? 1)).toEqual([1, 3, 3, ...Array(7).fill(5), ...Array(20).fill(3)]);
  });

  it('does not simply add arrows every level', () => {
    const counts = stats.map((s) => s.arrows);
    const alwaysGrowing = counts.every((n, i) => i === 0 || n > counts[i - 1]);
    expect(alwaysGrowing).toBe(false);
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

describe('redesigned Levels 4–30', () => {
  const redesigned = LEVELS.slice(3);
  const reports = redesigned.map((l) => analyzeDifficulty(l, { lives: false }));

  it('cover the board: at least 97 % of cells, no empty square, and full coverage on almost every level', () => {
    for (const [i, r] of reports.entries()) {
      expect(r.exact.density, `level ${redesigned[i].id}`).toBeGreaterThanOrEqual(0.97);
      expect(r.exact.largestEmptySquare, `level ${redesigned[i].id}`).toBeLessThanOrEqual(1);
    }
    const full = reports.filter((r) => r.exact.density === 1).length;
    expect(full / reports.length).toBeGreaterThanOrEqual(0.9);
  });

  it('never overlap: every cell belongs to at most one arrow', () => {
    for (const level of redesigned) {
      const cells = level.arrows.flatMap((a) => a.cells.map((c) => `${c.row},${c.col}`));
      expect(new Set(cells).size, `level ${level.id}`).toBe(cells.length);
    }
  });

  it('favour long, winding arrows over many short ones', () => {
    for (const level of redesigned) {
      // Full coverage leaves a few 2-cell arrows where a path had to split; never single cells.
      expect(level.arrows.every((a) => a.cells.length >= 2), `level ${level.id}`).toBe(true);
      expect(level.arrows.filter((a) => a.cells.length < 3).length / level.arrows.length, `level ${level.id}`).toBeLessThanOrEqual(0.15);
      const mean = level.arrows.reduce((n, a) => n + a.cells.length, 0) / level.arrows.length;
      expect(mean, `level ${level.id}`).toBeGreaterThanOrEqual(4.2);
    }
    const all = redesigned.flatMap((l) => l.arrows);
    expect(all.filter((a) => countTurns(a) >= 1).length / all.length).toBeGreaterThan(0.5); // most arrows bend
    expect(all.filter((a) => countTurns(a) >= 3).length).toBeGreaterThan(0); // some wind a lot
  });

  it('are richer in blocking than in arrows: more blocking links than arrows', () => {
    for (const [i, r] of reports.entries()) expect(r.exact.blockingRelations, `level ${redesigned[i].id}`).toBeGreaterThan(r.exact.arrows);
  });

  it('stay readable: no arrow runs alongside itself', () => {
    for (const level of redesigned) {
      for (const a of level.arrows) expect(isSelfTouching(a.cells), `level ${level.id} arrow ${a.id}`).toBe(false);
    }
  });

  it('keep the opening a search: few arrows are free at the start', () => {
    for (const r of reports) expect(r.exact.initialFree / r.exact.arrows).toBeLessThanOrEqual(0.34);
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

  it('rejects malformed maps with a helpful message', () => {
    expect(() => levelFromMap(1, ['a  .', '.  .'])).toThrow(/no head/);
    expect(() => levelFromMap(1, ['a> a>', '.  .'])).toThrow(/two heads/);
    expect(() => levelFromMap(1, ['a> .', 'a'])).toThrow(/row 1/);
    expect(() => levelFromMap(1, ['a> .  a', '.  .  .'])).toThrow(/disconnected/);
    expect(() => levelFromMap(1, ['a  a  .', 'a  a> .'])).toThrow(/branching/);
    expect(() => levelFromMap(1, ['?  .', '.  .'])).toThrow(/invalid token/);
  });
});
