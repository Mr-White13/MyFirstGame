import { arrow as makeArrow, cellKey, DIRECTION_VECTORS, step } from '../core/Arrow';
import { analyzeDifficulty, countAmbiguousJoins, type DifficultyReport } from '../core/difficulty';
import { validateLevel } from '../core/levelValidation';
import { createRandom, mixSeed, randomInt, type Random } from '../core/random';
import type { ArrowData, Cell, Direction, LevelData } from '../core/types';
import { arrowLabel, MAX_MAP_ARROWS } from '../levels/levelMap';

/*
 * Offline level generator (developer tool, never used during play).
 *
 * Arrows are placed in reverse solving order: each new arrow is one the player
 * will be able to clear *before* everything already placed, so its exit line
 * must be clear of all existing arrows. Its body, however, may sit on the
 * exit lines of existing arrows, which is what creates blocking chains. A
 * level built this way is solvable by construction (clear arrows in reverse
 * placement order); validateLevel() double-checks it anyway.
 *
 * Difficulty is steered by how strongly placement prefers spots that block
 * many existing arrows, then measured with analyzeDifficulty(). Candidates
 * outside the requested score range are rejected and another attempt is made,
 * up to a fixed budget.
 *
 * Constructive placement alone rarely reaches the hardest scores, so the few
 * closest candidates then go through a bounded refinement: random local edits
 * (swap, add or remove one arrow) that are kept only if the level stays valid,
 * solvable and readable and its score moves towards the target range.
 */

export interface GenerateOptions {
  readonly rows: number;
  readonly cols: number;
  /** Accepted difficulty score range, inclusive (0..100). */
  readonly minScore: number;
  readonly maxScore: number;
  readonly seed: number;
  /** Id given to the generated level. */
  readonly id?: number;
  /** Arrow count range; defaults scale with the grid size. */
  readonly arrows?: { readonly min: number; readonly max: number };
  /** Longest arrow, in cells (≥ 2). */
  readonly maxLength?: number;
  /** Most right-angle turns per arrow (0 = straight arrows only). */
  readonly maxTurns?: number;
  /** Generation attempts before giving up. */
  readonly attempts?: number;
  /** Existing levels to stay away from (near-duplicates are rejected). */
  readonly avoid?: readonly LevelData[];
  /** Highest allowed layout similarity (0..1) to any level in `avoid`. */
  readonly similarityLimit?: number;
  /** Local-edit steps per refined candidate (0 disables refinement). */
  readonly refineSteps?: number;
  /** Chance (0..1) of turning at each eligible step: higher gives more winding arrows (default 0.35). */
  readonly turnChance?: number;
  /**
   * Upper bound on difficulty analyses (the expensive part), across attempts
   * and refinement. Keeps large grids from running for minutes. Deterministic,
   * unlike a time limit. Default 1200.
   */
  readonly workBudget?: number;
  /**
   * Most arrows that may be free at the start. Larger boards naturally have
   * many easy first moves; capping this keeps their opening a real search.
   */
  readonly maxInitialFree?: number;
}

export type GenerateResult =
  | {
      readonly ok: true;
      readonly level: LevelData;
      readonly report: DifficultyReport;
      /** Attempt (0-based) that produced the level; with the seed, enough to reproduce it. */
      readonly attempt: number;
    }
  | {
      readonly ok: false;
      readonly reason: string;
      readonly attempts: number;
      /** Score of the closest candidate that was otherwise acceptable, if any. */
      readonly closestScore: number | null;
    };

const DIRECTIONS: readonly Direction[] = ['up', 'down', 'left', 'right'];
/** Candidate arrows tried per placement: more on larger boards, where most random walks don't fit. */
const candidatesFor = (rows: number, cols: number) => Math.max(100, Math.round((rows * cols) / 2));
/** The generator steers by the search score only; the lives simulation would just slow it down. */
const SEARCH_ONLY = { lives: false } as const;
/** How many of the closest constructive candidates get refined. */
const REFINE_CANDIDATES = 4;

export function defaultArrowRange(rows: number, cols: number): { min: number; max: number } {
  const cells = rows * cols;
  return { min: Math.round(cells / 6), max: Math.min(MAX_MAP_ARROWS, Math.round(cells / 3.6)) };
}

export function generateLevel(options: GenerateOptions): GenerateResult {
  const attempts = options.attempts ?? 300;
  const range = options.arrows ?? defaultArrowRange(options.rows, options.cols);
  if (options.rows < 3 || options.cols < 3) return failure('grid must be at least 3×3', 0, null);
  if (options.minScore > options.maxScore) return failure('minScore is greater than maxScore', 0, null);
  if (range.min > range.max || range.max > MAX_MAP_ARROWS) return failure('invalid arrow count range', 0, null);
  let work = options.workBudget ?? 1200;

  let closest: { score: number; gap: number } | null = null;
  let rejectedInvalid = 0;
  let rejectedSimilar = 0;
  const scoreGap = (score: number) =>
    score < options.minScore ? options.minScore - score : score > options.maxScore ? score - options.maxScore : 0;
  // Too many free arrows at the start counts as distance from the target too, so refinement can fix it.
  const freeGap = (report: DifficultyReport) => Math.max(0, report.exact.initialFree - (options.maxInitialFree ?? Infinity)) * 2;
  const gapFor = (report: DifficultyReport) => scoreGap(report.score) + freeGap(report);
  const nearMisses: { level: LevelData; report: DifficultyReport; attempt: number; gap: number }[] = [];
  const isNovel = (level: LevelData) =>
    !options.avoid?.some((other) => layoutSimilarity(level, other) > (options.similarityLimit ?? 0.6));

  for (let attempt = 0; attempt < attempts && work > 0; attempt++) {
    const random = createRandom(mixSeed(options.seed, attempt));
    const level = buildCandidate(random, options, range);
    if (!level) continue;

    try {
      validateLevel(level);
    } catch {
      rejectedInvalid++; // shouldn't happen by construction, but never trust a generator blindly
      continue;
    }
    if (!isNovel(level)) {
      rejectedSimilar++;
      continue;
    }

    const report = analyzeDifficulty(level, SEARCH_ONLY);
    work--;
    const gap = gapFor(report);
    if (gap === 0) return { ok: true, level, report, attempt };
    if (!closest || gap < closest.gap) closest = { score: report.score, gap };
    nearMisses.push({ level, report, attempt, gap });
    nearMisses.sort((a, b) => a.gap - b.gap);
    nearMisses.length = Math.min(nearMisses.length, REFINE_CANDIDATES);
  }

  // Refinement: nudge the closest candidates towards the target range.
  const steps = options.refineSteps ?? 500;
  for (const miss of steps > 0 ? nearMisses : []) {
    const random = createRandom(mixSeed(options.seed, miss.attempt, 0x7e1));
    let level = miss.level;
    let report = miss.report;
    for (let i = 0; i < steps && gapFor(report) > 0 && work > 0; i++) {
      const edited = mutate(level, random, options, range);
      if (!edited || !isPlayable(edited) || !isNovel(edited)) continue;
      const editedReport = analyzeDifficulty(edited, SEARCH_ONLY);
      work--;
      // Accept equal scores too, so the search can drift across plateaus.
      if (gapFor(editedReport) <= gapFor(report)) {
        level = edited;
        report = editedReport;
      }
    }
    if (gapFor(report) === 0) return { ok: true, level, report, attempt: miss.attempt };
    if (!closest || gapFor(report) < closest.gap) closest = { score: report.score, gap: gapFor(report) };
  }

  const details = [
    closest ? `closest score was ${closest.score}` : 'no complete candidate was built',
    rejectedInvalid ? `${rejectedInvalid} invalid` : '',
    rejectedSimilar ? `${rejectedSimilar} too similar to existing levels` : '',
  ].filter(Boolean);
  return failure(
    `no ${options.rows}×${options.cols} level scored ${options.minScore}–${options.maxScore} in ${attempts} attempts (${details.join(', ')}). ` +
      'Try a wider score range, another seed, more attempts, or a different arrow count.',
    attempts,
    closest?.score ?? null,
  );
}

function failure(reason: string, attempts: number, closestScore: number | null): GenerateResult {
  return { ok: false, reason, attempts, closestScore };
}

// ---------------------------------------------------------------- refinement

/** Valid, solvable and readable: no arrows that read as one, none that touch themselves. */
function isPlayable(level: LevelData): boolean {
  try {
    validateLevel(level);
  } catch {
    return false;
  }
  return countAmbiguousJoins(level) === 0 && level.arrows.every((a) => !isSelfTouching(a.cells));
}

/**
 * True if two cells of an arrow that are not next to each other along its
 * path are side by side on the board. Such an arrow folds against itself
 * (a tight U or a spiral) and reads as a blob instead of a path. Wide U
 * shapes and winding paths with space between their parts are fine.
 */
export function isSelfTouching(cells: readonly Cell[]): boolean {
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 2; j < cells.length; j++) {
      if (Math.abs(cells[i].row - cells[j].row) + Math.abs(cells[i].col - cells[j].col) === 1) return true;
    }
  }
  return false;
}

/** One random local edit: replace, add or remove a single arrow. Returns null if the edit didn't fit. */
function mutate(
  level: LevelData,
  random: Random,
  options: GenerateOptions,
  range: { min: number; max: number },
): LevelData | null {
  const maxLength = Math.max(2, options.maxLength ?? 5);
  const maxTurns = Math.max(0, options.maxTurns ?? 2);
  const roll = random();
  let arrows = [...level.arrows];
  const canAdd = arrows.length < range.max;
  const canRemove = arrows.length > range.min;

  if (roll < 0.2 && canRemove) {
    arrows.splice(randomInt(random, 0, arrows.length - 1), 1);
  } else {
    if (roll < 0.75 || !canAdd) arrows.splice(randomInt(random, 0, arrows.length - 1), 1); // replace
    const occupied = new Set(arrows.flatMap((a) => a.cells.map(cellKey)));
    // A crowded board rejects most random walks, so give each edit a few tries.
    let fresh: ArrowData | null = null;
    for (let tries = 0; tries < 25 && !fresh; tries++) {
      fresh = randomArrow(random, level.rows, level.cols, maxLength, maxTurns, occupied, '#new', options.turnChance);
    }
    if (!fresh) return null;
    arrows = [...arrows, fresh];
  }
  return relabel({ ...level, arrows });
}

// ------------------------------------------------------------------ building

function buildCandidate(
  random: Random,
  options: GenerateOptions,
  range: { min: number; max: number },
): LevelData | null {
  const { rows, cols } = options;
  const maxLength = Math.max(2, options.maxLength ?? 5);
  const maxTurns = Math.max(0, options.maxTurns ?? 2);
  const target = randomInt(random, range.min, range.max);
  // Harder targets prefer spots that block more existing arrows.
  const greed = Math.max(0, Math.min(1.5, (options.minScore + options.maxScore) / 2 / 45));

  const occupied = new Set<string>();
  /** For each cell, the indices of placed arrows whose exit line passes through it. */
  const rayCover = new Map<string, number[]>();
  const placed: ArrowData[] = [];
  /** How many later-placed arrows sit on each placed arrow's exit line. 0 = free at the start. */
  const blockerCount: number[] = [];

  while (placed.length < target) {
    let best: { arrow: ArrowData; blocked: Set<number>; value: number } | null = null;
    const tries = candidatesFor(rows, cols);
    for (let i = 0; i < tries; i++) {
      // Half the candidates grow backwards from a head whose exit is already clear,
      // which keeps finding room on crowded boards where random walks rarely fit.
      const candidate =
        i % 2 === 0
          ? randomArrow(random, rows, cols, maxLength, maxTurns, occupied, `#${placed.length}`, options.turnChance)
          : headFirstArrow(random, rows, cols, maxLength, maxTurns, occupied, `#${placed.length}`, options.turnChance);
      if (!candidate || !exitIsClear(candidate, rows, cols, occupied)) continue;
      if (countAmbiguousJoins({ id: 0, rows, cols, arrows: [...placed, candidate] }) > 0) continue;

      const blocked = new Set<number>();
      for (const c of candidate.cells) rayCover.get(cellKey(c))?.forEach((index) => blocked.add(index));
      // Blocking an arrow that is still free matters most: it removes an easy
      // move from the start of the level. Blocking already-blocked arrows adds
      // depth and long-range links.
      let newlyBlocked = 0;
      blocked.forEach((index) => blockerCount[index] === 0 && newlyBlocked++);
      // An arrow pointing straight off an edge has an empty exit line and can
      // never be blocked by anything placed later; longer exit lines keep the
      // arrow "in play" for future placements.
      const exitRoom = Math.min(rayCells(candidate, rows, cols).length, 4);
      const value =
        (newlyBlocked * 4 + blocked.size + exitRoom * 0.5) * greed + random() + candidate.cells.length * 0.05;
      if (!best || value > best.value) best = { arrow: candidate, blocked, value };
    }
    if (!best) break; // the board is full enough that nothing else fits

    const index = placed.length;
    placed.push(best.arrow);
    blockerCount.push(0);
    best.blocked.forEach((i) => blockerCount[i]++);
    best.arrow.cells.forEach((c) => occupied.add(cellKey(c)));
    for (const c of rayCells(best.arrow, rows, cols)) {
      const list = rayCover.get(cellKey(c)) ?? [];
      list.push(index);
      rayCover.set(cellKey(c), list);
    }
  }
  if (placed.length < range.min) return null;

  return relabel({ id: options.id ?? 0, rows, cols, arrows: placed });
}

/** Gives arrows ids a, b, c… (then a0, b0…) in reading order (by head position) so maps stay easy to read. */
function relabel(level: LevelData): LevelData {
  const ordered = [...level.arrows].sort((a, b) => {
    const ha = a.cells[a.cells.length - 1];
    const hb = b.cells[b.cells.length - 1];
    return ha.row - hb.row || ha.col - hb.col;
  });
  const arrows = ordered.map((a, i) =>
    makeArrow(arrowLabel(i), a.direction, ...a.cells.map((c) => [c.row, c.col] as [number, number])),
  );
  return { ...level, arrows };
}

/**
 * A random self-avoiding walk of 2..maxLength cells with at most maxTurns
 * turns, on free cells, that never runs alongside itself (see isSelfTouching).
 */
function randomArrow(
  random: Random,
  rows: number,
  cols: number,
  maxLength: number,
  maxTurns: number,
  occupied: ReadonlySet<string>,
  /** Must be unique among the arrows it is checked against (e.g. for ambiguous joins). */
  id: string,
  turnChance = 0.35,
): ArrowData | null {
  const length = randomInt(random, 2, maxLength);
  let cell: Cell = { row: randomInt(random, 0, rows - 1), col: randomInt(random, 0, cols - 1) };
  if (occupied.has(cellKey(cell))) return null;
  const cells: Cell[] = [cell];
  const own = new Set([cellKey(cell)]);
  let direction = DIRECTIONS[randomInt(random, 0, 3)];
  let turns = 0;
  let justTurned = false;

  while (cells.length < length) {
    // Turn on roughly every third step, if turns are still allowed. Never twice
    // in a row: that folds the arrow into a U packed into a 2×2 square, which
    // reads as a blob rather than an arrow.
    if (cells.length > 1 && turns < maxTurns && !justTurned && random() < turnChance) {
      direction = turnOf(direction, random() < 0.5);
      turns++;
      justTurned = true;
    } else {
      justTurned = false;
    }
    const next = step(cell, direction);
    const key = cellKey(next);
    if (next.row < 0 || next.row >= rows || next.col < 0 || next.col >= cols || occupied.has(key) || own.has(key)) {
      return null;
    }
    // Running alongside an earlier part of itself (not the cell it came from).
    if (cells.slice(0, -1).some((c) => Math.abs(c.row - next.row) + Math.abs(c.col - next.col) === 1)) return null;
    cells.push(next);
    own.add(key);
    cell = next;
  }
  // The head points the way the last segment travels (required by validation).
  return makeArrow(id, direction, ...cells.map((c) => [c.row, c.col] as [number, number]));
}

/**
 * Like randomArrow, but built from the head backwards: a free cell and a
 * direction whose exit line is clear of every placed arrow, then a body
 * grown behind it. Same shape rules (turn spacing, no self-touching).
 */
function headFirstArrow(
  random: Random,
  rows: number,
  cols: number,
  maxLength: number,
  maxTurns: number,
  occupied: ReadonlySet<string>,
  id: string,
  turnChance = 0.35,
): ArrowData | null {
  const head: Cell = { row: randomInt(random, 0, rows - 1), col: randomInt(random, 0, cols - 1) };
  if (occupied.has(cellKey(head))) return null;
  const direction = DIRECTIONS[randomInt(random, 0, 3)];
  for (let c = step(head, direction); c.row >= 0 && c.row < rows && c.col >= 0 && c.col < cols; c = step(c, direction)) {
    if (occupied.has(cellKey(c))) return null;
  }
  const length = randomInt(random, 2, maxLength);
  // Walk backwards: the first step behind the head must continue the head's direction.
  const back: Cell[] = [head];
  const own = new Set([cellKey(head)]);
  let travel = direction; // direction of travel along the body (tail → head)
  let turns = 0;
  let justTurned = true; // the segment into the head must be straight
  while (back.length < length) {
    if (back.length > 1 && turns < maxTurns && !justTurned && random() < turnChance) {
      travel = turnOf(travel, random() < 0.5);
      turns++;
      justTurned = true;
    } else {
      justTurned = false;
    }
    const prev = step(back[back.length - 1], opposite(travel));
    const key = cellKey(prev);
    if (prev.row < 0 || prev.row >= rows || prev.col < 0 || prev.col >= cols || occupied.has(key) || own.has(key)) break;
    if (back.slice(0, -1).some((c) => Math.abs(c.row - prev.row) + Math.abs(c.col - prev.col) === 1)) break;
    back.push(prev);
    own.add(key);
  }
  if (back.length < 2) return null;
  const cells = back.reverse();
  // The body must not lie on its own exit line.
  for (let c = step(head, direction); c.row >= 0 && c.row < rows && c.col >= 0 && c.col < cols; c = step(c, direction)) {
    if (own.has(cellKey(c))) return null;
  }
  return makeArrow(id, direction, ...cells.map((c) => [c.row, c.col] as [number, number]));
}

function opposite(direction: Direction): Direction {
  return ({ up: 'down', down: 'up', left: 'right', right: 'left' } as const)[direction];
}

function turnOf(direction: Direction, clockwise: boolean): Direction {
  const order: Direction[] = ['up', 'right', 'down', 'left'];
  const i = order.indexOf(direction);
  return order[(i + (clockwise ? 1 : 3)) % 4];
}

function rayCells(arrow: ArrowData, rows: number, cols: number): Cell[] {
  const cells: Cell[] = [];
  const head = arrow.cells[arrow.cells.length - 1];
  for (let c = step(head, arrow.direction); c.row >= 0 && c.row < rows && c.col >= 0 && c.col < cols; c = step(c, arrow.direction)) {
    cells.push(c);
  }
  return cells;
}

/** The exit line must avoid every placed arrow (they are cleared later) and the arrow's own body. */
function exitIsClear(arrow: ArrowData, rows: number, cols: number, occupied: ReadonlySet<string>): boolean {
  const own = new Set(arrow.cells.map(cellKey));
  return rayCells(arrow, rows, cols).every((c) => !occupied.has(cellKey(c)) && !own.has(cellKey(c)));
}

// ---------------------------------------------------------------- similarity

/**
 * How alike two layouts are (0..1): the overlap of their (cell, direction)
 * tokens, taking the best match over rotations and mirror images when the
 * grids are square. 1 means identical up to symmetry.
 */
export function layoutSimilarity(a: LevelData, b: LevelData): number {
  if (a.rows * a.cols !== b.rows * b.cols) return 0;
  const tokensB = tokens(b.arrows);
  const square = a.rows === a.cols && b.rows === b.cols && a.rows === b.rows;
  const variants = square ? symmetries(a) : a.rows === b.rows ? [a.arrows] : [];
  let best = 0;
  for (const arrows of variants) {
    const tokensA = tokens(arrows);
    let shared = 0;
    tokensA.forEach((t) => tokensB.has(t) && shared++);
    const union = tokensA.size + tokensB.size - shared;
    best = Math.max(best, union === 0 ? 1 : shared / union);
  }
  return best;
}

function tokens(arrows: readonly ArrowData[]): Set<string> {
  const set = new Set<string>();
  for (const a of arrows) for (const c of a.cells) set.add(`${c.row},${c.col},${a.direction}`);
  return set;
}

/** All 8 rotations/reflections of a square level's arrows. */
function symmetries(level: LevelData): ArrowData[][] {
  const n = level.rows - 1;
  const maps: ((c: Cell) => Cell)[] = [
    (c) => c,
    (c) => ({ row: c.col, col: n - c.row }),
    (c) => ({ row: n - c.row, col: n - c.col }),
    (c) => ({ row: n - c.col, col: c.row }),
    (c) => ({ row: c.row, col: n - c.col }),
    (c) => ({ row: n - c.row, col: c.col }),
    (c) => ({ row: c.col, col: c.row }),
    (c) => ({ row: n - c.col, col: n - c.row }),
  ];
  return maps.map((map) =>
    level.arrows.map((a) => {
      const head = a.cells[a.cells.length - 1];
      const ahead = step(head, a.direction);
      const h = map(head);
      const t = map(ahead);
      const direction = DIRECTIONS.find(
        (d) => DIRECTION_VECTORS[d].dRow === t.row - h.row && DIRECTION_VECTORS[d].dCol === t.col - h.col,
      )!;
      return { id: a.id, direction, cells: a.cells.map(map) };
    }),
  );
}
