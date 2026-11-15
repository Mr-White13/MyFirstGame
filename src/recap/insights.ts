import { formatClock, formatTotal } from '../core/time';
import type { LevelData } from '../core/types';
import type { DailyState } from '../daily/Daily';
import { addDays, type DayKey } from '../daily/dayKey';
import { dateLocale, formatNumber, getLocale, t } from '../i18n/translate';
import type { PlayerStats } from '../profile/Stats';
import { completedCount, MAX_STARS, nextLevelToPlay, perfectLevels, totalStars, type Progress } from '../progress/Progress';
import { browserStorage, isNonNegativeInt, readVersioned, SafeStore, type KeyValueStore, type SaveStatus } from '../storage/SafeStore';
import { lastSevenDays, summarize, type DailyLog } from './DailyLog';

/*
 * The startup recap: one short, personal fact about the player's own saved
 * records, shown after the studio splash. Every insight is computed from real
 * saved data and only offered when that data exists; nothing is estimated,
 * and nothing is ever compared with other players (there is no data about
 * other players at all).
 */

/** Everything the insights may read. All of it is the player's own saved data. */
export interface RecapRecords {
  readonly progress: Progress;
  /** The levels in the game (for counts and current layout revisions). */
  readonly levels: readonly LevelData[];
  readonly stats: PlayerStats;
  readonly daily: DailyState;
  readonly log: DailyLog;
  readonly today: DayKey;
}

export interface Insight {
  readonly id: InsightId;
  /** Small label above the text. */
  readonly title: string;
  readonly text: string;
}

/** Rotation order. Saved rotation positions refer to this list, so only append to it. */
export const INSIGHT_IDS = ['week', 'progress', 'yesterday', 'stars', 'best-time', 'streak', 'flawless', 'arrows', 'chains', 'play-time'] as const;
export type InsightId = (typeof INSIGHT_IDS)[number];

/** A grouped count for a plural message: `count` picks the form, `num` is what is shown. */
const counted = (n: number) => ({ count: n, num: formatNumber(n) });

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "12 Oct" from an ISO date-time, in the device's time zone ("12 oct" / "12 oct." in Spanish / Romanian). */
function shortDate(iso: string): string {
  const d = new Date(iso);
  if (getLocale() === 'en') return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short' });
}

/** The insight with this id, or null when the records don't support it yet. */
export function insightFor(id: InsightId, r: RecapRecords): Insight | null {
  switch (id) {
    case 'week': {
      const week = lastSevenDays(r.log, r.today);
      if (!week.complete || week.wins === 0) return null;
      return {
        id,
        title: t('recap.titleWeek'),
        text: t('recap.week', { ...counted(week.wins), time: formatTotal(week.playMs), days: t('recap.days', counted(week.daysPlayed)) }),
      };
    }
    case 'yesterday': {
      const yesterday = addDays(r.today, -1);
      const day = summarize(r.log, yesterday, 1);
      if (!day.complete || day.wins === 0) return null;
      return { id, title: t('recap.titleYesterday'), text: t('recap.yesterday', { ...counted(day.wins), time: formatTotal(day.playMs) }) };
    }
    case 'progress': {
      const done = completedCount(r.progress, r.levels.length);
      if (done === 0) return null;
      const title = t('recap.titleProgress');
      if (done === r.levels.length) return { id, title, text: t('recap.progressAll', { count: r.levels.length }) };
      return { id, title, text: t('recap.progress', { done, count: r.levels.length, next: nextLevelToPlay(r.progress, r.levels.length) }) };
    }
    case 'stars': {
      const stars = totalStars(r.progress, r.levels.length);
      if (stars === 0) return null;
      const perfect = perfectLevels(r.progress, r.levels.length);
      const count = r.levels.length * MAX_STARS;
      return {
        id,
        title: t('recap.titleStars'),
        text:
          perfect > 0
            ? t('recap.starsPerfect', { stars, count, perfect: t('recap.perfectLevels', counted(perfect)) })
            : t('recap.stars', { stars, count }),
      };
    }
    case 'best-time': {
      // The highest completed level with a time on its current layout (older layouts aren't comparable).
      for (const level of [...r.levels].reverse()) {
        const record = r.progress.completed[level.id];
        if (record?.bestTimeMs == null || record.revision !== (level.revision ?? 1)) continue;
        return { id, title: t('recap.titleBestTime'), text: t('recap.bestTime', { level: level.id, time: formatClock(record.bestTimeMs) }) };
      }
      return null;
    }
    case 'streak': {
      if (r.daily.lastCheckIn !== r.today || r.daily.streak < 2) return null;
      const text =
        r.daily.longestStreak > r.daily.streak
          ? t('recap.streakLonger', { streak: r.daily.streak, longest: r.daily.longestStreak })
          : t('recap.streakBest', { streak: r.daily.streak });
      return { id, title: t('recap.titleStreak'), text };
    }
    case 'flawless':
      if (r.stats.flawlessRuns === 0) return null;
      return { id, title: t('recap.titleFlawless'), text: t('recap.flawless', { ...counted(r.stats.flawlessRuns), date: shortDate(r.stats.trackedSince) }) };
    case 'arrows':
      if (r.stats.arrowsCleared === 0) return null;
      return { id, title: t('recap.titleArrows'), text: t('recap.arrows', { ...counted(r.stats.arrowsCleared), date: shortDate(r.stats.trackedSince) }) };
    case 'chains':
      if (r.stats.chainClears === 0) return null;
      return { id, title: t('recap.titleChains'), text: t('recap.chains', counted(r.stats.chainClears)) };
    case 'play-time':
      if (r.stats.playTimeMs < 60_000) return null;
      return { id, title: t('recap.titlePlayTime'), text: t('recap.playTime', { time: formatTotal(r.stats.playTimeMs), date: shortDate(r.stats.trackedSince) }) };
  }
}

/** Every insight the records support right now, in rotation order. */
export function availableInsights(records: RecapRecords): Insight[] {
  return INSIGHT_IDS.map((id) => insightFor(id, records)).filter((i): i is Insight => i !== null);
}

/**
 * The next insight in the rotation: the first one the records support,
 * starting at position `next` and wrapping around. Returns the position to
 * start from next time, so consecutive launches show different insights.
 */
export function pickInsight(records: RecapRecords, next: number): { insight: Insight; next: number } | null {
  const n = INSIGHT_IDS.length;
  const start = ((Math.floor(next) % n) + n) % n;
  for (let k = 0; k < n; k++) {
    const position = (start + k) % n;
    const insight = insightFor(INSIGHT_IDS[position], records);
    if (insight) return { insight, next: (position + 1) % n };
  }
  return null;
}

// --------------------------------------------------------------- storage

/** Where the rotation position is kept. Not a setting: resetting settings leaves it alone. */
export const RECAP_KEY = 'neon-escape.recap';
export const RECAP_VERSION = 1;

export interface RecapState {
  /** Rotation position of the next insight. */
  readonly next: number;
}

export function readRecap(raw: string | null): { value: RecapState; status: SaveStatus } {
  const header = readVersioned(raw, RECAP_VERSION);
  if ('status' in header) return { value: { next: 0 }, status: header.status };
  const { data } = header;
  return { value: { next: isNonNegativeInt(data.next) ? data.next % INSIGHT_IDS.length : 0 }, status: 'current' };
}

export class RecapStorage {
  private readonly safe: SafeStore<RecapState>;

  constructor(store: KeyValueStore | null = browserStorage()) {
    this.safe = new SafeStore(
      RECAP_KEY,
      { read: readRecap, write: (s) => JSON.stringify({ version: RECAP_VERSION, ...s }), fallback: () => ({ next: 0 }) },
      store,
    );
  }

  load(): RecapState {
    return this.safe.load();
  }

  save(state: RecapState): boolean {
    return this.safe.save(state);
  }
}
