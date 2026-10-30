import type { GameSnapshot } from '../core/types';
import { requireElement } from './dom';

/**
 * In-game heads-up display: level title, moves, arrows left with a progress
 * meter, plus the back and restart buttons. Updates only when the game state
 * changes (never per frame); the visual easing is all CSS.
 */
export class Hud {
  private readonly level = requireElement('hud-level');
  private readonly moves = requireElement('hud-moves');
  private readonly remaining = requireElement('hud-remaining');
  private readonly progress = requireElement('hud-progress');
  private readonly backButton = requireElement<HTMLButtonElement>('btn-back');
  private readonly restartButton = requireElement<HTMLButtonElement>('btn-restart');
  private last?: GameSnapshot;

  update(snapshot: GameSnapshot): void {
    const sameLevel = this.last?.levelId === snapshot.levelId;
    this.level.textContent = String(snapshot.levelId);
    this.moves.textContent = String(snapshot.moves);
    this.remaining.textContent = String(snapshot.remaining);
    const cleared = snapshot.total === 0 ? 0 : (snapshot.total - snapshot.remaining) / snapshot.total;
    this.progress.style.transform = `scaleX(${cleared})`;
    // Nothing to restart before the first move.
    this.restartButton.disabled = snapshot.moves === 0;

    // Tick animations only for real moves, not when a level is (re)loaded.
    if (sameLevel && this.last && snapshot.moves > this.last.moves) {
      this.tick(this.moves);
      this.tick(this.remaining);
    }
    this.last = snapshot;
  }

  onBack(handler: () => void): void {
    this.backButton.addEventListener('click', handler);
  }

  onRestart(handler: () => void): void {
    this.restartButton.addEventListener('click', handler);
  }

  private tick(el: HTMLElement): void {
    el.classList.remove('is-ticking');
    void el.offsetWidth; // restart the CSS animation
    el.classList.add('is-ticking');
  }
}
