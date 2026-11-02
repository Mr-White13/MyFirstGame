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
 */
export class BoardViewport {
  private canvas: Rect = { x: 0, y: 0, width: 1, height: 1 };
  private slot: Rect = { x: 0, y: 0, width: 1, height: 1 };
  private area: Rect = { x: 0, y: 0, width: 1, height: 1 };
  private max = 1;
  private z = 1;
  private sx = 0;
  private sy = 0;

  /**
   * Sets the canvas, the board slot, the zoom area (all in canvas pixels; the
   * area defaults to the slot) and the zoom limit, and fits the board.
   */
  configure(canvas: Rect, slot: Rect, maxZoom: number, area: Rect = slot): void {
    this.canvas = canvas;
    this.slot = slot;
    this.area = area;
    this.max = Math.max(1, maxZoom);
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

  get scroll(): Point {
    return { x: this.sx, y: this.sy };
  }

  /** The camera's viewport on the canvas. */
  get view(): Rect {
    return this.zoomed ? this.area : this.canvas;
  }

  reset(): void {
    this.z = 1;
    this.sx = 0;
    this.sy = 0;
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
    this.z = target;
    this.sx = world.x - (anchor.x - this.area.x) / target;
    this.sy = world.y - (anchor.y - this.area.y) / target;
    this.clamp();
  }

  /** Moves the view with a finger drag of (dx, dy) screen pixels. */
  panBy(dx: number, dy: number): void {
    if (!this.zoomed) return;
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

  /** The scroll that would put the world point in the middle of the zoomed view (kept on the board). Unchanged when not zoomed. */
  scrollToCenter(p: Point): Point {
    if (!this.zoomed) return this.scroll;
    const [x, y] = [this.sx, this.sy];
    this.sx = p.x - this.area.width / (2 * this.z);
    this.sy = p.y - this.area.height / (2 * this.z);
    this.clamp();
    const target = { x: this.sx, y: this.sy };
    [this.sx, this.sy] = [x, y];
    return target;
  }

  /** Scrolls the zoomed view (kept on the board). Does nothing when not zoomed. */
  scrollTo(x: number, y: number): void {
    if (!this.zoomed) return;
    this.sx = x;
    this.sy = y;
    this.clamp();
  }

  /** Keeps the view on the board: no scrolling past its edges, and centred where it doesn't fill the area. */
  private clamp(): void {
    const s = this.slot;
    const clampAxis = (scroll: number, start: number, size: number, viewSize: number) => {
      const visible = viewSize / this.z;
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
