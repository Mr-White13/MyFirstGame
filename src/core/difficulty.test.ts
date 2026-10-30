import { describe, expect, it } from 'vitest';
import { LEVELS } from '../levels';
import { levelFromMap } from '../levels/levelMap';
import { analyzeDifficulty, categoryFor, countAmbiguousJoins, countTurns } from './difficulty';

// b is free; a is blocked by b (adjacent); c is blocked by a (3 cells away).
const chain = levelFromMap(1, [
  '.  .  .  .  .',
  'c> .  .  a  .',
  '.  .  .  a^ .',
  '.  .  .  .  .',
  'b  b> .  .  .',
]);

describe('analyzeDifficulty', () => {
  it('is deterministic', () => {
    for (const level of [chain, LEVELS[4], LEVELS[9]]) {
      expect(analyzeDifficulty(level)).toEqual(analyzeDifficulty(level));
    }
  });

  it('computes exact metrics from the rules', () => {
    const { exact } = analyzeDifficulty(chain);
    expect(exact.arrows).toBe(3);
    expect(exact.initialFree).toBe(2); // a and b
    expect(exact.blockingRelations).toBe(1); // c → a
    expect(exact.longRangeBlocks).toBe(1); // a is 3 cells from c's head
    expect(exact.maxBlockers).toBe(1);
    expect(exact.depth).toBe(2);
    expect(exact.waves).toEqual([2, 1]);
    expect(exact.density).toBeCloseTo(5 / 25);
  });

  it('keeps the score within 0..100 and matches its category', () => {
    for (const level of [chain, ...LEVELS]) {
      const report = analyzeDifficulty(level);
      expect(report.score).toBeGreaterThanOrEqual(0);
      expect(report.score).toBeLessThanOrEqual(100);
      expect(report.category).toBe(categoryFor(report.score));
    }
  });

  it('rates a tangled board above a trivial one', () => {
    const trivial = levelFromMap(1, ['a> .  .', '.  .  .', '.  .  b>']);
    expect(analyzeDifficulty(trivial).score).toBeLessThan(analyzeDifficulty(LEVELS[9]).score);
    expect(analyzeDifficulty(trivial).estimated.wrongTapsPerMove).toBe(0);
  });

  it('does not treat arrow count as difficulty on its own', () => {
    // Many arrows, all free: lots to tap but nothing to figure out.
    const crowdButEasy = levelFromMap(1, [
      'a^ b^ c^ d^ e^ f^ g^',
      'a  b  c  d  e  f  g',
      '.  .  .  .  .  .  .',
      'hv iv jv kv lv mv nv',
    ]);
    expect(analyzeDifficulty(crowdButEasy).score).toBeLessThan(analyzeDifficulty(LEVELS[2]).score);
  });
});

describe('categoryFor', () => {
  it('maps band boundaries', () => {
    expect(categoryFor(0)).toBe('Very easy');
    expect(categoryFor(15)).toBe('Very easy');
    expect(categoryFor(16)).toBe('Easy');
    expect(categoryFor(28)).toBe('Easy–medium');
    expect(categoryFor(38)).toBe('Medium');
    expect(categoryFor(48)).toBe('Medium–hard');
    expect(categoryFor(58)).toBe('Hard');
    expect(categoryFor(70)).toBe('Very hard');
    expect(categoryFor(100)).toBe('Very hard');
  });
});

describe('readability helpers', () => {
  it('counts turns', () => {
    const level = levelFromMap(1, ['a  a  .', '.  a  .', '.  a  a>']);
    expect(countTurns(level.arrows[0])).toBe(2);
  });

  it('flags two arrows meeting tail to tail in a line', () => {
    const joined = levelFromMap(1, ['a< a  b  b>', '.  .  .  .']);
    expect(countAmbiguousJoins(joined)).toBe(1);
    // Head to tail is readable: the arrowhead marks where one ends.
    const headToTail = levelFromMap(1, ['a  a> b  b>', '.  .  .  .']);
    expect(countAmbiguousJoins(headToTail)).toBe(0);
  });
});

describe('lives model', () => {
  it('is deterministic and reports rates within 0..1', () => {
    const a = analyzeDifficulty(LEVELS[5]).lives!;
    const b = analyzeDifficulty(LEVELS[5]).lives!;
    expect(a).toEqual(b);
    for (const s of [a.random, a.nearSighted]) {
      expect(s.winRate).toBeGreaterThanOrEqual(0);
      expect(s.winRate).toBeLessThanOrEqual(1);
      expect(s.expectedMistakes).toBeGreaterThanOrEqual(0);
    }
    expect(a.riskScore).toBeGreaterThanOrEqual(0);
    expect(a.riskScore).toBeLessThanOrEqual(100);
  });

  it('lets even simple strategies finish the tutorial, and rates the finale far riskier', () => {
    const first = analyzeDifficulty(LEVELS[0]).lives!;
    const last = analyzeDifficulty(LEVELS[9]).lives!;
    expect(first.nearSighted.winRate).toBe(1);
    expect(last.riskScore).toBeGreaterThan(first.riskScore);
  });

  it('counts arrows that look free but are blocked further along', () => {
    // c's next cell is empty, but a sits two cells ahead: one deceptive arrow.
    expect(analyzeDifficulty(chain).lives!.deceptiveArrows).toBe(1);
  });

  it('chain reactions show up in the simulation', () => {
    expect(analyzeDifficulty(LEVELS[9]).lives!.random.averageChainClears).toBeGreaterThan(0);
  });

  it('can be skipped (the generator only needs the search score)', () => {
    const fast = analyzeDifficulty(LEVELS[3], { lives: false });
    expect(fast.lives).toBeNull();
    expect(fast.score).toBe(analyzeDifficulty(LEVELS[3]).score);
  });
});
