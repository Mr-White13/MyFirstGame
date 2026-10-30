import Phaser from 'phaser';
import type { BoardLayout } from './layout';
import { COLORS } from './theme';

/** Draws the static board: rounded container plus subtle grid lines. */
export class BoardRenderer {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private layout?: BoardLayout;
  private won = false;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(0);
  }

  setLayout(layout: BoardLayout): void {
    this.layout = layout;
    this.draw();
  }

  /** Switches the container outline to the success colour. */
  setWon(won: boolean): void {
    this.won = won;
    this.draw();
  }

  private draw(): void {
    const l = this.layout;
    if (!l) return;
    const g = this.graphics.clear();
    const stroke = Math.max(1, l.cellSize * 0.025);

    g.fillStyle(COLORS.surface, 1);
    g.fillRoundedRect(l.x, l.y, l.width, l.height, l.radius);
    g.lineStyle(stroke, this.won ? COLORS.green : COLORS.cyan, this.won ? 0.6 : 0.16);
    g.strokeRoundedRect(l.x, l.y, l.width, l.height, l.radius);

    // Interior grid lines only; the container outline frames the outer edge.
    const left = l.x + l.padding;
    const top = l.y + l.padding;
    const right = left + l.cols * l.cellSize;
    const bottom = top + l.rows * l.cellSize;
    g.lineStyle(Math.max(1, stroke * 0.6), COLORS.textSecondary, 0.08);
    for (let c = 1; c < l.cols; c++) g.lineBetween(left + c * l.cellSize, top, left + c * l.cellSize, bottom);
    for (let r = 1; r < l.rows; r++) g.lineBetween(left, top + r * l.cellSize, right, top + r * l.cellSize);

    // Small dots at cell centres help the eye read rows and columns.
    g.fillStyle(COLORS.textSecondary, 0.12);
    for (let r = 0; r < l.rows; r++) {
      for (let c = 0; c < l.cols; c++) {
        g.fillCircle(left + (c + 0.5) * l.cellSize, top + (r + 0.5) * l.cellSize, l.cellSize * 0.035);
      }
    }
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
