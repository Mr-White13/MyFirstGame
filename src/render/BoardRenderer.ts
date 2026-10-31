import Phaser from 'phaser';
import type { BoardLayout } from './layout';
import { decorationScale, reducedMotion } from './motion';
import { mixColors, palette } from './theme';

const WIN_WAVE_MS = 650;

/**
 * Draws the board: a frame with a soft outer light, a recessed play area,
 * faint grid lines and cell dots. Also plays the board's entrance and the
 * level-complete wave.
 *
 * The graphics are drawn around the board's centre and positioned there, so
 * the entrance can scale the whole board without redrawing it.
 */
export class BoardRenderer {
  private readonly graphics: Phaser.GameObjects.Graphics;
  /** Outline that expands and fades on level complete. */
  private readonly pulse: Phaser.GameObjects.Graphics;
  private layout?: BoardLayout;
  private won = false;
  /** Set when the level is lost: the frame turns red. */
  private failed = false;
  /** 0..1 progress of the win wave travelling outwards from the centre; 1 = finished. */
  private wave = 1;
  private waveTween?: Phaser.Tweens.Tween;

  constructor(private readonly scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(0);
    this.pulse = scene.add.graphics().setDepth(2).setVisible(false);
  }

  setLayout(layout: BoardLayout): void {
    this.layout = layout;
    this.stopEffects();
    this.graphics.setScale(1).setAlpha(1);
    this.draw();
  }

  /** Quick fade and settle when a level starts; never blocks input. */
  playEntrance(): void {
    if (reducedMotion()) return;
    this.scene.tweens.killTweensOf(this.graphics);
    this.graphics.setAlpha(0).setScale(0.97);
    this.scene.tweens.add({ targets: this.graphics, alpha: 1, scale: 1, duration: 260, ease: 'Cubic.easeOut' });
  }

  /** Celebrates the cleared board: a green wave across the cells, green frame and one expanding ring. */
  playWin(): void {
    const l = this.layout;
    if (!l) return;
    this.won = true;
    this.stopEffects();

    // The wave and ring are decoration; the green board alone says the level is done.
    if (decorationScale() === 0) {
      this.wave = 1;
      this.draw();
      return;
    }

    this.waveTween = this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: WIN_WAVE_MS,
      ease: 'Sine.easeOut',
      onUpdate: (tween) => {
        this.wave = tween.getValue() ?? 1;
        this.draw();
      },
    });

    this.pulse
      .clear()
      .lineStyle(Math.max(2, l.cellSize * 0.06), palette().success, 1)
      .strokeRoundedRect(-l.width / 2, -l.height / 2, l.width, l.height, l.radius)
      .setPosition(l.x + l.width / 2, l.y + l.height / 2)
      .setScale(1)
      .setAlpha(0.85)
      .setVisible(true);
    this.scene.tweens.add({
      targets: this.pulse,
      scale: 1.06,
      alpha: 0,
      duration: 600,
      ease: 'Cubic.easeOut',
      onComplete: () => this.pulse.setVisible(false),
    });
  }

  /** Out of lives: the frame turns red and one red ring contracts inwards. */
  playFailure(): void {
    const l = this.layout;
    if (!l) return;
    this.failed = true;
    this.stopEffects();
    this.draw();
    if (decorationScale() === 0) return; // the red frame stays: only the ring is decoration
    this.pulse
      .clear()
      .lineStyle(Math.max(2, l.cellSize * 0.06), palette().error, 1)
      .strokeRoundedRect(-l.width / 2, -l.height / 2, l.width, l.height, l.radius)
      .setPosition(l.x + l.width / 2, l.y + l.height / 2)
      .setScale(1.05)
      .setAlpha(0.9)
      .setVisible(true);
    this.scene.tweens.add({
      targets: this.pulse,
      scale: 1,
      alpha: 0,
      duration: 450,
      ease: 'Cubic.easeOut',
      onComplete: () => this.pulse.setVisible(false),
    });
  }

  /** Redraws in the active theme's colours, keeping the current state (playing, won or failed). */
  refreshTheme(): void {
    this.draw();
  }

  /** Back to the normal look, cancelling any running win or failure effect. */
  reset(): void {
    this.won = false;
    this.failed = false;
    this.stopEffects();
    this.draw();
  }

  destroy(): void {
    this.stopEffects();
    this.graphics.destroy();
    this.pulse.destroy();
  }

  private stopEffects(): void {
    this.waveTween?.remove();
    this.waveTween = undefined;
    this.wave = 1;
    this.scene.tweens.killTweensOf(this.pulse);
    this.pulse.setVisible(false);
  }

  private draw(): void {
    const l = this.layout;
    if (!l) return;
    const g = this.graphics.clear();
    const cx = l.x + l.width / 2;
    const cy = l.y + l.height / 2;
    g.setPosition(cx, cy);
    // Local coordinates: the board's top-left corner relative to its centre.
    const x0 = -l.width / 2;
    const y0 = -l.height / 2;
    const stroke = Math.max(1, l.cellSize * 0.025);
    const p = palette();
    const accent = this.won ? p.success : this.failed ? p.error : p.frame;
    const lit = this.won || this.failed;

    // Soft light around the frame: two wide, faint, opaque rings (no shader, no blur).
    g.lineStyle(stroke * 10, mixColors(p.background, accent, (lit ? 0.08 : 0.035) * p.glow), 1);
    g.strokeRoundedRect(x0, y0, l.width, l.height, l.radius);
    g.lineStyle(stroke * 5, mixColors(p.background, accent, (lit ? 0.16 : 0.07) * p.glow), 1);
    g.strokeRoundedRect(x0, y0, l.width, l.height, l.radius);

    // Frame, then the slightly darker play area recessed inside it.
    g.fillStyle(p.surface, 1);
    g.fillRoundedRect(x0, y0, l.width, l.height, l.radius);
    const inset = l.padding * 0.45;
    const wellRadius = Math.max(2, l.radius - inset);
    const greenWash = this.won ? 0.07 * (1 - this.wave * 0.5) : 0;
    g.fillStyle(mixColors(p.well, p.success, greenWash), 1);
    g.fillRoundedRect(x0 + inset, y0 + inset, l.width - 2 * inset, l.height - 2 * inset, wellRadius);
    // Hairline outline in the accent colour: cyan normally, green once solved.
    g.lineStyle(stroke, accent, lit ? 0.7 : p.frameAlpha);
    g.strokeRoundedRect(x0, y0, l.width, l.height, l.radius);

    // Interior grid lines only; the well's edge frames the outside.
    const left = x0 + l.padding;
    const top = y0 + l.padding;
    const right = left + l.cols * l.cellSize;
    const bottom = top + l.rows * l.cellSize;
    g.lineStyle(Math.max(1, stroke * 0.6), p.grid, p.gridAlpha);
    for (let c = 1; c < l.cols; c++) g.lineBetween(left + c * l.cellSize, top, left + c * l.cellSize, bottom);
    for (let r = 1; r < l.rows; r++) g.lineBetween(left, top + r * l.cellSize, right, top + r * l.cellSize);

    // Cell-centre dots. During the win wave, dots light up green as the wave front passes.
    const maxDistance = Math.hypot(l.cols / 2, l.rows / 2);
    const front = this.wave * (maxDistance + 1.5);
    const dot = l.cellSize * 0.035;
    for (let r = 0; r < l.rows; r++) {
      for (let c = 0; c < l.cols; c++) {
        const x = left + (c + 0.5) * l.cellSize;
        const y = top + (r + 0.5) * l.cellSize;
        let alpha = p.dotAlpha;
        let size = dot;
        let color = p.grid;
        if (this.won) {
          const d = Math.hypot(c + 0.5 - l.cols / 2, r + 0.5 - l.rows / 2);
          const band = 1 - Math.min(1, Math.abs(front - d) / 1.5); // 1 at the wave front
          color = p.success;
          alpha = 0.22 + 0.6 * band * (1 - this.wave * 0.4);
          size = dot * (1 + 1.6 * band);
        }
        g.fillStyle(color, alpha);
        g.fillCircle(x, y, size);
      }
    }
  }
}
