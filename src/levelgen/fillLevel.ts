import { cellKey, directionBetween, DIRECTION_VECTORS, step } from '../core/Arrow';
import { analyzeDifficulty, countAmbiguousJoins, type DifficultyReport } from '../core/difficulty';
import { createRandom, mixSeed, randomInt, type Random } from '../core/random';
import { findSolution } from '../core/solver';
import type { ArrowData, Cell, Direction, LevelData } from '../core/types';
import { levelFromMap, levelToMap } from '../levels/levelMap';
import { isPlayable, isSelfTouching, layoutSimilarity, relabel, type GenerateResult } from './generateLevel';

/*
 * Fill-first level generator (developer tool, never used during play).
 *
 * generateLevel() places arrows one by one in reverse solving order, which
 * guarantees solvability but stalls at about 75 % coverage: every new arrow
 * needs a clear exit line, and on a crowded board almost none is left.
 *
 * This generator works the other way round:
 *  1. Cover the whole board with long, winding, non-touching paths (a random
 *     path partition that always extends into the most constrained free
 *     cell, so few cells are stranded). Short leftovers are merged into a
 *     neighbouring path where that keeps it a clean path.
 *  2. Pick a head for every path (either end, pointing the way the path
 *     ends), preferring heads that point into the board, so most arrows
 *     start blocked.
 *  3. Repair: while the level is unsolvable (a set of arrows block each
 *     other) or two arrows read as one, flip a head or split an arrow,
 *     choosing among the arrows involved. Every repair keeps the board
 *     fully covered.
 *  4. Measure it with analyzeDifficulty() and keep it if it fits the
 *     requested score, depth and opening; otherwise flip heads to steer the
 *     score (only edits that stay solvable and readable), or try again.
 *
 * Cells are left empty only when a stranded single cell can't join any path
 * (rare), so coverage is typically 100 % and never below `minCoverage`.
 */

export interface FillOptions {
  readonly rows: number;
  readonly cols: number;
  readonly seed: number;
  readonly id?: number;
  readonly minScore: number;
  readonly maxScore: number;
  /** Accepted dependency depth (waves), inclusive. */
  readonly depth?: readonly [number, number];
  /** Most arrows free at the start. */
  readonly maxInitialFree?: number;
  /** Shortest arrow wanted; shorter leftovers are merged where possible (default 3). */
  readonly minLength?: number;
  /** Longest arrow (default 9). */
  readonly maxLength?: number;
  /** Most right-angle turns per arrow (default 4). */
  readonly maxTurns?: number;
  /** Chance of turning at each step while drawing a path (default 0.45). */
  readonly turnChance?: number;
  /** Longest straight run inside an arrow before it must turn, where it can (default 4). */
  readonly maxStraight?: number;
  /** Highest share of arrows shorter than `minLength` accepted (default 1). */
  readonly maxShortShare?: number;
  /** Lowest average arrow length accepted (default 0). */
  readonly minMeanLength?: number;
  /** Lowest share of covered cells accepted (default 0.97). */
  readonly minCoverage?: number;
  /** Attempts (different partitions) before giving up (default 60). */
  readonly attempts?: number;
  /** Head-flip edits used to steer the score per attempt (default 200). */
  readonly refineSteps?: number;
  readonly avoid?: readonly LevelData[];
  readonly similarityLimit?: number;
}

type Path = readonly Cell[];

const DIRS: readonly Direction[] = ['up', 'down', 'left', 'right'];
const SEARCH_ONLY = { lives: false } as const;

export function fillLevel(options: FillOptions): GenerateResult {
  const attempts = options.attempts ?? 60;
  const minCoverage = options.minCoverage ?? 0.97;
  const scoreGap = (r: DifficultyReport) =>
    r.score < options.minScore ? options.minScore - r.score : r.score > options.maxScore ? r.score - options.maxScore : 0;
  const depthGap = (r: DifficultyReport) =>
    options.depth ? Math.max(0, options.depth[0] - r.exact.depth, r.exact.depth - options.depth[1]) : 0;
  const freeGap = (r: DifficultyReport) => Math.max(0, r.exact.initialFree - (options.maxInitialFree ?? Infinity));
  const gapFor = (r: DifficultyReport) => scoreGap(r) + depthGap(r) * 2 + freeGap(r) * 2;
  const tooShort = (level: LevelData) =>
    coverage(level) * level.rows * level.cols < (options.minMeanLength ?? 0) * level.arrows.length ||
    level.arrows.filter((a) => a.cells.length < (options.minLength ?? 3)).length > (options.maxShortShare ?? 1) * level.arrows.length;
  const isNovel = (level: LevelData) => !options.avoid?.some((o) => layoutSimilarity(level, o) > (options.similarityLimit ?? 0.6));
  let closest: { gap: number; score: number } | null = null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const random = createRandom(mixSeed(options.seed, attempt, 0xf111));
    const arrows = buildFilled(random, options);
    if (!arrows) continue;
    let level = relabel({ id: options.id ?? 0, rows: options.rows, cols: options.cols, arrows });
    if (coverage(level) < minCoverage || tooShort(level) || !isPlayable(level) || !isNovel(level)) continue;

    let report = analyzeDifficulty(asLoaded(level), SEARCH_ONLY);
    // Steer the score with head flips that keep the level solvable and readable.
    for (let i = 0; i < (options.refineSteps ?? 200) && gapFor(report) > 0; i++) {
      const edited = flipRandom(level, random);
      if (!edited || !isPlayable(edited) || !isNovel(edited)) continue;
      const editedReport = analyzeDifficulty(asLoaded(edited), SEARCH_ONLY);
      if (gapFor(editedReport) <= gapFor(report)) {
        level = edited;
        report = editedReport;
      }
    }
    const gap = gapFor(report);
    if (gap === 0) return { ok: true, level, report, attempt };
    if (closest === null || gap < closest.gap) closest = { gap, score: report.score };
  }
  return {
    ok: false,
    reason: `no filled ${options.rows}×${options.cols} level scored ${options.minScore}–${options.maxScore} in ${attempts} attempts (closest score ${closest?.score ?? 'none'})`,
    attempts,
    closestScore: closest?.score ?? null,
  };
}

/**
 * The level exactly as the game will load it from its level file (written
 * with levelToMap, read with levelFromMap, which can reorder arrows on large
 * boards). Arrow order changes the simulated part of the score, so every
 * report is measured on this.
 */
function asLoaded(level: LevelData): LevelData {
  return levelFromMap(level.id, levelToMap(level));
}

/** Share of grid cells covered by arrows (0..1). */
export function coverage(level: LevelData): number {
  return level.arrows.reduce((n, a) => n + a.cells.length, 0) / (level.rows * level.cols);
}

// ---------------------------------------------------------------- building

function buildFilled(random: Random, o: FillOptions): ArrowData[] | null {
  const minLength = o.minLength ?? 3;
  const maxLength = o.maxLength ?? 9;
  const paths = partition(random, o.rows, o.cols, minLength, maxLength, o.maxTurns ?? 4, o.turnChance ?? 0.45, o.maxStraight ?? 4);
  mergeShort(paths, minLength, maxLength + 2, (o.maxTurns ?? 4) + 1);
  absorbSingles(paths);

  // Heads: either end; prefer pointing into the board (a longer exit line is blocked by more).
  let arrows: ArrowData[] = [];
  for (const path of paths) {
    if (path.length === 1) continue; // a stranded single cell stays empty
    const options = orientations(path, o.rows, o.cols);
    if (options.length === 0) {
      // Both ends point back into the path: split it into two arrows.
      for (const part of splitPath(path)) {
        const parts = orientations(part, o.rows, o.cols);
        if (parts.length > 0) arrows.push(pickInward(parts, o.rows, o.cols, random));
      }
      continue;
    }
    arrows.push(pickInward(options, o.rows, o.cols, random));
  }
  arrows = arrows.map((a, i) => ({ ...a, id: `#${i}` }));

  // Repair until solvable and readable, keeping every cell covered.
  for (let round = 0; round < 400; round++) {
    const stuck = stuckArrows(o.rows, o.cols, arrows);
    const joins = stuck.length === 0 ? joinedArrows(o.rows, o.cols, arrows) : [];
    if (stuck.length === 0 && joins.length === 0) return consolidate(arrows, o, minLength, maxLength + 2, random);
    const pool = stuck.length > 0 ? stuck : joins;
    const target = pool[Math.floor(random() * pool.length)];
    const index = arrows.findIndex((a) => a.id === target);
    const arrow = arrows[index];
    const flipped = flip(arrow, o.rows, o.cols);
    // Flipping keeps arrows long; split only now and then (or when a flip is impossible).
    if (flipped && random() < 0.9) {
      arrows[index] = flipped;
      continue;
    }
    if (arrow.cells.length >= 4) {
      const parts = splitPath(arrow.cells)
        .map((p) => orientations(p, o.rows, o.cols))
        .filter((opts) => opts.length > 0)
        .map((opts) => pickInward(opts, o.rows, o.cols, random));
      if (parts.length === 2) {
        arrows.splice(index, 1, { ...parts[0], id: `${arrow.id}a` }, { ...parts[1], id: `${arrow.id}b` });
        continue;
      }
    }
    if (flipped) arrows[index] = flipped;
  }
  return null;
}

/**
 * Merges arrows shorter than `minLength` into a neighbouring arrow (end to
 * end, as one clean path), keeping a merge only if the level stays solvable
 * and readable. Coverage is unchanged; there are just fewer, longer arrows.
 */
function consolidate(arrows: ArrowData[], o: FillOptions, minLength: number, maxLength: number, random: Random): ArrowData[] {
  const ok = (list: readonly ArrowData[]) =>
    findSolution({ id: 0, rows: o.rows, cols: o.cols, arrows: list }) !== null && countAmbiguousJoins({ id: 0, rows: o.rows, cols: o.cols, arrows: list }) === 0;
  for (let changed = true; changed; ) {
    changed = false;
    for (const short of arrows.filter((a) => a.cells.length < minLength)) {
      const others = arrows.filter((a) => a !== short && a.cells.length + short.cells.length <= maxLength);
      for (const other of others) {
        const joined = joinPaths(other.cells, short.cells);
        if (!joined || isSelfTouching(joined) || countPathTurns(joined) > (o.maxTurns ?? 4) + 1) continue;
        const candidates = orientations(joined, o.rows, o.cols);
        if (random() < 0.5) candidates.reverse();
        const merged = candidates
          .map((c) => arrows.filter((a) => a !== short && a !== other).concat({ ...c, id: other.id }))
          .find(ok);
        if (merged) {
          arrows = merged;
          changed = true;
          break;
        }
      }
      if (changed) break;
    }
  }
  return arrows;
}

/**
 * Covers the grid with simple, non-self-touching paths. Each path starts in
 * the free cell with the fewest free neighbours and always continues into
 * the most constrained neighbour (ties broken randomly, turns by chance), so
 * corners and narrow gaps are used up first and few cells are stranded.
 */
function partition(
  random: Random,
  rows: number,
  cols: number,
  minLength: number,
  maxLength: number,
  maxTurns: number,
  turnChance: number,
  maxStraight: number,
): Path[] {
  const free = new Set<string>();
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) free.add(cellKey({ row: r, col: c }));
  const inside = (c: Cell) => c.row >= 0 && c.row < rows && c.col >= 0 && c.col < cols;
  const freeNeighbours = (c: Cell) => DIRS.map((d) => step(c, d)).filter((n) => inside(n) && free.has(cellKey(n))).length;
  const paths: Path[] = [];

  while (free.size > 0) {
    let start: Cell | null = null;
    let best = Infinity;
    for (const key of free) {
      const [row, col] = key.split(',').map(Number);
      const cell = { row, col };
      const score = freeNeighbours(cell) + random() * 0.5;
      if (score < best) {
        best = score;
        start = cell;
      }
    }
    const path: Cell[] = [start!];
    free.delete(cellKey(start!));
    const target = randomInt(random, minLength, maxLength);
    let heading: Direction | null = null;
    let turns = 0;
    let run = 0;
    while (path.length < target) {
      const at = path[path.length - 1];
      const options = DIRS.filter((d) => {
        const n = step(at, d);
        if (!inside(n) || !free.has(cellKey(n))) return false;
        if (heading !== null && d !== heading && turns >= maxTurns) return false;
        // Stay a clean path: the new cell may touch only the cell it extends.
        return path.slice(0, -1).every((p) => Math.abs(p.row - n.row) + Math.abs(p.col - n.col) !== 1);
      });
      if (options.length === 0) break;
      // Keep going straight by chance, but never longer than maxStraight when a turn is possible.
      const mustTurn = run >= maxStraight && options.some((d) => d !== heading);
      const straight: Direction | null = heading !== null && !mustTurn && options.includes(heading) && random() > turnChance ? heading : null;
      const chosen: Direction =
        straight ??
        options
          .filter((d) => !mustTurn || d !== heading)
          .map((d) => ({ d, w: freeNeighbours(step(at, d)) + random() * 1.5 }))
          .sort((a, b) => a.w - b.w)[0].d;
      if (heading !== null && chosen !== heading) turns++;
      run = chosen === heading ? run + 1 : 1;
      heading = chosen;
      const next = step(at, chosen);
      path.push(next);
      free.delete(cellKey(next));
    }
    paths.push(path);
  }
  return paths;
}

/** Joins paths shorter than `minLength` onto a neighbouring path's end where the result stays a clean path. */
function mergeShort(paths: Path[], minLength: number, maxLength: number, maxTurns: number): void {
  for (let changed = true; changed; ) {
    changed = false;
    for (let i = 0; i < paths.length && !changed; i++) {
      const short = paths[i];
      if (short.length >= minLength) continue;
      for (let j = 0; j < paths.length && !changed; j++) {
        if (i === j) continue;
        const joined = joinPaths(paths[j], short);
        if (joined && joined.length <= maxLength && countPathTurns(joined) <= maxTurns && !isSelfTouching(joined)) {
          paths[j] = joined;
          paths.splice(i, 1);
          changed = true;
        }
      }
    }
  }
}

/**
 * A stranded single cell next to the middle of a path: split that path there
 * and attach the cell to one of the halves, so the board stays fully covered
 * with clean paths of at least 2 cells.
 */
function absorbSingles(paths: Path[]): void {
  const adjacent = (x: Cell, y: Cell) => Math.abs(x.row - y.row) + Math.abs(x.col - y.col) === 1;
  for (let i = paths.length - 1; i >= 0; i--) {
    if (paths[i].length !== 1) continue;
    const single = paths[i][0];
    found: for (let j = 0; j < paths.length; j++) {
      const path = paths[j];
      if (j === i || path.length < 3) continue;
      for (let k = 0; k < path.length; k++) {
        if (!adjacent(path[k], single)) continue;
        // Either [..k] + single and [k+1..], or [..k-1] and single + [k..].
        const options: [Cell[], Cell[]][] = [
          [[...path.slice(0, k + 1), single], path.slice(k + 1)],
          [path.slice(0, k), [single, ...path.slice(k)]],
        ];
        for (const [a, b] of options) {
          if (a.length < 2 || b.length < 2 || isSelfTouching(a) || isSelfTouching(b)) continue;
          paths.splice(j, 1, a, b);
          paths.splice(i < j ? i : i + 1, 1);
          break found;
        }
      }
    }
  }
}

/** `a` and `b` joined end to end in whichever order makes them one path, or null. */
function joinPaths(a: Path, b: Path): Cell[] | null {
  const adjacent = (x: Cell, y: Cell) => Math.abs(x.row - y.row) + Math.abs(x.col - y.col) === 1;
  const ra = [...a].reverse();
  const rb = [...b].reverse();
  for (const [x, y] of [[a, b], [a, rb], [ra, b], [ra, rb]] as const) {
    if (adjacent(x[x.length - 1], y[0])) return [...x, ...y];
  }
  return null;
}

function countPathTurns(path: Path): number {
  let turns = 0;
  for (let i = 2; i < path.length; i++) {
    if (directionBetween(path[i - 2], path[i - 1]) !== directionBetween(path[i - 1], path[i])) turns++;
  }
  return turns;
}

/** Two halves of a path, split near the middle. */
function splitPath(path: Path): [Path, Path] {
  const cut = Math.ceil(path.length / 2);
  return [path.slice(0, cut), path.slice(cut)];
}

/** The arrows a path can become: a head at either end that doesn't point back into its own body. */
function orientations(path: Path, rows: number, cols: number): ArrowData[] {
  if (path.length < 2) return [];
  const out: ArrowData[] = [];
  for (const cells of [path, [...path].reverse()]) {
    const direction = directionBetween(cells[cells.length - 2], cells[cells.length - 1])!;
    const own = new Set(cells.map(cellKey));
    let ok = true;
    for (let c = step(cells[cells.length - 1], direction); c.row >= 0 && c.row < rows && c.col >= 0 && c.col < cols; c = step(c, direction)) {
      if (own.has(cellKey(c))) ok = false;
    }
    if (ok) out.push({ id: '', direction, cells });
  }
  return out;
}

function exitLength(arrow: ArrowData, rows: number, cols: number): number {
  const head = arrow.cells[arrow.cells.length - 1];
  const v = DIRECTION_VECTORS[arrow.direction];
  let n = 0;
  for (let r = head.row + v.dRow, c = head.col + v.dCol; r >= 0 && r < rows && c >= 0 && c < cols; r += v.dRow, c += v.dCol) n++;
  return n;
}

/** Usually the orientation pointing deeper into the board (longer exit line), sometimes the other. */
function pickInward(options: ArrowData[], rows: number, cols: number, random: Random): ArrowData {
  if (options.length === 1) return options[0];
  const [a, b] = options;
  const deeper = exitLength(a, rows, cols) >= exitLength(b, rows, cols) ? a : b;
  return random() < 0.75 ? deeper : deeper === a ? b : a;
}

/** The same path with the head at the other end, if that end may be a head. */
function flip(arrow: ArrowData, rows: number, cols: number): ArrowData | null {
  const head = cellKey(arrow.cells[arrow.cells.length - 1]);
  const other = orientations(arrow.cells, rows, cols).find((o) => cellKey(o.cells[o.cells.length - 1]) !== head);
  return other ? { ...other, id: arrow.id } : null;
}

/** Flips one random arrow's head (a score-steering edit); null if that arrow can't be flipped. */
function flipRandom(level: LevelData, random: Random): LevelData | null {
  const index = Math.floor(random() * level.arrows.length);
  const flipped = flip(level.arrows[index], level.rows, level.cols);
  if (!flipped) return null;
  const arrows = [...level.arrows];
  arrows[index] = flipped;
  return { ...level, arrows };
}

/** Ids of arrows still on the board when greedy solving gets stuck (empty if solvable). */
function stuckArrows(rows: number, cols: number, arrows: readonly ArrowData[]): string[] {
  const level = { id: 0, rows, cols, arrows };
  if (findSolution(level) !== null) return [];
  // Replay the greedy solver to find what is left.
  const remaining = new Map(arrows.map((a) => [a.id, a]));
  const owner = new Map<string, string>();
  for (const a of arrows) for (const c of a.cells) owner.set(cellKey(c), a.id);
  for (let progress = true; progress; ) {
    progress = false;
    for (const a of remaining.values()) {
      const head = a.cells[a.cells.length - 1];
      let clear = true;
      for (let c = step(head, a.direction); c.row >= 0 && c.row < rows && c.col >= 0 && c.col < cols; c = step(c, a.direction)) {
        const id = owner.get(cellKey(c));
        if (id !== undefined && id !== a.id && remaining.has(id)) {
          clear = false;
          break;
        }
      }
      if (clear) {
        remaining.delete(a.id);
        progress = true;
      }
    }
  }
  return [...remaining.keys()];
}

/** Ids of arrows involved in a head-to-head or tail-to-tail join (they read as one arrow). */
function joinedArrows(rows: number, cols: number, arrows: readonly ArrowData[]): string[] {
  if (countAmbiguousJoins({ id: 0, rows, cols, arrows }) === 0) return [];
  return arrows
    .filter((a) => countAmbiguousJoins({ id: 0, rows, cols, arrows: arrows.filter((b) => b.id !== a.id) }) < countAmbiguousJoins({ id: 0, rows, cols, arrows }))
    .map((a) => a.id);
}
