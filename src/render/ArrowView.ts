import Phaser from 'phaser';
import { DIRECTION_VECTORS } from '../core/Arrow';
import type { ArrowData } from '../core/types';
import { cellCenter, type BoardLayout, type Point } from './layout';
import { polylineLength, slicePolyline } from './polyline';
import { ARROW_STYLE, COLORS, lighten, mixColors } from './theme';

/**
 * Visual representation of one arrow. Holds no game rules: the scene tells
 * it what happened and it animates accordingly.
 *
 * The arrow is drawn as a window of fixed length sliding along a path made of
 * its own body plus a straight runway past the board edge. `offset` is how far
 * that window has moved, so 0 = resting and growing values = leaving the board.
 */
export class ArrowView {
  readonly graphics: Phaser.GameObjects.Graphics;
  private layout: BoardLayout;
  private path: Point[] = [];
  private bodyLength = 0;
  private offset = 0;
  private color: number = COLORS.cyan;
  private flashTimer?: Phaser.Time.TimerEvent;
  /** Exit/bump animations are counter tweens (they target no object), so track them to stop them. */
  private motion?: Phaser.Tweens.Tween;
  private busy = false;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly data: ArrowData,
    layout: BoardLayout,
    parent: Phaser.GameObjects.Container,
  ) {
    this.graphics = scene.add.graphics();
    parent.add(this.graphics);
    this.layout = layout;
    this.rebuildPath();
    this.redraw();
  }

  /** True while a blocked-feedback animation is running; taps are ignored meanwhile. */
  get isBusy(): boolean {
    return this.busy;
  }

  setLayout(layout: BoardLayout): void {
    this.layout = layout;
    this.rebuildPath();
    this.redraw();
  }

  /** Staggered fade/slide-in used when the level (re)starts. */
  playIntro(delay: number): void {
    this.graphics.setAlpha(0);
    this.graphics.y = this.layout.cellSize * 0.15;
    this.scene.tweens.add({ targets: this.graphics, alpha: 1, y: 0, delay, duration: 260, ease: 'Cubic.easeOut' });
  }

  /** Slides the arrow along its body and off the board, then destroys it. */
  playExit(onComplete: () => void): void {
    this.stopAnimations();
    this.graphics.setAlpha(1).setY(0);
    this.offset = 0;
    this.color = COLORS.green;
    this.graphics.setDepth(1); // travel above resting arrows

    const view = this.scene.scale;
    const distance = this.bodyLength + Math.max(view.width, view.height);
    const cellsPerSecond = 18;
    const duration = Phaser.Math.Clamp((distance / (this.layout.cellSize * cellsPerSecond)) * 1000, 380, 850);

    this.motion = this.scene.tweens.addCounter({
      from: 0,
      to: distance,
      duration,
      ease: 'Quad.easeIn',
      onUpdate: (tween) => {
        this.offset = tween.getValue() ?? 0;
        // Fade out over the second half so it never pops at the canvas edge.
        this.graphics.setAlpha(Math.min(1, 2 - 2 * tween.progress));
        this.redraw();
      },
      onComplete: () => {
        this.destroy();
        onComplete();
      },
    });
  }

  /**
   * Feedback for an invalid move: turn red, bump forward towards the blocker
   * (never into it) and spring back.
   */
  playBlocked(freeCells: number): void {
    this.busy = true;
    const cell = this.layout.cellSize;
    // With no free cell the tip already sits ~0.36 cells from the blocker's edge,
    // so a small bump reads as "hit"; with room ahead, travel a bit further.
    const nudge = freeCells === 0 ? cell * 0.14 : Math.min(cell * 0.5, freeCells * cell);
    this.setColor(COLORS.red);
    this.motion = this.scene.tweens.addCounter({
      from: 0,
      to: nudge,
      duration: 90,
      ease: 'Quad.easeOut',
      yoyo: true,
      onUpdate: (tween) => {
        this.offset = tween.getValue() ?? 0;
        this.redraw();
      },
      onComplete: () => {
        this.offset = 0;
        this.redraw();
        this.flash(COLORS.red, 220, () => {
          this.busy = false;
        });
      },
    });
  }

  /** Briefly highlights this arrow as the one blocking another. */
  flashAsBlocker(): void {
    this.flash(COLORS.orange, 380);
  }

  destroy(): void {
    this.stopAnimations();
    this.graphics.destroy();
  }

  private stopAnimations(): void {
    this.flashTimer?.remove();
    this.flashTimer = undefined;
    this.motion?.remove();
    this.motion = undefined;
    this.scene.tweens.killTweensOf(this.graphics);
    this.busy = false;
  }

  private flash(color: number, duration: number, onDone?: () => void): void {
    this.flashTimer?.remove();
    this.setColor(color);
    this.flashTimer = this.scene.time.delayedCall(duration, () => {
      this.setColor(COLORS.cyan);
      onDone?.();
    });
  }

  private setColor(color: number): void {
    this.color = color;
    this.redraw();
  }

  /** Builds the travel path in pixels: [tail stub] → cell centres → tip → far runway point. */
  private rebuildPath(): void {
    const { cellSize } = this.layout;
    const v = DIRECTION_VECTORS[this.data.direction];
    const centres = this.data.cells.map((c) => cellCenter(this.layout, c));
    const head = centres[centres.length - 1];

    const points: Point[] = [];
    if (centres.length === 1) {
      // A single-cell arrow still needs a visible shaft behind its head.
      points.push({ x: head.x - v.dCol * cellSize * ARROW_STYLE.stubLength, y: head.y - v.dRow * cellSize * ARROW_STYLE.stubLength });
    }
    points.push(...centres);
    const tip = { x: head.x + v.dCol * cellSize * ARROW_STYLE.tipOffset, y: head.y + v.dRow * cellSize * ARROW_STYLE.tipOffset };
    points.push(tip);
    this.bodyLength = polylineLength(points);

    // Runway long enough for the whole arrow to leave any canvas size.
    const runway = this.bodyLength + 2 * Math.max(this.scene.scale.width, this.scene.scale.height);
    points.push({ x: tip.x + v.dCol * runway, y: tip.y + v.dRow * runway });
    this.path = points;
  }

  private redraw(): void {
    const g = this.graphics.clear();
    const cell = this.layout.cellSize;
    const segment = slicePolyline(this.path, this.offset, this.offset + this.bodyLength);
    if (segment.length < 2) return;

    const tip = segment[segment.length - 1];
    const v = DIRECTION_VECTORS[this.data.direction];
    const headLength = cell * ARROW_STYLE.headLength;
    const halfWidth = cell * ARROW_STYLE.headHalfWidth;

    // Stop the shaft inside the arrowhead so its rounded cap doesn't poke out of the tip.
    const shaft = slicePolyline(segment, 0, polylineLength(segment) - headLength * 0.6);

    // Glow: opaque rings pre-blended with the board colour. Translucent strokes
    // would double up where segments and joints overlap, and a shader glow is
    // too expensive on phones, so this fakes it at no cost.
    for (const [extra, strength] of ARROW_STYLE.halo) {
      const haloColor = mixColors(COLORS.surface, this.color, strength);
      const grow = cell * extra;
      this.strokeRounded(g, shaft, cell * ARROW_STYLE.bodyWidth + grow, haloColor);
      this.fillHead(g, tip, v, headLength + grow * 0.6, halfWidth + grow * 0.6, haloColor, grow * 0.4);
    }

    this.strokeRounded(g, shaft, cell * ARROW_STYLE.bodyWidth, this.color);
    this.fillHead(g, tip, v, headLength, halfWidth, this.color, 0);
    // A thin bright core line gives the "neon tube" look without extra glow.
    this.strokeRounded(g, shaft, cell * ARROW_STYLE.coreWidth, lighten(this.color, 0.55));
  }

  /** Arrowhead triangle with its tip at `tip`, optionally pushed forward by `forward` (for halos). */
  private fillHead(
    g: Phaser.GameObjects.Graphics,
    tip: Point,
    v: { dRow: number; dCol: number },
    length: number,
    halfWidth: number,
    color: number,
    forward: number,
  ): void {
    const tx = tip.x + v.dCol * forward;
    const ty = tip.y + v.dRow * forward;
    const baseX = tx - v.dCol * length;
    const baseY = ty - v.dRow * length;
    g.fillStyle(color, 1);
    g.fillTriangle(
      tx,
      ty,
      baseX - v.dRow * halfWidth,
      baseY + v.dCol * halfWidth,
      baseX + v.dRow * halfWidth,
      baseY - v.dCol * halfWidth,
    );
  }

  /** Thick polyline with round caps and joins (circles at every vertex). */
  private strokeRounded(g: Phaser.GameObjects.Graphics, points: readonly Point[], width: number, color: number): void {
    if (points.length < 2) return;
    g.lineStyle(width, color, 1);
    g.fillStyle(color, 1);
    for (let i = 1; i < points.length; i++) {
      g.lineBetween(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y);
    }
    for (const p of points) g.fillCircle(p.x, p.y, width / 2);
  }
}
