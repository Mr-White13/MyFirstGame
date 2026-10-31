import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AttemptTracker } from '../app/AttemptTracker';
import { Hud } from './Hud';

/** Just enough of an element for the HUD (the tests run without a DOM). */
function fakeElement() {
  return {
    textContent: '',
    hidden: false,
    disabled: false,
    style: { transform: '' },
    children: [],
    classList: { toggle() {}, add() {}, remove() {} },
    setAttribute() {},
    addEventListener() {},
  };
}

let elements: Map<string, ReturnType<typeof fakeElement>>;

beforeEach(() => {
  elements = new Map();
  (globalThis as { document?: unknown }).document = {
    getElementById(id: string) {
      if (!elements.has(id)) elements.set(id, fakeElement());
      return elements.get(id);
    },
  };
});

afterEach(() => {
  delete (globalThis as { document?: unknown }).document;
});

describe('gameplay timer visibility', () => {
  it('is shown by default and can be hidden and shown again', () => {
    const hud = new Hud();
    expect(elements.get('hud-timer')!.hidden).toBe(false);
    hud.setTimerVisible(false);
    expect(elements.get('hud-timer')!.hidden).toBe(true);
    hud.setTimerVisible(true);
    expect(elements.get('hud-timer')!.hidden).toBe(false);
  });

  it('keeps the clock text up to date while hidden, so showing it again is instant', () => {
    const hud = new Hud();
    hud.setTimerVisible(false);
    hud.setTime(83_000);
    expect(elements.get('hud-time')!.textContent).toBe('01:23');
  });

  it('hiding the timer is purely visual: the attempt is still timed', () => {
    let now = 0;
    const tracker = new AttemptTracker(() => now);
    const hud = new Hud();
    hud.setTimerVisible(false);
    tracker.begin(1, 1);
    tracker.interactive();
    now = 4_200;
    expect(tracker.timer.elapsed()).toBe(4_200);
  });
});
