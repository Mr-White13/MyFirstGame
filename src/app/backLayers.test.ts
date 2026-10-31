import { describe, expect, it } from 'vitest';
import { routeBack, type BackLayer } from './backLayers';

function layers(open: readonly boolean[], log: string[]): BackLayer[] {
  return open.map((isOpen, i) => ({
    active: () => (log.push(`ask ${i}`), isOpen),
    back: (system) => log.push(`back ${i} ${system ? 'system' : 'escape'}`),
  }));
}

describe('routeBack', () => {
  it('gives Back to the first active layer only, asking no layer below it', () => {
    const log: string[] = [];
    expect(routeBack(layers([false, true, true], log), true)).toBe(true);
    expect(log).toEqual(['ask 0', 'ask 1', 'back 1 system']);
  });

  it('passes on whether it was Android Back or Escape', () => {
    const log: string[] = [];
    routeBack(layers([true], log), false);
    expect(log).toEqual(['ask 0', 'back 0 escape']);
  });

  it('returns false when nothing is active', () => {
    const log: string[] = [];
    expect(routeBack(layers([false, false], log), true)).toBe(false);
    expect(log).toEqual(['ask 0', 'ask 1']);
  });
});
