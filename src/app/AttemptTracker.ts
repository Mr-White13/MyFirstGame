import { LevelTimer, type Clock } from '../core/LevelTimer';
import type { GameSnapshot } from '../core/types';
import { recordCompletion, type CompletionResult, type Progress } from '../progress/Progress';
import { recordAttempt, type AttemptOutcome, type PlayerStats } from '../profile/Stats';

/** Everything the records need to know about one finished attempt. */
export interface AttemptSummary {
  readonly levelId: number;
  readonly revision: number;
  readonly outcome: AttemptOutcome;
  /** Active play time of the whole attempt. */
  readonly timeMs: number;
  /** Part of timeMs not yet added to the lifetime total by a checkpoint. */
  readonly uncountedTimeMs: number;
  readonly moves: number;
  readonly stars: number;
  readonly directClears: number;
  readonly autoClears: number;
  readonly mistakes: number;
}

export interface Records {
  readonly progress: Progress;
  readonly stats: PlayerStats;
}

/**
 * Applies a finished attempt to the saved records.
 * - Every attempt adds to the lifetime statistics (time, arrows, outcome).
 * - Only a completed attempt touches per-level progress: unlocks, stars,
 *   best time. Failed or abandoned runs can never change a personal best.
 */
export function applyAttempt(
  records: Records,
  attempt: AttemptSummary,
  levelCount: number,
): { records: Records; completion: CompletionResult | null } {
  const stats = recordAttempt(records.stats, attempt);
  if (attempt.outcome !== 'won') return { records: { ...records, stats }, completion: null };
  const completion = recordCompletion(
    records.progress,
    attempt.levelId,
    { moves: attempt.moves, stars: attempt.stars, mistakes: attempt.mistakes, timeMs: attempt.timeMs },
    levelCount,
    attempt.revision,
  );
  return { records: { progress: completion.progress, stats }, completion };
}

/**
 * Bookkeeping for the attempt in progress: owns its timer and makes sure
 * every attempt is finished exactly once (won, failed or abandoned), so no
 * run can be counted twice or left running after the player leaves.
 */
export class AttemptTracker {
  readonly timer: LevelTimer;
  private current: { levelId: number; revision: number } | null = null;
  /** Play time of the current attempt already added to the lifetime total. */
  private counted = 0;

  constructor(clock?: Clock) {
    this.timer = new LevelTimer(clock);
  }

  /** True between begin() and finish(). */
  get isOpen(): boolean {
    return this.current !== null;
  }

  get levelId(): number | null {
    return this.current?.levelId ?? null;
  }

  /** A new attempt: timer back at 00:00, not yet counting. */
  begin(levelId: number, revision: number): void {
    this.current = { levelId, revision };
    this.counted = 0;
    this.timer.reset();
  }

  /** The level is ready for input: start counting. */
  interactive(): void {
    if (this.current) this.timer.start();
  }

  /**
   * Play time not yet added to the lifetime total, marked as added. Used to
   * save progress-so-far when the app is backgrounded (it may never return).
   */
  checkpoint(): number {
    if (!this.current) return 0;
    // Whole milliseconds: saved data stays free of floating-point noise.
    const delta = Math.max(0, Math.round(this.timer.elapsed()) - this.counted);
    this.counted += delta;
    return delta;
  }

  /** Ends the attempt and stops its timer. Returns null if no attempt was open. */
  finish(outcome: AttemptOutcome, snapshot: GameSnapshot): AttemptSummary | null {
    if (!this.current) return null;
    this.timer.stop();
    const timeMs = Math.round(this.timer.elapsed());
    const summary: AttemptSummary = {
      levelId: this.current.levelId,
      revision: this.current.revision,
      outcome,
      timeMs,
      uncountedTimeMs: Math.max(0, timeMs - this.counted),
      moves: snapshot.moves,
      stars: snapshot.stars,
      directClears: snapshot.directClears,
      autoClears: snapshot.autoClears,
      mistakes: snapshot.mistakes,
    };
    this.current = null;
    this.counted = 0;
    return summary;
  }
}

