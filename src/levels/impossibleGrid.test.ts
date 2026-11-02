import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cellKey, headOf } from '../core/Arrow';
import { analyzeDifficulty, dependencyGraph } from '../core/difficulty';
import { GameState } from '../core/GameState';
import { validateLevel } from '../core/levelValidation';
import { exitRay } from '../core/PathChecker';
import { analyzeLevel, findSolution } from '../core/solver';
import { STARTING_LIVES } from '../core/types';
import { isSelfTouching } from '../levelgen/generateLevel';
import { challengePool } from '../league/challenges';
import { ProgressStorage, STORAGE_KEY } from '../progress/ProgressStorage';
import { isUnlocked } from '../progress/Progress';
import { firstFreeArrow } from '../testing/play';
import { MemoryStore } from '../testing/memoryStore';
import { getLevel, LEVELS } from './index';

/**
 * Level 94, THE IMPOSSIBLE GRID: built as the Level 31 experiment (a stress
 * test of the engine), now one of the very hard levels of chapter 5. It must
 * still be fair: valid, solvable, and completable without losing a life.
 */
const level = getLevel(94)!;
const report = analyzeDifficulty(level, { lives: false });
const graph = dependencyGraph(level);
/** Depths of every normal and hard level (computed once: analysing 90 levels is the slow part). */
const otherDepths = LEVELS.filter((l) => l.tier !== 'very hard').map((l) => analyzeDifficulty(l, { lives: false }).exact.depth);

describe('Level 94 — THE IMPOSSIBLE GRID', () => {
  it('exists exactly once, as a very hard level with its name', () => {
    expect(LEVELS.filter((l) => l.name === 'THE IMPOSSIBLE GRID')).toHaveLength(1);
    expect(LEVELS[93]).toBe(level);
    expect(level).toMatchObject({ id: 94, name: 'THE IMPOSSIBLE GRID', tier: 'very hard' });
  });

  it('no longer uses the silhouette experiment: no shape masks, and every cell of the board is used', () => {
    expect(existsSync(new URL('./shapes', import.meta.url))).toBe(false);
    expect(readFileSync(new URL('./level94.ts', import.meta.url), 'utf8')).not.toMatch(/fox|silhouette|shapes/i);
    expect(report.exact.density).toBe(1);
  });

  it('is a large, dense board: 30×24 with 150–250 arrows', () => {
    expect([level.rows, level.cols]).toEqual([30, 24]);
    expect(level.arrows.length).toBeGreaterThanOrEqual(150);
    expect(level.arrows.length).toBeLessThanOrEqual(250);
  });

  it('has no illegal geometry: no overlaps, nothing off the board, no arrow folded against itself', () => {
    const cells = level.arrows.flatMap((a) => a.cells.map((c) => `${c.row},${c.col}`));
    expect(new Set(cells).size).toBe(cells.length);
    for (const a of level.arrows) {
      for (const c of a.cells) expect(c.row >= 0 && c.row < level.rows && c.col >= 0 && c.col < level.cols).toBe(true);
      expect(isSelfTouching(a.cells), `arrow ${a.id}`).toBe(false);
    }
    expect(report.exact.ambiguousJoins).toBe(0);
    expect(() => validateLevel(level)).not.toThrow();
  });

  it('mixes short, medium and long arrows', () => {
    const lengths = level.arrows.map((a) => a.cells.length);
    expect(lengths.filter((n) => n <= 3).length).toBeGreaterThan(20);
    expect(lengths.filter((n) => n >= 4 && n <= 5).length).toBeGreaterThan(20);
    expect(lengths.filter((n) => n >= 6).length).toBeGreaterThan(10);
    expect(Math.min(...lengths)).toBeGreaterThanOrEqual(2);
  });

  it('is solvable: every arrow leaves in the solver order, and the opening has a valid move', () => {
    const solution = findSolution(level);
    expect(solution).not.toBeNull();
    expect(new Set(solution)).toEqual(new Set(level.arrows.map((a) => a.id)));
    const stats = analyzeLevel(level)!;
    expect(stats.initialFree).toBeGreaterThanOrEqual(1);
  });

  it('is far deeper and more tangled than any normal or hard level', () => {
    expect(report.exact.depth).toBeGreaterThanOrEqual(50);
    expect(report.exact.depth).toBeGreaterThan(Math.max(...otherDepths));
    expect(report.exact.initialFree).toBeLessThanOrEqual(10); // few ways in: the opening is a search
    expect(report.exact.blockingRelations).toBeGreaterThan(5 * level.arrows.length);
    expect(['Hard', 'Very hard']).toContain(report.category);
  });

  it('is one interconnected puzzle with a long critical chain and decoys that grow as play goes on', () => {
    expect(graph.groups).toBe(1);
    expect(graph.largestGroup).toBe(level.arrows.length);
    expect(graph.criticalPath).toHaveLength(report.exact.depth);
    expect(graph.links).toBe(report.exact.blockingRelations);
    // Each arrow on the critical chain stands on the next one's exit line.
    const byId = new Map(level.arrows.map((a) => [a.id, a]));
    for (let i = 1; i < graph.criticalPath.length; i++) {
      const before = new Set(byId.get(graph.criticalPath[i - 1])!.cells.map(cellKey));
      const next = byId.get(graph.criticalPath[i])!;
      expect(exitRay(headOf(next), next.direction, level.rows, level.cols).some((c) => before.has(cellKey(c))), next.id).toBe(true);
    }
    const early = graph.decoyShareByWave.slice(0, 5);
    const middle = graph.decoyShareByWave.slice(10, 40);
    expect(Math.max(...middle)).toBeGreaterThan(Math.max(...early));
  });

  it('can be completed without losing a life (3 stars), playing slowly so no streak bonus fires', () => {
    const state = new GameState(level, { clock: () => 0 });
    findSolution(level)!.forEach((id, n) => expect(state.tryMove(id, n * 5000).kind).toBe('cleared'));
    expect(state.snapshot()).toMatchObject({ status: 'won', lives: STARTING_LIVES, stars: 3, mistakes: 0, bonusClears: 0, remaining: 0 });
  });

  it('keeps streak bonuses working: fast careful play earns bonuses and still wins with 3 lives', () => {
    const state = new GameState(level, { clock: () => 0 });
    for (let n = 0; state.isPlaying; n++) state.tryMove(firstFreeArrow(state)!, n * 100);
    const s = state.snapshot();
    expect(s).toMatchObject({ status: 'won', lives: STARTING_LIVES, mistakes: 0 });
    expect(s.bonusClears).toBeGreaterThan(0);
    expect(s.directClears + s.bonusClears + s.autoClears).toBe(level.arrows.length);
  });

  it('keeps chain reactions working: a mistake on the deepest arrow costs one life, then it leaves on its own', () => {
    const state = new GameState(level, { clock: () => 0 });
    const deepest = graph.criticalPath.at(-1)!;
    const first = state.tryMove(deepest, 0);
    expect(first).toMatchObject({ kind: 'blocked', lifeLost: true, failed: false });
    expect(state.isActivated(deepest)).toBe(true);
    for (let n = 1; state.isPlaying; n++) state.tryMove(firstFreeArrow(state)!, n * 5000);
    const s = state.snapshot();
    expect(s).toMatchObject({ status: 'won', lives: STARTING_LIVES - 1, stars: 2 });
    expect(s.autoClears).toBeGreaterThanOrEqual(1);
    expect(state.has(deepest)).toBe(false);
  });

  it('fails after three mistakes, and a restart brings back the full board', () => {
    const state = new GameState(level, { clock: () => 0 });
    let blocked = 0;
    for (const a of level.arrows) {
      if (!state.isPlaying) break;
      if (state.tryMove(a.id, 0).kind === 'blocked') blocked++;
    }
    expect(blocked).toBe(STARTING_LIVES);
    expect(state.snapshot()).toMatchObject({ status: 'failed', lives: 0 });
    state.reset();
    expect(state.snapshot()).toMatchObject({ status: 'playing', lives: STARTING_LIVES, remaining: level.arrows.length, activated: 0 });
  });

  it('stays out of the Daily League pool (too big for a quick challenge)', () => {
    expect(challengePool(LEVELS).some((l) => l.id === 94)).toBe(false);
  });

  it('opens once Level 93 is done, without touching earlier records', () => {
    const completed: Record<number, unknown> = {};
    for (let id = 1; id <= 93; id++) completed[id] = { bestMoves: 10, revision: LEVELS[id - 1].revision ?? 1, bestStars: 3, bestMistakes: 0, bestTimeMs: 50_000 + id };
    const store = new MemoryStore();
    store.setItem(STORAGE_KEY, JSON.stringify({ version: 4, highestUnlocked: 93, completed }));
    const progress = new ProgressStorage(LEVELS.length, store).load();
    expect(isUnlocked(progress, 94)).toBe(true);
    expect(progress.completed[94]).toBeUndefined();
    for (let id = 1; id <= 93; id++) expect(progress.completed[id]).toMatchObject({ bestStars: 3, bestTimeMs: 50_000 + id });
  });
});
