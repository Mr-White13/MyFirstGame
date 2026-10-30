/**
 * One animation in a move's sequence. `run` starts it and must call `done`
 * once the board is free for the next step (e.g. when a leaving arrow's tail
 * has crossed the grid edge, not when its fade-out ends).
 */
export interface SequenceStep {
  run(done: () => void): void;
}

/**
 * Plays the animations for one player action, one step after another, and
 * holds the input lock while it does.
 *
 * Game rules are already resolved before a sequence starts, so this only
 * orders visuals. It has no Phaser dependency, which keeps it testable.
 *
 * Every sequence gets a token; `cancel()` (restart, level change, resize)
 * invalidates it, so any `done` callback from an animation that was cut off
 * is ignored and can never advance or unlock a newer sequence.
 */
export class MoveSequencer {
  private token = 0;
  private running = false;

  /** True while a sequence is playing: player input must be ignored. */
  get busy(): boolean {
    return this.running;
  }

  /**
   * Starts a sequence. Returns false (and does nothing) if one is already
   * running. `onFinished` runs after the last step reports done.
   */
  run(steps: readonly SequenceStep[], onFinished: () => void = () => {}): boolean {
    if (this.running) return false;
    this.running = true;
    const token = ++this.token;

    const next = (index: number): void => {
      if (token !== this.token) return; // cancelled meanwhile: stale callback
      if (index >= steps.length) {
        this.running = false;
        onFinished();
        return;
      }
      let called = false;
      steps[index].run(() => {
        // Guard against a step reporting done twice.
        if (called) return;
        called = true;
        next(index + 1);
      });
    };
    next(0);
    return true;
  }

  /** Abandons the current sequence, if any, and releases the input lock. */
  cancel(): void {
    this.token++;
    this.running = false;
  }
}
