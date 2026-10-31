/** Milliseconds from a monotonic clock (performance.now() in the browser). */
export type Clock = () => number;

/** Why the timer is paused. Several can hold at once; it runs only when none do. */
export type PauseReason = 'hidden' | 'confirm' | 'navigation' | 'picker';

type TimerPhase = 'idle' | 'active' | 'stopped';

/**
 * Measures active play time for one level attempt.
 *
 * Time is accumulated from a monotonic clock at every state change instead of
 * counting interval ticks, so it stays accurate however often (or rarely) the
 * display is refreshed, and it can't drift.
 *
 * - `start()` begins timing once the level is interactive (not during loading
 *   or the screen transition).
 * - `pause(reason)` / `resume(reason)` are idempotent per reason, so repeated
 *   visibility or dialog events can't double-count or double-pause.
 * - `stop()` freezes the total (win, Game Over, leaving the level); nothing
 *   restarts it except `reset()`.
 */
export class LevelTimer {
  private phase: TimerPhase = 'idle';
  private readonly reasons = new Set<PauseReason>();
  /** Time banked from earlier running stretches. */
  private banked = 0;
  /** Clock reading when the current running stretch began, or null if not running. */
  private since: number | null = null;

  constructor(private readonly clock: Clock = () => performance.now()) {}

  /** True while time is being counted. */
  get running(): boolean {
    return this.since !== null;
  }

  get stopped(): boolean {
    return this.phase === 'stopped';
  }

  /** Active milliseconds so far (live while running). */
  elapsed(): number {
    return this.banked + (this.since === null ? 0 : this.clock() - this.since);
  }

  /** Begins counting. Ignored unless the timer is fresh (after construction or reset). */
  start(): void {
    if (this.phase !== 'idle') return;
    this.phase = 'active';
    this.update();
  }

  pause(reason: PauseReason): void {
    if (this.reasons.has(reason)) return;
    this.reasons.add(reason);
    this.update();
  }

  resume(reason: PauseReason): void {
    if (!this.reasons.delete(reason)) return;
    this.update();
  }

  /** Freezes the total. Further start/pause/resume calls change nothing. */
  stop(): void {
    if (this.phase === 'stopped') return;
    this.bank();
    this.phase = 'stopped';
  }

  /** Back to 00:00 and idle, for a restart or a new level. Pause reasons are kept: they describe the page, not the attempt. */
  reset(): void {
    this.phase = 'idle';
    this.banked = 0;
    this.since = null;
  }

  /** Starts or banks the current stretch so that "running" matches the phase and pause reasons. */
  private update(): void {
    const shouldRun = this.phase === 'active' && this.reasons.size === 0;
    if (shouldRun && this.since === null) this.since = this.clock();
    else if (!shouldRun) this.bank();
  }

  private bank(): void {
    if (this.since === null) return;
    this.banked += this.clock() - this.since;
    this.since = null;
  }
}
