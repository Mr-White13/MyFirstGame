import { formatClock } from '../core/time';
import type { GameSnapshot } from '../core/types';
import { requireElement } from './dom';

/**
 * In-game heads-up display: level title and timer, lives (three hearts), arrows left
 * with a progress meter, plus the back and restart buttons. Updates only when
 * the game state changes (never per frame); the visual easing is all CSS.
 */
export class Hud {
  private readonly level = requireElement('hud-level');
  private readonly hearts = requireElement('hud-hearts');
  private readonly remaining = requireElement('hud-remaining');
  private readonly progress = requireElement('hud-progress');
  private readonly backButton = requireElement<HTMLButtonElement>('btn-back');
  private readonly restartButton = requireElement<HTMLButtonElement>('btn-restart');
  private readonly time = requireElement('hud-time');
  private shownTime = '';
  private last?: GameSnapshot;

  update(snapshot: GameSnapshot): void {
    const sameRun = this.last?.levelId === snapshot.levelId;
    this.level.textContent = String(snapshot.levelId);
    this.remaining.textContent = String(snapshot.remaining);
    const cleared = snapshot.total === 0 ? 0 : (snapshot.total - snapshot.remaining) / snapshot.total;
    this.progress.style.transform = `scaleX(${cleared})`;
    // Nothing to restart before the first move or mistake.
    this.restartButton.disabled = snapshot.moves === 0 && snapshot.mistakes === 0;

    this.renderHearts(snapshot.lives, sameRun && this.last !== undefined && snapshot.lives < this.last.lives);
    if (sameRun && this.last && snapshot.remaining < this.last.remaining) this.tick(this.remaining);
    this.last = snapshot;
  }

  /** Shows the level time. Writes to the DOM only when the displayed text changes (about once a second). */
  setTime(ms: number): void {
    const text = formatClock(ms);
    if (text === this.shownTime) return;
    this.shownTime = text;
    this.time.textContent = text;
  }

  onBack(handler: () => void): void {
    this.backButton.addEventListener('click', handler);
  }

  onRestart(handler: () => void): void {
    this.restartButton.addEventListener('click', handler);
  }

  /** Full hearts first, lost hearts last; the heart that was just lost plays a short break animation. */
  private renderHearts(lives: number, justLost: boolean): void {
    const hearts = [...this.hearts.children] as SVGElement[];
    hearts.forEach((heart, index) => {
      const full = index < lives;
      heart.classList.toggle('heart--lost', !full);
      heart.classList.remove('heart--breaking');
      if (justLost && index === lives) {
        void heart.getBoundingClientRect(); // restart the CSS animation
        heart.classList.add('heart--breaking');
      }
    });
    this.hearts.setAttribute('aria-label', `${lives} ${lives === 1 ? 'life' : 'lives'} left`);
    this.hearts.classList.toggle('hearts--last', lives === 1);
  }

  private tick(el: HTMLElement): void {
    el.classList.remove('is-ticking');
    void el.offsetWidth; // restart the CSS animation
    el.classList.add('is-ticking');
  }
}
