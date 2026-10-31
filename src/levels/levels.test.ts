import { describe, expect, it } from 'vitest';
import { validateLevel } from '../core/levelValidation';
import { analyzeDifficulty } from '../core/difficulty';
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

  it('uses the planned grid sizes', () => {
    expect(LEVELS.map((l) => `${l.rows}x${l.cols}`)).toEqual([
      '7x7', '7x7', '7x7', '7x7', '7x7',
      '8x8', '8x8', '8x8',
      '9x9', '9x9',
      '10x10', '10x10', '10x10', '10x10', '10x10',
      '11x11', '11x11', '12x12', '12x12', '12x12',
      '13x13', '13x13', '14x14', '14x14', '15x15',
      '15x15', '15x15', '16x16', '16x16', '16x16',
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
  const allReports = LEVELS.map((l) => analyzeDifficulty(l));
  /** The hand-designed levels 1–10 (their curve is checked strictly). */
  const reports = allReports.slice(0, 10);

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
    expect(allReports.map((r) => r.exact.ambiguousJoins)).toEqual(LEVELS.map(() => 0));
  });

  it('has no two levels that are near-duplicates', () => {
    for (const a of LEVELS) {
      for (const b of LEVELS) {
        if (a.id < b.id) expect(layoutSimilarity(a, b)).toBeLessThanOrEqual(0.6);
      }
    }
  });

  it('marks redesigned layouts with a new revision', () => {
    expect(LEVELS.map((l) => l.revision ?? 1)).toEqual([1, 2, 2, 2, 2, 2, 2, 2, 2, 2, ...Array(20).fill(1)]);
  });

  it('does not simply add arrows every level', () => {
    const counts = stats.map((s) => s.arrows);
    const alwaysGrowing = counts.every((n, i) => i === 0 || n > counts[i - 1]);
    expect(alwaysGrowing).toBe(false);
  });
});

describe('levels 11–30', () => {
  const later = LEVELS.slice(10);
  const reports = later.map((l) => analyzeDifficulty(l, { lives: false }));
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const band = (from: number) => reports.slice(from - 11, from - 6);

  it('stay readable: no arrow runs alongside itself, and boards stay at most 16×16', () => {
    for (const level of later) {
      expect(level.rows).toBeLessThanOrEqual(16);
      for (const a of level.arrows) expect(isSelfTouching(a.cells), `level ${level.id} arrow ${a.id}`).toBe(false);
    }
  });

  it('use longer arrows and more bends than the curated levels', () => {
    const longest = (ls: typeof LEVELS) => Math.max(...ls.flatMap((l) => l.arrows.map((a) => a.cells.length)));
    expect(longest(later)).toBeGreaterThan(longest(LEVELS.slice(0, 10)));
    const bends = (cells: readonly { row: number; col: number }[]) =>
      cells.slice(2).filter((c, i) => c.row - cells[i + 1].row !== cells[i + 1].row - cells[i].row || c.col - cells[i + 1].col !== cells[i + 1].col - cells[i].col).length;
    expect(later.some((l) => l.arrows.some((a) => bends(a.cells) >= 3))).toBe(true);
  });

  it('get harder band by band (11–15, 16–20, 21–25, 26–30), without simply adding arrows', () => {
    const means = [11, 16, 21, 26].map((from) => mean(band(from).map((r) => r.score)));
    for (let i = 1; i < means.length; i++) expect(means[i]).toBeGreaterThan(means[i - 1]);
    expect(mean(band(26).map((r) => r.score))).toBeGreaterThan(mean([...band(11), ...band(16)].map((r) => r.score)));
    for (const r of reports) expect(r.score).toBeGreaterThanOrEqual(55);
  });

  it('keep the opening a search: few arrows are free at the start', () => {
    for (const r of reports) expect(r.exact.initialFree / r.exact.arrows).toBeLessThanOrEqual(0.3);
  });

  it('each need a long chain of moves (depth), deeper in the later bands', () => {
    const depth = (from: number) => mean(band(from).map((r) => r.exact.depth));
    expect(depth(26)).toBeGreaterThan(depth(11));
    for (const r of reports) expect(r.exact.depth).toBeGreaterThanOrEqual(10);
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
