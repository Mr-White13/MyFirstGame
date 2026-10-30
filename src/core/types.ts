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
  readonly rows: number;
  readonly cols: number;
  readonly arrows: readonly ArrowData[];
}

export type MoveResult =
  | {
      readonly kind: 'cleared';
      readonly arrowId: string;
      /** Board cells the head passes through on its way out (may be empty). */
      readonly exitPath: readonly Cell[];
    }
  | {
      readonly kind: 'blocked';
      readonly arrowId: string;
      readonly blockerId: string;
      /** Free cells in front of the head before the blocker. */
      readonly freePath: readonly Cell[];
    }
  | { readonly kind: 'ignored'; readonly reason: 'unknown-arrow' | 'game-over' };

export interface GameSnapshot {
  readonly levelId: number;
  readonly moves: number;
  readonly remaining: number;
  readonly total: number;
  readonly won: boolean;
}
