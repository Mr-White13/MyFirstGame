import type { Insight } from '../recap/insights';
import { Overlay, requireElement } from './dom';

/**
 * The startup recap card: one insight from the player's own records, with
 * Continue and Skip. Both lead to Home; the recap never blocks the game for
 * longer than one tap (or Back).
 */
export class RecapDialog {
  private readonly overlay = new Overlay(requireElement('recap-dialog'));
  private readonly title = requireElement('recap-title');
  private readonly text = requireElement('recap-text');
  private readonly continueButton = requireElement<HTMLButtonElement>('btn-recap-continue');
  private resolve?: (choice: 'continue' | 'skip') => void;

  constructor() {
    this.continueButton.addEventListener('click', () => this.close('continue'));
    requireElement('btn-recap-skip').addEventListener('click', () => this.close('skip'));
  }

  get isOpen(): boolean {
    return this.overlay.isOpen;
  }

  /** Shows the insight; resolves with how the player left it. */
  show(insight: Insight): Promise<'continue' | 'skip'> {
    this.title.textContent = insight.title;
    this.text.textContent = insight.text;
    this.overlay.show(this.continueButton);
    return new Promise((resolve) => (this.resolve = resolve));
  }

  /** Closes the card (Back counts as Skip). Safe to call when closed. */
  close(choice: 'continue' | 'skip' = 'skip'): void {
    if (!this.resolve) return;
    const resolve = this.resolve;
    this.resolve = undefined;
    this.overlay.hide();
    resolve(choice);
  }
}
