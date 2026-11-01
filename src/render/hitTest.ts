/**
 * Which arrow a tap means. Pure, so it can be tested without Phaser.
 *
 * 1. The arrow whose drawn line (body, turns and head) is nearest the tap,
 *    within the tolerance, wins, but only if it is clearly nearer than the
 *    next one. This follows what the player sees, not the cell grid: a tap
 *    just across a cell border, next to the arrow the finger aimed at, still
 *    picks that arrow.
 * 2. When two arrows are about equally near (a tap between two lines),
 *    nothing is selected: a missed tap is better than moving the wrong
 *    arrow (which can cost a life). The player can tap again or zoom in.
 * 3. A tap far from every line (the outer corner of a large cell) selects
 *    the arrow occupying that cell, if any.
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
  /** Lines farther than this from the tap are ignored (the cell owner decides if none is nearer). */
  readonly tolerance: number;
  /** The nearest arrow must be at least this much closer than the second. */
  readonly margin: number;
}

/** Minimum touch radius on screen, in CSS pixels (≈ a 44 px target). */
export const MIN_TOUCH_RADIUS_CSS = 22;
/**
 * The nearest line must be this much nearer than the second, in cells;
 * closer calls select nothing. Between two parallel arrows that is a band
 * of 0.15 cell around the midline. A share of the cell, never a minimum in
 * screen pixels: on small cells (dense boards on a phone, not zoomed) a
 * pixel minimum would swallow a large part of every cell and leave many
 * taps selecting nothing.
 */
const TIE_MARGIN_CELLS = 0.15;

/**
 * Tap tolerance and tie margin in world pixels, for a cell size in world
 * pixels, a device pixel ratio and the current zoom.
 */
export function hitOptions(cellPx: number, pxPerCss: number, zoom = 1): HitOptions {
  const fingertip = (MIN_TOUCH_RADIUS_CSS * pxPerCss) / Math.max(1, zoom);
  return {
    tolerance: Math.max(cellPx * 0.45, Math.min(fingertip, cellPx * 1.2)),
    margin: cellPx * TIE_MARGIN_CELLS,
  };
}

export function chooseArrow(cellOwner: string | undefined, hits: readonly ArrowHit[], options: HitOptions): string | undefined {
  const near = hits.filter((h) => h.distance <= options.tolerance).sort((a, b) => a.distance - b.distance || (a.id < b.id ? -1 : 1));
  if (near.length === 0) return cellOwner;
  if (near.length > 1 && near[1].distance - near[0].distance < options.margin) return undefined; // too close to call
  return near[0].id;
}
