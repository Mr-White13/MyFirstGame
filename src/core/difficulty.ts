import { cellKey, directionBetween, headOf, step } from './Arrow';
import { Grid } from './Grid';
import { checkExitPath } from './PathChecker';
import { createRandom } from './random';
import type { ArrowData, Cell, LevelData } from './types';

/*
 * Difficulty analysis.
 *
 * Under the current rules a level can never become unsolvable (removing an
 * arrow only frees cells) and the move count always equals the arrow count.
 * So the only real difficulty is *finding* an arrow that can escape, again
 * and again, until the board is empty. The metrics below try to capture that.
 *
 * Exact metrics are computed directly from the rules. Estimated metrics come
 * from simulating a player who taps arrows uniformly at random; the simulation
 * uses a fixed seed, so results are deterministic, but they describe a naive
 * player, not a human one. The final score is a weighted heuristic on top of
 * both and has not been validated against real players.
 */

export interface ExactMetrics {
  readonly rows: number;
  readonly cols: number;
  readonly arrows: number;
  /** Share of grid cells covered by arrows (0..1). */
  readonly density: number;
  /** Arrows that can escape on the very first move. */
  readonly initialFree: number;
  /** Share of arrows blocked at the start (0..1). */
  readonly blockedShare: number;
  /** Blocking relations at the start: (arrow, arrow on its exit line) pairs. */
  readonly blockingRelations: number;
  /** Most arrows standing on a single arrow's exit line. */
  readonly maxBlockers: number;
  /** Relations where the blocker is 3+ cells ahead of the head: easy to overlook. */
  readonly longRangeBlocks: number;
  /** Waves needed if every free arrow were cleared at once each time (longest dependency chain). */
  readonly depth: number;
  /** Arrows freed in each wave, starting with the initially free ones. */
  readonly waves: readonly number[];
  /** Total right-angle turns across all arrows. */
  readonly turns: number;
  /**
   * Places where two different arrows meet end-to-end in a straight line and
   * could be read as one arrow. 0 is best for readability.
   */
  readonly ambiguousJoins: number;
}

export interface EstimatedMetrics {
  /** Average number of escapable arrows each time the player looks for a move. */
  readonly averageChoices: number;
  /** Average share of remaining arrows that can escape (0..1). Lower = harder to spot. */
  readonly averageFreeShare: number;
  /** Lowest free share seen in a typical play-through (averaged over simulations). */
  readonly bottleneckShare: number;
  /** Blocked taps a random tapper makes per successful move. */
  readonly wrongTapsPerMove: number;
}

export interface ScoreComponent {
  readonly name: string;
  /** 0..1 after normalisation. */
  readonly value: number;
  readonly weight: number;
}

export type DifficultyCategory =
  | 'Very easy'
  | 'Easy'
  | 'Easy–medium'
  | 'Medium'
  | 'Medium–hard'
  | 'Hard'
  | 'Very hard';

export interface DifficultyReport {
  readonly exact: ExactMetrics;
  readonly estimated: EstimatedMetrics;
  readonly components: readonly ScoreComponent[];
  /** 0..100, deterministic. A heuristic, not a measurement of human difficulty. */
  readonly score: number;
  readonly category: DifficultyCategory;
}

/** Lower bounds (inclusive) of each category, from hardest to easiest. */
export const CATEGORY_BANDS: readonly (readonly [number, DifficultyCategory])[] = [
  [70, 'Very hard'],
  [58, 'Hard'],
  [48, 'Medium–hard'],
  [38, 'Medium'],
  [28, 'Easy–medium'],
  [16, 'Easy'],
  [0, 'Very easy'],
];

export function categoryFor(score: number): DifficultyCategory {
  return CATEGORY_BANDS.find(([min]) => score >= min)![1];
}

const SIMULATIONS = 200;
const SIMULATION_SEED = 0x5eed;

export function analyzeDifficulty(level: LevelData): DifficultyReport {
  const exact = exactMetrics(level);
  const estimated = simulateRandomPlayer(level);

  const turnsPerArrow = exact.turns / Math.max(1, exact.arrows);
  const components: ScoreComponent[] = [
    // Finding a free arrow: the core of this puzzle. 1 wrong tap per move → 0.33, 4 → 0.67.
    { name: 'search', value: saturate(estimated.wrongTapsPerMove, 2), weight: 35 },
    // How many layers the player has to peel off.
    { name: 'depth', value: saturate(exact.depth - 1, 5), weight: 20 },
    // How tangled the board is: blocking relations per arrow.
    { name: 'entanglement', value: saturate(exact.blockingRelations / Math.max(1, exact.arrows), 1.5), weight: 15 },
    // Blockers far down an arrow's line are easy to miss.
    { name: 'long-range', value: exact.longRangeBlocks / Math.max(1, exact.blockingRelations), weight: 10 },
    // More arrows means more to scan, with diminishing effect.
    { name: 'size', value: saturate(exact.arrows, 20), weight: 10 },
    // Busy, twisty boards are harder to read.
    { name: 'visual', value: 0.6 * exact.density + 0.4 * saturate(turnsPerArrow, 1), weight: 10 },
  ];
  const total = components.reduce((sum, c) => sum + c.weight, 0);
  const score = Math.round((100 * components.reduce((sum, c) => sum + c.value * c.weight, 0)) / total);

  return { exact, estimated, components, score, category: categoryFor(score) };
}

/** x / (x + half): 0 at 0, 0.5 at `half`, approaching 1. */
function saturate(x: number, half: number): number {
  return x <= 0 ? 0 : x / (x + half);
}

function placeAll(level: LevelData): Grid {
  const grid = new Grid(level.rows, level.cols);
  level.arrows.forEach((a) => grid.place(a));
  return grid;
}

/** Every arrow standing on `arrow`'s exit line, with its distance from the head. */
function blockersOf(grid: Grid, arrow: ArrowData): { id: string; distance: number }[] {
  const seen = new Map<string, number>();
  let distance = 0;
  for (let c = step(headOf(arrow), arrow.direction); grid.inBounds(c); c = step(c, arrow.direction)) {
    distance++;
    const id = grid.occupantAt(c);
    if (id !== undefined && id !== arrow.id && !seen.has(id)) seen.set(id, distance);
  }
  return [...seen].map(([id, d]) => ({ id, distance: d }));
}

function exactMetrics(level: LevelData): ExactMetrics {
  const grid = placeAll(level);
  let blockingRelations = 0;
  let maxBlockers = 0;
  let longRangeBlocks = 0;
  for (const arrow of level.arrows) {
    const blockers = blockersOf(grid, arrow);
    blockingRelations += blockers.length;
    maxBlockers = Math.max(maxBlockers, blockers.length);
    longRangeBlocks += blockers.filter((b) => b.distance >= 3).length;
  }

  // Waves: clear every free arrow at once until the board is empty.
  const waveGrid = placeAll(level);
  const waves: number[] = [];
  let remaining = [...level.arrows];
  while (remaining.length > 0) {
    const wave = remaining.filter((a) => checkExitPath(waveGrid, a).clear);
    if (wave.length === 0) break; // unsolvable; validation reports that separately
    wave.forEach((a) => waveGrid.remove(a));
    remaining = remaining.filter((a) => !wave.includes(a));
    waves.push(wave.length);
  }

  const occupied = level.arrows.reduce((sum, a) => sum + a.cells.length, 0);
  const initialFree = waves[0] ?? 0;
  return {
    rows: level.rows,
    cols: level.cols,
    arrows: level.arrows.length,
    density: occupied / (level.rows * level.cols),
    initialFree,
    blockedShare: level.arrows.length === 0 ? 0 : 1 - initialFree / level.arrows.length,
    blockingRelations,
    maxBlockers,
    longRangeBlocks,
    depth: waves.length,
    waves,
    turns: level.arrows.reduce((sum, a) => sum + countTurns(a), 0),
    ambiguousJoins: countAmbiguousJoins(level),
  };
}

export function countTurns(arrow: ArrowData): number {
  let turns = 0;
  for (let i = 2; i < arrow.cells.length; i++) {
    if (directionBetween(arrow.cells[i - 2], arrow.cells[i - 1]) !== directionBetween(arrow.cells[i - 1], arrow.cells[i])) {
      turns++;
    }
  }
  return turns;
}

/**
 * Two arrows "join" ambiguously when an end of one touches an end of the
 * other and both end segments lie on the same straight line, so the pair can
 * look like a single long arrow. The arrowhead usually makes a head-to-tail
 * join readable, so only tail-to-tail and head-to-head joins count.
 */
export function countAmbiguousJoins(level: LevelData): number {
  interface End {
    readonly id: string;
    readonly cell: Cell;
    /** Unit vector pointing outwards from the arrow at this end. */
    readonly out: { dRow: number; dCol: number };
    readonly isHead: boolean;
  }
  const ends: End[] = [];
  for (const a of level.arrows) {
    const cells = a.cells;
    const head = cells[cells.length - 1];
    const headOut = step(head, a.direction);
    ends.push({ id: a.id, cell: head, out: { dRow: headOut.row - head.row, dCol: headOut.col - head.col }, isHead: true });
    if (cells.length > 1) {
      const tail = cells[0];
      const next = cells[1];
      ends.push({ id: a.id, cell: tail, out: { dRow: tail.row - next.row, dCol: tail.col - next.col }, isHead: false });
    }
  }
  const byCell = new Map(ends.map((e) => [cellKey(e.cell), e] as const));
  let joins = 0;
  for (const e of ends) {
    const neighbour = byCell.get(cellKey({ row: e.cell.row + e.out.dRow, col: e.cell.col + e.out.dCol }));
    if (!neighbour || neighbour.id === e.id || neighbour.isHead !== e.isHead) continue;
    // Facing each other along the same line?
    if (neighbour.out.dRow === -e.out.dRow && neighbour.out.dCol === -e.out.dCol) joins++;
  }
  return joins / 2; // each join was counted from both ends
}

/**
 * Simulates a player with no strategy: tap a random remaining arrow; if it is
 * blocked, try another. Deterministic thanks to the fixed seed.
 */
function simulateRandomPlayer(level: LevelData): EstimatedMetrics {
  const random = createRandom(SIMULATION_SEED);
  let wrongTaps = 0;
  let moves = 0;
  let choiceSum = 0;
  let shareSum = 0;
  let bottleneckSum = 0;

  for (let run = 0; run < SIMULATIONS; run++) {
    const grid = placeAll(level);
    const remaining = [...level.arrows];
    let bottleneck = 1;
    while (remaining.length > 0) {
      const free = remaining.filter((a) => checkExitPath(grid, a).clear);
      if (free.length === 0) break;
      const share = free.length / remaining.length;
      choiceSum += free.length;
      shareSum += share;
      bottleneck = Math.min(bottleneck, share);
      // Expected wrong taps before hitting a free arrow when sampling without
      // replacement: blocked / (free + 1). Exact for this state.
      wrongTaps += (remaining.length - free.length) / (free.length + 1);
      const chosen = free[Math.floor(random() * free.length)];
      grid.remove(chosen);
      remaining.splice(remaining.indexOf(chosen), 1);
      moves++;
    }
    bottleneckSum += bottleneck;
  }

  return {
    averageChoices: moves === 0 ? 0 : choiceSum / moves,
    averageFreeShare: moves === 0 ? 0 : shareSum / moves,
    bottleneckShare: bottleneckSum / SIMULATIONS,
    wrongTapsPerMove: moves === 0 ? 0 : wrongTaps / moves,
  };
}
