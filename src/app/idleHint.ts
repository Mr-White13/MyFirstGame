/**
 * A gentle nudge for a player who has stopped to think: after IDLE_HINT_MS of
 * level time without a tap, say how many arrows can move right now. Level
 * time (not wall time), so pauses, dialogs and the background never count.
 * Shown once per idle spell; the next tap starts a new one. Pure, so the
 * timing is testable without a DOM or a game.
 */
export const IDLE_HINT_MS = 8_000;

/** How long the hint stays on screen. */
export const IDLE_HINT_SHOW_MS = 3_800;

export function idleHintText(movable: number): string {
  return movable === 1 ? 'Only 1 arrow can move right now. Can you find it?' : `Only ${movable} arrows can move right now.`;
}

export class IdleHint {
  private lastActivityMs = 0;
  private shown = false;

  /** A tap (or a new attempt) at this level time: the idle spell starts again. */
  activity(elapsedMs: number): void {
    this.lastActivityMs = elapsedMs;
    this.shown = false;
  }

  /** True once per idle spell, when the player has been idle long enough during play. */
  due(elapsedMs: number, playing: boolean): boolean {
    if (this.shown || !playing || elapsedMs - this.lastActivityMs < IDLE_HINT_MS) return false;
    this.shown = true;
    return true;
  }
}
