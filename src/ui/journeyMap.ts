/*
 * The Home journey map: every level the player may see as stops on one
 * winding path, level 1 at the bottom, climbing upward. A banner opens each
 * chapter (below its first level), and a locked teaser can close the top.
 * Pure geometry (no DOM), so the layout is testable.
 */

/** Vertical distance between two stops of one chapter (CSS px). */
export const STOP_GAP = 86;
/** Distance between a chapter banner and the stops around it (CSS px). */
export const BANNER_GAP = 92;
/** Distance between the last stop and the locked teaser above it (CSS px). */
export const TEASER_GAP = 96;
/** Space above the top item and below the bottom one (CSS px). */
export const MAP_PAD = 64;
/** How far stops swing left and right of the centre, as a fraction of the width. */
const SWING = 0.3;
/** Stops per full left-right-left swing. */
const PERIOD = 8;

export interface JourneyStop {
  /** Horizontal position, 0..1 of the map width. */
  readonly x: number;
  /** Vertical position from the top of the map (CSS px). */
  readonly y: number;
}

export interface JourneyBanner {
  /** Chapter number (1-based). */
  readonly chapter: number;
  /** Index of the chapter's first stop. */
  readonly first: number;
  /** Vertical centre from the top of the map (CSS px). */
  readonly y: number;
}

export interface JourneyLayout {
  readonly height: number;
  readonly stops: readonly JourneyStop[];
  readonly banners: readonly JourneyBanner[];
  /** Vertical centre of the locked teaser, or null without one. */
  readonly teaser: number | null;
  /** SVG path through every stop, in a box `100` wide and `height` tall (x in percent, y in px). */
  readonly path: string;
}

export interface JourneyOptions {
  /** Stops per chapter: a banner opens each one. Omit for no banners. */
  readonly chapterSize?: number;
  /** Add a locked teaser above the last stop. */
  readonly teaser?: boolean;
}

const round = (n: number) => Math.round(n * 100) / 100;

/** The layout for `count` stops; stop 0 (level 1) is at the bottom. */
export function journeyLayout(count: number, options: JourneyOptions = {}): JourneyLayout {
  const n = Math.max(0, Math.floor(count));
  const size = options.chapterSize && options.chapterSize > 0 ? Math.floor(options.chapterSize) : 0;
  // Walk upward from the bottom, measuring each item's distance from it.
  const fromBottom: number[] = [];
  const banners: { chapter: number; first: number; at: number }[] = [];
  let at = MAP_PAD;
  for (let i = 0; i < n; i++) {
    if (size && i % size === 0) {
      if (i > 0) at += BANNER_GAP - STOP_GAP; // the step to here was a stop gap; a banner needs its own
      banners.push({ chapter: i / size + 1, first: i, at });
      at += BANNER_GAP;
    }
    fromBottom.push(at);
    at += STOP_GAP;
  }
  at -= n > 0 ? STOP_GAP : 0;
  let teaserAt: number | null = null;
  if (options.teaser) {
    teaserAt = n > 0 ? at + TEASER_GAP : at;
    at = teaserAt;
  }
  const height = n === 0 && teaserAt === null ? 0 : at + MAP_PAD;
  const stops = fromBottom.map((b, i) => ({ x: round(0.5 + SWING * Math.sin((i * 2 * Math.PI) / PERIOD)), y: height - b }));
  return {
    height,
    stops,
    banners: banners.map((b) => ({ chapter: b.chapter, first: b.first, y: height - b.at })),
    teaser: teaserAt === null ? null : height - teaserAt,
    path: pathThrough(stops),
  };
}

/** SVG path through the given stops (x in percent, y in px): a smooth S between each pair, leaving and arriving vertically. */
export function pathThrough(stops: readonly JourneyStop[]): string {
  let path = '';
  stops.forEach((s, i) => {
    const x = round(s.x * 100);
    if (i === 0) {
      path = `M ${x} ${s.y}`;
      return;
    }
    const prev = stops[i - 1];
    const mid = (prev.y + s.y) / 2;
    path += ` C ${round(prev.x * 100)} ${mid} ${x} ${mid} ${x} ${s.y}`;
  });
  return path;
}

/** The scroll offset that centres a stop in a viewport of `viewHeight` (kept inside the map). */
export function scrollToStop(layout: JourneyLayout, index: number, viewHeight: number): number {
  const stop = layout.stops[index];
  if (!stop) return 0;
  const max = Math.max(0, layout.height - viewHeight);
  return Math.min(max, Math.max(0, Math.round(stop.y - viewHeight / 2)));
}
