import type { ArrowData, Cell, Direction } from './types';

export const DIRECTION_VECTORS: Readonly<Record<Direction, { readonly dRow: number; readonly dCol: number }>> = {
  up: { dRow: -1, dCol: 0 },
  down: { dRow: 1, dCol: 0 },
  left: { dRow: 0, dCol: -1 },
  right: { dRow: 0, dCol: 1 },
};

const DIRECTIONS = Object.keys(DIRECTION_VECTORS) as Direction[];

export function cellKey(cell: Cell): string {
  return `${cell.row},${cell.col}`;
}

export function step(cell: Cell, direction: Direction): Cell {
  const v = DIRECTION_VECTORS[direction];
  return { row: cell.row + v.dRow, col: cell.col + v.dCol };
}

export function headOf(arrow: ArrowData): Cell {
  return arrow.cells[arrow.cells.length - 1];
}

/** Direction from cell `a` to an orthogonally adjacent cell `b`, or null if not adjacent. */
export function directionBetween(a: Cell, b: Cell): Direction | null {
  const dRow = b.row - a.row;
  const dCol = b.col - a.col;
  return DIRECTIONS.find((d) => DIRECTION_VECTORS[d].dRow === dRow && DIRECTION_VECTORS[d].dCol === dCol) ?? null;
}

/** Compact level-authoring helper: `arrow('a1', 'right', [0, 0], [0, 1])` (cells tail → head). */
export function arrow(id: string, direction: Direction, ...cells: [row: number, col: number][]): ArrowData {
  return { id, direction, cells: cells.map(([row, col]) => ({ row, col })) };
}
