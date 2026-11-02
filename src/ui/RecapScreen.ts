import type { Insight } from '../recap/insights';
import { Overlay, requireElement } from './dom';

/** The screen moves on by itself after this long (a tap, Skip or Back are quicker). */
export const RECAP_AUTO_MS = 7000;

/**
 * The startup recap screen, after the studio splash: the animated NEON ESCAPE
 * logo (arrows draw themselves in, the cyan one keeps "escaping" upwards), the
 * name, and one fact from the player's own records as a quote. A full screen
 * instead of a card; the contract is the old one (see app/Intro.ts): it
 * resolves 'continue' (a tap anywhere, or after RECAP_AUTO_MS) or 'skip'
 * (Skip or Back), and never blocks the game for longer than one tap.
 * With reduced motion everything is simply there, no animation.
 */
export class RecapScreen {
  private readonly overlay = new Overlay(requireElement('recap-screen'));
  private readonly title = requireElement('recap-title');
  private readonly text = requireElement('recap-text');
  private readonly progress = requireElement('recap-progress');
  private readonly continueButton = requireElement<HTMLButtonElement>('btn-recap-continue');
  private resolve?: (choice: 'continue' | 'skip') => void;
  private autoTimer = 0;

  constructor(private readonly autoMs = RECAP_AUTO_MS) {
    const screen = this.overlay.element;
    requireElement('btn-recap-skip').addEventListener('click', (event) => {
      event.stopPropagation();
      this.close('skip');
    });
    // A tap anywhere on the screen continues (the Continue button is the keyboard and screen-reader way).
    screen.addEventListener('click', () => this.close('continue'));
  }

  get isOpen(): boolean {
    return this.overlay.isOpen;
  }

  /** Shows the insight over the animated logo; resolves with how the player left it. */
  show(insight: Insight): Promise<'continue' | 'skip'> {
    this.title.textContent = insight.title;
    this.text.textContent = insight.text;
    const screen = this.overlay.element;
    // Restart the CSS intro animation each time the screen opens.
    screen.classList.remove('recap-screen--play');
    void screen.offsetWidth;
    screen.classList.add('recap-screen--play');
    this.progress.style.animationDuration = `${this.autoMs}ms`;
    this.overlay.show(this.continueButton);
    window.clearTimeout(this.autoTimer);
    this.autoTimer = window.setTimeout(() => this.close('continue'), this.autoMs);
    return new Promise((resolve) => (this.resolve = resolve));
  }

  /** Leaves the screen (Back counts as Skip). Safe to call when it isn't open. */
  close(choice: 'continue' | 'skip' = 'skip'): void {
    window.clearTimeout(this.autoTimer);
    if (!this.resolve) return;
    const resolve = this.resolve;
    this.resolve = undefined;
    this.overlay.hide();
    resolve(choice);
  }
}
