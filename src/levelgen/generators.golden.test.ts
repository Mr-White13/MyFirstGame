import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { LevelData } from '../core/types';
import { LEVELS } from '../levels';
import { levelToMap } from '../levels/levelMap';
import { golden, plain } from '../testing/golden';
import { fillLevel, type FillOptions } from './fillLevel';
import { generateLevel, type GenerateOptions, type GenerateResult } from './generateLevel';

/**
 * Golden output of both level generators for fixed seeds: the exact layout
 * (arrow order and labels included), the attempt that produced it and its
 * score, or the failure. Any change to the random sequence, iteration order
 * or acceptance rules shows up here.
 */

function summary(result: GenerateResult) {
  if (!result.ok) return plain(result);
  const { score, category, exact } = result.report;
  return { ok: true, attempt: result.attempt, id: result.level.id, map: levelToMap(result.level), score, category, depth: exact.depth, initialFree: exact.initialFree };
}

const GENERATE: Record<string, GenerateOptions> = {
  'base 7x7 seed 42': { rows: 7, cols: 7, minScore: 25, maxScore: 45, seed: 42, attempts: 60 },
  'base 7x7 seed 3': { rows: 7, cols: 7, minScore: 25, maxScore: 45, seed: 3, attempts: 60 },
  'any score 7x9': { rows: 7, cols: 9, minScore: 0, maxScore: 100, seed: 79, attempts: 60 },
  'straight arrows': { rows: 7, cols: 7, minScore: 0, maxScore: 100, seed: 42, attempts: 60, maxTurns: 0, maxLength: 3 },
  'dense, avoiding levels 1-3': { rows: 7, cols: 7, minScore: 20, maxScore: 60, seed: 5, attempts: 40, minDensity: 0.6, maxEmptySquare: 2, avoid: LEVELS.slice(0, 3), id: 77 },
  'unreachable score': { rows: 6, cols: 6, minScore: 99, maxScore: 100, seed: 1, attempts: 3, workBudget: 50 },
  'invalid grid': { rows: 2, cols: 6, minScore: 0, maxScore: 100, seed: 1 },
};

const FILL: Record<string, FillOptions> = {
  '9x7 seed 7 no refine': { rows: 9, cols: 7, seed: 7, minScore: 0, maxScore: 100, attempts: 10, refineSteps: 0 },
  '10x8 seed 42': { rows: 10, cols: 8, seed: 42, minScore: 0, maxScore: 100, attempts: 5 },
  '10x8 seed 3 score 45-55': { rows: 10, cols: 8, seed: 3, minScore: 45, maxScore: 55, attempts: 30 },
  '12x9 seed 11 long arrows': { rows: 12, cols: 9, seed: 11, minScore: 0, maxScore: 100, attempts: 40, minMeanLength: 4.5, maxShortShare: 0.12 },
  'unreachable score': { rows: 6, cols: 5, seed: 3, minScore: 99, maxScore: 100, attempts: 2, refineSteps: 5 },
};

describe('generator golden output', () => {
  const actual = {
    generateLevel: Object.fromEntries(Object.entries(GENERATE).map(([name, options]) => [name, summary(generateLevel(options))])),
    fillLevel: Object.fromEntries(Object.entries(FILL).map(([name, options]) => [name, summary(fillLevel(options))])),
  };
  const expected = golden(new URL('./generators.golden.json', import.meta.url), plain(actual));

  it.each(Object.keys(GENERATE))('generateLevel: %s', (name) => {
    expect(actual.generateLevel[name]).toEqual(expected.generateLevel[name]);
  });

  it.each(Object.keys(FILL))('fillLevel: %s', (name) => {
    expect(actual.fillLevel[name]).toEqual(expected.fillLevel[name]);
  });
});

interface PlanEntry {
  readonly id: number;
  readonly rows: number;
  readonly cols: number;
  readonly score: readonly [number, number];
  readonly depth?: readonly [number, number];
  readonly maxFree?: number;
  readonly minLength?: number;
  readonly length?: number;
  readonly turns?: number;
  readonly bend?: number;
  readonly minCoverage?: number;
  readonly minMeanLength?: number;
  readonly maxShortShare?: number;
  readonly maxStraight?: number;
  readonly attempts?: number;
}

/**
 * Shipped levels the generator still rebuilds exactly from tools/level-plan.json
 * and the seed in their file header (the same options as `levels:plan`).
 * Only the quick ones are checked here; levels 4–14 all reproduce, but
 * levels 15–30 no longer do (they predate later generator changes).
 */
const REPRODUCIBLE = [8, 13, 14];

describe('shipped levels rebuilt from the level plan', () => {
  const plan = JSON.parse(readFileSync(new URL('../../tools/level-plan.json', import.meta.url), 'utf8')) as PlanEntry[];

  it.each(REPRODUCIBLE)('level %i', (id) => {
    const entry = plan.find((e) => e.id === id)!;
    const header = readFileSync(new URL(`../levels/level${String(id).padStart(2, '0')}.ts`, import.meta.url), 'utf8');
    const seed = Number(/seed (\d+), attempt (\d+)/.exec(header)![1]);
    const attempt = Number(/seed (\d+), attempt (\d+)/.exec(header)![2]);
    const result = fillLevel({
      rows: entry.rows,
      cols: entry.cols,
      minScore: entry.score[0],
      maxScore: entry.score[1],
      seed,
      id,
      depth: entry.depth,
      maxInitialFree: entry.maxFree,
      minLength: entry.minLength,
      maxLength: entry.length,
      maxTurns: entry.turns,
      turnChance: entry.bend,
      minCoverage: entry.minCoverage,
      minMeanLength: entry.minMeanLength,
      maxShortShare: entry.maxShortShare,
      maxStraight: entry.maxStraight,
      attempts: entry.attempts,
      avoid: LEVELS.filter((l) => l.id !== id),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const shipped: LevelData = LEVELS[id - 1];
    expect(result.attempt).toBe(attempt);
    expect(levelToMap(result.level)).toEqual(levelToMap(shipped));
    expect(result.level.arrows).toEqual(shipped.arrows);
  });
});
