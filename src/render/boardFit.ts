/** Board padding around the grid, in cells. Leaves room for the arrow halo at the edges. */
export const PADDING_IN_CELLS = 0.3;

/** Boards never grow wider than this on large screens (CSS px); they'd just look stretched. */
export const MAX_BOARD_WIDTH = 620;

/**
 * The board slot for a grid in the space left for it (CSS pixels): as large
 * as fits, keeping the board's true aspect (cols × rows plus padding), so
 * tall portrait grids use the screen height and square ones its width.
 */
export function fitBoardSlot(availableWidth: number, availableHeight: number, rows: number, cols: number): { width: number; height: number } {
  const aspect = (cols + 2 * PADDING_IN_CELLS) / (rows + 2 * PADDING_IN_CELLS);
  const width = Math.floor(Math.max(120, Math.min(availableWidth, availableHeight * aspect, MAX_BOARD_WIDTH)));
  return { width, height: Math.floor(width / aspect) };
}
