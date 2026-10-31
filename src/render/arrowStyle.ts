/**
 * Arrow proportions, as fractions of the cell size, adapted to the board.
 *
 * Small boards (up to 9×9) keep the original thick neon tubes with two halo
 * rings. As boards get larger the tubes get thinner, the glow fades and the
 * heads get more compact, reaching clean thin paths at 16×16 and above, so
 * dense levels stay readable. A minimum on-screen width keeps arrows (and
 * Energy Arrow markers) visible on small cells and low-density screens.
 *
 * Only the drawing changes: touch targets are handled separately (see
 * hitTest.ts), and rules never depend on any of this.
 */
export interface ArrowStyle {
  readonly bodyWidth: number;
  /** Halo rings beneath the body: [extra width, colour strength]. Empty = no glow. */
  readonly halo: readonly (readonly [number, number])[];
  /** Bright core line; 0 = none (too thin to read). */
  readonly coreWidth: number;
  readonly headLength: number;
  readonly headHalfWidth: number;
  /** Notch depth at the back of the arrowhead, as a fraction of its length. */
  readonly headNotch: number;
  /** How far the tip reaches past the centre of the head cell. */
  readonly tipOffset: number;
  readonly cornerRadius: number;
  /** Stub behind the centre for single-cell arrows. */
  readonly stubLength: number;
  readonly trailLength: number;
  /** Activated arrows' dashes: gap length and spacing along the body. */
  readonly activatedGap: number;
  readonly activatedSpacing: number;
  /** Energy Arrow marker half-size (diamond), in cells. */
  readonly markerSize: number;
}

/** The original look, used up to 9×9. */
export const BASE_ARROW_STYLE: ArrowStyle = {
  bodyWidth: 0.28,
  halo: [
    [0.2, 0.1],
    [0.1, 0.24],
  ],
  coreWidth: 0.08,
  headLength: 0.42,
  headHalfWidth: 0.3,
  headNotch: 0.28,
  tipOffset: 0.38,
  cornerRadius: 0.32,
  stubLength: 0.3,
  trailLength: 2.4,
  activatedGap: 0.11,
  activatedSpacing: 0.36,
  markerSize: 0.27,
};

/** The thin look, reached at 16×16. */
const THIN: Pick<ArrowStyle, 'bodyWidth' | 'coreWidth' | 'headLength' | 'headHalfWidth' | 'tipOffset' | 'markerSize'> = {
  bodyWidth: 0.15,
  coreWidth: 0.045,
  headLength: 0.36,
  headHalfWidth: 0.25,
  tipOffset: 0.36,
  markerSize: 0.2,
};

/** Board size (largest side) where thinning starts, and where it is complete. */
export const THIN_FROM = 9;
export const THIN_AT = 16;
/** Minimum on-screen sizes, in CSS pixels. */
const MIN_BODY_CSS = 2.5;
const MIN_HEAD_HALF_CSS = 4;
const MIN_MARKER_CSS = 3.5;
const MIN_CORE_CSS = 1;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 0 for boards up to 9×9, 1 from 16×16, linear in between. */
export function thinness(rows: number, cols: number): number {
  const n = Math.max(rows, cols);
  return Math.min(1, Math.max(0, (n - THIN_FROM) / (THIN_AT - THIN_FROM)));
}

/**
 * The arrow style for a board. `cellPx` is the cell size in canvas pixels,
 * `pxPerCss` the canvas pixels per CSS pixel (device pixel ratio).
 */
export function arrowStyleFor(rows: number, cols: number, cellPx: number, pxPerCss = 1): ArrowStyle {
  const t = thinness(rows, cols);
  const b = BASE_ARROW_STYLE;
  const cell = Math.max(1, cellPx);
  const atLeast = (fraction: number, minCss: number, cap: number) => Math.min(cap, Math.max(fraction, (minCss * pxPerCss) / cell));

  const bodyWidth = atLeast(lerp(b.bodyWidth, THIN.bodyWidth, t), MIN_BODY_CSS, 0.3);
  const core = lerp(b.coreWidth, THIN.coreWidth, t);
  // Glow fades out with thinness: two rings → one faint ring → none.
  const glow = 1 - t;
  const rings: (readonly [number, number])[] = [
    [b.halo[0][0] * (1 - 0.6 * t), b.halo[0][1] * glow],
    [b.halo[1][0] * (1 - 0.5 * t), b.halo[1][1] * (1 - 0.6 * t)],
  ];
  const halo = t < 1 ? rings.filter(([, strength]) => strength > 0.01) : [[0.05, 0.12] as const];

  return {
    ...b,
    bodyWidth,
    halo,
    coreWidth: core * cell >= MIN_CORE_CSS * pxPerCss ? core : 0,
    headLength: lerp(b.headLength, THIN.headLength, t),
    headHalfWidth: atLeast(lerp(b.headHalfWidth, THIN.headHalfWidth, t), MIN_HEAD_HALF_CSS, 0.34),
    tipOffset: lerp(b.tipOffset, THIN.tipOffset, t),
    // The Energy marker must stay visible on thin bodies: never smaller than the body itself.
    markerSize: Math.max(bodyWidth * 0.95, atLeast(lerp(b.markerSize, THIN.markerSize, t), MIN_MARKER_CSS, 0.3)),
  };
}
