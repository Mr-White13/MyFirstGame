import type { LevelData } from '../core/types';
import type { DayClock } from '../daily/dayKey';
import { addPlayTime, type PlayerStats, type StatsStorage } from '../profile/Stats';
import type { CompletionResult, Progress } from '../progress/Progress';
import type { ProgressStorage } from '../progress/ProgressStorage';
import { addDayPlayTime, recordDayAttempt, type DailyLog, type DailyLogStorage } from '../recap/DailyLog';
import type { Rewards } from '../rewards/Rewards';
import { applyAttempt, type AttemptSummary } from './AttemptTracker';

/** What the records need from the rest of the app (a subset of AppParts). */
export interface RecordsParts {
  readonly levels: readonly LevelData[];
  readonly storage: ProgressStorage;
  readonly statsStorage: StatsStorage;
  readonly dailyLogStorage: DailyLogStorage;
  readonly rewards: Rewards;
  readonly dayClock: DayClock;
}

/**
 * The player's saved records: level progress, lifetime statistics and the
 * per-day log. Every finished attempt goes through `record()`, which saves in
 * a fixed order: progress (only for a completed level), statistics, the day's
 * log, then lets Rewards check achievements against the new records.
 */
export class RecordsKeeper {
  constructor(
    private readonly parts: RecordsParts,
    private currentProgress: Progress,
    private currentStats: PlayerStats,
    private log: DailyLog,
  ) {}

  get progress(): Progress {
    return this.currentProgress;
  }

  get stats(): PlayerStats {
    return this.currentStats;
  }

  get dailyLog(): DailyLog {
    return this.log;
  }

  /** Saves the daily log as it is (on start, this pins the first tracked day). */
  saveDailyLog(): void {
    this.parts.dailyLogStorage.save(this.log);
  }

  /**
   * Applies a finished attempt and saves it. A failed or abandoned attempt
   * never changes progress. Returns what a completion changed (null otherwise).
   */
  record(summary: AttemptSummary): CompletionResult | null {
    const { storage, statsStorage, rewards, dayClock, levels } = this.parts;
    const { records, completion } = applyAttempt({ progress: this.currentProgress, stats: this.currentStats }, summary, levels.length);
    if (summary.outcome === 'won') {
      this.currentProgress = records.progress;
      storage.save(this.currentProgress);
    }
    this.currentStats = records.stats;
    statsStorage.save(this.currentStats);
    // The same attempt, split by the day it ended on.
    this.log = recordDayAttempt(this.log, dayClock.refresh(), summary);
    this.parts.dailyLogStorage.save(this.log);
    rewards.afterAttempt(dayClock.today, summary.longestChain);
    return completion;
  }

  /** Play time of an attempt still in progress (a checkpoint when the app goes to the background). */
  addPlayTime(ms: number): void {
    this.currentStats = addPlayTime(this.currentStats, ms);
    this.parts.statsStorage.save(this.currentStats);
    this.log = addDayPlayTime(this.log, this.parts.dayClock.refresh(), ms);
    this.parts.dailyLogStorage.save(this.log);
  }
}
