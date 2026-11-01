/*
 * Board shapes for the shaped levels (32–40), used only by the offline level
 * tools (tools/levels.ts plan entries with "shape"). A shape is a test on a
 * cell centre in board coordinates from 0 to 1 (u across, v down), so it
 * scales to any board size. The levels themselves are plain text maps with
 * `.` outside the shape; nothing here ships with the game.
 */

type Point = readonly [number, number];
type Inside = (u: number, v: number) => boolean;

/** Even–odd point-in-polygon test. */
function polygon(...points: Point[]): Inside {
  return (u, v) => {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [ui, vi] = points[i];
      const [uj, vj] = points[j];
      if (vi > v !== vj > v && u < ((uj - ui) * (v - vi)) / (vj - vi) + ui) inside = !inside;
    }
    return inside;
  };
}

const ellipse = (cu: number, cv: number, ru: number, rv: number): Inside => (u, v) => ((u - cu) / ru) ** 2 + ((v - cv) / rv) ** 2 <= 1;
const union = (...parts: Inside[]): Inside => (u, v) => parts.some((p) => p(u, v));
const minus = (shape: Inside, hole: Inside): Inside => (u, v) => shape(u, v) && !hole(u, v);


export const SHAPES: Readonly<Record<string, Inside>> = {
  /** Level 32: an arrowhead pointing up, with a notch cut into its base (two legs). */
  arrowhead: polygon([0.5, 0], [1, 0.3], [1, 1], [0.8, 1], [0.5, 0.72], [0.2, 1], [0, 1], [0, 0.3]),
  /** Level 33: two triangles meeting at a narrow waist. */
  hourglass: polygon([0, 0], [1, 0], [1, 0.08], [0.62, 0.46], [0.62, 0.54], [1, 0.92], [1, 1], [0, 1], [0, 0.92], [0.38, 0.54], [0.38, 0.46], [0, 0.08]),
  /** Level 34: a plus sign with broad arms. */
  cross: union(polygon([0.3, 0], [0.7, 0], [0.7, 1], [0.3, 1]), polygon([0, 0.33], [1, 0.33], [1, 0.67], [0, 0.67])),
  /** Level 35: a thick oval ring around an empty centre. */
  ring: minus(ellipse(0.5, 0.5, 0.5, 0.5), ellipse(0.5, 0.5, 0.2, 0.17)),
  /** Level 36: a heart: two lobes above a point. */
  heart: union(ellipse(0.27, 0.3, 0.27, 0.26), ellipse(0.73, 0.3, 0.27, 0.26), polygon([0.01, 0.36], [0.99, 0.36], [0.5, 1])),
  /** Level 40: a fortress: battlements on top and an arched gate at the base. */
  castle: minus(
    union(
      polygon([0, 0.06], [1, 0.06], [1, 1], [0, 1]),
      ...[0, 0.2, 0.4, 0.6, 0.8].map((x) => polygon([x, 0], [x + 0.15, 0], [x + 0.15, 0.06], [x, 0.06])),
    ),
    union(polygon([0.36, 0.78], [0.64, 0.78], [0.64, 1.01], [0.36, 1.01]), ellipse(0.5, 0.78, 0.14, 0.09)),
  ),
  /** Level 37: a crown: a solid band with five points, the middle one tallest. */
  crown: polygon([0, 0.12], [0.15, 0.4], [0.27, 0.08], [0.39, 0.4], [0.5, 0], [0.61, 0.4], [0.73, 0.08], [0.85, 0.4], [1, 0.12], [1, 1], [0, 1]),
  /** Level 38: a shield: square shoulders, curved sides meeting at a point, with a hollow cross. */
  shield: minus(
    polygon([0, 0], [0.5, 0.05], [1, 0], [1, 0.45], [0.92, 0.7], [0.7, 0.9], [0.5, 1], [0.3, 0.9], [0.08, 0.7], [0, 0.45]),
    union(polygon([0.45, 0.2], [0.55, 0.2], [0.55, 0.72], [0.45, 0.72]), polygon([0.27, 0.36], [0.73, 0.36], [0.73, 0.45], [0.27, 0.45])),
  ),
  /** Level 39: a tree of three broad tiers on a short trunk. */
  tree: polygon([0.5, 0], [0.82, 0.27], [0.7, 0.27], [0.94, 0.54], [0.82, 0.54], [1, 0.85], [0.64, 0.85], [0.64, 1], [0.36, 1], [0.36, 0.85], [0, 0.85], [0.18, 0.54], [0.06, 0.54], [0.3, 0.27], [0.18, 0.27]),
};

/** A shape as a mask for fillLevel: one string per row, `#` inside and `.` outside. */
export function shapeMask(name: string, rows: number, cols: number): string[] {
  const inside = SHAPES[name];
  if (!inside) throw new Error(`No shape "${name}" in tools/shapes.ts`);
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => (inside((c + 0.5) / cols, (r + 0.5) / rows) ? '#' : '.')).join(''),
  );
}
