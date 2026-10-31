import Phaser from 'phaser';
import type { BoardLayout } from './layout';
import { decorationScale, reducedMotion } from './motion';
import { palette } from './theme';

const WIN_WAVE_MS = 650;

/** Unit octagon: a dot of a few pixels looks round, and costs 8 triangles instead of fillCircle's 100. */
const OCT_COS = Array.from({ length: 9 }, (_, i) => Math.cos((i / 8) * Math.PI * 2));
const OCT_SIN = Array.from({ length: 9 }, (_, i) => Math.sin((i / 8) * Math.PI * 2));

function dot8(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number): void {
  for (let i = 0; i < 8; i++) g.fillTriangle(x, y, x + OCT_COS[i] * r, y + OCT_SIN[i] * r, x + OCT_COS[i + 1] * r, y + OCT_SIN[i + 1] * r);
}
const FAIL_WAVE_MS = 450;

/**
 * Draws the board: borderless, just a subtle dot at every cell on the page
 * background. The grid's logical edges (collisions, exits, hit testing) are
 * unchanged; only the frame, the recessed well and the grid lines are gone.
 * Also plays the board's entrance, the level-complete wave and the failure wave.
 *
 * The graphics are drawn around the board's centre and positioned there, so
 * the entrance can scale the whole board without redrawing it.
 */
export class BoardRenderer {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private layout?: BoardLayout;
  private won = false;
  /** Set when the level is lost: the dots turn red. */
  private failed = false;
  /** 0..1 progress of the win (outwards) or failure (inwards) wave; 1 = finished. */
  private wave = 1;
  private waveTween?: Phaser.Tweens.Tween;

  constructor(private readonly scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(0);
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

  /** Celebrates the cleared board: a green wave travels outwards across the dots, which stay green. */
  playWin(): void {
    if (!this.layout) return;
    this.won = true;
    this.stopEffects();
    this.runWave(WIN_WAVE_MS, 'Sine.easeOut');
  }

  /** Out of lives: a red wave contracts inwards across the dots, which stay red. */
  playFailure(): void {
    if (!this.layout) return;
    this.failed = true;
    this.stopEffects();
    this.runWave(FAIL_WAVE_MS, 'Cubic.easeOut');
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
  }

  private runWave(duration: number, ease: string): void {
    // The wave is decoration; the coloured dots alone say how the level ended.
    if (decorationScale() === 0) {
      this.draw();
      return;
    }
    this.waveTween = this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration,
      ease,
      onUpdate: (tween) => {
        this.wave = tween.getValue() ?? 1;
        this.draw();
      },
    });
  }

  private stopEffects(): void {
    this.waveTween?.remove();
    this.waveTween = undefined;
    this.wave = 1;
  }

  private draw(): void {
    const l = this.layout;
    if (!l) return;
    const g = this.graphics.clear();
    g.setPosition(l.x + l.width / 2, l.y + l.height / 2);
    const p = palette();
    const left = -l.width / 2 + l.padding;
    const top = -l.height / 2 + l.padding;
    const ended = this.won || this.failed;
    const accent = this.won ? p.success : p.error;

    // One dot per cell centre. While a wave runs, dots brighten as its front passes:
    // outwards from the centre on a win, inwards from the corners on a failure.
    const maxDistance = Math.hypot(l.cols / 2, l.rows / 2);
    const progress = this.won ? this.wave : 1 - this.wave;
    const front = progress * (maxDistance + 1.5);
    const dot = Math.max(1, l.cellSize * 0.045);
    for (let r = 0; r < l.rows; r++) {
      for (let c = 0; c < l.cols; c++) {
        let alpha = p.dotAlpha;
        let size = dot;
        let color = p.dots;
        if (ended) {
          const d = Math.hypot(c + 0.5 - l.cols / 2, r + 0.5 - l.rows / 2);
          const band = this.wave < 1 ? 1 - Math.min(1, Math.abs(front - d) / 1.5) : 0; // 1 at the wave front
          color = accent;
          alpha = 0.3 + 0.6 * band;
          size = dot * (1 + 1.6 * band);
        }
        g.fillStyle(color, alpha);
        dot8(g, left + (c + 0.5) * l.cellSize, top + (r + 0.5) * l.cellSize, size);
      }
    }
  }
}
