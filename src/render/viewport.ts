import type { Point, Rect } from './layout';

/** Zoom steps closer than this to 1 snap back to the fitted view. */
const SNAP = 1.02;

/**
 * Zoom and pan for the board, as a camera transform. Pure (no Phaser), so
 * the coordinate mapping used for taps is testable.
 *
 * - Fitted (zoom 1): the camera shows the whole canvas, world = screen, so
 *   arrows can fly off past the board exactly as before.
 * - Zoomed: the camera draws inside the zoom area (the board's whole part
 *   of the screen: the fitted board plus the empty space around it, such as
 *   the strips above and below a wide board on a phone) and shows part of
 *   the board, magnified. screen = area.x + (world − scroll) × zoom. The
 *   scroll is clamped to the board (the slot, in world pixels); along an
 *   axis where the magnified board is smaller than the area, it is centred.
 * - Free pan (`freePan`, boards that can zoom): one finger may also move the
 *   board at zoom 1, and on every axis, until a board edge reaches the
 *   middle of the zoom area, so any arrow can be brought under a finger
 *   without zooming in. A moved board at zoom 1 is drawn in the zoom area
 *   like a zoomed one; `reset()` puts it back in place.
 */
export class BoardViewport {
  private canvas: Rect = { x: 0, y: 0, width: 1, height: 1 };
  private slot: Rect = { x: 0, y: 0, width: 1, height: 1 };
  private area: Rect = { x: 0, y: 0, width: 1, height: 1 };
  private max = 1;
  /** Breathing room (screen pixels) a zoomed view may show past the board's edges. */
  private edge = 0;
  /**
   * Extra room past the board's edges as a share of the zoom area, per axis:
   * 0.5 lets a zoomed view scroll until a board edge reaches the middle of
   * the screen, so arrows on the edges can be brought away from the screen
   * border (and from under the thumb). The larger of this and `edge` applies.
   */
  private overscroll = 0;
  /** One-finger panning at zoom 1 and on every axis (see the class comment). */
  private freePan = false;
  /** Moved at zoom 1 (free pan): the view is the zoom area, like a zoomed view. */
  private shifted = false;
  private z = 1;
  private sx = 0;
  private sy = 0;

  /**
   * Sets the canvas, the board slot, the zoom area (all in canvas pixels; the
   * area defaults to the slot), the zoom limit and the edge margin (screen
   * pixels a zoomed view may scroll past the board's edges, so arrows at the
   * edge never touch the screen border), the overscroll (share of the zoom
   * area a zoomed view may scroll past the board, see `overscroll`), whether
   * the board may also be moved at zoom 1 (`freePan`), and fits the board.
   */
  configure(canvas: Rect, slot: Rect, maxZoom: number, area: Rect = slot, edge = 0, overscroll = 0, freePan = false): void {
    this.canvas = canvas;
    this.slot = slot;
    this.area = area;
    this.max = Math.max(1, maxZoom);
    this.edge = Math.max(0, edge);
    this.overscroll = Math.min(0.5, Math.max(0, overscroll));
    this.freePan = freePan;
    this.reset();
  }

  get zoom(): number {
    return this.z;
  }

  get maxZoom(): number {
    return this.max;
  }

  /** True if this board can be zoomed at all (small boards can't). */
  get zoomable(): boolean {
    return this.max > 1.15;
  }

  get zoomed(): boolean {
    return this.z > 1;
  }

  /** Zoomed, or moved away from its place at zoom 1: not the fitted view. */
  get moved(): boolean {
    return this.zoomed || this.shifted;
  }

  /** True if a one-finger drag moves the view now: zoomed, or free pan on a board that can zoom. */
  get canPan(): boolean {
    return this.zoomed || (this.freePan && this.zoomable);
  }

  get scroll(): Point {
    return { x: this.sx, y: this.sy };
  }

  /** The camera's viewport on the canvas. */
  get view(): Rect {
    return this.moved ? this.area : this.canvas;
  }

  reset(): void {
    this.z = 1;
    this.sx = 0;
    this.sy = 0;
    this.shifted = false;
  }

  screenToWorld(p: Point): Point {
    const v = this.view;
    return { x: this.sx + (p.x - v.x) / this.z, y: this.sy + (p.y - v.y) / this.z };
  }

  worldToScreen(p: Point): Point {
    const v = this.view;
    return { x: v.x + (p.x - this.sx) * this.z, y: v.y + (p.y - this.sy) * this.z };
  }

  /** Zooms to `zoom` (clamped) keeping the world point under `anchor` (screen) in place as far as the bounds allow. */
  zoomAt(anchor: Point, zoom: number): void {
    const target = Math.min(this.max, Math.max(1, zoom));
    if (target < SNAP || !this.zoomable) {
      this.reset();
      return;
    }
    const world = this.screenToWorld(anchor);
    this.shifted = false;
    this.z = target;
    this.sx = world.x - (anchor.x - this.area.x) / target;
    this.sy = world.y - (anchor.y - this.area.y) / target;
    this.clamp();
  }

  /** Moves the view with a finger drag of (dx, dy) screen pixels. */
  panBy(dx: number, dy: number): void {
    if (!this.canPan) return;
    if (!this.moved) {
      // Leaving the fitted view at zoom 1: switch to the zoom area without the board jumping.
      this.shifted = true;
      this.sx = this.area.x - this.canvas.x;
      this.sy = this.area.y - this.canvas.y;
    }
    this.sx -= dx / this.z;
    this.sy -= dy / this.z;
    this.clamp();
  }

  /** True if the world point is on screen, at least `margin` world pixels inside the visible part of the board. */
  isVisible(p: Point, margin = 0): boolean {
    const v = this.view;
    const left = this.sx + margin;
    const top = this.sy + margin;
    const right = this.sx + v.width / this.z - margin;
    const bottom = this.sy + v.height / this.z - margin;
    return p.x >= left && p.x <= right && p.y >= top && p.y <= bottom;
  }

  /** The scroll that would put the world point in the middle of the moved or zoomed view (kept on the board). Unchanged in the fitted view. */
  scrollToCenter(p: Point): Point {
    if (!this.moved) return this.scroll;
    const [x, y] = [this.sx, this.sy];
    this.sx = p.x - this.area.width / (2 * this.z);
    this.sy = p.y - this.area.height / (2 * this.z);
    this.clamp();
    const target = { x: this.sx, y: this.sy };
    [this.sx, this.sy] = [x, y];
    return target;
  }

  /** Scrolls the moved or zoomed view (kept on the board). Does nothing in the fitted view. */
  scrollTo(x: number, y: number): void {
    if (!this.moved) return;
    this.sx = x;
    this.sy = y;
    this.clamp();
  }

  /** Keeps the view on the board (plus the edge margin): no scrolling further, and centred where it doesn't fill the area. */
  private clamp(): void {
    const s = this.slot;
    const clampAxis = (scroll: number, start: number, size: number, viewSize: number) => {
      const visible = viewSize / this.z;
      // The margin in world pixels: a constant gap on screen at any zoom.
      const m = Math.max(this.edge, viewSize * this.overscroll) / this.z;
      // Free pan: the margin applies even where the board fits, so it can move on every axis.
      if (size > visible || this.freePan) {
        start -= m;
        size += 2 * m;
      }
      const min = start;
      const max = start + size - visible;
      return max < min ? start + (size - visible) / 2 : Math.min(max, Math.max(min, scroll));
    };
    this.sx = clampAxis(this.sx, s.x, s.width, this.area.width);
    this.sy = clampAxis(this.sy, s.y, s.height, this.area.height);
  }
}

/**
 * Most zoom that is useful for a board: enough to show cells at about
 * `targetCss` CSS pixels (a comfortable fingertip size), at most 4×.
 */
export function maxZoomFor(cellPx: number, pxPerCss: number, targetCss = 44): number {
  return Math.min(4, Math.max(1, (targetCss * pxPerCss) / Math.max(1, cellPx)));
}
