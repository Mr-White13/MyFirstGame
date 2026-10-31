import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  calendar,
  checkIn,
  claim,
  claimStatus,
  createDaily,
  cycleDay,
  DAILY_REWARDS,
  nextReward,
  readDaily,
  rewardForDay,
  type DailyState,
} from './Daily';
import { addDays, DayClock, dayKey, daysBetween, doneOn, isDayKey, msUntilNextDay, recordDay } from './dayKey';

// A zone with daylight saving, so DST behaviour is tested whatever the machine's zone is.
const originalTz = process.env.TZ;
beforeAll(() => {
  process.env.TZ = 'Europe/Bucharest';
});
afterAll(() => {
  process.env.TZ = originalTz;
});

/** Checks in on each day in turn. */
function visit(days: string[], start: DailyState = createDaily()): DailyState {
  return days.reduce((s, d) => checkIn(s, d).state, start);
}

describe('calendar days', () => {
  it('uses the local calendar date, not UTC', () => {
    // 23:30 local on 31 Oct is 21:30 UTC: still 31 Oct. 01:00 local on 1 Nov is 23:00 UTC on 31 Oct.
    expect(dayKey(new Date(2026, 9, 31, 23, 30))).toBe('2026-10-31');
    expect(dayKey(new Date(2026, 10, 1, 1, 0))).toBe('2026-11-01');
    expect(new Date(2026, 10, 1, 1, 0).toISOString().slice(0, 10)).toBe('2026-10-31');
  });

  it('crosses month and year ends', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29'); // leap year
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1);
    expect(daysBetween('2026-01-01', '2027-01-01')).toBe(365);
  });

  it('counts daylight-saving days as one day each', () => {
    // Europe/Bucharest: 29 Mar 2026 has 23 hours, 25 Oct 2026 has 25 hours.
    expect(daysBetween('2026-03-28', '2026-03-29')).toBe(1);
    expect(daysBetween('2026-03-29', '2026-03-30')).toBe(1);
    expect(daysBetween('2026-10-25', '2026-10-26')).toBe(1);
    const shortDay = new Date(2026, 2, 29, 0, 0, 0);
    expect(msUntilNextDay(shortDay)).toBe(23 * 3600_000 + 1000);
    const longDay = new Date(2026, 9, 25, 0, 0, 0);
    expect(msUntilNextDay(longDay)).toBe(25 * 3600_000 + 1000);
    // 24 hours after 00:30 on the long day is still the same date: not a new day.
    expect(dayKey(new Date(longDay.getTime() + 30 * 60_000 + 24 * 3600_000))).toBe('2026-10-25');
  });

  it('validates day keys', () => {
    expect(isDayKey('2026-10-31')).toBe(true);
    for (const bad of ['2026-02-30', '2026-13-01', '26-10-31', '2026-10-31T00:00', 20261031, null]) expect(isDayKey(bad)).toBe(false);
  });

  it('records completion days for daily objectives', () => {
    const days = recordDay(recordDay(['2026-10-29'], '2026-10-31', 2), '2026-10-30', 2);
    expect(days).toEqual(['2026-10-30', '2026-10-31']);
    expect(doneOn(days, '2026-10-31')).toBe(true);
    expect(doneOn(days, '2026-11-01')).toBe(false); // a new day resets it, no timer needed
    expect(recordDay(days, '2026-10-31', 5)).toEqual(days); // no duplicates
  });
});

describe('check-in and streak', () => {
  it('first check-in starts a 1-day streak', () => {
    const { state, kind } = checkIn(createDaily(), '2026-10-31');
    expect(kind).toBe('first');
    expect(state).toMatchObject({ lastCheckIn: '2026-10-31', streak: 1, longestStreak: 1, daysPlayed: 1 });
  });

  it('checking in again the same day changes nothing', () => {
    const once = visit(['2026-10-31']);
    const again = checkIn(once, '2026-10-31');
    expect(again.kind).toBe('same-day');
    expect(again.state).toBe(once);
  });

  it('consecutive days grow the streak, also across month and year ends', () => {
    const s = visit(['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']);
    expect(s.streak).toBe(4);
    expect(s.daysPlayed).toBe(4);
    expect(visit(['2026-02-28', '2026-03-01']).streak).toBe(2);
  });

  it('a missed day resets the streak but keeps the longest', () => {
    const s = visit(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-05']);
    expect(checkIn(visit(['2026-10-01', '2026-10-02', '2026-10-03']), '2026-10-05').kind).toBe('reset');
    expect(s.streak).toBe(1);
    expect(s.longestStreak).toBe(3);
    const later = visit(['2026-10-06'], s);
    expect(later.streak).toBe(2);
    expect(later.longestStreak).toBe(3); // never decreases
    expect(later.daysPlayed).toBe(5);
  });

  it('a clock moved backwards (or a westward time-zone change) changes nothing', () => {
    const s = visit(['2026-10-30', '2026-10-31']);
    const back = checkIn(s, '2026-10-30');
    expect(back.kind).toBe('clock-back');
    expect(back.state).toBe(s);
    expect(checkIn(s, '2026-10-31').kind).toBe('same-day');
    expect(checkIn(s, '2026-11-01').state.streak).toBe(3); // and continues normally afterwards
  });

  it('the same instant in another time zone is judged by the local date only', () => {
    const instant = Date.UTC(2026, 9, 31, 22, 30); // 00:30 on 1 Nov in Bucharest, 22:30 on 31 Oct in London
    const bucharest = dayKey(new Date(instant));
    process.env.TZ = 'Europe/London';
    const london = dayKey(new Date(instant));
    process.env.TZ = 'Europe/Bucharest';
    expect([bucharest, london]).toEqual(['2026-11-01', '2026-10-31']);
    // Played in Bucharest on 1 Nov, flew to London where it is still 31 Oct: no new day, no duplicate.
    const s = visit(['2026-10-31', bucharest]);
    expect(checkIn(s, london).state).toBe(s);
  });
});

describe('daily reward', () => {
  it('follows the 7-day cycle and starts again after day 7', () => {
    expect(DAILY_REWARDS).toEqual([10, 15, 20, 25, 30, 40, 75]);
    expect([1, 2, 7, 8, 14, 15].map(cycleDay)).toEqual([1, 2, 7, 1, 7, 1]);
    expect(rewardForDay(7)).toBe(75);
  });

  it('can be claimed once per date, with the right amount', () => {
    let s = visit(['2026-10-29', '2026-10-30', '2026-10-31']);
    expect(claimStatus(s, '2026-10-31')).toBe('available');
    const first = claim(s, '2026-10-31')!;
    expect(first.reward).toEqual({ date: '2026-10-31', day: 3, credits: 20, transactionId: 'daily:2026-10-31' });
    s = first.state;
    expect(claimStatus(s, '2026-10-31')).toBe('claimed');
    expect(claim(s, '2026-10-31')).toBeNull();
    s = visit(['2026-11-01'], s);
    expect(claim(s, '2026-11-01')!.reward.credits).toBe(25);
  });

  it('a missed day restarts the cycle at day 1', () => {
    let s = visit(['2026-10-01', '2026-10-02', '2026-10-03']);
    s = visit(['2026-10-05'], s);
    expect(claim(s, '2026-10-05')!.reward).toMatchObject({ day: 1, credits: 10 });
  });

  it('is not available before checking in, nor for a date earlier than the last claim', () => {
    const s = claim(visit(['2026-10-31']), '2026-10-31')!.state;
    expect(claimStatus(createDaily(), '2026-10-31')).toBe('pending');
    expect(claimStatus(s, '2026-10-30')).toBe('clock-back');
    expect(claim(s, '2026-10-30')).toBeNull();
  });

  it('shows claimed, missed, today and upcoming days of the current cycle', () => {
    let s = visit(['2026-10-29']);
    s = claim(s, '2026-10-29')!.state;
    s = visit(['2026-10-30', '2026-10-31'], s); // played the 30th without claiming
    const days = calendar(s, '2026-10-31');
    expect(days.map((d) => d.status)).toEqual(['claimed', 'missed', 'today', 'upcoming', 'upcoming', 'upcoming', 'upcoming']);
    expect(days[0].date).toBe('2026-10-29');
    expect(days[6].credits).toBe(75);
    s = claim(s, '2026-10-31')!.state;
    expect(calendar(s, '2026-10-31')[2].status).toBe('claimed');
    expect(nextReward(s, '2026-10-31')).toEqual({ day: 4, credits: 25 });
  });

  it('day 8 shows a fresh cycle', () => {
    const week = Array.from({ length: 8 }, (_, i) => addDays('2026-10-01', i));
    const s = visit(week);
    const days = calendar(s, week[7]);
    expect(days[0]).toMatchObject({ date: week[7], status: 'today', day: 1 });
  });
});

describe('daily storage validation', () => {
  it('repairs bad or inconsistent fields', () => {
    expect(readDaily(null)).toEqual(createDaily());
    expect(readDaily('x')).toEqual(createDaily());
    const s = readDaily({
      lastCheckIn: '2026-10-31',
      streak: -4,
      longestStreak: 'lots',
      daysPlayed: 0,
      lastClaim: 'yesterday',
      claims: 2.5,
      claimedDays: ['2026-10-30', 'nope', '2026-10-30', '2026-10-31'],
      history: ['2026-10-31', 42],
    });
    expect(s).toMatchObject({ lastCheckIn: '2026-10-31', streak: 1, longestStreak: 1, daysPlayed: 1, lastClaim: '2026-10-31', claims: 2 });
    expect(s.claimedDays).toEqual(['2026-10-30', '2026-10-31']);
  });
});

describe('day clock (app open across midnight, resume from background)', () => {
  afterEach(() => vi.useRealTimers());

  it('notices midnight with one timer, not polling', () => {
    vi.useFakeTimers();
    let now = new Date(2026, 9, 31, 23, 59, 0);
    vi.setSystemTime(now);
    const clock = new DayClock(() => now, null);
    const seen: string[] = [];
    clock.onChange((day) => seen.push(day));
    clock.start();
    expect(vi.getTimerCount()).toBe(1);
    now = new Date(2026, 10, 1, 0, 0, 2);
    vi.advanceTimersByTime(62_000);
    expect(seen).toEqual(['2026-11-01']);
    expect(clock.today).toBe('2026-11-01');
    expect(vi.getTimerCount()).toBe(1); // re-armed for the next midnight
    clock.stop();
  });

  it('re-checks when the page becomes visible again (timers sleep in the background)', () => {
    vi.useFakeTimers();
    let now = new Date(2026, 9, 31, 22, 0);
    const events = new EventTarget();
    const clock = new DayClock(() => now, events);
    const seen: string[] = [];
    clock.onChange((day, previous) => seen.push(`${previous}->${day}`));
    clock.start();
    now = new Date(2026, 10, 2, 9, 0); // the phone slept for a day and a half
    events.dispatchEvent(new Event('visibilitychange'));
    expect(seen).toEqual(['2026-10-31->2026-11-02']);
    events.dispatchEvent(new Event('focus'));
    expect(seen).toHaveLength(1); // same day: no second event
    clock.stop();
  });
});
