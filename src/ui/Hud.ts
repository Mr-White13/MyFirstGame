import type { GameSnapshot } from '../core/types';
import { requireElement } from './dom';

/** In-game heads-up display: level, moves, arrows left, plus the back and restart buttons. */
export class Hud {
  private readonly level = requireElement('hud-level');
  private readonly moves = requireElement('hud-moves');
  private readonly remaining = requireElement('hud-remaining');
  private readonly backButton = requireElement<HTMLButtonElement>('btn-back');
  private readonly restartButton = requireElement<HTMLButtonElement>('btn-restart');
  private lastMoves = 0;
  private lastLevel = 0;

  update(snapshot: GameSnapshot): void {
    this.level.textContent = String(snapshot.levelId);
    this.remaining.textContent = String(snapshot.remaining);
    this.moves.textContent = String(snapshot.moves);
    // Pulse only on a real move, not when a level is (re)loaded.
    if (snapshot.levelId === this.lastLevel && snapshot.moves > this.lastMoves) this.pulse(this.moves);
    this.lastMoves = snapshot.moves;
    this.lastLevel = snapshot.levelId;
  }

  onBack(handler: () => void): void {
    this.backButton.addEventListener('click', handler);
  }

  onRestart(handler: () => void): void {
    this.restartButton.addEventListener('click', handler);
  }

  private pulse(el: HTMLElement): void {
    el.classList.remove('stat__value--pulse');
    void el.offsetWidth; // restart the CSS animation
    el.classList.add('stat__value--pulse');
  }
}
