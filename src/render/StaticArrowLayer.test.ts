import { describe, expect, it } from 'vitest';
import type { ArrowView } from './ArrowView';
import type { BoardLayout } from './layout';
import { StaticArrowLayer } from './StaticArrowLayer';

/** Just enough of an arrow view: whether it is at rest, and its Graphics' visibility. */
function fakeView(id: string, isStatic = true) {
  const graphics = {
    visible: true,
    setVisible(v: boolean) {
      this.visible = v;
      return this;
    },
    setScale() {
      return this;
    },
  };
  return { data: { id }, isStatic, graphics } as unknown as ArrowView & { isStatic: boolean; graphics: typeof graphics };
}

function fakeScene() {
  const drawn: unknown[][] = [];
  const texture = {
    width: 0,
    height: 0,
    setOrigin() { return this; },
    setPosition() { return this; },
    setScale() { return this; },
    clear() { drawn.push([]); return this; },
    beginDraw() { return this; },
    batchDraw(g: unknown) { drawn[drawn.length - 1].push(g); return this; },
    endDraw() { return this; },
    destroy() {},
  };
  const scene = {
    time: { now: 0 },
    add: {
      renderTexture: (_x: number, _y: number, w: number, h: number) => Object.assign(texture, { width: w, height: h }),
    },
  };
  return { scene, parent: { addAt() {} }, drawn };
}

const layout = { x: 0, y: 0, width: 300, height: 400, cellSize: 30 } as BoardLayout;

describe('resting-arrow cache', () => {
  it('draws resting arrows from the cache and hides their live Graphics', () => {
    const { scene, parent, drawn } = fakeScene();
    const layer = new StaticArrowLayer(scene as never, parent as never);
    layer.setLayout(layout);
    const a = fakeView('a');
    const b = fakeView('b');
    layer.update(new Map([['a', a], ['b', b]]), 0);
    expect(drawn.at(-1)).toEqual([a.graphics, b.graphics]);
    expect([a.graphics.visible, b.graphics.visible]).toEqual([false, false]);
  });

  it('an arrow that leaves the board without being pressed (bonus or chain release) is shown live, never hidden', () => {
    const { scene, parent } = fakeScene();
    const layer = new StaticArrowLayer(scene as never, parent as never);
    layer.setLayout(layout);
    const a = fakeView('a');
    const bonus = fakeView('bonus');
    const views = new Map([['a', a], ['bonus', bonus]]);
    layer.update(views, 0);
    expect(bonus.graphics.visible).toBe(false); // drawn from the cache while at rest

    // Its exit starts: it is no longer at rest and is taken off the board's list.
    (bonus as { isStatic: boolean }).isStatic = false;
    views.delete('bonus');
    layer.update(views, 16);
    expect(bonus.graphics.visible).toBe(true); // flies off visibly
    expect(a.graphics.visible).toBe(false); // the rest stay cached
  });

  it('a resting arrow that starts moving in place (a blocked bounce) becomes live too', () => {
    const { scene, parent } = fakeScene();
    const layer = new StaticArrowLayer(scene as never, parent as never);
    layer.setLayout(layout);
    const a = fakeView('a');
    const views = new Map([['a', a]]);
    layer.update(views, 0);
    (a as { isStatic: boolean }).isStatic = false;
    layer.update(views, 16);
    expect(a.graphics.visible).toBe(true);
  });

  it('B1: does not rebuild on every frame while an arrow is pressed, flashing or tweening', () => {
    const { scene, parent, drawn } = fakeScene();
    const layer = new StaticArrowLayer(scene as never, parent as never);
    layer.setLayout(layout);
    const a = fakeView('a');
    const pressed = fakeView('pressed', false);
    const views = new Map([['a', a], ['pressed', pressed]]);
    layer.update(views, 0);
    const rebuilds = drawn.length;
    for (let frame = 1; frame <= 60; frame++) layer.update(views, frame * 16);
    expect(drawn.length).toBe(rebuilds); // nothing changed: no rebuild
    expect([a.graphics.visible, pressed.graphics.visible]).toEqual([false, true]);
  });

  it('still rebuilds when a cached arrow leaves the board list while another is live', () => {
    const { scene, parent, drawn } = fakeScene();
    const layer = new StaticArrowLayer(scene as never, parent as never);
    layer.setLayout(layout);
    const a = fakeView('a');
    const b = fakeView('b');
    const pressed = fakeView('pressed', false);
    const views = new Map([['a', a], ['b', b], ['pressed', pressed]]);
    layer.update(views, 0);
    const rebuilds = drawn.length;
    views.delete('b'); // removed while still marked static (e.g. a release that hasn't started animating)
    layer.update(views, 16);
    expect(drawn.length).toBe(rebuilds + 1);
    expect(drawn.at(-1)).toEqual([a.graphics]);
    expect(b.graphics.visible).toBe(true);
  });

  it('clear() (restart, level change) shows every arrow live again', () => {
    const { scene, parent } = fakeScene();
    const layer = new StaticArrowLayer(scene as never, parent as never);
    layer.setLayout(layout);
    const a = fakeView('a');
    layer.update(new Map([['a', a]]), 0);
    layer.clear();
    expect(a.graphics.visible).toBe(true);
  });
});

describe('resting-arrow cache when zoomed (sharp arrows on large boards)', () => {
  /** A scene whose texture records where it is drawn and at what resolution. */
  function recordingScene() {
    const builds: { x: number; y: number; width: number; height: number; scale: number }[] = [];
    let pos = { x: 0, y: 0 };
    const texture = {
      width: 0,
      height: 0,
      setOrigin() { return this; },
      setPosition(x: number, y: number) { pos = { x, y }; return this; },
      setScale(s: number) { builds.push({ ...pos, width: this.width, height: this.height, scale: 1 / s }); return this; },
      clear() { return this; },
      beginDraw() { return this; },
      batchDraw() { return this; },
      endDraw() { return this; },
      destroy() {},
    };
    const scene = { time: { now: 0 }, add: { renderTexture: (_x: number, _y: number, w: number, h: number) => Object.assign(texture, { width: w, height: h }) } };
    return { scene, parent: { addAt() {} }, builds };
  }
  // A large board (THE FINAL GRID on a phone, in device pixels).
  const big = { x: 0, y: 0, width: 1000, height: 1300, cellSize: 36 } as BoardLayout;
  const views = new Map([['a', fakeView('a')]]);

  it('fitted: one cache for the whole board, as before', () => {
    const { scene, parent, builds } = recordingScene();
    const layer = new StaticArrowLayer(scene as never, parent as never);
    layer.setLayout(big);
    layer.update(views, 1000);
    expect(builds.at(-1)).toMatchObject({ x: -36, y: -36 });
    // The whole board must fit a 2048-pixel texture: under 2× on a board this large, as before.
    expect(builds.at(-1)!.scale).toBeCloseTo(2048 / (1300 + 2 * 36));
  });

  it('zoomed 3× and settled: caches only the visible part plus a margin, with more than one texture pixel per screen pixel', () => {
    const { scene, parent, builds } = recordingScene();
    const layer = new StaticArrowLayer(scene as never, parent as never);
    layer.setLayout(big);
    layer.update(views, 0);
    const wholeBoard = builds.at(-1)!;
    layer.setZoom(3);
    layer.setView({ x: 400, y: 500, width: 360, height: 540 }); // 1080×1620 screen pixels at 3×
    layer.update(views, 1000); // the zoom has settled
    const zoomed = builds.at(-1)!;
    expect(zoomed).toMatchObject({ x: 310, y: 365 }); // the visible part, plus 25 % of it on each side
    expect(zoomed.scale / 3).toBeGreaterThan(1); // sharp: over one texture pixel per screen pixel
    expect(zoomed.scale).toBeGreaterThan(wholeBoard.scale);
    expect(Math.max(zoomed.width, zoomed.height)).toBeLessThanOrEqual(3072); // within the phone texture limit
  });

  it('panning out of the cached part rebuilds at once, in the same frame, so no arrow goes missing', () => {
    const { scene, parent, builds } = recordingScene();
    const layer = new StaticArrowLayer(scene as never, parent as never);
    layer.setLayout(big);
    layer.setZoom(3);
    layer.setView({ x: 400, y: 500, width: 360, height: 540 });
    layer.update(views, 1000);
    const count = builds.length;
    layer.setView({ x: 420, y: 520, width: 360, height: 540 }); // a small pan: still inside the margin
    layer.update(views, 1016);
    expect(builds.length).toBe(count);
    layer.setView({ x: 600, y: 700, width: 360, height: 540 }); // past the margin
    layer.update(views, 1032);
    expect(builds.length).toBe(count + 1);
    const r = builds.at(-1)!;
    expect(r.x).toBeLessThanOrEqual(600);
    expect(r.y).toBeLessThanOrEqual(700);
  });

  it('mid-pinch it falls back to the whole board, and zooming back out restores the whole board at once', () => {
    const { scene, parent, builds } = recordingScene();
    const layer = new StaticArrowLayer(scene as never, parent as never);
    layer.setLayout(big);
    layer.setZoom(3);
    layer.setView({ x: 400, y: 500, width: 360, height: 540 });
    layer.update(views, 1000);
    scene.time.now = 2000;
    layer.setZoom(1.5); // pinching out: the visible part grows past the cache
    layer.setView({ x: 200, y: 300, width: 720, height: 1080 });
    layer.update(views, 2016); // not settled yet
    expect(builds.at(-1)).toMatchObject({ x: -36, y: -36 });
    layer.setZoom(1);
    layer.setView(undefined); // back to fitted
    layer.update(views, 2032);
    expect(builds.at(-1)).toMatchObject({ x: -36, y: -36 });
  });
});
