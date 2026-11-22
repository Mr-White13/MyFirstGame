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

/** A regular star with `points` tips, centred on (cu, cv), tips at radius `outer`, inner corners at `inner`. */
function star(points: number, cu: number, cv: number, outer: number, inner: number): Inside {
  const corners: Point[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    corners.push([cu + r * Math.cos(a), cv + r * Math.sin(a)]);
  }
  return polygon(...corners);
}

/** Levels 101–200: the new outlines (chapter 6–10 extremes and shaped levels). */
const MORE_SHAPES: Readonly<Record<string, Inside>> = {
  /** A five-pointed star with fat tips. */
  star: star(5, 0.5, 0.54, 0.56, 0.26),
  /** A lightning bolt: a zigzag from the top right to a point at the bottom left. */
  bolt: polygon([0.38, 0], [0.92, 0], [0.62, 0.38], [0.9, 0.38], [0.3, 1], [0.12, 1], [0.34, 0.54], [0.1, 0.54]),
  /** A crescent moon opening to the right. */
  crescent: minus(ellipse(0.5, 0.5, 0.5, 0.5), ellipse(0.72, 0.42, 0.4, 0.42)),
  /** A gem: a diamond with a diamond-shaped window in the middle. */
  gem: minus(polygon([0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]), polygon([0.5, 0.36], [0.64, 0.5], [0.5, 0.64], [0.36, 0.5])),
  /** A rocket: a pointed body with two fins and a window. */
  rocket: minus(
    union(
      polygon([0.5, 0], [0.7, 0.2], [0.7, 0.82], [0.3, 0.82], [0.3, 0.2]),
      polygon([0.3, 0.55], [0.3, 0.82], [0.08, 1], [0.08, 0.75]),
      polygon([0.7, 0.55], [0.92, 0.75], [0.92, 1], [0.7, 0.82]),
      polygon([0.38, 0.82], [0.62, 0.82], [0.56, 0.95], [0.44, 0.95]),
    ),
    ellipse(0.5, 0.35, 0.09, 0.07),
  ),
  /** A key: a round bow with a hole, a long shaft and two teeth. */
  key: union(
    minus(ellipse(0.5, 0.2, 0.36, 0.2), ellipse(0.5, 0.2, 0.13, 0.08)),
    polygon([0.4, 0.36], [0.6, 0.36], [0.6, 1], [0.4, 1]),
    polygon([0.6, 0.72], [0.86, 0.72], [0.86, 0.8], [0.6, 0.8]),
    polygon([0.6, 0.88], [0.8, 0.88], [0.8, 0.96], [0.6, 0.96]),
  ),
  /** A butterfly: four wings around a narrow body. */
  butterfly: union(
    ellipse(0.26, 0.3, 0.26, 0.26),
    ellipse(0.74, 0.3, 0.26, 0.26),
    ellipse(0.3, 0.74, 0.2, 0.22),
    ellipse(0.7, 0.74, 0.2, 0.22),
    polygon([0.44, 0.1], [0.56, 0.1], [0.56, 0.96], [0.44, 0.96]),
  ),
  /** Infinity: two rings side by side, touching in the middle. */
  infinity: union(
    minus(ellipse(0.27, 0.5, 0.27, 0.5), ellipse(0.27, 0.5, 0.1, 0.18)),
    minus(ellipse(0.73, 0.5, 0.27, 0.5), ellipse(0.73, 0.5, 0.1, 0.18)),
  ),
  /** A stepped pyramid of five tiers. */
  pyramid: union(...[0, 1, 2, 3, 4].map((i) => polygon([0.4 - i * 0.1, i * 0.2], [0.6 + i * 0.1, i * 0.2], [0.6 + i * 0.1, (i + 1) * 0.2], [0.4 - i * 0.1, (i + 1) * 0.2]))),
  /** THE EXIT: a big arrow pointing right, the game's own symbol. */
  exit: polygon([0, 0.3], [0.55, 0.3], [0.55, 0], [1, 0.5], [0.55, 1], [0.55, 0.7], [0, 0.7]),
  /** A hexagon with a hexagonal hole: a nut. */
  nut: minus(
    polygon([0.25, 0], [0.75, 0], [1, 0.5], [0.75, 1], [0.25, 1], [0, 0.5]),
    polygon([0.4, 0.3], [0.6, 0.3], [0.7, 0.5], [0.6, 0.7], [0.4, 0.7], [0.3, 0.5]),
  ),
};
const intersect = (...parts: Inside[]): Inside => (u, v) => parts.every((p) => p(u, v));

/**
 * Levels 201–300: the chapter 11–15 finales. Deliberately fat outlines (few
 * thin tips or narrow bands), so few arrows sit on the edge pointing out and
 * the opening has few free arrows. Sized for 44×34 boards; a circle there is
 * an ellipse with rv = ru × 34/44.
 */
const FINAL_SHAPES: Readonly<Record<string, Inside>> = {
  /** A planet with a broad flat ring across it. */
  planet: union(ellipse(0.5, 0.5, 0.45, 0.35), ellipse(0.5, 0.52, 0.5, 0.14)),
  /** A robot head: square ears, an antenna, cut-out eyes and mouth. Straight edges only, so few arrows point out of it. */
  robot: minus(
    union(
      polygon([0.12, 0.2], [0.88, 0.2], [0.88, 0.8], [0.12, 0.8]),
      polygon([0, 0.38], [0.12, 0.38], [0.12, 0.62], [0, 0.62]),
      polygon([0.88, 0.38], [1, 0.38], [1, 0.62], [0.88, 0.62]),
      polygon([0.44, 0.08], [0.56, 0.08], [0.56, 0.2], [0.44, 0.2]),
      polygon([0.36, 0], [0.64, 0], [0.64, 0.08], [0.36, 0.08]),
      polygon([0.3, 0.8], [0.7, 0.8], [0.7, 0.96], [0.3, 0.96]),
    ),
    union(
      polygon([0.26, 0.34], [0.4, 0.34], [0.4, 0.46], [0.26, 0.46]),
      polygon([0.6, 0.34], [0.74, 0.34], [0.74, 0.46], [0.6, 0.46]),
      polygon([0.32, 0.6], [0.68, 0.6], [0.68, 0.66], [0.32, 0.66]),
    ),
  ),
  /** A trophy: a cup with two handles on a stem and a wide base. */
  trophy: union(
    polygon([0.2, 0.04], [0.8, 0.04], [0.76, 0.42], [0.62, 0.56], [0.38, 0.56], [0.24, 0.42]),
    minus(ellipse(0.2, 0.2, 0.18, 0.14), ellipse(0.2, 0.2, 0.08, 0.06)),
    minus(ellipse(0.8, 0.2, 0.18, 0.14), ellipse(0.8, 0.2, 0.08, 0.06)),
    polygon([0.4, 0.56], [0.6, 0.56], [0.6, 0.78], [0.4, 0.78]),
    polygon([0.16, 0.78], [0.84, 0.78], [0.84, 0.97], [0.16, 0.97]),
  ),
  /** An anchor: a ring on top, a thick shank and cross bar, and curved arms. */
  anchor: union(
    minus(ellipse(0.5, 0.1, 0.17, 0.1), ellipse(0.5, 0.1, 0.07, 0.04)),
    polygon([0.4, 0.17], [0.6, 0.17], [0.6, 0.94], [0.4, 0.94]),
    polygon([0.18, 0.26], [0.82, 0.26], [0.82, 0.37], [0.18, 0.37]),
    intersect(minus(ellipse(0.5, 0.56, 0.5, 0.44), ellipse(0.5, 0.52, 0.3, 0.3)), (_u, v) => v > 0.6),
  ),
  /** A four-leaf clover with a short stem. */
  clover: union(
    ellipse(0.5, 0.24, 0.24, 0.19),
    ellipse(0.26, 0.47, 0.24, 0.19),
    ellipse(0.74, 0.47, 0.24, 0.19),
    ellipse(0.5, 0.7, 0.24, 0.19),
    polygon([0.58, 0.8], [0.7, 0.8], [0.84, 1], [0.72, 1]),
  ),
  /** A padlock: a thick shackle over a solid body with a keyhole. */
  lock: union(
    intersect(minus(ellipse(0.5, 0.42, 0.34, 0.38), ellipse(0.5, 0.42, 0.16, 0.24)), (_u, v) => v < 0.44),
    minus(polygon([0.08, 0.42], [0.92, 0.42], [0.92, 1], [0.08, 1]), union(ellipse(0.5, 0.62, 0.07, 0.05), polygon([0.47, 0.62], [0.53, 0.62], [0.53, 0.8], [0.47, 0.8]))),
  ),
  /** A cut diamond: a flat crown over a deep point. */
  diamond: polygon([0.24, 0], [0.76, 0], [1, 0.3], [0.5, 1], [0, 0.3]),
  /** A gamepad: a wide body with two grips, a cross pad and two buttons cut out. */
  gamepad: minus(
    union(polygon([0.2, 0.25], [0.8, 0.25], [0.8, 0.72], [0.2, 0.72]), ellipse(0.22, 0.58, 0.22, 0.36), ellipse(0.78, 0.58, 0.22, 0.36)),
    union(
      polygon([0.2, 0.44], [0.32, 0.44], [0.32, 0.48], [0.2, 0.48]),
      polygon([0.24, 0.39], [0.28, 0.39], [0.28, 0.53], [0.24, 0.53]),
      ellipse(0.72, 0.42, 0.04, 0.03),
      ellipse(0.8, 0.5, 0.04, 0.03),
    ),
  ),
  /** A sailing ship: two sails over a broad hull. */
  ship: union(
    polygon([0.47, 0], [0.47, 0.7], [0.04, 0.7]),
    polygon([0.53, 0.08], [0.53, 0.7], [0.94, 0.7]),
    polygon([0, 0.73], [1, 0.73], [0.82, 1], [0.18, 1]),
  ),
};

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
  ...MORE_SHAPES,
  ...FINAL_SHAPES,
};

/** A shape as a mask for fillLevel: one string per row, `#` inside and `.` outside. */
export function shapeMask(name: string, rows: number, cols: number): string[] {
  const inside = SHAPES[name];
  if (!inside) throw new Error(`No shape "${name}" in tools/shapes.ts`);
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => (inside((c + 0.5) / cols, (r + 0.5) / rows) ? '#' : '.')).join(''),
  );
}
