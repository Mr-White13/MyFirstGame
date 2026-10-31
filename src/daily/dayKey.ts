/**
 * Calendar days for date-based features (daily check-in, future daily
 * challenges and leagues).
 *
 * A day is the player's **device-local calendar date** as `YYYY-MM-DD`, not a
 * 24-hour interval and not the UTC date. Day differences are counted on the
 * calendar (via UTC midnights of those dates), so daylight-saving changes
 * (23- or 25-hour days) and month or year ends never skew them.
 *
 * This is an offline system: the date comes from the device clock, which the
 * player can change. Code using it must be safe against the clock moving
 * backwards (see Daily.ts), but it cannot detect a clock moved forwards.
 */

/** A local calendar date, `YYYY-MM-DD`. Sorts correctly as a string. */
export type DayKey = string;

const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

const pad = (n: number) => String(n).padStart(2, '0');

/** The local calendar date of `date`. */
export function dayKey(date: Date): DayKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** True for a real calendar date in `YYYY-MM-DD` form (rejects 2026-02-30). */
export function isDayKey(value: unknown): value is DayKey {
  if (typeof value !== 'string') return false;
  const m = DAY_KEY.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const utc = new Date(Date.UTC(y, mo - 1, d));
  return utc.getUTCFullYear() === y && utc.getUTCMonth() === mo - 1 && utc.getUTCDate() === d;
}

function toUtc(key: DayKey): number {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Whole calendar days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: DayKey, to: DayKey): number {
  return Math.round((toUtc(to) - toUtc(from)) / MS_PER_DAY);
}

/** The calendar date `days` after `key` (or before, if negative). */
export function addDays(key: DayKey, days: number): DayKey {
  const d = new Date(toUtc(key) + days * MS_PER_DAY);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Milliseconds from `now` until the next local midnight (at least 1 s). */
export function msUntilNextDay(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
  return Math.max(1000, next.getTime() - now.getTime());
}

/**
 * Something that can be done once per calendar day: today's daily reward
 * now, daily challenges or league goals later. Completion is stored as the
 * set of days on which it was done, so "already done today?" is one lookup
 * and a new day resets it without any timer.
 */
export interface DailyObjective<Context> {
  readonly id: string;
  /** Shown to the player. */
  readonly title: string;
  /** True if the objective's condition is met (it may still need claiming). */
  isMet(context: Context, day: DayKey): boolean;
}

/** True if `day` is among the recorded completion days. */
export function doneOn(completedDays: readonly DayKey[], day: DayKey): boolean {
  return completedDays.includes(day);
}

/** Records `day`, keeping the list sorted, unique and no longer than `keep` (newest kept). */
export function recordDay(days: readonly DayKey[], day: DayKey, keep: number): DayKey[] {
  const next = days.includes(day) ? [...days] : [...days, day].sort();
  return next.slice(-keep);
}

/**
 * Notices when the local date changes while the app is open, without
 * polling: one timer set for the next midnight, plus a re-check whenever the
 * page becomes visible again (timers don't run reliably in the background,
 * and the device may have slept through midnight or changed time zone).
 */
export class DayClock {
  private current: DayKey;
  private timer?: ReturnType<typeof setTimeout>;
  private readonly listeners = new Set<(day: DayKey, previous: DayKey) => void>();
  private readonly check = () => this.refresh();

  constructor(
    private readonly now: () => Date = () => new Date(),
    private readonly events: EventTarget | null = typeof document !== 'undefined' ? document : null,
  ) {
    this.current = dayKey(now());
  }

  get today(): DayKey {
    return this.current;
  }

  /** Starts watching for a new day. */
  start(): void {
    this.events?.addEventListener('visibilitychange', this.check);
    this.events?.addEventListener('focus', this.check);
    this.arm();
  }

  stop(): void {
    this.events?.removeEventListener('visibilitychange', this.check);
    this.events?.removeEventListener('focus', this.check);
    clearTimeout(this.timer);
  }

  onChange(listener: (day: DayKey, previous: DayKey) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Re-reads the clock; notifies listeners if the date changed (either way). Returns today's key. */
  refresh(): DayKey {
    const next = dayKey(this.now());
    if (next !== this.current) {
      const previous = this.current;
      this.current = next;
      this.listeners.forEach((l) => l(next, previous));
    }
    this.arm();
    return this.current;
  }

  private arm(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(this.check, msUntilNextDay(this.now()));
  }
}
