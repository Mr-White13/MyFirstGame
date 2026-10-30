/** NEON ESCAPE palette as numeric colours for Phaser (CSS mirrors these in style.css). */
export const COLORS = {
  background: 0x101522,
  surface: 0x171f30,
  cyan: 0x27ddf5,
  purple: 0xa855f7,
  orange: 0xff9f43,
  green: 0x48f5a5,
  red: 0xff526b,
  textPrimary: 0xf4f7fc,
  textSecondary: 0x9ba8bc,
} as const;

/** Board-only shades derived from the palette. */
export const BOARD_COLORS = {
  /** The recessed play area inside the board frame: a touch darker than the frame. */
  well: 0x131a29,
} as const;

/** Arrow proportions, as fractions of the cell size. */
export const ARROW_STYLE = {
  bodyWidth: 0.28,
  /**
   * Halo rings drawn beneath the body: [extra width, colour strength over the
   * board]. Kept tight so neighbouring arrows never visually merge.
   */
  halo: [
    [0.2, 0.1],
    [0.1, 0.24],
  ] as const,
  coreWidth: 0.08,
  headLength: 0.42,
  headHalfWidth: 0.3,
  /** How deep the notch at the back of the arrowhead is, as a fraction of its length. */
  headNotch: 0.28,
  /** How far the arrow tip reaches past the centre of the head cell. */
  tipOffset: 0.38,
  /** Radius of the rounded turns. */
  cornerRadius: 0.32,
  /** Stub length behind the centre for single-cell arrows. */
  stubLength: 0.3,
  /** Length of the fading energy trail behind a leaving arrow. */
  trailLength: 2.4,
} as const;

/** Linear blend from colour `a` to colour `b` by `t` (0..1). */
export function mixColors(a: number, b: number, t: number): number {
  const channel = (shift: number) => {
    const ca = (a >> shift) & 0xff;
    const cb = (b >> shift) & 0xff;
    return Math.round(ca + (cb - ca) * t) << shift;
  };
  return channel(16) | channel(8) | channel(0);
}

/** Mixes a colour towards white by `amount` (0..1). */
export function lighten(color: number, amount: number): number {
  return mixColors(color, 0xffffff, amount);
}
