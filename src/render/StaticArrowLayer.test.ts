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
