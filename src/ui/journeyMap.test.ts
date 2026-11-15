import { describe, expect, it } from 'vitest';
import { BANNER_GAP, journeyLayout, MAP_PAD, scrollToStop, STOP_GAP, TEASER_GAP } from './journeyMap';

describe('journey map layout', () => {
  it('climbs from the bottom: the first stop lowest, evenly spaced', () => {
    const l = journeyLayout(20);
    expect(l.stops).toHaveLength(20);
    expect(l.height).toBe(MAP_PAD * 2 + 19 * STOP_GAP);
    expect(l.stops[0].y).toBe(l.height - MAP_PAD);
    expect(l.stops[19].y).toBe(MAP_PAD);
    for (let i = 1; i < 20; i++) expect(l.stops[i - 1].y - l.stops[i].y).toBe(STOP_GAP);
    expect(l.banners).toEqual([]);
    expect(l.teaser).toBeNull();
  });

  it('winds left and right but stays well inside the width', () => {
    const xs = journeyLayout(20).stops.map((s) => s.x);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0.15);
    expect(Math.max(...xs)).toBeLessThanOrEqual(0.85);
    expect(new Set(xs).size).toBeGreaterThan(3);
  });

  it('opens every chapter with a banner below its first level, in one continuous column', () => {
    const l = journeyLayout(45, { chapterSize: 20 });
    expect(l.banners.map((b) => [b.chapter, b.first])).toEqual([
      [1, 0],
      [2, 20],
      [3, 40],
    ]);
    expect(l.banners[0].y).toBe(l.height - MAP_PAD);
    expect(l.banners[0].y - l.stops[0].y).toBe(BANNER_GAP);
    // Between chapters: last stop → banner → first stop, each a banner gap apart.
    expect(l.stops[19].y - l.banners[1].y).toBe(BANNER_GAP);
    expect(l.banners[1].y - l.stops[20].y).toBe(BANNER_GAP);
    expect(l.stops[44].y).toBe(MAP_PAD);
    for (let i = 1; i < 45; i++) expect(l.stops[i].y).toBeLessThan(l.stops[i - 1].y);
  });

  it('puts the locked teaser above the last level', () => {
    const l = journeyLayout(20, { chapterSize: 20, teaser: true });
    expect(l.teaser).toBe(MAP_PAD);
    expect(l.stops[19].y - l.teaser!).toBe(TEASER_GAP);
  });

  it('draws one path through every stop', () => {
    const l = journeyLayout(3);
    expect(l.path.startsWith(`M 50 ${l.stops[0].y}`)).toBe(true);
    expect(l.path.match(/C /g)).toHaveLength(2);
    expect(journeyLayout(0)).toEqual({ height: 0, stops: [], banners: [], teaser: null, path: '' });
  });

  it('centres a stop when scrolling, without leaving the map', () => {
    const l = journeyLayout(20);
    expect(scrollToStop(l, 0, 500)).toBe(l.height - 500); // bottom stop: scrolled to the end
    expect(scrollToStop(l, 19, 500)).toBe(0);
    expect(scrollToStop(l, 10, 500)).toBe(Math.round(l.stops[10].y - 250));
    expect(scrollToStop(l, 99, 500)).toBe(0);
  });
});
