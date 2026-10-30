import Phaser from 'phaser';
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

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Board padding around the grid, in cells. Leaves room for the arrow halo at the edges. */
export const PADDING_IN_CELLS = 0.3;

/**
 * Fits the largest square-celled board into `frame`, centred. The frame is
 * the on-screen slot reserved for the board (see ui/GameLayout), so no extra
 * margin is added here.
 */
export function computeBoardLayout(frame: Rect, rows: number, cols: number): BoardLayout {
  const cellSize = Math.max(
    4,
    Math.floor(Math.min(frame.width / (cols + 2 * PADDING_IN_CELLS), frame.height / (rows + 2 * PADDING_IN_CELLS))),
  );
  const padding = Math.round(cellSize * PADDING_IN_CELLS);
  const width = cols * cellSize + 2 * padding;
  const height = rows * cellSize + 2 * padding;
  return {
    rows,
    cols,
    x: Math.round(frame.x + (frame.width - width) / 2),
    y: Math.round(frame.y + (frame.height - height) / 2),
    width,
    height,
    padding,
    cellSize,
    radius: Math.round(cellSize * 0.42),
  };
}

export function sameLayout(a: BoardLayout | undefined, b: BoardLayout): boolean {
  return (
    a !== undefined &&
    a.rows === b.rows &&
    a.cols === b.cols &&
    a.x === b.x &&
    a.y === b.y &&
    a.cellSize === b.cellSize
  );
}

/** The playable grid area (inside the board padding). */
export function gridBounds(layout: BoardLayout): Phaser.Geom.Rectangle {
  return new Phaser.Geom.Rectangle(
    layout.x + layout.padding,
    layout.y + layout.padding,
    layout.cols * layout.cellSize,
    layout.rows * layout.cellSize,
  );
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
