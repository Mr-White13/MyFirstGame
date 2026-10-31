import Phaser from 'phaser';
import { DIRECTION_VECTORS } from '../core/Arrow';
import type { ArrowData, Direction } from '../core/types';
import type { FxLayer } from './FxLayer';
import { cellCenter, gridBounds, type BoardLayout, type Point } from './layout';
import { decorationScale, reducedMotion } from './motion';
import { distanceToPolyline, MeasuredPolyline, type MutablePoint } from './polyline';
import { arrowColor, lighten, mixColors, palette } from './theme';

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
/** Corner arcs: at least this many segments, more on large cells (about one per 4 px of arc). */
const CORNER_STEPS = 6;
const CORNER_STEP_PX = 4;
const MAX_CORNER_STEPS = 24;

/** Unit-circle points for the triangle-fan discs (caps, sockets): enough for a smooth edge at arrow sizes. */
const DISC_STEPS = 14;
const DISC_COS = Array.from({ length: DISC_STEPS + 1 }, (_, i) => Math.cos((i / DISC_STEPS) * Math.PI * 2));
const DISC_SIN = Array.from({ length: DISC_STEPS + 1 }, (_, i) => Math.sin((i / DISC_STEPS) * Math.PI * 2));

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
  /** restPath plus a runway leading off-screen, measured once so per-frame slicing is cheap. */
  private path = new MeasuredPolyline([{ x: 0, y: 0 }]);
  /** Reused point buffers: redraw() allocates nothing per frame. */
  private readonly shaftBuf: MutablePoint[] = [];
  private readonly pieceBuf: MutablePoint[] = [];
  private readonly tipBuf: MutablePoint = { x: 0, y: 0 };
  private readonly probeBuf: MutablePoint = { x: 0, y: 0 };
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
    /** The resting-arrow cache, told when this arrow is redrawn while at rest (see StaticArrowLayer). */
    private readonly cache?: { invalidate(): void },
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

  /**
   * True while the arrow is at rest and looks exactly as recorded: no
   * movement, flash, press highlight or tween. Resting arrows are drawn from
   * the shared cache; the rest are live Graphics.
   */
  get isStatic(): boolean {
    return !this.motion && !this.flashTimer && !this.pressed && this.offset === 0 && this.trail === 0 && !this.scene.tweens.isTweening(this.graphics);
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
  /** `auto`: a red arrow released by a chain reaction. `cascade`: a normal arrow cleared by a cascade. */
  playExit(callbacks: ExitCallbacks, options: { auto?: boolean; cascade?: boolean } = {}): void {
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
    } else if (options.cascade) {
      // Cascade: a wider double ring in the arrow's own success colour, so it reads as "swept along".
      this.fx.ring(tip.x, tip.y, p.success, cell, 0.15, 0.85, 340);
      this.fx.ring(tip.x, tip.y, p.success, cell, 0.1, 0.45, 220);
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
        this.trail = Math.min(this.offset, cell * this.layout.style.trailLength * decoration);

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

  /**
   * Back to the resting look: no offset, no tint, fully visible. Every
   * animation starts here, so an arrow that was drawn from the resting cache
   * (hidden Graphics) is always shown live while it moves.
   */
  private resetPose(): void {
    this.offset = 0;
    this.trail = 0;
    this.color = this.baseColor;
    this.graphics.setAlpha(1).setPosition(0, 0).setVisible(true);
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

  /** The point `distance` along the travel path (a shared buffer: read it before the next call). */
  private pointAt(distance: number): Point {
    return this.path.pointAt(distance, this.probeBuf);
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
      points.push({ x: head.x - v.dCol * cellSize * this.layout.style.stubLength, y: head.y - v.dRow * cellSize * this.layout.style.stubLength });
    }
    points.push(...roundCorners(centres, cellSize * this.layout.style.cornerRadius));
    const tip = { x: head.x + v.dCol * cellSize * this.layout.style.tipOffset, y: head.y + v.dRow * cellSize * this.layout.style.tipOffset };
    points.push(tip);
    this.restPath = points;
    this.bodyLength = new MeasuredPolyline(points).length;

    // Runway long enough for the whole arrow to leave any canvas size.
    const runway = this.bodyLength + 2 * Math.max(this.scene.scale.width, this.scene.scale.height);
    this.path = new MeasuredPolyline([...points, { x: tip.x + v.dCol * runway, y: tip.y + v.dRow * runway }]);
  }

  /**
   * Draws the arrow at its current offset. Called once per animation frame
   * for a moving arrow only; resting arrows keep their recorded commands.
   * Everything is cut from the measured path into reused buffers, strokes
   * are single joined paths, and caps are small triangle fans, so Phaser has
   * little geometry to rebuild each frame.
   */
  private redraw(): void {
    if (this.isStatic) this.cache?.invalidate();
    const g = this.graphics.clear();
    const p = palette();
    const cell = this.layout.cellSize;
    const style = this.layout.style;
    const start = this.offset;
    const end = this.offset + this.bodyLength;
    if (this.bodyLength <= 0) return;

    const tip = this.path.pointAt(end, this.tipBuf);
    const v = DIRECTION_VECTORS[this.data.direction];
    const headLength = cell * style.headLength;
    const halfWidth = cell * style.headHalfWidth;
    const bodyWidth = cell * style.bodyWidth;
    const color = this.pressed ? lighten(this.color, 0.35) : this.color;
    const haloBoost = this.pressed ? 1.6 : 1;
    const moving = this.motion !== undefined && this.offset > 0;

    // Energy trail: three tapered, fading pieces over the cells just vacated.
    if (this.trail > 1) {
      const pieces = 3;
      for (let i = 0; i < pieces; i++) {
        const from = start - this.trail * (1 - i / pieces);
        const to = start - this.trail * (1 - (i + 1) / pieces);
        const n = this.path.sliceInto(Math.max(0, from), Math.max(0, to), this.pieceBuf);
        const strength = (i + 1) / pieces;
        if (n >= 2) {
          g.lineStyle(bodyWidth * (0.25 + 0.45 * strength), color, 0.12 + 0.3 * strength);
          g.strokePoints(this.pieceBuf, false, false, n);
        }
      }
    }

    // Stop the shaft inside the arrowhead so its rounded cap doesn't poke out of the tip.
    const shaftEnd = end - headLength * 0.55;
    const n = this.path.sliceInto(start, shaftEnd, this.shaftBuf);
    const shaft = this.shaftBuf;

    // Glow: opaque rings pre-blended with the board colour. Translucent strokes
    // would double up where segments and joints overlap, and a shader glow is
    // too expensive on phones, so this fakes it at no cost. While moving, only
    // the inner ring is drawn: the outer one is invisible at speed.
    style.halo.forEach(([extra, strength], index) => {
      if (moving && index === 0 && style.halo.length > 1) return;
      const haloColor = mixColors(p.well, color, Math.min(1, strength * haloBoost * p.glow));
      const grow = cell * extra;
      this.strokeRounded(g, shaft, n, bodyWidth + grow, haloColor);
      this.fillHead(g, tip, v, headLength + grow * 0.7, halfWidth + grow * 0.55, haloColor, grow * 0.45);
    });

    this.strokeRounded(g, shaft, n, bodyWidth, color);
    this.fillHead(g, tip, v, headLength, halfWidth, color, 0);
    // A thin bright core line gives the "neon tube" look without extra glow.
    // Energy Arrows get a gold core instead of a white one, while resting.
    const resting = this.color === this.baseColor && !this.activated;
    if (style.coreWidth > 0) this.strokeRounded(g, shaft, n, cell * style.coreWidth, this.data.energy && resting ? p.energy : lighten(color, p.core));
    // Activated arrows are cut into a dashed tube, so they differ from the
    // others by shape as well as by colour (colour-blind players, any theme).
    if (this.activated && this.color === this.baseColor) this.cutDashes(g, start, shaftEnd, bodyWidth, mixColors(p.well, color, 0.2));
    // A small dark socket marks the tail, so an arrowhead pointing straight
    // into the next arrow's tail still reads as two separate arrows.
    if (n > 0) disc(g, shaft[0].x, shaft[0].y, bodyWidth * 0.2, p.well);
    // Energy marker: a gold diamond with a dark rim on the body, kept when the arrow turns red.
    if (this.data.energy && shaftEnd > start) this.drawEnergyMarker(g, this.path.pointAt(start + (shaftEnd - start) * 0.45, this.probeBuf), p.energy, p.well);
  }

  /** A small diamond on the shaft (behind the head, so the direction stays readable). */
  private drawEnergyMarker(g: Phaser.GameObjects.Graphics, at: Point, color: number, rim: number): void {
    const r = this.layout.cellSize * this.layout.style.markerSize;
    diamond(g, at, r * 1.3, rim, 1);
    diamond(g, at, r, color, 1);
    diamond(g, at, r * 0.35, rim, 0.85);
  }

  /** Short gaps across the body at regular spacing along the shaft (between path distances `from` and `to`). */
  private cutDashes(g: Phaser.GameObjects.Graphics, from: number, to: number, bodyWidth: number, color: number): void {
    const cell = this.layout.cellSize;
    const gap = cell * this.layout.style.activatedGap;
    const spacing = cell * this.layout.style.activatedSpacing;
    g.lineStyle(bodyWidth * 1.08, color, 1);
    for (let d = from + spacing * 0.6; d + gap < to; d += spacing) {
      const n = this.path.sliceInto(d, d + gap, this.pieceBuf);
      if (n >= 2) g.strokePoints(this.pieceBuf, false, false, n);
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
    const notchX = baseX + v.dCol * length * this.layout.style.headNotch;
    const notchY = baseY + v.dRow * length * this.layout.style.headNotch;
    // Two triangles (tip–left–notch, tip–notch–right): no polygon triangulation per frame.
    g.fillStyle(color, 1);
    g.fillTriangle(tx, ty, baseX - v.dRow * halfWidth, baseY + v.dCol * halfWidth, notchX, notchY);
    g.fillTriangle(tx, ty, notchX, notchY, baseX + v.dRow * halfWidth, baseY - v.dCol * halfWidth);
  }

  /**
   * Thick polyline with round ends: one joined stroke (Phaser bridges the
   * small angles between the arc segments) plus a disc at each end. Drawing a
   * filled circle at every vertex, as before, made Phaser rebuild thousands
   * of triangles per arrow every frame.
   */
  private strokeRounded(g: Phaser.GameObjects.Graphics, points: readonly Point[], count: number, width: number, color: number): void {
    if (count < 2) return;
    g.lineStyle(width, color, 1);
    g.strokePoints(points as Phaser.Types.Math.Vector2Like[], false, false, count);
    disc(g, points[0].x, points[0].y, width / 2, color);
    disc(g, points[count - 1].x, points[count - 1].y, width / 2, color);
  }
}

/**
 * Replaces each right-angle turn of a cell-centre path with a quarter circle
 * of radius `r`, so bent arrows read as one smooth tube.
 */
function roundCorners(points: readonly Point[], r: number): Point[] {
  if (points.length < 3) return [...points];
  const steps = Math.min(MAX_CORNER_STEPS, Math.max(CORNER_STEPS, Math.ceil((r * Math.PI) / 2 / CORNER_STEP_PX)));
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
    for (let s = 0; s <= steps; s++) {
      const theta = (s / steps) * (Math.PI / 2);
      out.push({
        x: cx - outX * r * Math.cos(theta) + inX * r * Math.sin(theta),
        y: cy - outY * r * Math.cos(theta) + inY * r * Math.sin(theta),
      });
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

/** A filled disc as a triangle fan (cheaper than Graphics.fillCircle, which tessellates 100 segments). */
function disc(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, color: number): void {
  g.fillStyle(color, 1);
  for (let i = 0; i < DISC_STEPS; i++) {
    g.fillTriangle(x, y, x + DISC_COS[i] * r, y + DISC_SIN[i] * r, x + DISC_COS[i + 1] * r, y + DISC_SIN[i + 1] * r);
  }
}

/** A filled diamond (two triangles). */
function diamond(g: Phaser.GameObjects.Graphics, at: Point, size: number, color: number, alpha: number): void {
  g.fillStyle(color, alpha);
  g.fillTriangle(at.x, at.y - size, at.x + size, at.y, at.x - size, at.y);
  g.fillTriangle(at.x - size, at.y, at.x + size, at.y, at.x, at.y + size);
}

function clampToRect(p: Point, rect: Phaser.Geom.Rectangle): Point {
  return {
    x: Phaser.Math.Clamp(p.x, rect.left, rect.right),
    y: Phaser.Math.Clamp(p.y, rect.top, rect.bottom),
  };
}
