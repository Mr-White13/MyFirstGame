import { Overlay, requireElement } from './dom';

export interface FailureSummary {
  readonly levelId: number;
  readonly cleared: number;
  readonly total: number;
  readonly mistakes: number;
  /** Set for a Daily League challenge: its number and the points kept today. */
  readonly challenge?: { readonly number: number; readonly today: number; readonly maxToday: number };
  /** Offer "Continue" (watch a rewarded ad for one heart). */
  readonly canContinue?: boolean;
}

export interface FailureActions {
  onTryAgain(): void;
  onLevels(): void;
  /** "Continue": watch a rewarded ad, then the same run goes on with one heart. */
  onContinue?(): void;
}

/** Shown when the last life is lost. Saved progress is never touched by a failure. */
export class GameOverDialog {
  private readonly overlay = new Overlay(requireElement('gameover-dialog'));
  private readonly eyebrow = requireElement('gameover-eyebrow');
  private readonly detail = requireElement('gameover-detail');
  private readonly cleared = requireElement('gameover-cleared');
  private readonly mistakes = requireElement('gameover-mistakes');
  private readonly tryAgainButton = requireElement<HTMLButtonElement>('btn-try-again');
  private readonly continueButton = requireElement<HTMLButtonElement>('btn-continue-ad');

  constructor(actions: FailureActions) {
    this.tryAgainButton.addEventListener('click', () => actions.onTryAgain());
    this.continueButton.addEventListener('click', () => actions.onContinue?.());
    this.continueButton.setAttribute('aria-label', 'Continue: watch an ad to get one heart back and keep playing this level');
    requireElement('btn-gameover-levels').addEventListener('click', () => actions.onLevels());
  }

  get isOpen(): boolean {
    return this.overlay.isOpen;
  }

  show(summary: FailureSummary): void {
    const c = summary.challenge;
    this.eyebrow.textContent = c ? `Daily challenge ${c.number}/3` : `Level ${summary.levelId}`;
    const left = summary.total - summary.cleared;
    this.detail.textContent = c
      ? `Energy Points you collected are kept: ${c.today} / ${c.maxToday} today. Try again to finish the challenge.`
      : `${left} ${left === 1 ? 'arrow was' : 'arrows were'} still on the board. Each tap on a blocked arrow costs a life.`;
    requireElement('btn-gameover-levels-label').textContent = c ? 'League' : 'Levels';
    this.cleared.textContent = `${summary.cleared} / ${summary.total}`;
    this.mistakes.textContent = String(summary.mistakes);
    this.continueButton.hidden = !summary.canContinue;
    this.overlay.show(summary.canContinue ? this.continueButton : this.tryAgainButton);
  }

  hide(): void {
    this.overlay.hide();
  }
}
