import Phaser from 'phaser';
import { DIRECTION_VECTORS } from '../core/Arrow';
import type { ArrowData, Direction } from '../core/types';
import { cellCenter, gridBounds, type BoardLayout, type Point } from './layout';
import { distanceToPolyline, polylineLength, slicePolyline } from './polyline';
import { ARROW_STYLE, COLORS, lighten, mixColors } from './theme';

export interface ExitCallbacks {
  /** The tail has crossed the grid edge: the board is free again. */
  onLeftBoard: () => void;
  /** The arrow has faded out and been destroyed. */
  onComplete: () => void;
}

export interface BlockedCallbacks {
  /** The tip has reached the blocking arrow. */
  onImpact: () => void;
  /** The arrow is back at rest. */
  onComplete: () => void;
}

/** Starts moving immediately, then accelerates: feels snappier than a pure ease-in. */
const launchEase = (t: number): number => 0.3 * t + 0.7 * t * t;

/**
 * Visual representation of one arrow. Holds no game rules: the scene tells
 * it what happened and it animates accordingly.
 *
 * The arrow is drawn as a window of fixed length sliding along a path made of
 * its own body plus a straight runway past the board edge. `offset` is how far
 * that window has moved, so 0 = resting and growing values = moving forward.
 */
export class ArrowView {
  readonly graphics: Phaser.GameObjects.Graphics;
  private layout: BoardLayout;
  /** Body path at rest: [tail stub] → cell centres → tip. Used for hit testing. */
  private restPath: Point[] = [];
  /** restPath plus a runway leading off-screen. */
  private path: Point[] = [];
  private bodyLength = 0;
  private offset = 0;
  private color: number = COLORS.cyan;
  private pressed = false;
  private flashTimer?: Phaser.Time.TimerEvent;
  /** Exit/bump animations are counter tweens (they target no object), so track them to stop them. */
  private motion?: Phaser.Tweens.Tween;

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

  /**
   * Re-fits the arrow to a new board size. Any in-place animation is cut
   * short, because its pixel distances belong to the old layout.
   */
  setLayout(layout: BoardLayout): void {
    this.stopAnimations();
    this.resetPose();
    this.layout = layout;
    this.rebuildPath();
    this.redraw();
  }

  /** Distance in pixels from a point to the resting arrow body. */
  distanceTo(x: number, y: number): number {
    return distanceToPolyline(this.restPath, { x, y });
  }

  /** Subtle highlight while a finger or mouse button is held on the arrow. */
  setPressed(pressed: boolean): void {
    if (this.pressed === pressed) return;
    this.pressed = pressed;
    this.redraw();
  }

  /** Staggered fade/slide-in used when the level (re)starts. */
  playIntro(delay: number): void {
    this.graphics.setAlpha(0);
    this.graphics.y = this.layout.cellSize * 0.15;
    this.scene.tweens.add({ targets: this.graphics, alpha: 1, y: 0, delay, duration: 240, ease: 'Cubic.easeOut' });
  }

  /** Slides the arrow along its body and off the board, then destroys it. */
  playExit(callbacks: ExitCallbacks): void {
    this.stopAnimations();
    this.resetPose();
    this.pressed = false;
    this.graphics.setDepth(1); // travel above resting arrows

    const cell = this.layout.cellSize;
    const view = this.scene.scale;
    const distance = this.bodyLength + Math.max(view.width, view.height);
    const duration = Phaser.Math.Clamp((distance / (cell * 24)) * 1000, 320, 560);
    const grid = gridBounds(this.layout);
    let leftAtProgress: number | null = null;

    this.motion = this.scene.tweens.addCounter({
      from: 0,
      to: distance,
      duration,
      ease: launchEase,
      onUpdate: (tween) => {
        this.offset = tween.getValue() ?? 0;
        // A short white-green flash at launch, settling into success green.
        const flash = Math.max(0, 1 - tween.elapsed / 140);
        this.color = lighten(COLORS.green, 0.6 * flash);

        if (leftAtProgress === null && !Phaser.Geom.Rectangle.Contains(grid, this.tailPoint().x, this.tailPoint().y)) {
          leftAtProgress = tween.progress;
          callbacks.onLeftBoard();
        }
        // Fade only once off the grid, so the whole slide across the board stays crisp.
        if (leftAtProgress !== null) {
          const fade = (tween.progress - leftAtProgress) / Math.max(0.0001, 1 - leftAtProgress);
          this.graphics.setAlpha(1 - fade);
        }
        this.redraw();
      },
      onComplete: () => {
        this.motion = undefined;
        if (leftAtProgress === null) callbacks.onLeftBoard();
        this.destroy();
        callbacks.onComplete();
      },
    });
  }

  /**
   * Feedback for an invalid move: turn red, slide forward until the tip
   * touches the blocking arrow, then spring back. `travel` is in pixels.
   */
  playBlocked(travel: number, callbacks: BlockedCallbacks): void {
    this.stopAnimations();
    this.resetPose();
    this.pressed = false;
    this.color = COLORS.red;

    const cells = travel / this.layout.cellSize;
    const outDuration = Phaser.Math.Clamp(60 + cells * 45, 70, 200);
    const back = () => {
      this.motion = this.scene.tweens.addCounter({
        from: travel,
        to: 0,
        duration: outDuration * 1.4,
        ease: 'Quad.easeOut',
        onUpdate: (tween) => this.setOffset(tween.getValue() ?? 0),
        onComplete: () => {
          this.motion = undefined;
          this.setOffset(0);
          this.flash(COLORS.red, 140);
          callbacks.onComplete();
        },
      });
    };

    this.motion = this.scene.tweens.addCounter({
      from: 0,
      to: travel,
      duration: outDuration,
      ease: 'Quad.easeIn',
      onUpdate: (tween) => this.setOffset(tween.getValue() ?? 0),
      onComplete: () => {
        callbacks.onImpact();
        back();
      },
    });
  }

  /** Reaction of the arrow that was hit: flashes orange and gets knocked in the hit direction. */
  playHit(direction: Direction): void {
    this.scene.tweens.killTweensOf(this.graphics);
    this.resetPose();
    this.flash(COLORS.orange, 420);
    const v = DIRECTION_VECTORS[direction];
    const knock = this.layout.cellSize * 0.07;
    this.scene.tweens.add({
      targets: this.graphics,
      x: v.dCol * knock,
      y: v.dRow * knock,
      duration: 60,
      ease: 'Quad.easeOut',
      yoyo: true,
    });
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
  }

  /** Back to the resting look: no offset, no tint, fully visible. */
  private resetPose(): void {
    this.offset = 0;
    this.color = COLORS.cyan;
    this.graphics.setAlpha(1).setPosition(0, 0);
  }

  private flash(color: number, duration: number): void {
    this.flashTimer?.remove();
    this.color = color;
    this.redraw();
    this.flashTimer = this.scene.time.delayedCall(duration, () => {
      this.flashTimer = undefined;
      this.color = COLORS.cyan;
      this.redraw();
    });
  }

  private setOffset(offset: number): void {
    this.offset = offset;
    this.redraw();
  }

  private tailPoint(): Point {
    return slicePolyline(this.path, this.offset, this.offset)[0] ?? this.path[0];
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
    this.restPath = points;
    this.bodyLength = polylineLength(points);

    // Runway long enough for the whole arrow to leave any canvas size.
    const runway = this.bodyLength + 2 * Math.max(this.scene.scale.width, this.scene.scale.height);
    this.path = [...points, { x: tip.x + v.dCol * runway, y: tip.y + v.dRow * runway }];
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
    const color = this.pressed ? lighten(this.color, 0.35) : this.color;
    const haloBoost = this.pressed ? 1.5 : 1;

    // Stop the shaft inside the arrowhead so its rounded cap doesn't poke out of the tip.
    const shaft = slicePolyline(segment, 0, polylineLength(segment) - headLength * 0.6);

    // Glow: opaque rings pre-blended with the board colour. Translucent strokes
    // would double up where segments and joints overlap, and a shader glow is
    // too expensive on phones, so this fakes it at no cost.
    for (const [extra, strength] of ARROW_STYLE.halo) {
      const haloColor = mixColors(COLORS.surface, color, Math.min(1, strength * haloBoost));
      const grow = cell * extra;
      this.strokeRounded(g, shaft, cell * ARROW_STYLE.bodyWidth + grow, haloColor);
      this.fillHead(g, tip, v, headLength + grow * 0.6, halfWidth + grow * 0.6, haloColor, grow * 0.4);
    }

    this.strokeRounded(g, shaft, cell * ARROW_STYLE.bodyWidth, color);
    this.fillHead(g, tip, v, headLength, halfWidth, color, 0);
    // A thin bright core line gives the "neon tube" look without extra glow.
    this.strokeRounded(g, shaft, cell * ARROW_STYLE.coreWidth, lighten(color, 0.55));
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
