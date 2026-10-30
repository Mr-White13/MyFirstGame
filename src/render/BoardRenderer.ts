import Phaser from 'phaser';
import type { BoardLayout } from './layout';
import { COLORS, mixColors } from './theme';

/** Draws the static board (rounded container plus subtle grid) and its win effect. */
export class BoardRenderer {
  private readonly graphics: Phaser.GameObjects.Graphics;
  /** Outline that expands and fades on level complete; drawn around its own centre so it can scale. */
  private readonly pulse: Phaser.GameObjects.Graphics;
  private layout?: BoardLayout;
  private won = false;
  /** 0..1 strength of the green tint washing over the board on completion. */
  private glow = 0;
  private glowTween?: Phaser.Tweens.Tween;

  constructor(private readonly scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(0);
    this.pulse = scene.add.graphics().setDepth(2).setVisible(false);
  }

  setLayout(layout: BoardLayout): void {
    this.layout = layout;
    this.stopPulse();
    this.draw();
  }

  /** Celebrates the cleared board: green outline, a soft wash of colour and two expanding rings. */
  playWin(): void {
    const l = this.layout;
    if (!l) return;
    this.won = true;
    this.stopPulse();

    this.glowTween = this.scene.tweens.addCounter({
      from: 1,
      to: 0.35,
      duration: 700,
      ease: 'Quad.easeOut',
      onUpdate: (tween) => {
        this.glow = tween.getValue() ?? 0;
        this.draw();
      },
    });

    this.pulse
      .clear()
      .lineStyle(Math.max(2, l.cellSize * 0.06), COLORS.green, 1)
      .strokeRoundedRect(-l.width / 2, -l.height / 2, l.width, l.height, l.radius)
      .setPosition(l.x + l.width / 2, l.y + l.height / 2)
      .setScale(1)
      .setAlpha(0.9)
      .setVisible(true);
    this.scene.tweens.add({
      targets: this.pulse,
      scale: 1.07,
      alpha: 0,
      duration: 650,
      ease: 'Cubic.easeOut',
      repeat: 1,
      repeatDelay: 80,
      onComplete: () => this.pulse.setVisible(false),
    });
  }

  /** Back to the normal look, cancelling any running win effect. */
  reset(): void {
    this.won = false;
    this.glow = 0;
    this.stopPulse();
    this.draw();
  }

  destroy(): void {
    this.stopPulse();
    this.graphics.destroy();
    this.pulse.destroy();
  }

  private stopPulse(): void {
    this.glowTween?.remove();
    this.glowTween = undefined;
    this.scene.tweens.killTweensOf(this.pulse);
    this.pulse.setVisible(false);
  }

  private draw(): void {
    const l = this.layout;
    if (!l) return;
    const g = this.graphics.clear();
    const stroke = Math.max(1, l.cellSize * 0.025);
    const wonGlow = this.won ? Math.max(this.glow, 0.35) : 0;

    // Outer halo ring hugging the container: a cheap, subtle frame glow.
    const frame = this.won ? COLORS.green : COLORS.cyan;
    g.lineStyle(stroke * 4, mixColors(COLORS.background, frame, this.won ? 0.22 : 0.07), 1);
    g.strokeRoundedRect(l.x, l.y, l.width, l.height, l.radius);

    g.fillStyle(mixColors(COLORS.surface, COLORS.green, 0.12 * wonGlow), 1);
    g.fillRoundedRect(l.x, l.y, l.width, l.height, l.radius);
    g.lineStyle(stroke, frame, this.won ? 0.75 : 0.22);
    g.strokeRoundedRect(l.x, l.y, l.width, l.height, l.radius);

    // Interior grid lines only; the container outline frames the outer edge.
    const left = l.x + l.padding;
    const top = l.y + l.padding;
    const right = left + l.cols * l.cellSize;
    const bottom = top + l.rows * l.cellSize;
    g.lineStyle(Math.max(1, stroke * 0.6), COLORS.textSecondary, 0.07);
    for (let c = 1; c < l.cols; c++) g.lineBetween(left + c * l.cellSize, top, left + c * l.cellSize, bottom);
    for (let r = 1; r < l.rows; r++) g.lineBetween(left, top + r * l.cellSize, right, top + r * l.cellSize);

    // Small dots at cell centres help the eye read rows and columns.
    g.fillStyle(this.won ? COLORS.green : COLORS.textSecondary, this.won ? 0.25 : 0.14);
    for (let r = 0; r < l.rows; r++) {
      for (let c = 0; c < l.cols; c++) {
        g.fillCircle(left + (c + 0.5) * l.cellSize, top + (r + 0.5) * l.cellSize, l.cellSize * 0.035);
      }
    }
  }
}
