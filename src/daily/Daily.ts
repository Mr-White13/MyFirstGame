import { addDays, daysBetween, isDayKey, recordDay, type DayKey } from './dayKey';

/**
 * Daily check-in and login streak. Pure functions over a small record; the
 * Rewards service persists it together with the wallet.
 *
 * - **Check-in** happens automatically when the game is open on a day (start,
 *   refresh, return from background, or midnight passing while it is in
 *   front of the player). It counts the day; it never gives a reward.
 * - **Claiming** the day's reward is always an explicit tap.
 */
export interface DailyState {
  /** Last day the game was opened. */
  readonly lastCheckIn: DayKey | null;
  /** Consecutive days up to and including `lastCheckIn`. */
  readonly streak: number;
  /** Best streak ever; never decreases. */
  readonly longestStreak: number;
  /** Distinct calendar days the game was opened. */
  readonly daysPlayed: number;
  /** Most recent day whose reward was claimed. Claims only ever move forward in time. */
  readonly lastClaim: DayKey | null;
  /** Rewards claimed in total. */
  readonly claims: number;
  /** Recent days with a claim (for the calendar), oldest first. */
  readonly claimedDays: readonly DayKey[];
  /** Recent days the game was opened, oldest first. */
  readonly history: readonly DayKey[];
}

/** Credits for each day of the 7-day cycle. Initial balancing values. */
export const DAILY_REWARDS: readonly number[] = [10, 15, 20, 25, 30, 40, 75];
export const CYCLE_LENGTH = DAILY_REWARDS.length;
/** Enough history for the calendar and a few weeks of statistics. */
const KEEP_CLAIMS = 14;
const KEEP_HISTORY = 60;

export function createDaily(): DailyState {
  return { lastCheckIn: null, streak: 0, longestStreak: 0, daysPlayed: 0, lastClaim: null, claims: 0, claimedDays: [], history: [] };
}

export type CheckInKind =
  /** The very first day. */
  | 'first'
  /** Already checked in today: nothing changes. */
  | 'same-day'
  /** The day after the last check-in: streak + 1. */
  | 'continued'
  /** One or more days missed: the streak starts again at 1. */
  | 'reset'
  /** Today is *before* the last check-in (clock or time zone moved back): nothing changes. */
  | 'clock-back';

/** Counts `today` as a day played. Calling it again on the same day changes nothing. */
export function checkIn(state: DailyState, today: DayKey): { state: DailyState; kind: CheckInKind } {
  if (state.lastCheckIn === null) {
    return { state: visit(state, today, 1), kind: 'first' };
  }
  const gap = daysBetween(state.lastCheckIn, today);
  if (gap === 0) return { state, kind: 'same-day' };
  if (gap < 0) return { state, kind: 'clock-back' };
  return gap === 1 ? { state: visit(state, today, state.streak + 1), kind: 'continued' } : { state: visit(state, today, 1), kind: 'reset' };
}

function visit(state: DailyState, today: DayKey, streak: number): DailyState {
  return {
    ...state,
    lastCheckIn: today,
    streak,
    longestStreak: Math.max(state.longestStreak, streak),
    daysPlayed: state.daysPlayed + 1,
    history: recordDay(state.history, today, KEEP_HISTORY),
  };
}

/** Day of the 7-day cycle (1..7) for a streak. Day 8 starts the cycle again at Day 1. */
export function cycleDay(streak: number): number {
  return ((Math.max(1, streak) - 1) % CYCLE_LENGTH) + 1;
}

export function rewardForDay(day: number): number {
  return DAILY_REWARDS[Math.min(CYCLE_LENGTH, Math.max(1, day)) - 1];
}

export type ClaimStatus =
  /** Today's reward can be claimed. */
  | 'available'
  /** Already claimed today. */
  | 'claimed'
  /** The device date is earlier than a day already checked in or claimed: wait until that day has passed. */
  | 'clock-back'
  /** Not checked in today yet (the app checks in on open, so this is brief). */
  | 'pending';

export function claimStatus(state: DailyState, today: DayKey): ClaimStatus {
  if ((state.lastClaim && state.lastClaim > today) || (state.lastCheckIn && state.lastCheckIn > today)) return 'clock-back';
  if (state.lastClaim === today) return 'claimed';
  if (state.lastCheckIn !== today) return 'pending';
  return 'available';
}

export interface DailyClaim {
  readonly date: DayKey;
  /** Day of the cycle, 1..7. */
  readonly day: number;
  readonly credits: number;
  /** Unique id for the wallet: the same day can never be credited twice. */
  readonly transactionId: string;
}

/** Claims today's reward, or returns null if it isn't available. */
export function claim(state: DailyState, today: DayKey): { state: DailyState; reward: DailyClaim } | null {
  if (claimStatus(state, today) !== 'available') return null;
  const day = cycleDay(state.streak);
  return {
    state: { ...state, lastClaim: today, claims: state.claims + 1, claimedDays: recordDay(state.claimedDays, today, KEEP_CLAIMS) },
    reward: { date: today, day, credits: rewardForDay(day), transactionId: dailyTransactionId(today) },
  };
}

export const dailyTransactionId = (day: DayKey) => `daily:${day}`;

export type CalendarStatus = 'claimed' | 'missed' | 'today' | 'upcoming';

export interface CalendarDay {
  readonly day: number;
  readonly date: DayKey;
  readonly credits: number;
  readonly status: CalendarStatus;
}

/**
 * The current 7-day cycle for display: days already passed (claimed or
 * missed), today (claimed shows as 'claimed'), and the days still to come if
 * the streak continues.
 */
export function calendar(state: DailyState, today: DayKey): CalendarDay[] {
  const streakToday = state.lastCheckIn === today ? state.streak : 1;
  const start = addDays(today, -(cycleDay(streakToday) - 1));
  return DAILY_REWARDS.map((credits, i) => {
    const date = addDays(start, i);
    const claimed = state.claimedDays.includes(date);
    const status: CalendarStatus =
      date < today ? (claimed ? 'claimed' : 'missed') : date === today ? (claimed ? 'claimed' : 'today') : 'upcoming';
    return { day: i + 1, date, credits, status };
  });
}

/** The reward that tomorrow's check-in would offer if the streak continues. */
export function nextReward(state: DailyState, today: DayKey): { day: number; credits: number } {
  const streak = state.lastCheckIn === today ? state.streak + 1 : 1;
  const day = cycleDay(streak);
  return { day, credits: rewardForDay(day) };
}

const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;

/** Validates a stored daily record field by field. Inconsistent values are repaired, never trusted. */
export function readDaily(data: unknown): DailyState {
  if (typeof data !== 'object' || data === null) return createDaily();
  const d = data as Record<string, unknown>;
  const days = (v: unknown, keep: number) =>
    Array.isArray(v) ? [...new Set(v.filter(isDayKey))].sort().slice(-keep) : [];
  const lastCheckIn = isDayKey(d.lastCheckIn) ? d.lastCheckIn : null;
  const streak = lastCheckIn && isCount(d.streak) && d.streak >= 1 ? d.streak : lastCheckIn ? 1 : 0;
  const claimedDays = days(d.claimedDays, KEEP_CLAIMS);
  const lastClaim = isDayKey(d.lastClaim) ? d.lastClaim : (claimedDays[claimedDays.length - 1] ?? null);
  const history = days(d.history, KEEP_HISTORY);
  return {
    lastCheckIn,
    streak,
    longestStreak: Math.max(streak, isCount(d.longestStreak) ? d.longestStreak : 0),
    daysPlayed: Math.max(lastCheckIn ? 1 : 0, history.length, isCount(d.daysPlayed) ? d.daysPlayed : 0),
    lastClaim,
    claims: Math.max(claimedDays.length, isCount(d.claims) ? d.claims : 0),
    claimedDays,
    history,
  };
}
