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
      /** True if this move (with its chain) emptied the board. */
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
