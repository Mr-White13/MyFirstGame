import Phaser from 'phaser';
import { DIRECTION_VECTORS } from '../core/Arrow';
import type { ArrowData, Direction } from '../core/types';
import type { FxLayer } from './FxLayer';
import { cellCenter, gridBounds, type BoardLayout, type Point } from './layout';
import { decorationScale, reducedMotion } from './motion';
import { distanceToPolyline, polylineLength, slicePolyline } from './polyline';
import { ARROW_STYLE, arrowColor, lighten, mixColors, palette } from './theme';

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
/** Points used to approximate each rounded turn. */
const CORNER_STEPS = 6;

/**
 * Visual representation of one arrow. Holds no game rules: the scene tells
 * it what happened and it animates accordingly.
 *
 * The arrow is drawn as a window of fixed length sliding along a path made of
 * its own body (with rounded turns) plus a straight runway past the board
 * edge. `offset` is how far that window has moved, so 0 = resting and growing
 * values = moving forward.
 */
export class ArrowView {
  readonly graphics: Phaser.GameObjects.Graphics;
  private layout: BoardLayout;
  /** Body path at rest: [tail stub] → cell centres (rounded turns) → tip. Used for hit testing. */
  private restPath: Point[] = [];
  /** restPath plus a runway leading off-screen. */
  private path: Point[] = [];
  private bodyLength = 0;
  private offset = 0;
  private color: number;
  /** Set once the arrow is activated (tapped while blocked): it rests in red, drawn as a dashed tube. */
  private activated = false;
  private pressed = false;
  /** Length of the energy trail drawn behind the tail while leaving. */
  private trail = 0;
  private flashTimer?: Phaser.Time.TimerEvent;
  /** Exit/bump animations are counter tweens (they target no object), so track them to stop them. */
  private motion?: Phaser.Tweens.Tween;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly data: ArrowData,
    layout: BoardLayout,
    parent: Phaser.GameObjects.Container,
    private readonly fx: FxLayer,
    /** Position in level order; picks the arrow's colour in multi-colour themes. */
    private readonly colorIndex = 0,
  ) {
    this.color = this.baseColor;
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

  /**
   * Activated arrows stay red until they leave the board, so the player can
   * see which arrows are waiting to be released by a chain reaction.
   */
  setActivated(activated: boolean): void {
    this.activated = activated;
    if (!this.flashTimer && !this.motion) {
      this.color = this.baseColor;
      this.redraw();
    }
  }

  /**
   * Picks up the active theme's colours. A running animation keeps its
   * effect colours and settles into the new resting colour when it ends.
   */
  refreshTheme(): void {
    if (!this.flashTimer && !this.motion) this.color = this.baseColor;
    this.redraw();
  }

  /** Fade/slide-in used when the level (re)starts. Input is never blocked by it. */
  playIntro(delay: number): void {
    if (reducedMotion()) return;
    this.graphics.setAlpha(0);
    this.graphics.y = this.layout.cellSize * 0.12;
    this.scene.tweens.add({ targets: this.graphics, alpha: 1, y: 0, delay, duration: 220, ease: 'Cubic.easeOut' });
  }

  /**
   * Slides the arrow along its body and off the board, then destroys it.
   * `auto` marks a release by a chain reaction: it launches from red with a
   * purple ring instead of the cyan-to-green flash of a tapped arrow.
   */
  playExit(callbacks: ExitCallbacks, options: { auto?: boolean } = {}): void {
    this.stopAnimations();
    this.resetPose();
    this.pressed = false;
    this.graphics.setDepth(1); // travel above resting arrows

    const cell = this.layout.cellSize;
    const view = this.scene.scale;
    const distance = this.bodyLength + Math.max(view.width, view.height);
    const duration = Phaser.Math.Clamp((distance / (cell * 26)) * 1000, 300, 520);
    const grid = gridBounds(this.layout);
    const v = DIRECTION_VECTORS[this.data.direction];
    const decoration = decorationScale();
    const p = palette();
    let leftAtProgress: number | null = null;
    let headOut = false;

    const tip = this.restPath[this.restPath.length - 1];
    // A collected Energy Arrow sends out a gold ring (decoration only: the point was awarded when the rules removed it).
    if (this.data.energy) this.fx.ring(tip.x, tip.y, p.energy, cell, 0.2, 0.95, 380);
    if (options.auto) {
      this.fx.ring(tip.x, tip.y, p.chain, cell, 0.15, 0.75, 320);
      this.fx.burst(tip.x, tip.y, v.dCol, v.dRow, p.chain, cell, 5, 1.4);
    } else {
      this.fx.ring(tip.x, tip.y, p.success, cell, 0.12, 0.5, 240);
    }
    const launchColor = options.auto ? p.error : p.success;

    this.motion = this.scene.tweens.addCounter({
      from: 0,
      to: distance,
      duration,
      ease: launchEase,
      onUpdate: (tween) => {
        this.offset = tween.getValue() ?? 0;
        // A short white-green flash at launch, settling into success green.
        const flash = Math.max(0, 1 - tween.elapsed / 140);
        this.color = flash > 0 ? mixColors(p.success, lighten(launchColor, 0.4), flash) : p.success;
        this.trail = Math.min(this.offset, cell * ARROW_STYLE.trailLength * decoration);

        // Sparks where the head breaks through the edge of the grid.
        if (!headOut) {
          const head = this.pointAt(this.offset + this.bodyLength);
          if (!Phaser.Geom.Rectangle.Contains(grid, head.x, head.y)) {
            headOut = true;
            const edge = clampToRect(head, grid);
            this.fx.burst(edge.x, edge.y, v.dCol, v.dRow, p.success, cell, 9);
            this.fx.ring(edge.x, edge.y, p.success, cell, 0.1, 0.6, 300);
          }
        }

        const tail = this.pointAt(this.offset);
        if (leftAtProgress === null && !Phaser.Geom.Rectangle.Contains(grid, tail.x, tail.y)) {
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
  playBlocked(travel: number, callbacks: BlockedCallbacks, options: { activate?: boolean } = {}): void {
    this.stopAnimations();
    this.resetPose();
    this.pressed = false;
    this.color = palette().error;

    const cell = this.layout.cellSize;
    const v = DIRECTION_VECTORS[this.data.direction];
    const outDuration = Phaser.Math.Clamp(60 + (travel / cell) * 45, 70, 190);
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
          if (options.activate) {
            // From now on the arrow rests in red; a red ring marks the moment it was activated.
            this.activated = true;
            const head = this.restPath[this.restPath.length - 1];
            this.fx.ring(head.x, head.y, palette().error, cell, 0.2, 0.7, 300);
          }
          this.flash(lighten(palette().error, 0.35), 140);
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
        // Small orange sparks bouncing back off the blocker at the point of contact.
        const tip = this.pointAt(this.offset + this.bodyLength);
        this.fx.burst(tip.x, tip.y, -v.dCol, -v.dRow, palette().warning, cell, 5, 1.1);
        this.fx.ring(tip.x, tip.y, palette().warning, cell, 0.08, 0.35, 220);
        callbacks.onImpact();
        back();
      },
    });
  }

  /**
   * Gentle feedback for tapping an arrow that is already red and still
   * blocked: a short nudge, no impact, no penalty.
   */
  playNudge(onComplete: () => void): void {
    this.stopAnimations();
    this.resetPose();
    const distance = this.layout.cellSize * 0.1;
    this.color = lighten(this.baseColor, 0.3);
    this.motion = this.scene.tweens.addCounter({
      from: 0,
      to: distance,
      duration: 70,
      ease: 'Quad.easeOut',
      yoyo: true,
      onUpdate: (tween) => this.setOffset(tween.getValue() ?? 0),
      onComplete: () => {
        this.motion = undefined;
        this.color = this.baseColor;
        this.setOffset(0);
        onComplete();
      },
    });
  }

  /** Reaction of the arrow that was hit: flashes orange and gets knocked in the hit direction. */
  playHit(direction: Direction): void {
    this.scene.tweens.killTweensOf(this.graphics);
    this.resetPose();
    this.flash(palette().warning, 380);
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

  /** Resting colour: the theme's arrow colour, or the error colour once activated. */
  private get baseColor(): number {
    const p = palette();
    return this.activated ? p.error : arrowColor(p, this.colorIndex);
  }

  /** Back to the resting look: no offset, no tint, fully visible. */
  private resetPose(): void {
    this.offset = 0;
    this.trail = 0;
    this.color = this.baseColor;
    this.graphics.setAlpha(1).setPosition(0, 0);
  }

  private flash(color: number, duration: number): void {
    this.flashTimer?.remove();
    this.color = color;
    this.redraw();
    this.flashTimer = this.scene.time.delayedCall(duration, () => {
      this.flashTimer = undefined;
      this.color = this.baseColor;
      this.redraw();
    });
  }

  private setOffset(offset: number): void {
    this.offset = offset;
    this.redraw();
  }

  private pointAt(distance: number): Point {
    return slicePolyline(this.path, distance, distance)[0] ?? this.path[0];
  }

  /** Builds the travel path in pixels: [tail stub] → cell centres with rounded turns → tip → runway. */
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
    points.push(...roundCorners(centres, cellSize * ARROW_STYLE.cornerRadius));
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
    const p = palette();
    const cell = this.layout.cellSize;
    const segment = slicePolyline(this.path, this.offset, this.offset + this.bodyLength);
    if (segment.length < 2) return;

    const tip = segment[segment.length - 1];
    const v = DIRECTION_VECTORS[this.data.direction];
    const headLength = cell * ARROW_STYLE.headLength;
    const halfWidth = cell * ARROW_STYLE.headHalfWidth;
    const bodyWidth = cell * ARROW_STYLE.bodyWidth;
    const color = this.pressed ? lighten(this.color, 0.35) : this.color;
    const haloBoost = this.pressed ? 1.6 : 1;

    // Energy trail: three tapered, fading pieces over the cells just vacated.
    if (this.trail > 1) {
      const pieces = 3;
      for (let i = 0; i < pieces; i++) {
        const from = this.offset - this.trail * (1 - i / pieces);
        const to = this.offset - this.trail * (1 - (i + 1) / pieces);
        const piece = slicePolyline(this.path, Math.max(0, from), Math.max(0, to));
        const strength = (i + 1) / pieces;
        g.lineStyle(bodyWidth * (0.25 + 0.45 * strength), color, 0.12 + 0.3 * strength);
        for (let k = 1; k < piece.length; k++) g.lineBetween(piece[k - 1].x, piece[k - 1].y, piece[k].x, piece[k].y);
      }
    }

    // Stop the shaft inside the arrowhead so its rounded cap doesn't poke out of the tip.
    const shaft = slicePolyline(segment, 0, polylineLength(segment) - headLength * 0.55);

    // Glow: opaque rings pre-blended with the board colour. Translucent strokes
    // would double up where segments and joints overlap, and a shader glow is
    // too expensive on phones, so this fakes it at no cost.
    for (const [extra, strength] of ARROW_STYLE.halo) {
      const haloColor = mixColors(p.well, color, Math.min(1, strength * haloBoost * p.glow));
      const grow = cell * extra;
      this.strokeRounded(g, shaft, bodyWidth + grow, haloColor);
      this.fillHead(g, tip, v, headLength + grow * 0.7, halfWidth + grow * 0.55, haloColor, grow * 0.45);
    }

    this.strokeRounded(g, shaft, bodyWidth, color);
    this.fillHead(g, tip, v, headLength, halfWidth, color, 0);
    // A thin bright core line gives the "neon tube" look without extra glow.
    // Energy Arrows get a gold core instead of a white one, while resting.
    const resting = this.color === this.baseColor && !this.activated;
    this.strokeRounded(g, shaft, cell * ARROW_STYLE.coreWidth, this.data.energy && resting ? p.energy : lighten(color, p.core));
    // Activated arrows are cut into a dashed tube, so they differ from the
    // others by shape as well as by colour (colour-blind players, any theme).
    if (this.activated && this.color === this.baseColor) this.cutDashes(g, shaft, bodyWidth, mixColors(p.well, color, 0.2));
    // A small dark socket marks the tail, so an arrowhead pointing straight
    // into the next arrow's tail still reads as two separate arrows.
    const tail = shaft[0] ?? segment[0];
    g.fillStyle(p.well, 1);
    g.fillCircle(tail.x, tail.y, bodyWidth * 0.2);
    // Energy marker: a gold diamond with a dark rim on the body, kept when the arrow turns red.
    if (this.data.energy) this.drawEnergyMarker(g, shaft, bodyWidth, p.energy, p.well);
  }

  /** A small diamond halfway along the shaft (behind the head, so the direction stays readable). */
  private drawEnergyMarker(g: Phaser.GameObjects.Graphics, shaft: readonly Point[], bodyWidth: number, color: number, rim: number): void {
    const length = polylineLength(shaft);
    const at = slicePolyline(shaft, length * 0.45, length * 0.45)[0] ?? shaft[0];
    if (!at) return;
    const r = bodyWidth * 0.95;
    const diamond = (size: number) => [
      { x: at.x, y: at.y - size },
      { x: at.x + size, y: at.y },
      { x: at.x, y: at.y + size },
      { x: at.x - size, y: at.y },
    ];
    g.fillStyle(rim, 1);
    g.fillPoints(diamond(r * 1.3), true);
    g.fillStyle(color, 1);
    g.fillPoints(diamond(r), true);
    g.fillStyle(rim, 0.85);
    g.fillPoints(diamond(r * 0.35), true);
  }

  /** Short gaps across the body at regular spacing along it. */
  private cutDashes(g: Phaser.GameObjects.Graphics, shaft: readonly Point[], bodyWidth: number, color: number): void {
    const cell = this.layout.cellSize;
    const gap = cell * ARROW_STYLE.activatedGap;
    const spacing = cell * ARROW_STYLE.activatedSpacing;
    const length = polylineLength(shaft);
    g.lineStyle(bodyWidth * 1.08, color, 1);
    for (let d = spacing * 0.6; d + gap < length; d += spacing) {
      const piece = slicePolyline(shaft, d, d + gap);
      for (let k = 1; k < piece.length; k++) g.lineBetween(piece[k - 1].x, piece[k - 1].y, piece[k].x, piece[k].y);
    }
  }

  /**
   * Arrowhead with a shallow notch at the back, which reads as an arrow even
   * at small sizes. `forward` pushes the tip ahead (used for the halo).
   */
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
    const notchX = baseX + v.dCol * length * ARROW_STYLE.headNotch;
    const notchY = baseY + v.dRow * length * ARROW_STYLE.headNotch;
    g.fillStyle(color, 1);
    g.fillPoints(
      [
        { x: tx, y: ty },
        { x: baseX - v.dRow * halfWidth, y: baseY + v.dCol * halfWidth },
        { x: notchX, y: notchY },
        { x: baseX + v.dRow * halfWidth, y: baseY - v.dCol * halfWidth },
      ],
      true,
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

/**
 * Replaces each right-angle turn of a cell-centre path with a quarter circle
 * of radius `r`, so bent arrows read as one smooth tube.
 */
function roundCorners(points: readonly Point[], r: number): Point[] {
  if (points.length < 3) return [...points];
  const out: Point[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const at = points[i];
    const next = points[i + 1];
    const inX = Math.sign(at.x - prev.x);
    const inY = Math.sign(at.y - prev.y);
    const outX = Math.sign(next.x - at.x);
    const outY = Math.sign(next.y - at.y);
    if (inX === outX && inY === outY) {
      out.push(at); // straight through: keep the vertex
      continue;
    }
    // Arc from (at - in·r) to (at + out·r) around centre (at - in·r + out·r).
    const cx = at.x - inX * r + outX * r;
    const cy = at.y - inY * r + outY * r;
    for (let s = 0; s <= CORNER_STEPS; s++) {
      const theta = (s / CORNER_STEPS) * (Math.PI / 2);
      out.push({
        x: cx - outX * r * Math.cos(theta) + inX * r * Math.sin(theta),
        y: cy - outY * r * Math.cos(theta) + inY * r * Math.sin(theta),
      });
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

function clampToRect(p: Point, rect: Phaser.Geom.Rectangle): Point {
  return {
    x: Phaser.Math.Clamp(p.x, rect.left, rect.right),
    y: Phaser.Math.Clamp(p.y, rect.top, rect.bottom),
  };
}
