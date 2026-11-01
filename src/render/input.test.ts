import { describe, expect, it } from 'vitest';
import { arrowStyleFor, BASE_ARROW_STYLE, MAX_BODY_CSS, thinness } from './arrowStyle';
import { GestureTracker, type GestureEvent } from './gestures';
import { chooseArrow, hitOptions } from './hitTest';
import { fitBoardSlot, MAX_BOARD_WIDTH } from './boardFit';
import { distanceToPolyline, MeasuredPolyline, slicePolyline } from './polyline';
import { BoardViewport, maxZoomFor } from './viewport';

describe('adaptive arrow thickness', () => {
  it('keeps the original neon look up to 9×9', () => {
    for (const n of [7, 8, 9]) expect(arrowStyleFor(n, n, 60, 2)).toEqual({ ...BASE_ARROW_STYLE, halo: BASE_ARROW_STYLE.halo });
    expect(thinness(9, 9)).toBe(0);
  });

  it('gets thinner, with less glow and more compact heads, as boards grow', () => {
    const at = (n: number) => arrowStyleFor(n, n, 30, 1); // small enough cells that the thickness cap never applies
    expect(at(12).bodyWidth).toBeLessThan(at(9).bodyWidth);
    expect(at(16).bodyWidth).toBeLessThan(at(12).bodyWidth);
    expect(at(12).headHalfWidth).toBeLessThan(at(9).headHalfWidth);
    const glow = (n: number) => at(n).halo.reduce((sum, [, strength]) => sum + strength, 0);
    expect(glow(12)).toBeLessThan(glow(9));
    expect(glow(16)).toBeLessThan(glow(12));
    expect(at(20)).toEqual(at(16)); // fully thin from 16×16
  });

  it('never draws arrows thinner than a minimum on-screen width', () => {
    // 30 canvas px cells at 2× density: the thin style (0.15 × 30 = 4.5 px) is raised to the 2.5 CSS px (5 px) minimum.
    const small = arrowStyleFor(20, 20, 30, 2);
    expect(small.bodyWidth * 30).toBeCloseTo(5);
    expect(small.headHalfWidth * 30).toBeGreaterThanOrEqual(8 - 1e-9);
    // Tiny cells: the minimum can't exceed the cap (30% of a cell), so arrows never overlap their neighbours.
    expect(arrowStyleFor(20, 20, 10, 2).bodyWidth).toBe(0.3);
  });

  it('keeps Energy Arrow markers at least as wide as the body', () => {
    for (const n of [7, 10, 12, 16, 20]) {
      const s = arrowStyleFor(n, n, 30, 2);
      expect(s.markerSize).toBeGreaterThanOrEqual(s.bodyWidth * 0.95);
    }
  });

  it('drops the core line when it would be thinner than a pixel', () => {
    expect(arrowStyleFor(16, 16, 14, 1).coreWidth).toBe(0);
    expect(arrowStyleFor(7, 7, 80, 1).coreWidth).toBeGreaterThan(0);
  });
});

describe('smooth arrows on large cells (Levels 1–3, tablets)', () => {
  it('caps the body at MAX_BODY_CSS on screen, whatever the cell size', () => {
    for (const [cell, dpr] of [[96, 2], [200, 2.75], [81, 1]] as const) {
      const s = arrowStyleFor(7, 7, cell, dpr);
      expect((s.bodyWidth * cell) / dpr).toBeCloseTo(MAX_BODY_CSS);
    }
  });

  it('shrinks halo and core with the body, and the head less, so it stays an arrow', () => {
    const base = arrowStyleFor(7, 7, 60, 2); // 30 CSS px cells: uncapped
    const big = arrowStyleFor(7, 7, 200, 2); // 100 CSS px cells
    const k = big.bodyWidth / base.bodyWidth;
    expect(k).toBeLessThan(1);
    expect(big.halo[0][0]).toBeCloseTo(base.halo[0][0] * k);
    expect(big.coreWidth).toBeCloseTo(base.coreWidth * k);
    expect(big.headHalfWidth / base.headHalfWidth).toBeGreaterThan(k);
    expect(big.headHalfWidth).toBeGreaterThan(big.bodyWidth); // the head is always wider than the shaft
    expect(big.tipOffset).toBe(base.tipOffset); // positions (and so hit testing and exits) are unchanged
    expect(big.cornerRadius).toBe(base.cornerRadius);
  });
});

describe('tap selection with thin arrows', () => {
  // Two parallel horizontal arrows one cell apart (cell = 20 px): A at y = 10, B at y = 30.
  const A = [{ x: 0, y: 10 }, { x: 100, y: 10 }];
  const B = [{ x: 0, y: 30 }, { x: 100, y: 30 }];
  const hits = (x: number, y: number) => [
    { id: 'A', distance: distanceToPolyline(A, { x, y }) },
    { id: 'B', distance: distanceToPolyline(B, { x, y }) },
  ];
  const options = hitOptions(20, 1);

  it('uses a fingertip-sized tolerance, not the drawn width', () => {
    expect(options.tolerance).toBeGreaterThanOrEqual(20 * 0.45);
    expect(hitOptions(12, 2).tolerance).toBeGreaterThan(12 * 0.45); // small cells: bigger than the cell-based tolerance
    expect(chooseArrow(undefined, hits(50, -5), options)).toBe('A'); // 15 px off a thin arrow still hits it
  });

  it('follows the drawn lines, not the cell grid: a tap just past the border next to A picks A', () => {
    // y = 21 is in B's cell, but only 1 px past the border: about equally near both lines.
    expect(chooseArrow('B', hits(50, 21), options)).toBeUndefined();
    expect(chooseArrow('B', hits(50, 24), options)).toBe('B'); // clearly nearer B's line
    // A turning arrow's line can be clearly nearer than the line of the cell's own arrow.
    expect(chooseArrow('B', [{ id: 'A', distance: 2 }, { id: 'B', distance: 9 }], options)).toBe('A');
  });

  it('never guesses on a tap right between two arrows, even inside an occupied cell', () => {
    expect(chooseArrow('B', hits(50, 20), options)).toBeUndefined();
    expect(chooseArrow('A', hits(50, 19), options)).toBeUndefined();
    expect(chooseArrow('A', hits(50, 18), options)).toBe('A'); // 0.2 cell nearer A: that is A
  });

  it('keeps the undecided band a small share of the cell on small, dense cells (phones, not zoomed)', () => {
    // Level 31 fitted on a phone: 14.6 CSS px cells at a 2.625 device pixel ratio.
    const cell = 14.6 * 2.625;
    const phone = hitOptions(cell, 2.625, 1);
    expect(phone.margin).toBeCloseTo(cell * 0.15);
    // Two parallel arrows one cell apart; a tap 0.3 cell off A's line, towards B, still picks A.
    const A2 = [{ x: 0, y: cell / 2 }, { x: 10 * cell, y: cell / 2 }];
    const B2 = [{ x: 0, y: cell * 1.5 }, { x: 10 * cell, y: cell * 1.5 }];
    const at = (y: number) => [{ id: 'A', distance: distanceToPolyline(A2, { x: 5 * cell, y }) }, { id: 'B', distance: distanceToPolyline(B2, { x: 5 * cell, y }) }];
    expect(chooseArrow('A', at(cell * 0.8), phone)).toBe('A');
    expect(chooseArrow('B', at(cell * 1.04), phone)).toBeUndefined(); // right on the border: no guess
  });

  it('falls back to the cell owner far from every line (outer corner of a big cell)', () => {
    expect(chooseArrow('B', [{ id: 'A', distance: 60 }, { id: 'B', distance: 50 }], options)).toBe('B');
    expect(chooseArrow(undefined, [{ id: 'A', distance: 60 }], options)).toBeUndefined();
  });

  it('selects the clearly nearer arrow', () => {
    expect(chooseArrow(undefined, hits(50, 13), options)).toBe('A');
    expect(chooseArrow(undefined, hits(50, 27), options)).toBe('B');
  });

  it('selects nothing when two arrows are about equally near (no guessing)', () => {
    expect(chooseArrow(undefined, hits(50, 20), options)).toBeUndefined();
    expect(chooseArrow(undefined, hits(50, 21), options)).toBeUndefined();
  });

  it('selects nothing far from every arrow, and breaks exact ties deterministically', () => {
    expect(chooseArrow(undefined, hits(50, 200), options)).toBeUndefined();
    expect(chooseArrow(undefined, [{ id: 'x', distance: 3 }], options)).toBe('x');
  });

  it('shrinks the world-space tolerance when zoomed in (same size under the finger)', () => {
    expect(hitOptions(30, 2, 3).tolerance).toBeLessThan(hitOptions(30, 2, 1).tolerance);
    expect(hitOptions(10, 2, 1).tolerance).toBe(12); // never more than 1.2 cells, whatever the finger size
  });
});

describe('zoom and pan transform', () => {
  const canvas = { x: 0, y: 0, width: 800, height: 1600 };
  const slot = { x: 50, y: 400, width: 700, height: 700 };
  const make = (max = 3) => {
    const v = new BoardViewport();
    v.configure(canvas, slot, max);
    return v;
  };

  it('is the identity when fitted', () => {
    const v = make();
    expect(v.zoomed).toBe(false);
    expect(v.view).toEqual(canvas);
    expect(v.screenToWorld({ x: 123, y: 456 })).toEqual({ x: 123, y: 456 });
  });

  it('keeps the point under the fingers in place while zooming', () => {
    const v = make();
    const anchor = { x: 400, y: 750 };
    const before = v.screenToWorld(anchor);
    v.zoomAt(anchor, 2);
    const after = v.screenToWorld(anchor);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
    expect(v.view).toEqual(slot); // zoomed: drawing is clipped to the board
  });

  it('screen → world → screen round-trips at any zoom', () => {
    const v = make();
    v.zoomAt({ x: 300, y: 600 }, 2.5);
    v.panBy(-40, 25);
    const p = { x: 512, y: 777 };
    const back = v.worldToScreen(v.screenToWorld(p));
    expect(back.x).toBeCloseTo(p.x);
    expect(back.y).toBeCloseTo(p.y);
  });

  it('clamps zoom to its limits and snaps back to fitted near 1×', () => {
    const v = make(2);
    v.zoomAt({ x: 400, y: 750 }, 10);
    expect(v.zoom).toBe(2);
    v.zoomAt({ x: 400, y: 750 }, 1.01);
    expect(v.zoomed).toBe(false);
    expect(v.scroll).toEqual({ x: 0, y: 0 });
  });

  it('never lets the board be dragged off-screen', () => {
    const v = make();
    v.zoomAt({ x: 400, y: 750 }, 2);
    v.panBy(5000, 5000);
    expect(v.scroll).toEqual({ x: slot.x, y: slot.y }); // top-left corner of the board at the slot's corner
    v.panBy(-9000, -9000);
    expect(v.scroll.x).toBeCloseTo(slot.x + slot.width - slot.width / 2);
    expect(v.scroll.y).toBeCloseTo(slot.y + slot.height - slot.height / 2);
  });

  it('does not zoom small boards, and limits large ones to a useful zoom', () => {
    expect(maxZoomFor(100, 2)).toBe(1); // cells already 50 CSS px
    expect(maxZoomFor(20, 2)).toBeCloseTo(4.4 > 4 ? 4 : 4.4);
    const v = make(1);
    v.zoomAt({ x: 400, y: 750 }, 2);
    expect(v.zoomed).toBe(false);
    expect(v.zoomable).toBe(false);
  });

  it('fills the whole board area when zoomed, not just the fitted board, and stays on the board', () => {
    // A wide board on a phone: the fitted board leaves empty strips above and below it.
    const area = { x: 50, y: 150, width: 700, height: 1400 };
    const v = new BoardViewport();
    v.configure(canvas, slot, 3, area);
    v.zoomAt({ x: 400, y: 750 }, 2);
    expect(v.view).toEqual(area);
    // At 2×, 700 world px fill the area's 1400 px height: the whole board height, edge to edge.
    v.panBy(0, 5000);
    expect(v.worldToScreen({ x: 0, y: slot.y }).y).toBeCloseTo(area.y);
    v.panBy(0, -9000);
    expect(v.worldToScreen({ x: 0, y: slot.y + slot.height }).y).toBeCloseTo(area.y + area.height);
    // At 1.5× the board is shorter than the area: centred in it, whatever the pan.
    v.zoomAt({ x: 400, y: 750 }, 1.5);
    v.panBy(0, 300);
    const top = v.worldToScreen({ x: 0, y: slot.y }).y;
    const bottom = v.worldToScreen({ x: 0, y: slot.y + slot.height }).y;
    expect(top - area.y).toBeCloseTo(area.y + area.height - bottom);
    // Taps still map to the right board point.
    const p = { x: 300, y: 900 };
    const back = v.worldToScreen(v.screenToWorld(p));
    expect([back.x, back.y]).toEqual([expect.closeTo(p.x), expect.closeTo(p.y)]);
  });

  it('pan does nothing when fitted', () => {
    const v = make();
    v.panBy(100, 100);
    expect(v.scroll).toEqual({ x: 0, y: 0 });
  });
});

describe('gestures', () => {
  const types = (events: readonly GestureEvent[]) => events.map((e) => e.type);

  it('one finger: press then release is a tap', () => {
    const g = new GestureTracker(10, () => false);
    expect(types(g.down(1, 100, 100))).toEqual(['press']);
    expect(types(g.move(1, 103, 102))).toEqual(['drag']);
    expect(g.up(1, 103, 102)).toEqual([{ type: 'release', x: 103, y: 102 }]);
    expect(g.state).toBe('idle');
  });

  it('when zoomed, dragging past the threshold pans and cancels the press: no release', () => {
    const g = new GestureTracker(10, () => true);
    g.down(1, 100, 100);
    expect(types(g.move(1, 105, 100))).toEqual(['drag']);
    expect(types(g.move(1, 130, 100))).toEqual(['cancelPress', 'pan']);
    expect(types(g.move(1, 140, 110))).toEqual(['pan']);
    expect(g.up(1, 140, 110)).toEqual([]);
  });

  it('when not zoomed, dragging never pans (the press may still be cancelled by sliding off the arrow)', () => {
    const g = new GestureTracker(10, () => false);
    g.down(1, 100, 100);
    expect(types(g.move(1, 300, 100))).toEqual(['drag']);
  });

  it('a second finger that moves turns the touch into a pinch and cancels the press', () => {
    const g = new GestureTracker(10, () => false);
    g.down(1, 100, 100);
    expect(types(g.down(2, 200, 100))).toEqual([]); // undecided: maybe just the next tap
    expect(types(g.move(2, 204, 100))).toEqual([]); // still within the threshold
    expect(types(g.move(2, 250, 100))).toEqual(['cancelPress']);
    const events = g.move(2, 400, 100);
    expect(events.find((e) => e.type === 'pinch')).toMatchObject({ type: 'pinch', scale: 2 });
    expect(types(events)).toContain('pan'); // the midpoint moved too
  });

  it('rapid taps with two thumbs: the next finger lands before the previous lifts, and both taps count', () => {
    const g = new GestureTracker(10, () => false);
    expect(types(g.down(1, 100, 100))).toEqual(['press']);
    expect(g.down(2, 200, 300)).toEqual([]);
    expect(g.up(1, 101, 100)).toEqual([
      { type: 'release', x: 101, y: 100 },
      { type: 'press', x: 200, y: 300 },
    ]);
    // A third thumb lands while the second is still down: same again.
    expect(g.down(3, 50, 60)).toEqual([]);
    expect(g.up(2, 200, 300)).toEqual([
      { type: 'release', x: 200, y: 300 },
      { type: 'press', x: 50, y: 60 },
    ]);
    expect(g.up(3, 50, 60)).toEqual([{ type: 'release', x: 50, y: 60 }]);
    expect(g.state).toBe('idle');
  });

  it('a brief second touch that lifts first leaves the original press alone', () => {
    const g = new GestureTracker(10, () => false);
    g.down(1, 100, 100);
    g.down(2, 200, 300);
    expect(g.up(2, 200, 300)).toEqual([]);
    expect(g.up(1, 100, 100)).toEqual([{ type: 'release', x: 100, y: 100 }]);
  });

  it('three fingers are always a pinch', () => {
    const g = new GestureTracker(10, () => false);
    g.down(1, 100, 100);
    g.down(2, 200, 100);
    expect(types(g.down(3, 300, 100))).toEqual(['cancelPress']);
    expect(g.state).toBe('pinch');
  });

  it('after a pinch, lifting fingers never releases an arrow', () => {
    const g = new GestureTracker(10, () => false);
    g.down(1, 100, 100);
    g.down(2, 200, 100);
    g.move(2, 260, 100); // it is a pinch
    expect(g.up(2, 260, 100)).toEqual([]);
    expect(types(g.move(1, 101, 100))).toEqual([]); // the remaining finger does nothing
    expect(g.up(1, 101, 100)).toEqual([]);
    expect(types(g.down(1, 50, 50))).toEqual(['press']); // a new tap works again
  });

  it('cancel drops everything (level change, restart, pointer left the game)', () => {
    const g = new GestureTracker(10, () => true);
    g.down(1, 100, 100);
    expect(types(g.cancel())).toEqual(['cancelPress']);
    expect(g.up(1, 100, 100)).toEqual([]);
    expect(g.state).toBe('idle');
  });
});

describe('tall portrait boards', () => {
  // A 375 × 812 phone: about 359 × 690 CSS px left for the board under the compact HUD.
  it('fill the height for tall grids and the width for square ones', () => {
    const tall = fitBoardSlot(359, 690, 17, 12);
    expect(tall.height).toBeGreaterThan(tall.width);
    expect(tall.width).toBe(359); // limited by the width: the whole width is used
    expect(tall.height).toBeLessThanOrEqual(690);
    const square = fitBoardSlot(359, 690, 7, 7);
    expect(square.width).toBe(square.height);
  });

  it('never overflow a short screen: the height limits the width instead', () => {
    const slot = fitBoardSlot(359, 420, 17, 12);
    expect(slot.height).toBeLessThanOrEqual(420);
    expect(slot.width).toBeLessThan(359);
  });

  it('keep cells square and large enough to tap on common phones', () => {
    for (const [w, h] of [[359, 690], [344, 640], [396, 760]]) {
      const slot = fitBoardSlot(w, h, 17, 12);
      const cellW = slot.width / 12.6;
      const cellH = slot.height / 17.6;
      expect(Math.abs(cellW - cellH)).toBeLessThan(0.2);
      expect(cellW).toBeGreaterThanOrEqual(26);
    }
    expect(fitBoardSlot(2000, 2000, 7, 7).width).toBe(MAX_BOARD_WIDTH);
  });
});

describe('animation path slicing (allocation-free)', () => {
  const path = [
    { x: 0, y: 0 },
    { x: 30, y: 0 },
    { x: 30, y: 40 },
    { x: 30, y: 40 }, // zero-length segment
    { x: 100, y: 40 },
  ];
  const measured = new MeasuredPolyline(path);

  it('gives exactly the same points as slicePolyline for any window', () => {
    const buf: { x: number; y: number }[] = [];
    for (const [from, to] of [[0, 140], [5, 25], [10, 60], [29, 31], [45, 45], [60, 200], [-5, 20]]) {
      const n = measured.sliceInto(from, to, buf);
      const expected = slicePolyline(path, Math.max(0, from), to);
      expect(buf.slice(0, n).map((p) => [+p.x.toFixed(6), +p.y.toFixed(6)])).toEqual(expected.map((p) => [+p.x.toFixed(6), +p.y.toFixed(6)]));
    }
    expect(measured.length).toBe(140);
  });

  it('reuses its buffer: no new point objects once it is large enough', () => {
    const buf: { x: number; y: number }[] = [];
    measured.sliceInto(0, 140, buf);
    const objects = [...buf];
    measured.sliceInto(10, 120, buf);
    expect(buf.slice(0, objects.length).every((p, i) => p === objects[i])).toBe(true);
  });

  it('finds the point at a distance, clamped to the ends', () => {
    const out = { x: 0, y: 0 };
    expect(measured.pointAt(50, out)).toEqual({ x: 30, y: 20 });
    expect(measured.pointAt(-10, out)).toEqual({ x: 0, y: 0 });
    expect(measured.pointAt(999, out)).toEqual({ x: 100, y: 40 });
  });
});
