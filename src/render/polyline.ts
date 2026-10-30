import type { Point } from './layout';

export function polylineLength(points: readonly Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return total;
}

/** Shortest distance from `p` to any segment of the polyline. */
export function distanceToPolyline(points: readonly Point[], p: Point): number {
  if (points.length === 1) return Math.hypot(p.x - points[0].x, p.y - points[0].y);
  let best = Infinity;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy;
    // Project p onto segment ab, clamped to the segment ends.
    const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
    best = Math.min(best, Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t)));
  }
  return best;
}

/**
 * Returns the part of `points` between distances `from` and `to` measured
 * along the line, interpolating the end points. Used to animate an arrow
 * "sliding" along its own body and out of the board like a snake.
 */
export function slicePolyline(points: readonly Point[], from: number, to: number): Point[] {
  const out: Point[] = [];
  let travelled = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const segStart = travelled;
    const segEnd = travelled + len;
    travelled = segEnd;
    if (len === 0 || segEnd < from || segStart > to) continue;

    const lerp = (d: number): Point => {
      const t = Math.min(1, Math.max(0, (d - segStart) / len));
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    };
    if (out.length === 0) out.push(lerp(Math.max(from, segStart)));
    out.push(lerp(Math.min(to, segEnd)));
    if (segEnd >= to) break;
  }
  return out;
}
