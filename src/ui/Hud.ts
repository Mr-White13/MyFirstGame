import type { GameSnapshot } from '../core/types';

function requireElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id} in index.html`);
  return el as T;
}

/** DOM heads-up display: level, moves, remaining arrows, restart and the win dialog. */
export class Hud {
  private readonly level = requireElement('hud-level');
  private readonly moves = requireElement('hud-moves');
  private readonly remaining = requireElement('hud-remaining');
  private readonly restartButton = requireElement<HTMLButtonElement>('btn-restart');
  private readonly overlay = requireElement('win-overlay');
  private readonly winMoves = requireElement('win-moves');
  private readonly playAgainButton = requireElement<HTMLButtonElement>('btn-play-again');
  private lastMoves = 0;

  update(snapshot: GameSnapshot): void {
    this.level.textContent = String(snapshot.levelId);
    this.remaining.textContent = String(snapshot.remaining);
    this.moves.textContent = String(snapshot.moves);
    if (snapshot.moves > this.lastMoves) this.pulse(this.moves);
    this.lastMoves = snapshot.moves;
  }

  onRestart(handler: () => void): void {
    this.restartButton.addEventListener('click', handler);
    this.playAgainButton.addEventListener('click', handler);
  }

  showWin(moves: number): void {
    this.winMoves.textContent = String(moves);
    this.overlay.hidden = false;
    // Next frame, so the CSS transition runs from the hidden state.
    requestAnimationFrame(() => this.overlay.classList.add('overlay--visible'));
    this.playAgainButton.focus({ preventScroll: true });
  }

  hideWin(): void {
    this.overlay.classList.remove('overlay--visible');
    this.overlay.hidden = true;
  }

  private pulse(el: HTMLElement): void {
    el.classList.remove('stat__value--pulse');
    void el.offsetWidth; // restart the CSS animation
    el.classList.add('stat__value--pulse');
  }
}
