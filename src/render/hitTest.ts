/**
 * Which arrow a tap means. Pure, so it can be tested without Phaser.
 *
 * 1. A tap inside a cell an arrow occupies selects that arrow: the grid is
 *    exact, whatever the drawing looks like.
 * 2. Otherwise the nearest arrow body within the tolerance wins, but only if
 *    it is clearly nearer than the next one. When two arrows are about
 *    equally close, nothing is selected: a missed tap is better than moving
 *    the wrong arrow (which can cost a life). The player can tap again or
 *    zoom in.
 *
 * The tolerance has a minimum size on screen (about a fingertip), so thin
 * arrows on large boards stay as easy to hit as thick ones.
 */
export interface ArrowHit {
  readonly id: string;
  /** Distance from the tap to the arrow's body, in world pixels. */
  readonly distance: number;
}

export interface HitOptions {
  /** Taps farther than this from every arrow select nothing. */
  readonly tolerance: number;
  /** The nearest arrow must be at least this much closer than the second. */
  readonly margin: number;
}

/** Minimum touch radius on screen, in CSS pixels (≈ a 44 px target). */
export const MIN_TOUCH_RADIUS_CSS = 22;

/**
 * Tap tolerance and tie margin in world pixels, for a cell size in world
 * pixels, a device pixel ratio and the current zoom.
 */
export function hitOptions(cellPx: number, pxPerCss: number, zoom = 1): HitOptions {
  const fingertip = (MIN_TOUCH_RADIUS_CSS * pxPerCss) / Math.max(1, zoom);
  return {
    tolerance: Math.max(cellPx * 0.45, Math.min(fingertip, cellPx * 1.2)),
    margin: Math.max(cellPx * 0.15, (4 * pxPerCss) / Math.max(1, zoom)),
  };
}

export function chooseArrow(cellOwner: string | undefined, hits: readonly ArrowHit[], options: HitOptions): string | undefined {
  if (cellOwner !== undefined) return cellOwner;
  const near = hits.filter((h) => h.distance <= options.tolerance).sort((a, b) => a.distance - b.distance || (a.id < b.id ? -1 : 1));
  if (near.length === 0) return undefined;
  if (near.length > 1 && near[1].distance - near[0].distance < options.margin) return undefined; // too close to call
  return near[0].id;
}
