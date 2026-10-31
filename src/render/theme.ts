/** A theme that can actually be drawn (`system` resolves to one of these first). */
export type ThemeId = 'dark' | 'light' | 'colorful';

/**
 * Semantic colours for the Phaser board, one set per theme. CSS has the
 * matching custom properties in style.css (`:root` and `[data-theme=…]`).
 * Rules never depend on these: a theme only changes how the board looks.
 */
export interface CanvasPalette {
  readonly id: ThemeId;
  /** Page colour behind the board (used to blend the frame's soft light). */
  readonly background: number;
  /** Board frame. */
  readonly surface: number;
  /** The recessed play area inside the frame, and the arrows' tail sockets. */
  readonly well: number;
  /** Frame outline and light while playing, and the outline's opacity. */
  readonly frame: number;
  readonly frameAlpha: number;
  /** Grid lines and cell dots, with their opacity. */
  readonly grid: number;
  readonly gridAlpha: number;
  readonly dotAlpha: number;
  /**
   * Resting arrow colours. One colour = every arrow alike; several = each
   * arrow takes the next one in level order, so neighbours stay distinct.
   */
  readonly arrows: readonly number[];
  /** Activated arrows, collisions and failure. Reserved: no resting arrow uses it. */
  readonly error: number;
  /** The arrow in the way when a tap is blocked. */
  readonly warning: number;
  /** Leaving arrows and the cleared board. */
  readonly success: number;
  /** Chain-reaction releases. */
  readonly chain: number;
  /** Strength of the halo around arrows and the frame (1 = the original neon). */
  readonly glow: number;
  /** How far the arrow's core line is lightened towards white (the "neon tube"). */
  readonly core: number;
}

/** Dark Neon: the original NEON ESCAPE look. */
const DARK: CanvasPalette = {
  id: 'dark',
  background: 0x101522,
  surface: 0x171f30,
  well: 0x131a29,
  frame: 0x27ddf5,
  frameAlpha: 0.2,
  grid: 0x9ba8bc,
  gridAlpha: 0.06,
  dotAlpha: 0.14,
  arrows: [0x27ddf5],
  error: 0xff526b,
  warning: 0xff9f43,
  success: 0x48f5a5,
  chain: 0xa855f7,
  glow: 1,
  core: 0.5,
};

/** Light: daytime board with darker grid lines, deep high-contrast arrows and little glow. */
const LIGHT: CanvasPalette = {
  id: 'light',
  background: 0xe9eef6,
  surface: 0xffffff,
  well: 0xf3f6fb,
  frame: 0x0a7f96,
  frameAlpha: 0.45,
  grid: 0x4a5568,
  gridAlpha: 0.16,
  dotAlpha: 0.3,
  arrows: [0x0a7f96],
  error: 0xd42a46,
  warning: 0xc25e00,
  success: 0x0d8a55,
  chain: 0x7c3aed,
  glow: 0.55,
  core: 0.32,
};

/**
 * Colourful: the dark board with a coordinated neon palette, one colour per
 * arrow. Red stays reserved for activated arrows; warning is a bright amber
 * so the arrow in the way still flashes visibly over orange arrows.
 */
const COLORFUL: CanvasPalette = {
  id: 'colorful',
  background: 0x130f26,
  surface: 0x1d1836,
  well: 0x17122d,
  frame: 0xb57bff,
  frameAlpha: 0.25,
  grid: 0xa9a3c9,
  gridAlpha: 0.07,
  dotAlpha: 0.16,
  // cyan, violet, orange, green, pink, blue: neighbours in this order differ in hue by a lot
  arrows: [0x27ddf5, 0xb57bff, 0xff9f43, 0x5cf28c, 0xff6fcf, 0x5b8cff],
  error: 0xff3b55,
  warning: 0xffe066,
  success: 0x48f5a5,
  chain: 0xd38bff,
  glow: 1,
  core: 0.5,
};

export const PALETTES: Readonly<Record<ThemeId, CanvasPalette>> = { dark: DARK, light: LIGHT, colorful: COLORFUL };

let active: CanvasPalette = DARK;

/** The palette the board is drawn with right now. */
export function palette(): CanvasPalette {
  return active;
}

/** Switches the board's palette. Views redraw themselves when told to (see GameScene.refreshTheme). */
export function setPalette(id: ThemeId): void {
  active = PALETTES[id];
}

/** Resting colour of the arrow at `index` in level order. */
export function arrowColor(p: CanvasPalette, index: number): number {
  return p.arrows[((index % p.arrows.length) + p.arrows.length) % p.arrows.length];
}

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
  /** Activated arrows are drawn as a dashed tube: gap length and spacing along the body. */
  activatedGap: 0.11,
  activatedSpacing: 0.36,
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

/** WCAG relative luminance of a 0xRRGGBB colour. */
export function luminance(color: number): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin((color >> 16) & 0xff) + 0.7152 * lin((color >> 8) & 0xff) + 0.0722 * lin(color & 0xff);
}

/** WCAG contrast ratio between two colours (1..21). */
export function contrastRatio(a: number, b: number): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
