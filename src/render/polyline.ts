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

/** A point that can be overwritten in place (reused between frames). */
export interface MutablePoint {
  x: number;
  y: number;
}

/**
 * A polyline with its cumulative lengths precomputed, so slicing it every
 * animation frame costs a binary search and a few writes instead of
 * re-measuring every segment and allocating new arrays.
 */
export class MeasuredPolyline {
  /** Distance along the line at each point (cumulative[0] = 0). */
  private readonly cumulative: number[];
  readonly length: number;

  constructor(readonly points: readonly Point[]) {
    this.cumulative = [0];
    for (let i = 1; i < points.length; i++) {
      this.cumulative.push(this.cumulative[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
    }
    this.length = this.cumulative[this.cumulative.length - 1] ?? 0;
  }

  /** Index of the segment containing distance `d` (clamped to the line). */
  private segmentAt(d: number): number {
    let lo = 1;
    let hi = this.points.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.cumulative[mid] < d) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  /** Writes the point at distance `d` into `out` and returns it. */
  pointAt(d: number, out: MutablePoint): MutablePoint {
    const p = this.points;
    if (p.length === 1 || d <= 0) {
      out.x = p[0].x;
      out.y = p[0].y;
      return out;
    }
    const i = this.segmentAt(Math.min(d, this.length));
    const a = p[i - 1];
    const b = p[i];
    const len = this.cumulative[i] - this.cumulative[i - 1];
    const t = len === 0 ? 0 : Math.min(1, Math.max(0, (d - this.cumulative[i - 1]) / len));
    out.x = a.x + (b.x - a.x) * t;
    out.y = a.y + (b.y - a.y) * t;
    return out;
  }

  /**
   * Writes the part between distances `from` and `to` into `out`, reusing
   * (and growing) its point objects, and returns how many points it wrote.
   * Gives the same points as slicePolyline().
   */
  sliceInto(from: number, to: number, out: MutablePoint[]): number {
    if (this.points.length < 2) return 0;
    const start = Math.max(0, from);
    const end = Math.min(this.length, to);
    if (end < start) return 0;
    let n = 0;
    n = this.writeAt(start, out, n);
    for (let i = this.segmentAt(start); i < this.points.length && this.cumulative[i] < end; i++) {
      // Interior vertices, skipping repeats left by zero-length segments.
      if (this.cumulative[i] > start && this.cumulative[i] > this.cumulative[i - 1]) n = write(out, n, this.points[i].x, this.points[i].y);
    }
    return this.writeAt(end, out, n);
  }

  /** Writes the point at distance `d` as out[n]; returns n + 1. */
  private writeAt(d: number, out: MutablePoint[], n: number): number {
    const i = this.segmentAt(d);
    const a = this.points[i - 1];
    const b = this.points[i];
    const len = this.cumulative[i] - this.cumulative[i - 1];
    const t = len === 0 ? 0 : Math.min(1, Math.max(0, (d - this.cumulative[i - 1]) / len));
    return write(out, n, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
  }
}

/** Sets out[n] (reusing the object, or adding one) and returns n + 1. */
function write(out: MutablePoint[], n: number, x: number, y: number): number {
  if (out.length <= n) out.push({ x, y });
  else {
    out[n].x = x;
    out[n].y = y;
  }
  return n + 1;
}
