import { describe, expect, it } from 'vitest';
import type { LevelData } from '../core/types';
import { addDays } from '../daily/dayKey';
import { LEVELS } from '../levels';
import { STEP_14_LEVELS } from '../levels/archive';
import { golden } from '../testing/golden';
import { CHALLENGE_POOLS, challengePool, CURRENT_POOL, dailyChallenges } from './challenges';

/**
 * Pool 5 was the live Daily League pool until the 100-level rebuild; it now
 * draws from its frozen archive (levels/archive/step14) and pool 6 is live.
 * The checks below are unchanged: pool 5 must keep its exact layouts. Players' competition
 * days remember their pool version, and Energy Points are keyed by challenge
 * and arrow id, so changing any level in this pool would silently change days
 * already in progress (layouts, Energy Arrows, collected points).
 *
 * If this test fails because a pool-5 level changed on purpose, do NOT
 * update the golden file. Instead: archive the current pool-5 layouts
 * (src/levels/archive), give pool 5 that archive as its `source`, add pool 6
 * on the new levels and make it CURRENT_POOL (see challenges.ts). This test
 * then passes again unchanged, because pool 5 keeps its exact layouts.
 */

const signature = (l: LevelData) => l.arrows.map((a) => `${a.id}${a.direction[0]}${a.cells.map((x) => x.row + '.' + x.col).join('/')}`).join(' ');

/** Days around the time pool 5 went live, plus later ones. */
const DAYS = [...Array.from({ length: 21 }, (_, i) => addDays('2026-10-25', i)), '2026-12-31', '2027-02-28', '2028-02-29'];

describe('Daily League pool 5 (archived in Step 14)', () => {
  const layouts = challengePool(LEVELS, 5).map((l) => ({ id: l.id, revision: l.revision ?? 1, rows: l.rows, cols: l.cols, arrows: signature(l) }));
  const days = Object.fromEntries(
    DAYS.map((day) => [day, dailyChallenges(day, LEVELS, 5).map((c) => ({ id: c.id, energy: c.energyArrowIds.join(' ') }))]),
  );
  const expected = golden(new URL('./pool5.golden.json', import.meta.url), { layouts, days });

  it('draws from exactly the recorded levels', () => {
    expect(layouts.map((l) => l.id)).toEqual(expected.layouts.map((l) => l.id));
  });

  it.each(expected.layouts.map((l) => [l.id, l] as const))('level %i keeps its pool-5 layout', (id, recorded) => {
    expect(layouts.find((l) => l.id === id)).toEqual(recorded);
  });

  it('gives the recorded challenges and Energy Arrows for every recorded day', () => {
    expect(days).toEqual(expected.days);
  });

  it('marks exactly the recorded arrows as Energy Arrows on an unchanged layout', () => {
    for (const day of DAYS) {
      for (const c of dailyChallenges(day, LEVELS, 5)) {
        const source = layouts.find((l) => l.id === c.sourceLevelId)!;
        expect(signature(c.level)).toBe(source.arrows);
        expect(c.level.arrows.filter((a) => a.energy).map((a) => a.id)).toEqual([...c.energyArrowIds]);
      }
    }
  });

  it('pool 5 draws from its frozen archive, and pool 6 is the live pool', () => {
    expect(Object.keys(CHALLENGE_POOLS).map(Number)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(CHALLENGE_POOLS[5].source).toBe(STEP_14_LEVELS);
    expect(CURRENT_POOL).toBe(6);
    expect(CHALLENGE_POOLS[6].source).toBeUndefined();
  });
});
