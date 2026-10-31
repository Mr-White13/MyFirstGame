/** Shared, framework-agnostic types for the puzzle logic. */

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Cell {
  readonly row: number;
  readonly col: number;
}

/**
 * An arrow is a chain of orthogonally adjacent cells ordered from tail to head.
 * When released, it travels in `direction`, its body following the head.
 */
export interface ArrowData {
  readonly id: string;
  readonly cells: readonly Cell[];
  readonly direction: Direction;
  /**
   * An Energy Arrow: a collectible variant used by Daily League challenges.
   * It moves, blocks, turns red and chains exactly like any other arrow; the
   * rules never read this flag. Only the league awards a point when one is removed.
   */
  readonly energy?: boolean;
}

export interface LevelData {
  readonly id: number;
  /**
   * Content version of this level. Bump it whenever the layout changes, so
   * saved records (such as best move counts) from an older layout are not
   * compared with the new one. Defaults to 1.
   */
  readonly revision?: number;
  readonly rows: number;
  readonly cols: number;
  readonly arrows: readonly ArrowData[];
}

/** Lives at the start of every level. */
export const STARTING_LIVES = 3;

/**
 * Streak bonus (see GameState): this many successful taps in a row, each
 * within STREAK_WINDOW_MS of the previous one, earn one bonus...
 */
export const STREAK_TAPS = 3;
/** Longest pause between two taps that still continues a streak. */
export const STREAK_WINDOW_MS = 1500;
/** ...which clears at least BONUS_MIN and at most BONUS_MAX currently removable normal arrows. */
export const BONUS_MIN = 2;
export const BONUS_MAX = 3;

/** One arrow leaving the board: the one the player tapped, or one released by a chain reaction. */
export interface Removal {
  readonly arrowId: string;
  /** Board cells the head passes through on its way out (may be empty). */
  readonly exitPath: readonly Cell[];
}

export type MoveResult =
  | {
      readonly kind: 'cleared';
      readonly arrowId: string;
      readonly exitPath: readonly Cell[];
      /**
       * Activated (red) arrows released automatically because of this move, in
       * the order they left. Already applied to the state; listed for animation.
       */
      readonly chain: readonly Removal[];
      /**
       * Normal arrows cleared by a streak bonus after this tap (BONUS_MIN to
       * BONUS_MAX), in the order they left; empty when no bonus fired.
       */
      readonly cascade: readonly Removal[];
      /** Activated arrows released because the bonus freed them (after `cascade`). */
      readonly cascadeChain: readonly Removal[];
      /** True if this move (with its chain and bonus) emptied the board. */
      readonly won: boolean;
    }
  | {
      readonly kind: 'blocked';
      readonly arrowId: string;
      readonly blockerId: string;
      /** Free cells in front of the head before the blocker. */
      readonly freePath: readonly Cell[];
      /**
       * True the first time this arrow is tapped while blocked: it costs a life
       * and the arrow becomes activated (red). False for a repeat tap on an
       * arrow that is already red, which changes nothing.
       */
      readonly lifeLost: boolean;
      /** True if this tap used up the last life. */
      readonly failed: boolean;
    }
  | { readonly kind: 'ignored'; readonly reason: 'unknown-arrow' | 'level-over' };

export type LevelStatus = 'playing' | 'won' | 'failed';

/**
 * Counters for the current attempt.
 *
 * - `moves`: successful player taps (kept for compatibility; equals `directClears`).
 * - `directClears`: arrows the player removed by tapping them.
 * - `autoClears`: activated arrows released automatically by chain reactions.
 * - `cascadeClears`: normal arrows cleared automatically by streak bonuses.
 * - `streak`: successful taps in the current streak (0..STREAK_TAPS - 1; it
 *   resets when a bonus is earned, on a blocked tap, or after a pause).
 * - `streakAt`: clock time of the streak's last tap (ms), or null; the
 *   streak expires STREAK_WINDOW_MS after it.
 * - `longestChain`: most red arrows released by a single move's chain reactions (bookkeeping only).
 * - `mistakes`: taps on a blocked arrow that cost a life (repeat taps on a red arrow don't count).
 * - `lives`: lives left (`STARTING_LIVES - mistakes`, never below 0).
 * - `remaining` / `total`: arrows still on the board / at the start.
 * - `activated`: red arrows currently on the board.
 */
export interface GameSnapshot {
  readonly levelId: number;
  readonly status: LevelStatus;
  readonly moves: number;
  readonly directClears: number;
  readonly autoClears: number;
  readonly cascadeClears: number;
  readonly streak: number;
  readonly streakAt: number | null;
  readonly longestChain: number;
  readonly mistakes: number;
  readonly lives: number;
  readonly remaining: number;
  readonly total: number;
  readonly activated: number;
  /** True once every arrow is gone (status 'won'). Kept for compatibility. */
  readonly won: boolean;
  /** Stars earned, 1..3, once won (lives left at the end); 0 otherwise. */
  readonly stars: number;
}
