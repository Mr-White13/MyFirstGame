import { cellKey } from './Arrow';
import type { ArrowData, Cell } from './types';

/** Tracks which arrow (if any) occupies each cell of the board. */
export class Grid {
  private readonly occupancy = new Map<string, string>();

  constructor(
    readonly rows: number,
    readonly cols: number,
  ) {}

  inBounds(cell: Cell): boolean {
    return cell.row >= 0 && cell.row < this.rows && cell.col >= 0 && cell.col < this.cols;
  }

  occupantAt(cell: Cell): string | undefined {
    return this.occupancy.get(cellKey(cell));
  }

  place(arrow: ArrowData): void {
    for (const cell of arrow.cells) {
      if (!this.inBounds(cell)) {
        throw new Error(`Arrow "${arrow.id}" has a cell outside the board at ${cellKey(cell)}`);
      }
      const existing = this.occupantAt(cell);
      if (existing !== undefined) {
        throw new Error(`Arrow "${arrow.id}" overlaps "${existing}" at ${cellKey(cell)}`);
      }
    }
    for (const cell of arrow.cells) this.occupancy.set(cellKey(cell), arrow.id);
  }

  remove(arrow: ArrowData): void {
    for (const cell of arrow.cells) {
      if (this.occupantAt(cell) === arrow.id) this.occupancy.delete(cellKey(cell));
    }
  }

  clear(): void {
    this.occupancy.clear();
  }
}
