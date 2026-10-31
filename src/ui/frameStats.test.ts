import { describe, expect, it } from 'vitest';
import { FrameStats } from './frameStats';

describe('frame time statistics (debug overlay)', () => {
  it('reports average and worst frame interval, slow-frame share and CPU work per frame', () => {
    const stats = new FrameStats();
    for (const interval of [16.7, 16.6, 16.8, 33.4]) stats.add(interval, 2);
    const r = stats.take()!;
    expect(r.frames).toBe(4);
    expect(r.avg).toBeCloseTo(20.875);
    expect(r.worst).toBeCloseTo(33.4);
    expect(r.slowShare).toBe(0.25);
    expect(r.work).toBe(2);
    expect(stats.take()).toBeNull(); // each report starts a new window
  });
});
