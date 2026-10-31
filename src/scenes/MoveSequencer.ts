/**
 * One animation in a move's sequence. `run` starts it and must call `done`
 * once the board is free for the next step (e.g. when a leaving arrow's tail
 * has crossed the grid edge, not when its fade-out ends).
 */
export interface SequenceStep {
  run(done: () => void): void;
}

/**
 * Plays the animations of player actions. Each action's steps play one after
 * another (a tapped arrow, then its chain reaction, then a streak bonus), but
 * several actions may play at once: game rules are resolved the moment the
 * player taps, so a quick second tap never has to wait for the first arrow
 * to finish leaving. This only orders visuals. It has no Phaser dependency,
 * which keeps it testable.
 *
 * All running sequences belong to one generation; `cancel()` (restart, level
 * change, resize) starts a new one, so any `done` callback from an animation
 * that was cut off is ignored and can never advance a newer sequence or
 * report the board idle too early.
 */
export class MoveSequencer {
  private generation = 0;
  private active = 0;

  /** True while any sequence is playing (the scene waits for this before win / Game Over). */
  get busy(): boolean {
    return this.active > 0;
  }

  /** How many sequences are playing right now. */
  get running(): number {
    return this.active;
  }

  /**
   * Starts a sequence alongside any already playing. `onFinished` runs after
   * its last step reports done.
   */
  run(steps: readonly SequenceStep[], onFinished: () => void = () => {}): void {
    const generation = this.generation;
    this.active++;

    const next = (index: number): void => {
      if (generation !== this.generation) return; // cancelled meanwhile: stale callback
      if (index >= steps.length) {
        this.active--;
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
  }

  /** Abandons every running sequence. */
  cancel(): void {
    this.generation++;
    this.active = 0;
  }
}

/**
 * Keeps each target (an arrow view) to one step at a time across concurrent
 * sequences. Starting a step on a target that is still busy with an earlier
 * one first settles the earlier step, so the sequence it belongs to still
 * finishes (an animation cut off by a newer one never reports done itself).
 */
export class StepOwners<K> {
  private readonly pending = new Map<K, () => void>();

  /** A step that animates `target`; `run` gets a `done` that is safe to call once or never. */
  step(target: K, run: (done: () => void) => void): SequenceStep {
    return {
      run: (done) => {
        this.settle(target);
        const finish = () => {
          if (this.pending.get(target) === finish) this.pending.delete(target);
          done();
        };
        this.pending.set(target, finish);
        run(finish);
      },
    };
  }

  /** Reports the target's current step as done, if it has one. */
  settle(target: K): void {
    const pending = this.pending.get(target);
    if (!pending) return;
    this.pending.delete(target);
    pending();
  }

  /** Forgets every pending step (after the sequencer was cancelled: their callbacks are stale anyway). */
  clear(): void {
    this.pending.clear();
  }
}
