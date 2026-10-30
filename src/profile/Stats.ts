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
 * Lifetime play statistics. These count *runs* (attempts), including replays;
 * per-level results (unique completions, stars, best times) live in Progress.
 *
 * Tracking began with this feature: older saves have no history, so the
 * counters start at zero and `trackedSince` records when counting started,
 * rather than pretending earlier play was measured.
 */
export interface PlayerStats {
  /** Attempts that ended in a completed level (replays included). */
  readonly successfulRuns: number;
  /** Attempts that ended by losing all lives. */
  readonly failedRuns: number;
  /** Completed attempts without a single mistake. */
  readonly flawlessRuns: number;
  /** Active play time across all attempts (completed, failed or abandoned). */
  readonly playTimeMs: number;
  /** Arrows removed in all attempts: tapped plus chain reactions. */
  readonly arrowsCleared: number;
  /** Arrows removed by chain reactions in all attempts. */
  readonly chainClears: number;
  /** ISO date-time when statistics tracking began on this device. */
  readonly trackedSince: string;
}

export type AttemptOutcome = 'won' | 'failed' | 'abandoned';

/** What one attempt contributes to the statistics. */
export interface AttemptStats {
  readonly outcome: AttemptOutcome;
  readonly directClears: number;
  readonly autoClears: number;
  readonly mistakes: number;
  /**
   * Play time not yet added to the totals. Long attempts are checkpointed
   * (e.g. when the app is backgrounded), so this can be less than the run time.
   */
  readonly uncountedTimeMs: number;
}

export function createStats(now: Date = new Date()): PlayerStats {
  return {
    successfulRuns: 0,
    failedRuns: 0,
    flawlessRuns: 0,
    playTimeMs: 0,
    arrowsCleared: 0,
    chainClears: 0,
    trackedSince: now.toISOString(),
  };
}

export function recordAttempt(stats: PlayerStats, attempt: AttemptStats): PlayerStats {
  const won = attempt.outcome === 'won';
  return {
    ...stats,
    successfulRuns: stats.successfulRuns + (won ? 1 : 0),
    failedRuns: stats.failedRuns + (attempt.outcome === 'failed' ? 1 : 0),
    flawlessRuns: stats.flawlessRuns + (won && attempt.mistakes === 0 ? 1 : 0),
    playTimeMs: stats.playTimeMs + Math.max(0, attempt.uncountedTimeMs),
    arrowsCleared: stats.arrowsCleared + attempt.directClears + attempt.autoClears,
    chainClears: stats.chainClears + attempt.autoClears,
  };
}

/** Adds play time from an attempt still in progress (a checkpoint). */
export function addPlayTime(stats: PlayerStats, ms: number): PlayerStats {
  return ms > 0 ? { ...stats, playTimeMs: stats.playTimeMs + ms } : stats;
}

// --------------------------------------------------------------- storage

export const STATS_KEY = 'neon-escape.stats';
export const STATS_VERSION = 1;

const COUNTERS = ['successfulRuns', 'failedRuns', 'flawlessRuns', 'arrowsCleared', 'chainClears'] as const;

/** Reads stored statistics; malformed counters reset to 0, the rest are kept. Never throws. */
export function readStats(raw: string | null, now: Date = new Date()): { value: PlayerStats; status: SaveStatus } {
  if (raw === null) return { value: createStats(now), status: 'empty' };
  const data = parseObject(raw);
  if (!data) return { value: createStats(now), status: 'corrupt' };
  if (typeof data.version === 'number' && data.version > STATS_VERSION) return { value: createStats(now), status: 'newer' };
  if (data.version !== STATS_VERSION) return { value: createStats(now), status: 'corrupt' };

  const fresh = createStats(now);
  const counters = Object.fromEntries(COUNTERS.map((k) => [k, isNonNegativeInt(data[k]) ? data[k] : 0])) as Record<
    (typeof COUNTERS)[number],
    number
  >;
  const since = typeof data.trackedSince === 'string' && !Number.isNaN(Date.parse(data.trackedSince)) ? data.trackedSince : fresh.trackedSince;
  return {
    value: {
      ...counters,
      playTimeMs: isNonNegativeNumber(data.playTimeMs) ? data.playTimeMs : 0,
      trackedSince: since,
    },
    status: 'current',
  };
}

export function serializeStats(stats: PlayerStats): string {
  return JSON.stringify({ version: STATS_VERSION, ...stats });
}

export class StatsStorage {
  private readonly safe: SafeStore<PlayerStats>;

  constructor(store: KeyValueStore | null = browserStorage(), now: () => Date = () => new Date()) {
    this.safe = new SafeStore(
      STATS_KEY,
      { read: (raw) => readStats(raw, now()), write: serializeStats, fallback: () => createStats(now()) },
      store,
    );
  }

  load(): PlayerStats {
    return this.safe.load();
  }

  save(stats: PlayerStats): boolean {
    return this.safe.save(stats);
  }
}
