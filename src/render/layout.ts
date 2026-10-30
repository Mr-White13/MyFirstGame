import type { Cell } from '../core/types';

/** Pixel geometry of the board inside the canvas. All values are in game (device) pixels. */
export interface BoardLayout {
  readonly rows: number;
  readonly cols: number;
  /** Top-left corner of the rounded board container. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly padding: number;
  readonly cellSize: number;
  readonly radius: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Fits the largest square-celled board into the view, centred, with a small margin. */
export function computeBoardLayout(viewWidth: number, viewHeight: number, rows: number, cols: number): BoardLayout {
  const margin = Math.min(viewWidth, viewHeight) * 0.035;
  // Padding is proportional to the cell so arrow glow never touches the container edge.
  const paddingInCells = 0.35;
  const cellSize = Math.max(
    4,
    Math.floor(
      Math.min(
        (viewWidth - 2 * margin) / (cols + 2 * paddingInCells),
        (viewHeight - 2 * margin) / (rows + 2 * paddingInCells),
      ),
    ),
  );
  const padding = Math.round(cellSize * paddingInCells);
  const width = cols * cellSize + 2 * padding;
  const height = rows * cellSize + 2 * padding;
  return {
    rows,
    cols,
    x: Math.round((viewWidth - width) / 2),
    y: Math.round((viewHeight - height) / 2),
    width,
    height,
    padding,
    cellSize,
    radius: Math.round(cellSize * 0.4),
  };
}

export function cellCenter(layout: BoardLayout, cell: Cell): Point {
  return {
    x: layout.x + layout.padding + (cell.col + 0.5) * layout.cellSize,
    y: layout.y + layout.padding + (cell.row + 0.5) * layout.cellSize,
  };
}

/** Maps a pixel position to a cell, or null when it falls outside the grid. */
export function cellAtPoint(layout: BoardLayout, x: number, y: number): Cell | null {
  const col = Math.floor((x - layout.x - layout.padding) / layout.cellSize);
  const row = Math.floor((y - layout.y - layout.padding) / layout.cellSize);
  if (row < 0 || row >= layout.rows || col < 0 || col >= layout.cols) return null;
  return { row, col };
}
