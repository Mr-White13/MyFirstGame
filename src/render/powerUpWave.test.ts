import { describe, expect, it } from 'vitest';
import type { ArrowData } from '../core/types';
import { powerUpWave, WAVE_SPREAD_MS, WAVE_START_MS } from './powerUpWave';

function arrow(id: string, cells: [number, number][]): ArrowData {
  return { id, direction: 'right', cells: cells.map(([row, col]) => ({ row, col })) };
}

describe('powerUpWave', () => {
  it('starts at the grid centre and reaches the farthest arrow after exactly the spread time', () => {
    // 5×5 grid, centre (2,2).
    const arrows = [arrow('corner', [[0, 0]]), arrow('centre', [[2, 2]]), arrow('edge', [[2, 4]])];
    const { delays, reach } = powerUpWave(arrows, 5, 5);
    expect(reach).toBeCloseTo(Math.hypot(2, 2));
    expect(delays[0]).toBeCloseTo(WAVE_START_MS + WAVE_SPREAD_MS);
    expect(delays[1]).toBe(WAVE_START_MS);
    expect(delays[2]).toBeGreaterThan(WAVE_START_MS);
    expect(delays[2]).toBeLessThan(delays[0]);
  });

  it("measures each arrow from the centre of its cells, so a long arrow through the middle lights early", () => {
    const arrows = [arrow('through', [[2, 0], [2, 1], [2, 2], [2, 3], [2, 4]]), arrow('corner', [[4, 4]])];
    const { delays } = powerUpWave(arrows, 5, 5);
    expect(delays[0]).toBe(WAVE_START_MS);
    expect(delays[1]).toBeCloseTo(WAVE_START_MS + WAVE_SPREAD_MS);
  });

  it('follows the ease-out of the wave front ring: halfway out is reached in under half the spread time', () => {
    const arrows = [arrow('half', [[2, 3]]), arrow('far', [[2, 4]])];
    const { delays } = powerUpWave(arrows, 5, 5);
    expect(delays[0] - WAVE_START_MS).toBeCloseTo((1 - Math.sqrt(0.5)) * WAVE_SPREAD_MS);
  });

  it('handles a single centred arrow and no arrows at all', () => {
    expect(powerUpWave([arrow('only', [[1, 1]])], 3, 3)).toEqual({ delays: [WAVE_START_MS], reach: 0 });
    expect(powerUpWave([], 3, 3)).toEqual({ delays: [], reach: 0 });
  });
});
