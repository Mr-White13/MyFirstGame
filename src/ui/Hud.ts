import type { GameSnapshot } from '../core/types';

function requireElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id} in index.html`);
  return el as T;
}

const prefersReducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** DOM heads-up display: level, moves, remaining arrows, restart and the win dialog. */
export class Hud {
  private readonly level = requireElement('hud-level');
  private readonly moves = requireElement('hud-moves');
  private readonly remaining = requireElement('hud-remaining');
  private readonly restartButton = requireElement<HTMLButtonElement>('btn-restart');
  private readonly overlay = requireElement('win-overlay');
  private readonly winLevel = requireElement('win-level');
  private readonly winMoves = requireElement('win-moves');
  private readonly winMovesLabel = requireElement('win-moves-label');
  private readonly winCleared = requireElement('win-cleared');
  private readonly playAgainButton = requireElement<HTMLButtonElement>('btn-play-again');
  private lastMoves = 0;
  /** Pending animation frame for the dialog (show transition or count-up). */
  private frame = 0;

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

  showWin(snapshot: GameSnapshot): void {
    cancelAnimationFrame(this.frame);
    this.winLevel.textContent = `Level ${snapshot.levelId}`;
    this.winMovesLabel.textContent = snapshot.moves === 1 ? 'move' : 'moves';
    this.winCleared.textContent = `All ${snapshot.total} arrows cleared`;
    this.overlay.classList.remove('overlay--visible');
    this.overlay.hidden = false;
    // Next frame, so the CSS transition runs from the hidden state.
    this.frame = requestAnimationFrame(() => {
      this.overlay.classList.add('overlay--visible');
      this.countUp(snapshot.moves);
    });
    this.playAgainButton.focus({ preventScroll: true });
  }

  hideWin(): void {
    cancelAnimationFrame(this.frame);
    this.overlay.classList.remove('overlay--visible');
    this.overlay.hidden = true;
  }

  /** Rolls the final move count up from zero; quick enough not to delay the restart button. */
  private countUp(target: number): void {
    if (prefersReducedMotion() || target === 0) {
      this.winMoves.textContent = String(target);
      return;
    }
    const duration = 450;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      this.winMoves.textContent = String(Math.round(target * eased));
      if (t < 1) this.frame = requestAnimationFrame(tick);
    };
    this.winMoves.textContent = '0';
    this.frame = requestAnimationFrame(tick);
  }

  private pulse(el: HTMLElement): void {
    el.classList.remove('stat__value--pulse');
    void el.offsetWidth; // restart the CSS animation
    el.classList.add('stat__value--pulse');
  }
}
