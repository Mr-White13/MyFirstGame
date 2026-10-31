import { formatClock, formatTotal } from '../core/time';
import type { LevelData } from '../core/types';
import type { DailyState } from '../daily/Daily';
import { addDays, type DayKey } from '../daily/dayKey';
import type { PlayerStats } from '../profile/Stats';
import { completedCount, MAX_STARS, nextLevelToPlay, perfectLevels, totalStars, type Progress } from '../progress/Progress';
import { browserStorage, isNonNegativeInt, parseObject, SafeStore, type KeyValueStore, type SaveStatus } from '../storage/SafeStore';
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

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

/** "12 Oct" from an ISO date-time, in the device's time zone. */
function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]}`;
}

/** The insight with this id, or null when the records don't support it yet. */
export function insightFor(id: InsightId, r: RecapRecords): Insight | null {
  switch (id) {
    case 'week': {
      const week = lastSevenDays(r.log, r.today);
      if (!week.complete || week.wins === 0) return null;
      return {
        id,
        title: 'Your last 7 days',
        text: `${plural(week.wins, 'level')} cleared in ${formatTotal(week.playMs)} of play, across ${plural(week.daysPlayed, 'day')}.`,
      };
    }
    case 'yesterday': {
      const yesterday = addDays(r.today, -1);
      const day = summarize(r.log, yesterday, 1);
      if (!day.complete || day.wins === 0) return null;
      return { id, title: 'Yesterday', text: `You cleared ${plural(day.wins, 'level')} in ${formatTotal(day.playMs)} of play.` };
    }
    case 'progress': {
      const done = completedCount(r.progress, r.levels.length);
      if (done === 0) return null;
      if (done === r.levels.length) return { id, title: 'Progress', text: `All ${r.levels.length} levels completed.` };
      return { id, title: 'Progress', text: `${done} of ${r.levels.length} levels completed. Next up: Level ${nextLevelToPlay(r.progress, r.levels.length)}.` };
    }
    case 'stars': {
      const stars = totalStars(r.progress, r.levels.length);
      if (stars === 0) return null;
      const perfect = perfectLevels(r.progress, r.levels.length);
      return {
        id,
        title: 'Stars',
        text: `${stars} of ${r.levels.length * MAX_STARS} stars collected${perfect > 0 ? `, with ${plural(perfect, 'perfect level')}` : ''}.`,
      };
    }
    case 'best-time': {
      // The highest completed level with a time on its current layout (older layouts aren't comparable).
      for (const level of [...r.levels].reverse()) {
        const record = r.progress.completed[level.id];
        if (record?.bestTimeMs == null || record.revision !== (level.revision ?? 1)) continue;
        return { id, title: 'Personal best', text: `Your best time on Level ${level.id} is ${formatClock(record.bestTimeMs)}.` };
      }
      return null;
    }
    case 'streak': {
      if (r.daily.lastCheckIn !== r.today || r.daily.streak < 2) return null;
      const longest = r.daily.longestStreak > r.daily.streak ? ` Your longest is ${r.daily.longestStreak}.` : ' Your longest yet.';
      return { id, title: 'Daily streak', text: `Day ${r.daily.streak} in a row.${longest}` };
    }
    case 'flawless':
      if (r.stats.flawlessRuns === 0) return null;
      return { id, title: 'Flawless', text: `${plural(r.stats.flawlessRuns, 'clear')} without a single mistake since ${shortDate(r.stats.trackedSince)}.` };
    case 'arrows':
      if (r.stats.arrowsCleared === 0) return null;
      return { id, title: 'Arrows', text: `${plural(r.stats.arrowsCleared, 'arrow')} escaped the grid since ${shortDate(r.stats.trackedSince)}.` };
    case 'chains':
      if (r.stats.chainClears === 0) return null;
      return { id, title: 'Chain reactions', text: `Chain reactions have released ${plural(r.stats.chainClears, 'arrow')} for you.` };
    case 'play-time':
      if (r.stats.playTimeMs < 60_000) return null;
      return { id, title: 'Play time', text: `${formatTotal(r.stats.playTimeMs)} of play since ${shortDate(r.stats.trackedSince)}.` };
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
  if (raw === null) return { value: { next: 0 }, status: 'empty' };
  const data = parseObject(raw);
  if (!data) return { value: { next: 0 }, status: 'corrupt' };
  if (typeof data.version === 'number' && data.version > RECAP_VERSION) return { value: { next: 0 }, status: 'newer' };
  if (data.version !== RECAP_VERSION) return { value: { next: 0 }, status: 'corrupt' };
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
