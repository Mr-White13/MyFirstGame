import { describe, expect, it } from 'vitest';
import { unitCircle } from './unitCircle';

describe('unitCircle', () => {
  it.each([8, 14, 32])('gives exactly the values of the former inline tables (%i steps)', (steps) => {
    const { cos, sin } = unitCircle(steps);
    // toEqual compares numbers with Object.is: bit-identical, not just close.
    expect(cos).toEqual(Array.from({ length: steps + 1 }, (_, i) => Math.cos((i / steps) * Math.PI * 2)));
    expect(sin).toEqual(Array.from({ length: steps + 1 }, (_, i) => Math.sin((i / steps) * Math.PI * 2)));
  });

  it('starts at angle 0 and closes the loop', () => {
    const { cos, sin } = unitCircle(8);
    expect([cos[0], sin[0]]).toEqual([1, 0]);
    expect(cos[8]).toBe(1);
    expect(sin[8]).toBeCloseTo(0, 12);
  });
});
