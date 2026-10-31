import { addDays, isDayKey, type DayKey } from '../daily/dayKey';
import type { AttemptStats } from '../profile/Stats';
import {
  browserStorage,
  isNonNegativeInt,
  isNonNegativeNumber,
  parseObject,
  SafeStore,
  type KeyValueStore,
  type SaveStatus,
} from '../storage/SafeStore';

/**
 * Per-day play statistics, for the startup recap's daily and weekly
 * summaries. Lifetime totals stay in Stats; this only splits the same
 * numbers by calendar day (device-local, see daily/dayKey.ts).
 *
 * Tracking starts when this record is first created: earlier play was never
 * split by day, so `since` marks the first day that is fully known and
 * summaries never cover days before it.
 */
export interface DayRecord {
  /** Active play time added on this day (attempts and background checkpoints). */
  readonly playMs: number;
  /** Attempts that ended on this day: completed, failed or abandoned. */
  readonly runs: number;
  /** Completed levels (replays included). */
  readonly wins: number;
  /** Completed without a mistake. */
  readonly flawless: number;
  /** Arrows removed: tapped, chain reactions and cascades. */
  readonly arrows: number;
}

export interface DailyLog {
  /** First day with complete tracking. */
  readonly since: DayKey;
  /** Recorded days (only days with play), at most KEEP_DAYS of the newest. */
  readonly days: Readonly<Record<DayKey, DayRecord>>;
}

/** Days kept: enough for a weekly summary and the week before it, with room to spare. */
export const KEEP_DAYS = 35;

const EMPTY_DAY: DayRecord = { playMs: 0, runs: 0, wins: 0, flawless: 0, arrows: 0 };

export function createDailyLog(today: DayKey): DailyLog {
  return { since: today, days: {} };
}

function withDay(log: DailyLog, day: DayKey, change: (record: DayRecord) => DayRecord): DailyLog {
  const days = { ...log.days, [day]: change(log.days[day] ?? EMPTY_DAY) };
  const keys = Object.keys(days).sort();
  for (const old of keys.slice(0, Math.max(0, keys.length - KEEP_DAYS))) delete days[old];
  return { ...log, days };
}

/** Adds one finished attempt to the day it ended on (its uncounted play time included). */
export function recordDayAttempt(log: DailyLog, day: DayKey, attempt: AttemptStats): DailyLog {
  const won = attempt.outcome === 'won';
  return withDay(log, day, (r) => ({
    playMs: r.playMs + Math.max(0, attempt.uncountedTimeMs),
    runs: r.runs + 1,
    wins: r.wins + (won ? 1 : 0),
    flawless: r.flawless + (won && attempt.mistakes === 0 ? 1 : 0),
    arrows: r.arrows + attempt.directClears + attempt.autoClears + (attempt.cascadeClears ?? 0),
  }));
}

/** Adds play time from an attempt still in progress (a checkpoint when the app is backgrounded). */
export function addDayPlayTime(log: DailyLog, day: DayKey, ms: number): DailyLog {
  return ms > 0 ? withDay(log, day, (r) => ({ ...r, playMs: r.playMs + ms })) : log;
}

/** Totals over a range of days. */
export interface PeriodSummary {
  /** True when every day of the period was tracked (none before `since`, none after today). */
  readonly complete: boolean;
  readonly daysPlayed: number;
  readonly playMs: number;
  readonly runs: number;
  readonly wins: number;
  readonly flawless: number;
  readonly arrows: number;
}

/** The `length` days ending with `last` (inclusive). */
export function summarize(log: DailyLog, last: DayKey, length: number): PeriodSummary {
  const first = addDays(last, -(length - 1));
  let daysPlayed = 0;
  let playMs = 0;
  let runs = 0;
  let wins = 0;
  let flawless = 0;
  let arrows = 0;
  for (let i = 0; i < length; i++) {
    const r = log.days[addDays(first, i)];
    if (!r) continue;
    if (r.runs > 0 || r.playMs > 0) daysPlayed++;
    playMs += r.playMs;
    runs += r.runs;
    wins += r.wins;
    flawless += r.flawless;
    arrows += r.arrows;
  }
  return { complete: log.since <= first, daysPlayed, playMs, runs, wins, flawless, arrows };
}

/** The last seven days including today. Weekly summaries use it only when `complete`. */
export function lastSevenDays(log: DailyLog, today: DayKey): PeriodSummary {
  return summarize(log, today, 7);
}

// --------------------------------------------------------------- storage

export const DAILY_LOG_KEY = 'neon-escape.daily-stats';
export const DAILY_LOG_VERSION = 1;

/** Reads the stored log; malformed days are dropped, the rest kept. Never throws. */
export function readDailyLog(raw: string | null, today: DayKey): { value: DailyLog; status: SaveStatus } {
  if (raw === null) return { value: createDailyLog(today), status: 'empty' };
  const data = parseObject(raw);
  if (!data) return { value: createDailyLog(today), status: 'corrupt' };
  if (typeof data.version === 'number' && data.version > DAILY_LOG_VERSION) return { value: createDailyLog(today), status: 'newer' };
  if (data.version !== DAILY_LOG_VERSION || !isDayKey(data.since)) return { value: createDailyLog(today), status: 'corrupt' };

  const days: Record<DayKey, DayRecord> = {};
  if (typeof data.days === 'object' && data.days !== null) {
    for (const [day, entry] of Object.entries(data.days as Record<string, unknown>)) {
      const r = (entry ?? {}) as Partial<Record<keyof DayRecord, unknown>>;
      if (!isDayKey(day)) continue;
      if (!isNonNegativeNumber(r.playMs) || ![r.runs, r.wins, r.flawless, r.arrows].every(isNonNegativeInt)) continue;
      days[day] = { playMs: r.playMs, runs: r.runs as number, wins: r.wins as number, flawless: r.flawless as number, arrows: r.arrows as number };
    }
  }
  return { value: { since: data.since, days }, status: 'current' };
}

export function serializeDailyLog(log: DailyLog): string {
  return JSON.stringify({ version: DAILY_LOG_VERSION, ...log });
}

export class DailyLogStorage {
  private readonly safe: SafeStore<DailyLog>;

  constructor(today: () => DayKey, store: KeyValueStore | null = browserStorage()) {
    this.safe = new SafeStore(
      DAILY_LOG_KEY,
      { read: (raw) => readDailyLog(raw, today()), write: serializeDailyLog, fallback: () => createDailyLog(today()) },
      store,
    );
  }

  load(): DailyLog {
    return this.safe.load();
  }

  save(log: DailyLog): boolean {
    return this.safe.save(log);
  }
}
